import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { APIResponse, DashboardSummary, PortalSettings, SpreadsheetSchema, User } from "../types/domain.js";
import { fail } from "../utils/apiResponse.js";
import { analyzeSchema } from "./spreadsheetMapper.js";

type CallOptions = {
  requestId: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  retryRead?: boolean;
};

type UpstreamDiagnostics = {
  status: number;
  contentType: string;
};

type ParsedCall<T> = {
  response: Response;
  parsed: APIResponse<T>;
};

export class AppsScriptService {
  async call<T>(action: string, options: CallOptions): Promise<APIResponse<T>> {
    const method = options.method ?? "POST";
    const canRetry = isRetryableAppsScriptAction(action) && (options.retryRead || action === "login" || action === "health");
    const attempts = canRetry ? 2 : 1;
    const controller = new AbortController();
    // Read retries share one deadline instead of multiplying the browser's wait.
    const timeout = setTimeout(() => controller.abort(), env.APPS_SCRIPT_TIMEOUT_MS);

    try {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const transport = method === "GET" && attempt > 1 ? "payload" : "params";
          const result = await this.performCall<T>(action, method, options, controller.signal, transport);
          const retryable = ["APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE", "APPS_SCRIPT_HTTP_ERROR", "INVALID_APPS_SCRIPT_RESPONSE"].includes(result.error?.code ?? "");
          if (attempt < attempts && retryable) continue;
          return result;
        } catch (error) {
          logger.warn({ err: error, action, requestId: options.requestId, attempt }, "Apps Script call failed");
          if (controller.signal.aborted) {
            return fail("APPS_SCRIPT_TIMEOUT", "The spreadsheet service took too long to respond. Check the latest status before trying again.", "Spreadsheet request timed out", options.requestId) as APIResponse<T>;
          }
        }
      }

      return fail("APPS_SCRIPT_UNAVAILABLE", "Unable to reach the spreadsheet service. Please try again shortly.", "Apps Script unavailable", options.requestId) as APIResponse<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(requestId: string) {
    const started = Date.now();
    const result = await this.call<Record<string, unknown>>("health", { requestId, method: "GET", retryRead: false });
    return {
      backend: "ok",
      appsScriptConnectivity: result.success || result.error?.code !== "APPS_SCRIPT_UNAVAILABLE" ? "reachable" : "unreachable",
      appsScriptCapability: result.success ? "ready" : "missing_required_action",
      spreadsheetConnectivity: result.success ? "verified_by_apps_script" : "not_verified",
      requiredSheetAvailability: result.success ? result.data?.requiredSheetAvailability ?? "unknown" : "not_verified",
      authenticationReadiness: result.success ? result.data?.authenticationReadiness ?? "unknown" : "not_verified",
      responseTimeMs: Date.now() - started,
      upstream: result
    };
  }

  async schema(requestId: string): Promise<APIResponse<SpreadsheetSchema>> {
    const result = await this.call<SpreadsheetSchema>("schema", { requestId, method: "GET", retryRead: true });
    if (result.success && result.data) {
      return { ...result, data: analyzeSchema({ ...result.data, spreadsheetId: env.SPREADSHEET_ID }) };
    }
    return result;
  }

  login(identifier: string, password: string, requestId: string, expectedRole?: "client" | "admin") {
    return this.call<{ user: User }>("login", {
      requestId,
      method: "POST",
      body: { identifier, password, expectedRole }
    });
  }

  dashboard(role: string, clientId: string | undefined, requestId: string) {
    return this.call<DashboardSummary>("dashboard", { requestId, body: { role, clientId }, retryRead: true });
  }

  getSettings(requestId: string) {
    return this.call<PortalSettings>("getSettings", { requestId, method: "GET", retryRead: true });
  }

  action<T>(action: string, payload: Record<string, unknown>, requestId: string, method: "GET" | "POST" = "GET", retryRead = false) {
    return this.call<T>(action, { requestId, method, body: payload, retryRead });
  }

  private async performCall<T>(action: string, method: "GET" | "POST", options: CallOptions, signal: AbortSignal, transport: "params" | "payload"): Promise<APIResponse<T>> {
    const { parsed } = await this.fetchAndParse<T>(action, method, options, signal, transport);

    if (parsed && typeof parsed.success === "boolean") {
      return {
        success: parsed.success,
        message: parsed.message ?? (parsed.success ? "Operation completed" : "Operation failed"),
        data: parsed.data ?? null,
        error: normalizeUpstreamError(parsed.error),
        meta: parsed.meta ?? { timestamp: new Date().toISOString(), requestId: options.requestId }
      };
    }

    return fail("INVALID_APPS_SCRIPT_RESPONSE", "The spreadsheet service returned an unexpected response. Please try again shortly or contact support.", "Spreadsheet service unavailable", options.requestId) as APIResponse<T>;
  }

  private async fetchAndParse<T>(
    action: string,
    method: "GET" | "POST",
    options: CallOptions,
    signal: AbortSignal,
    transport: "params" | "payload"
  ): Promise<ParsedCall<T>> {
    const url = new URL(env.APPS_SCRIPT_URL);
    url.searchParams.set("_portalRequest", randomUUID());
    const payload = { action, spreadsheetId: env.SPREADSHEET_ID, requestId: options.requestId, ...(options.body ?? {}) };
    const init: RequestInit = {
      method,
      signal,
      cache: "no-store",
      redirect: "follow",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Request-ID": options.requestId }
    };

    if (transport === "payload") {
      if (method === "POST") {
        init.body = JSON.stringify(payload);
      } else {
        url.searchParams.set("payload", JSON.stringify(payload));
      }
    } else {
      url.searchParams.set("action", action);
      if (method === "POST") {
        init.body = JSON.stringify(payload);
      } else {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        });
      }
    }

    const response = await fetch(url, init);
    const text = await response.text();
    const diagnostics = {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "unknown"
    };
    if (!response.ok) {
      logger.warn({ ...diagnostics, action, requestId: options.requestId }, "Apps Script HTTP error");
      const code = response.status === 404 ? "APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE" : "APPS_SCRIPT_HTTP_ERROR";
      return { response, parsed: fail(code, "The spreadsheet connection is unavailable. Please try again shortly or contact support.", "Spreadsheet service unavailable", options.requestId) as APIResponse<T> };
    }
    return { response, parsed: this.parseJson<T>(text, options.requestId, action, diagnostics) };
  }

  private parseJson<T>(text: string, requestId: string, action: string, diagnostics: UpstreamDiagnostics): APIResponse<T> {
    try {
      return JSON.parse(text) as APIResponse<T>;
    } catch {
      logger.warn({ ...diagnostics, action, requestId }, "Apps Script did not return JSON");
      return fail(
        "INVALID_APPS_SCRIPT_RESPONSE",
        "The spreadsheet service returned an unexpected response. Please try again shortly or contact support.",
        "Spreadsheet service unavailable",
        requestId
      ) as APIResponse<T>;
    }
  }
}

function isRetryableAppsScriptAction(action: string) {
  return /^get[A-Z]/.test(action) || ["health", "schema", "dashboard", "login"].includes(action);
}

function normalizeUpstreamError(error: unknown) {
  if (!error) return null;
  if (typeof error === "string") return { code: "APPS_SCRIPT_ERROR", details: error };
  if (typeof error === "object" && "code" in error && "details" in error) {
    return error as { code: string; details: string };
  }
  return { code: "APPS_SCRIPT_ERROR", details: "The spreadsheet service returned an error" };
}

export const appsScriptService = new AppsScriptService();
