import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { kycNumbersSchema, kycReviewSchema } from "../schemas/kyc.js";
import { appsScriptService } from "../services/appsScriptService.js";
import { fail } from "../utils/apiResponse.js";
import { signKycPayload } from "../utils/kycProof.js";
import type { KycRecord } from "../types/kyc.js";

export function kycHandler(action: "getKyc" | "saveKyc" | "reviewKyc", admin = false) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = action === "getKyc" ? { success: true as const, data: {} } : (action === "saveKyc" ? kycNumbersSchema : kycReviewSchema).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("VALIDATION_ERROR", parsed.error.issues.map((issue) => issue.message).join("; "), "Invalid KYC request", req.requestId));
      return;
    }
    const payload = signKycPayload(action, {
      ...parsed.data,
      role: req.user!.role,
      actorId: req.user!.id,
      clientId: admin ? req.params.id : req.user!.clientId
    }, env.SPREADSHEET_ID, req.requestId, env.JWT_SECRET);
    const result = await appsScriptService.action<KycRecord>(action, payload, req.requestId, "POST", action === "getKyc");
    if (result.success && result.data) {
      if (String(result.data.clientId).trim().toLowerCase() !== String(payload.clientId).trim().toLowerCase()) {
        res.status(502).json(fail("KYC_SCOPE_MISMATCH", "The KYC service returned an unexpected client record.", "KYC unavailable", req.requestId));
        return;
      }
      if (req.user!.role === "client") { result.data = { ...result.data }; delete result.data.aadhaar; }
    }
    const code = result.error?.code ?? "";
    const unavailable = ["APPS_SCRIPT_UNAVAILABLE", "APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE", "APPS_SCRIPT_HTTP_ERROR", "INVALID_APPS_SCRIPT_RESPONSE"];
    const status = result.success ? 200 : code === "APPS_SCRIPT_TIMEOUT" ? 504 : unavailable.includes(code) ? 503 : code === "KYC_REVISION_CONFLICT" ? 409 : ["FORBIDDEN", "KYC_REQUEST_DENIED"].includes(code) ? 403 : ["KYC_CONFIGURATION_REQUIRED", "INVALID_ACTION"].includes(code) ? 503 : 422;
    if (code === "INVALID_ACTION") {
      res.status(status).json(fail("KYC_DEPLOYMENT_REQUIRED", "KYC review requires the latest Apps Script deployment. Please contact the portal administrator.", "KYC unavailable", req.requestId));
      return;
    }
    if (!result.success && !/^(KYC_|INVALID_KYC_|VERIFIED_KYC_|DUPLICATE_KYC_|INVALID_CLIENT_ID$|FORBIDDEN$)/.test(code) && code !== "APPS_SCRIPT_TIMEOUT" && !unavailable.includes(code)) {
      res.status(status).json(fail("KYC_UNAVAILABLE", "KYC could not be completed. Please contact the portal administrator.", "KYC unavailable", req.requestId));
      return;
    }
    res.status(status).json(result);
  };
}
