import type { Request, Response } from "express";
import { clientPasswordSchema } from "../schemas/requests.js";
import { appsScriptService } from "../services/appsScriptService.js";
import { fail } from "../utils/apiResponse.js";

type PasswordResult = { updated: boolean; verified: boolean; clientId: string; changedAt?: string };

export async function changePassword(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const { body } = clientPasswordSchema.parse({ body: req.body });
  const result = await appsScriptService.action<PasswordResult>("changeClientPassword", {
    ...body, clientId: req.user!.clientId, actorId: req.user!.id, role: "client"
  }, req.requestId, "POST");
  if (result.success && (result.data?.updated !== true || result.data.verified !== true || String(result.data.clientId).toLowerCase() !== String(req.user!.clientId).toLowerCase())) {
    res.status(502).json(fail("PASSWORD_CHANGE_UNCONFIRMED", "The password change could not be confirmed. Check your latest login before submitting again, or contact support.", "Password change not confirmed", req.requestId));
    return;
  }
  if (result.success && result.data) result.data = { updated: true, verified: true, clientId: result.data.clientId, changedAt: result.data.changedAt };
  const code = result.error?.code ?? "";
  const status = result.success ? 200 : code === "PASSWORD_MISMATCH" ? 400 : code === "FORBIDDEN" ? 403 : ["AMBIGUOUS_LOGIN", "AMBIGUOUS_CREDENTIAL_PASSWORD"].includes(code) ? 409 : 502;
  const permitted = ["PASSWORD_MISMATCH", "PASSWORD_UNCHANGED", "WEAK_PASSWORD", "PASSWORD_CHANGE_UNCONFIRMED", "ACCOUNT_INACTIVE", "CREDENTIAL_NOT_FOUND", "AMBIGUOUS_LOGIN", "AMBIGUOUS_CREDENTIAL_PASSWORD", "FORBIDDEN", "VALIDATION_ERROR", "APPS_SCRIPT_TIMEOUT", "APPS_SCRIPT_UNAVAILABLE", "APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE", "APPS_SCRIPT_HTTP_ERROR", "INVALID_APPS_SCRIPT_RESPONSE"];
  if (!result.success && !permitted.includes(code)) {
    res.status(502).json(fail("PASSWORD_CHANGE_FAILED", "Password change could not be completed. Please contact support.", "Password change failed", req.requestId));
    return;
  }
  res.status(status).json(result);
}
