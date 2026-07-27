import type { Request, Response } from "express";
import type {
  ClientDocument,
  ClientNotification,
  DashboardSummary,
  Investment,
  PortalSettings,
  Referral,
  Transaction,
  Withdrawal
} from "../types/domain.js";
import { appsScriptService } from "../services/appsScriptService.js";
import { fail } from "../utils/apiResponse.js";

type ModuleConfig = {
  listAction: string;
  getAction?: string;
  createAction?: string;
  updateAction?: string;
  deleteAction?: string;
};

const modules: Record<string, ModuleConfig> = {
  profile: { listAction: "getProfile", updateAction: "updateProfile" },
  clients: { listAction: "getClients", getAction: "getClient", createAction: "createClient", updateAction: "updateClient" },
  investments: { listAction: "getInvestments", getAction: "getInvestment", createAction: "createInvestment", updateAction: "updateInvestment" },
  transactions: { listAction: "getTransactions", getAction: "getTransaction", createAction: "createTransaction" },
  withdrawals: { listAction: "getWithdrawals", createAction: "createWithdrawal", updateAction: "updateWithdrawal" },
  referrals: { listAction: "getReferrals", createAction: "createReferral", updateAction: "updateReferral" },
  documents: { listAction: "getDocuments", createAction: "createDocument", deleteAction: "deleteDocument" },
  notifications: { listAction: "getNotifications", createAction: "createNotification", updateAction: "markNotificationRead" },
  reports: { listAction: "getReports" },
  settings: { listAction: "getSettings", updateAction: "updateSettings" }
};

export async function dashboard(req: Request, res: Response) {
  const result = await appsScriptService.dashboard(req.user!.role, req.user!.clientId, req.requestId);
  res.status(result.success ? 200 : 502).json(result);
}

export async function getProfile(req: Request, res: Response) {
  const result = await read<unknown>(modules.profile.listAction, req);
  res.status(result.success ? 200 : 502).json(result);
}

export async function updateProfile(req: Request, res: Response) {
  const payload = scopePayload(req, req.body);
  const result = await appsScriptService.action("updateProfile", payload, req.requestId);
  res.status(result.success ? 200 : 502).json(result);
}

export function list(moduleName: keyof typeof modules) {
  return async (req: Request, res: Response) => {
    const result = await read(moduleName === "settings" ? "getSettings" : modules[moduleName].listAction, req);
    res.status(result.success ? 200 : 502).json(result);
  };
}

export function getById(moduleName: keyof typeof modules) {
  return async (req: Request, res: Response) => {
    const action = modules[moduleName].getAction;
    if (!action) {
      res.status(404).json(fail("ACTION_NOT_SUPPORTED", "This lookup is not supported by the spreadsheet API", "Not found", req.requestId));
      return;
    }
    const result = await appsScriptService.action(action, scopePayload(req, { id: req.params.id }), req.requestId, "GET", true);
    res.status(result.success ? 200 : 502).json(result);
  };
}

export function create(moduleName: keyof typeof modules) {
  return async (req: Request, res: Response) => {
    const action = modules[moduleName].createAction;
    if (!action) {
      res.status(405).json(fail("ACTION_NOT_SUPPORTED", "Create is not supported for this module", "Operation failed", req.requestId));
      return;
    }
    const result = await appsScriptService.action(action, scopePayload(req, req.body), req.requestId);
    res.status(result.success ? 201 : 502).json(result);
  };
}

export function update(moduleName: keyof typeof modules, actionOverride?: string) {
  return async (req: Request, res: Response) => {
    const action = actionOverride ?? modules[moduleName].updateAction;
    if (!action) {
      res.status(405).json(fail("ACTION_NOT_SUPPORTED", "Update is not supported for this module", "Operation failed", req.requestId));
      return;
    }
    const result = await appsScriptService.action(action, scopePayload(req, { id: req.params.id, ...(req.body ?? {}) }), req.requestId);
    res.status(result.success ? 200 : 502).json(result);
  };
}

export function remove(moduleName: keyof typeof modules) {
  return async (req: Request, res: Response) => {
    const action = modules[moduleName].deleteAction;
    if (!action) {
      res.status(405).json(fail("ACTION_NOT_SUPPORTED", "Delete is not supported for this module", "Operation failed", req.requestId));
      return;
    }
    const result = await appsScriptService.action(action, scopePayload(req, { id: req.params.id }), req.requestId);
    res.status(result.success ? 200 : 502).json(result);
  };
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const result = await appsScriptService.action("markAllNotificationsRead", scopePayload(req, {}), req.requestId);
  res.status(result.success ? 200 : 502).json(result);
}

export async function getReportByType(req: Request, res: Response) {
  const result = await appsScriptService.action("getReports", scopePayload(req, { type: req.params.type }), req.requestId, "GET", true);
  res.status(result.success ? 200 : 502).json(result);
}

export async function settings(req: Request, res: Response) {
  const result = await appsScriptService.getSettings(req.requestId);
  res.status(result.success ? 200 : 502).json(result);
}

async function read<T>(action: string, req: Request) {
  return appsScriptService.action<T>(action, scopePayload(req, req.query as Record<string, unknown>), req.requestId, "GET", true);
}

function scopePayload(req: Request, payload: Record<string, unknown>) {
  if (req.user?.role === "admin") return { ...payload, role: "admin", actorId: req.user.id };
  return {
    ...payload,
    role: "client",
    actorId: req.user?.id,
    clientId: req.user?.clientId
  };
}

export type DataUnion =
  | DashboardSummary
  | Investment
  | Transaction
  | Withdrawal
  | Referral
  | ClientDocument
  | ClientNotification
  | PortalSettings;
