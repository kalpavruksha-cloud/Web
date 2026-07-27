import type { NextFunction, Request, Response } from "express";
import { appsScriptService } from "../services/appsScriptService.js";
import { fail } from "../utils/apiResponse.js";

type ClientAction =
  | "getClientDashboard"
  | "getAccountOverview"
  | "getBankDetails"
  | "updateBankDetails"
  | "createBankChangeRequest"
  | "getTransactions"
  | "getInvestmentPlans"
  | "getInvestmentRequests"
  | "createInvestmentRequest"
  | "getWithdrawals"
  | "createWithdrawal"
  | "cancelWithdrawal"
  | "getClientAgreements"
  | "uploadSignedAgreement"
  | "getClientDocuments"
  | "uploadClientDocument"
  | "replaceClientDocument"
  | "archiveClientDocument"
  | "getReferrals"
  | "getProfile"
  | "updateProfile"
  | "uploadProfilePhoto"
  | "removeProfilePhoto"
  | "getFaqs"
  | "getSupportRequests"
  | "createSupportRequest"
  | "getClientPreferences"
  | "updateClientPreferences";

export function clientRead(action: ClientAction) {
  return async (req: Request, res: Response) => {
    const result = await appsScriptService.action(action, clientPayload(req, { ...(req.query as Record<string, unknown>), ...(req.params ?? {}) }), req.requestId, "GET", true);
    res.status(result.success ? 200 : 502).json(result);
  };
}

export function clientWrite(action: ClientAction, successStatus = 200) {
  return async (req: Request, res: Response) => {
    const result = await appsScriptService.action(action, clientPayload(req, { ...(req.body ?? {}), ...(req.params ?? {}) }), req.requestId);
    res.status(result.success ? successStatus : 502).json(result);
  };
}

export function clientUpload(action: ClientAction, successStatus = 201) {
  return async (req: Request, res: Response) => {
    const result = await appsScriptService.action(action, clientPayload(req, { ...(req.body ?? {}), ...(req.params ?? {}) }), req.requestId, "POST");
    res.status(result.success ? successStatus : 502).json(result);
  };
}

export function rejectClientIdOverride(req: Request, res: Response, next: NextFunction) {
  const supplied = req.body?.clientId || req.query?.clientId;
  if (supplied && String(supplied).toUpperCase() !== String(req.user?.clientId).toUpperCase()) {
    res.status(403).json(fail("CLIENT_SCOPE_VIOLATION", "Client ID is derived from the secure session and cannot be overridden", "Permission denied", req.requestId));
    return;
  }
  next();
}

function clientPayload(req: Request, payload: Record<string, unknown>) {
  return {
    ...payload,
    clientId: req.user?.clientId,
    actorId: req.user?.id,
    role: "client"
  };
}
