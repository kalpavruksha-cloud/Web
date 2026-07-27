import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { appsScriptService } from "../services/appsScriptService.js";
import { ok } from "../utils/apiResponse.js";

export async function health(req: Request, res: Response) {
  const data = await appsScriptService.health(req.requestId);
  const payload = {
    ...data,
    configuration: {
      valid: env.isConfigValid,
      error: env.configError
    }
  };
  res.status(data.appsScriptCapability === "ready" && env.isConfigValid ? 200 : 503).json(ok(payload, "System health checked", req.requestId));
}

export async function spreadsheetSchema(req: Request, res: Response) {
  const result = await appsScriptService.schema(req.requestId);
  res.status(result.success ? 200 : 502).json(result);
}

export async function startup(req: Request, res: Response) {
  const [healthData, frontendData] = await Promise.all([
    appsScriptService.health(req.requestId),
    checkFrontend()
  ]);

  const data = {
    backend: {
      running: true,
      url: env.isProduction ? `${env.CLIENT_URL}/api` : `http://localhost:${env.PORT}/api`,
      configuration: {
        valid: env.isConfigValid,
        error: env.configError
      }
    },
    frontend: frontendData,
    appsScript: {
      reachable: healthData.appsScriptConnectivity === "reachable",
      capability: healthData.appsScriptCapability,
      urlConfigured: Boolean(env.APPS_SCRIPT_URL),
      responseTimeMs: healthData.responseTimeMs,
      upstreamError: healthData.upstream.error
    },
    spreadsheet: {
      id: env.SPREADSHEET_ID,
      reachable: healthData.spreadsheetConnectivity === "verified_by_apps_script",
      status: healthData.spreadsheetConnectivity,
      requiredSheetAvailability: healthData.requiredSheetAvailability,
      authenticationReadiness: healthData.authenticationReadiness
    }
  };

  const complete = env.isConfigValid && data.frontend.running && data.appsScript.reachable && data.spreadsheet.reachable;
  res.status(complete ? 200 : 503).json(ok(data, "Startup health checked", req.requestId));
}

async function checkFrontend() {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(env.CLIENT_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return {
      running: response.ok,
      url: env.CLIENT_URL,
      status: response.status,
      responseTimeMs: Date.now() - started
    };
  } catch (error) {
    return {
      running: false,
      url: env.CLIENT_URL,
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Frontend unavailable"
    };
  }
}
