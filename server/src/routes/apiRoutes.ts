import { Router } from "express";
import {
  create,
  dashboard,
  getById,
  getProfile,
  getReportByType,
  list,
  markAllNotificationsRead,
  remove,
  settings,
  update,
  updateProfile
} from "../controllers/dataController.js";
import { clientRead, clientUpload, clientWrite, rejectClientIdOverride } from "../controllers/clientController.js";
import { health, spreadsheetSchema, startup } from "../controllers/systemController.js";
import { authenticate, clientScope, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  documentSchema,
  idParamSchema,
  bankDetailsSchema,
  clientPreferencesSchema,
  clientUploadSchema,
  clientWithdrawalCancelSchema,
  investmentSchema,
  investmentRequestSchema,
  notificationSchema,
  profileUpdateSchema,
  referralSchema,
  settingsSchema,
  supportRequestSchema,
  transactionSchema,
  withdrawalCreateSchema,
  withdrawalDecisionSchema
} from "../schemas/requests.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const apiRouter = Router();

apiRouter.get("/system/health", asyncHandler(health));
apiRouter.get("/system/startup", asyncHandler(startup));

apiRouter.use(authenticate);

apiRouter.use("/client", requireRole("client"), rejectClientIdOverride);
apiRouter.get("/client/dashboard", asyncHandler(clientRead("getClientDashboard")));
apiRouter.get("/client/account-overview", asyncHandler(clientRead("getAccountOverview")));
apiRouter.get("/client/bank-details", asyncHandler(clientRead("getBankDetails")));
apiRouter.put("/client/bank-details", validate(bankDetailsSchema), asyncHandler(clientWrite("updateBankDetails")));
apiRouter.post("/client/bank-change-requests", validate(bankDetailsSchema), asyncHandler(clientWrite("createBankChangeRequest", 201)));
apiRouter.get("/client/transactions", asyncHandler(clientRead("getTransactions")));
apiRouter.get("/client/investment-plans", asyncHandler(clientRead("getInvestmentPlans")));
apiRouter.get("/client/investment-requests", asyncHandler(clientRead("getInvestmentRequests")));
apiRouter.post("/client/investment-requests", validate(investmentRequestSchema), asyncHandler(clientWrite("createInvestmentRequest", 201)));
apiRouter.get("/client/withdrawals", asyncHandler(clientRead("getWithdrawals")));
apiRouter.post("/client/withdrawals", validate(withdrawalCreateSchema), asyncHandler(clientWrite("createWithdrawal", 201)));
apiRouter.put("/client/withdrawals/:id/cancel", validate(clientWithdrawalCancelSchema), asyncHandler(clientWrite("cancelWithdrawal")));
apiRouter.get("/client/agreements", asyncHandler(clientRead("getClientAgreements")));
apiRouter.post("/client/agreements/:id/upload-signed", validate(clientUploadSchema), asyncHandler(clientUpload("uploadSignedAgreement")));
apiRouter.get("/client/documents", asyncHandler(clientRead("getClientDocuments")));
apiRouter.post("/client/documents/upload", validate(clientUploadSchema), asyncHandler(clientUpload("uploadClientDocument")));
apiRouter.put("/client/documents/:id/replace", validate(clientUploadSchema), asyncHandler(clientUpload("replaceClientDocument")));
apiRouter.delete("/client/documents/:id", validate(idParamSchema), asyncHandler(clientWrite("archiveClientDocument")));
apiRouter.get("/client/referrals", asyncHandler(clientRead("getReferrals")));
apiRouter.get("/client/profile", asyncHandler(clientRead("getProfile")));
apiRouter.put("/client/profile", validate(profileUpdateSchema), asyncHandler(clientWrite("updateProfile")));
apiRouter.post("/client/profile/photo", validate(clientUploadSchema), asyncHandler(clientUpload("uploadProfilePhoto")));
apiRouter.delete("/client/profile/photo", asyncHandler(clientWrite("removeProfilePhoto")));
apiRouter.get("/client/faqs", asyncHandler(clientRead("getFaqs")));
apiRouter.get("/client/support", asyncHandler(clientRead("getSupportRequests")));
apiRouter.post("/client/support", validate(supportRequestSchema), asyncHandler(clientWrite("createSupportRequest", 201)));
apiRouter.get("/client/support/:id", validate(idParamSchema), asyncHandler(clientRead("getSupportRequests")));
apiRouter.get("/client/settings", asyncHandler(clientRead("getClientPreferences")));
apiRouter.put("/client/settings", validate(clientPreferencesSchema), asyncHandler(clientWrite("updateClientPreferences")));

