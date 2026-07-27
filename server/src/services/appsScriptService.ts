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
  bodyPreview: string;
};

type ParsedCall<T> = {
  response: Response;
  parsed: APIResponse<T>;
};

export class AppsScriptService {
  async call<T>(action: string, options: CallOptions): Promise<APIResponse<T>> {
    const method = options.method ?? "POST";
    const attempts = method === "GET" && options.retryRead ? 2 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.performCall<T>(action, method, options);
      } catch (error) {
        lastError = error;
        logger.warn({ err: error, action, requestId: options.requestId, attempt }, "Apps Script call failed");
      }
    }

    const details = lastError instanceof Error ? lastError.message : "Unable to reach Apps Script";
    return fail("APPS_SCRIPT_UNAVAILABLE", details, "Apps Script unavailable", options.requestId) as APIResponse<T>;
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
      method: "GET",
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

  private async performCall<T>(action: string, method: "GET" | "POST", options: CallOptions): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.APPS_SCRIPT_TIMEOUT_MS);

    try {
      let { response, parsed } = await this.fetchAndParse<T>(action, method, options, controller.signal, "params");

      if (isInvalidHtml(parsed) && method === "GET") {
        logger.warn({ action, requestId: options.requestId, firstError: parsed.error }, "Apps Script returned HTML; retrying with payload query transport");
        ({ response, parsed } = await this.fetchAndParse<T>(action, method, options, controller.signal, "payload"));
      }

      if (!response.ok) {
        return fail("APPS_SCRIPT_HTTP_ERROR", `Apps Script returned HTTP ${response.status}`, "Operation failed", options.requestId) as APIResponse<T>;
      }

      if (typeof parsed.success === "boolean") {
        return {
          success: parsed.success,
          message: parsed.message ?? (parsed.success ? "Operation completed" : "Operation failed"),
          data: parsed.data ?? null,
          error: normalizeUpstreamError(parsed.error),
          meta: parsed.meta ?? { timestamp: new Date().toISOString(), requestId: options.requestId }
        };
      }

      return fail("INVALID_APPS_SCRIPT_RESPONSE", "Apps Script returned JSON without a success flag", "Operation failed", options.requestId) as APIResponse<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchAndParse<T>(
    action: string,
    method: "GET" | "POST",
    options: CallOptions,
    signal: AbortSignal,
    transport: "params" | "payload"
  ): Promise<ParsedCall<T>> {
    const url = new URL(env.APPS_SCRIPT_URL);
    const payload = { action, spreadsheetId: env.SPREADSHEET_ID, requestId: options.requestId, ...(options.body ?? {}) };
    const init: RequestInit = {
      method,
      signal,
      headers: { "Content-Type": "application/json", "X-Request-ID": options.requestId }
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
      contentType: response.headers.get("content-type") ?? "unknown",
      bodyPreview: preview(text)
    };
    return { response, parsed: this.parseJson<T>(text, options.requestId, action, diagnostics) };
  }

  private parseJson<T>(text: string, requestId: string, action: string, diagnostics: UpstreamDiagnostics): APIResponse<T> {
    try {
      return JSON.parse(text) as APIResponse<T>;
    } catch {
      const isHtml = /html/i.test(diagnostics.contentType) || /^<!doctype html|^<html/i.test(text.trim());
      const details = isHtml
        ? `Google Apps Script returned an HTML error page for action "${action}". Redeploy the latest Code.gs as a Web App with Execute as: Me and access for the backend, then update APPS_SCRIPT_URL if the deployment URL changed. Google message: ${diagnostics.bodyPreview}`
        : `Apps Script did not return valid JSON. HTTP ${diagnostics.status}; content-type ${diagnostics.contentType}; body: ${diagnostics.bodyPreview}`;
      return fail(
        "INVALID_APPS_SCRIPT_RESPONSE",
        details,
        "Operation failed",
        requestId
      ) as APIResponse<T>;
    }
  }
}

function preview(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  const googleMessage = compact.match(/<div[^>]*class=["']errorMessage["'][^>]*>(.*?)<\/div>/i)?.[1];
  return stripTags(googleMessage || compact).slice(0, 1500);
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isInvalidHtml<T>(response: APIResponse<T>) {
  return response.error?.code === "INVALID_APPS_SCRIPT_RESPONSE" && /html/i.test(response.error.details);
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