apiRouter.get("/dashboard", asyncHandler(dashboard));
apiRouter.get("/profile", asyncHandler(getProfile));
apiRouter.put("/profile", validate(profileUpdateSchema), clientScope, asyncHandler(updateProfile));

apiRouter.get("/clients", requireRole("admin"), asyncHandler(list("clients")));
apiRouter.get("/clients/:id", requireRole("admin"), validate(idParamSchema), asyncHandler(getById("clients")));
apiRouter.post("/clients", requireRole("admin"), asyncHandler(create("clients")));
apiRouter.put("/clients/:id", requireRole("admin"), validate(idParamSchema), asyncHandler(update("clients")));

apiRouter.get("/investments", asyncHandler(list("investments")));
apiRouter.get("/investments/:id", validate(idParamSchema), asyncHandler(getById("investments")));
apiRouter.post("/investments", requireRole("admin"), validate(investmentSchema), asyncHandler(create("investments")));
apiRouter.put("/investments/:id", requireRole("admin"), validate(idParamSchema), asyncHandler(update("investments")));

apiRouter.get("/transactions", asyncHandler(list("transactions")));
apiRouter.get("/transactions/:id", validate(idParamSchema), asyncHandler(getById("transactions")));
apiRouter.post("/transactions", requireRole("admin"), validate(transactionSchema), asyncHandler(create("transactions")));

apiRouter.get("/withdrawals", asyncHandler(list("withdrawals")));
apiRouter.post("/withdrawals", validate(withdrawalCreateSchema), asyncHandler(create("withdrawals")));
apiRouter.put("/withdrawals/:id/approve", requireRole("admin"), validate(withdrawalDecisionSchema), asyncHandler(update("withdrawals", "approveWithdrawal")));
apiRouter.put("/withdrawals/:id/reject", requireRole("admin"), validate(withdrawalDecisionSchema), asyncHandler(update("withdrawals", "rejectWithdrawal")));
apiRouter.put("/withdrawals/:id/paid", requireRole("admin"), validate(withdrawalDecisionSchema), asyncHandler(update("withdrawals", "markWithdrawalPaid")));

apiRouter.get("/referrals", asyncHandler(list("referrals")));
apiRouter.post("/referrals", validate(referralSchema), asyncHandler(create("referrals")));
apiRouter.put("/referrals/:id", requireRole("admin"), validate(idParamSchema), asyncHandler(update("referrals")));

apiRouter.get("/documents", asyncHandler(list("documents")));
apiRouter.post("/documents", requireRole("admin"), validate(documentSchema), asyncHandler(create("documents")));
apiRouter.delete("/documents/:id", requireRole("admin"), validate(idParamSchema), asyncHandler(remove("documents")));

apiRouter.get("/notifications", asyncHandler(list("notifications")));
apiRouter.post("/notifications", requireRole("admin"), validate(notificationSchema), asyncHandler(create("notifications")));
apiRouter.put("/notifications/:id/read", validate(idParamSchema), asyncHandler(update("notifications")));
apiRouter.put("/notifications/read-all", asyncHandler(markAllNotificationsRead));

apiRouter.get("/reports", asyncHandler(list("reports")));
apiRouter.get("/reports/:type", asyncHandler(getReportByType));

apiRouter.get("/settings", asyncHandler(settings));
apiRouter.put("/settings", requireRole("admin"), validate(settingsSchema), asyncHandler(update("settings")));

apiRouter.get("/admin/spreadsheet-schema", requireRole("admin"), asyncHandler(spreadsheetSchema));
