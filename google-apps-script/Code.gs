var DEFAULT_SPREADSHEET_ID = "19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI";
var DEPLOYMENT_MARKER = "KALPAVRUKSHA_PORTAL_CODE_GS_2026_07_27_DOCUMENTS_TRANSACTIONS_V4";

var REQUIRED_SHEETS = [
  "CLIENT_CREDENTIALS",
  "CLIENTS",
  "KYC",
  "BANK_DETAILS",
  "INVESTMENT_PLANS",
  "TRANSACTIONS",
  "DASHBOARD",
  "Documents",
  "Referrals",
  "ACTIVITY_LOG"
];

var ACTIONS = {
  deploymentTest: deploymentTest,
  health: health,
  schema: schema,
  login: login,
  registerClient: registerClient,
  dashboard: dashboard,
  getClients: getClients,
  getClient: getClient,
  createClient: createClient,
  updateClient: updateClient,
  getProfile: getProfile,
  updateProfile: updateProfile,
  getInvestments: getInvestments,
  getInvestment: getInvestment,
  createInvestment: createInvestment,
  updateInvestment: updateInvestment,
  getTransactions: getTransactions,
  getTransaction: getTransaction,
  createTransaction: createTransaction,
  getWithdrawals: getWithdrawals,
  createWithdrawal: createWithdrawal,
  approveWithdrawal: approveWithdrawal,
  rejectWithdrawal: rejectWithdrawal,
  markWithdrawalPaid: markWithdrawalPaid,
  getReferrals: getReferrals,
  createReferral: createReferral,
  updateReferral: updateReferral,
  getDocuments: getDocuments,
  createDocument: createDocument,
  deleteDocument: deleteDocument,
  getNotifications: getNotifications,
  createNotification: createNotification,
  markNotificationRead: markNotificationRead,
  markAllNotificationsRead: markAllNotificationsRead,
  getReports: getReports,
  getSettings: getSettings,
  updateSettings: updateSettings,
  loginDiagnostics: loginDiagnostics,
  getClientDashboard: getClientDashboard,
  getAccountOverview: getAccountOverview,
  getBankDetails: getBankDetails,
  updateBankDetails: updateBankDetails,
  createBankChangeRequest: createBankChangeRequest,
  getInvestmentPlans: getInvestmentPlans,
  getInvestmentRequests: getInvestmentRequests,
  createInvestmentRequest: createInvestmentRequest,
  cancelWithdrawal: cancelWithdrawal,
  getClientAgreements: getClientAgreements,
  uploadSignedAgreement: uploadSignedAgreement,
  getClientDocuments: getClientDocuments,
  uploadClientDocument: uploadClientDocument,
  replaceClientDocument: replaceClientDocument,
  archiveClientDocument: archiveClientDocument,
  uploadProfilePhoto: uploadProfilePhoto,
  removeProfilePhoto: removeProfilePhoto,
  getFaqs: getFaqs,
  getSupportRequests: getSupportRequests,
  createSupportRequest: createSupportRequest,
  getClientPreferences: getClientPreferences,
  updateClientPreferences: updateClientPreferences,
  uploadDriveFile: uploadDriveFile,
  getSecureFile: getSecureFile,
  logClientActivity: logClientActivity
};

function deploymentTest(payload) {
  payload = payload || {};
  return {
    marker: DEPLOYMENT_MARKER,
    doGetAvailable: typeof doGet === "function",
    doPostAvailable: typeof doPost === "function",
    spreadsheetId: payload.spreadsheetId || DEFAULT_SPREADSHEET_ID,
    timestamp: new Date().toISOString()
  };
}

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    if (params.payload) {
      var body = JSON.parse(params.payload);
      return route(body);
    }
    return route(params);
  } catch (error) {
    return jsonResponse(false, "Operation failed", null, { code: error.code || "DO_GET_ERROR", details: error.message || String(error) }, safeRequestId());
  }
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    return route(body);
  } catch (error) {
    return jsonResponse(false, "Operation failed", null, { code: error.code || "DO_POST_ERROR", details: error.message || String(error) }, safeRequestId());
  }
}

function route(payload) {
  var id = safeRequestId(payload);
  try {
    var action = String(payload.action || "").trim();
    if (!ACTIONS[action]) {
      return jsonResponse(false, "Operation failed", null, { code: "INVALID_ACTION", details: "Unknown action: " + action }, id);
    }
    var result = ACTIONS[action](payload, id);
    return jsonResponse(true, "Operation completed", result || {}, null, id);
  } catch (error) {
    return jsonResponse(false, "Operation failed", null, { code: error.code || "APPS_SCRIPT_ERROR", details: error.message || String(error) }, id);
  }
}

function health(payload) {
  var started = Date.now();
  var spreadsheet = getSpreadsheet(payload);
  var detected = spreadsheet.getSheets().map(function(sheet) { return sheet.getName(); });
  return {
    appsScript: "ok",
    spreadsheetId: spreadsheet.getId(),
    spreadsheetConnectivity: "ok",
    requiredSheetAvailability: REQUIRED_SHEETS.map(function(name) {
      return { name: name, available: findSheet(spreadsheet, [name]) ? true : false };
    }),
    authenticationReadiness: findSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]) ? "ready" : "missing_credentials_sheet",
    responseTimeMs: Date.now() - started,
    detectedSheets: detected
  };
}

function schema(payload) {
  var spreadsheet = getSpreadsheet(payload);
  return {
    spreadsheetId: spreadsheet.getId(),
    sheets: spreadsheet.getSheets().map(function(sheet) {
      var values = sheet.getDataRange().getValues();
      return {
        name: sheet.getName(),
        headers: values.length ? values[0].map(String) : [],
        recordCount: Math.max(values.length - 1, 0)
      };
    }),
    warnings: []
  };
}

function login(payload) {
  requireFields(payload, ["identifier", "password"]);
  var sheet = requireSheet(getSpreadsheet(payload), ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var rows = readRows(sheet);
  var loginId = normalizeLogin(payload.identifier);
  var loginPassword = normalizePassword(payload.password);
  var expectedRole = normalizeRole(payload.expectedRole);
  var matches = rows.filter(function(row) {
    return normalizeLogin(credentialLoginId(row)) === loginId;
  });
  if (!matches.length) {
    matches = rows.filter(function(row) {
      return normalizeLogin(first(row, ["Email", "email"])) === loginId;
    });
  }
  if (expectedRole) {
    var roleMatches = matches.filter(function(row) {
      return credentialRole(row) === expectedRole;
    });
    if (matches.length && !roleMatches.length) {
      throw coded("WRONG_PORTAL_ROLE", expectedRole === "admin" ? "This credential is not marked as admin in CLIENT_CREDENTIALS" : "This credential is not marked as client in CLIENT_CREDENTIALS");
    }
    matches = roleMatches;
  }
  var match = matches[0];
  if (!match) throw coded("LOGIN_ID_NOT_FOUND", "Login ID was not found in CLIENT_CREDENTIALS");
  var stored = String(first(match, ["Password", "password", "Portal Password", "PASSWORD"]) || "");
  if (normalizePassword(stored) !== loginPassword) throw coded("PASSWORD_MISMATCH", "Password does not match the CLIENT_CREDENTIALS row");
  var status = normalizeStatus(first(match, ["Status", "Account Status", "status"]) || "active");
  var role = credentialRole(match);
  return {
    user: {
      id: cleanString(first(match, ["User ID", "ID", "Admin ID", "AdminId", "ClientId (Login ID)", "Login ID", "ClientId", "Client ID", "Email"]) || payload.identifier),
      clientId: role === "admin" ? "" : cleanString(credentialLoginId(match) || ""),
      email: cleanString(first(match, ["Email", "email"]) || ""),
      name: cleanString(first(match, ["Name", "Full Name", "ClientName", "Client Name"]) || payload.identifier),
      role: role,
      status: status
    }
  };
}

function loginDiagnostics(payload) {
  var sheet = requireSheet(getSpreadsheet(payload), ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  return readRows(sheet).map(function(row) {
    var loginId = cleanString(credentialLoginId(row));
    var password = cleanString(first(row, ["Password", "password", "Portal Password", "PASSWORD"]));
    return {
      loginId: loginId,
      clientName: cleanString(first(row, ["ClientName", "Client Name", "Name", "Full Name"])),
      role: credentialRole(row),
      rawRole: cleanString(first(row, ["Role", "role", "User Role", "Portal Role", "Access Role"])),
      status: normalizeStatus(first(row, ["Status", "Account Status", "status"]) || "active"),
      passwordConfigured: password.length > 0,
      passwordLength: password.length
    };
  });
}

function registerClient(payload) {
  requireFields(payload, ["fullName", "email", "mobile", "password"]);
  var spreadsheet = getSpreadsheet(payload);
  var clientsSheet = requireSheet(spreadsheet, ["CLIENTS", "Client", "Clients"]);
  var credentialsSheet = requireSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var email = cleanString(payload.email).toLowerCase();
  var mobile = cleanString(payload.mobile);
  var clientId = nextClientId(clientsSheet);

  var existingClients = readRows(clientsSheet);
  var duplicateClient = existingClients.some(function(row) {
    return normalizeText(first(row, ["Email"])) === email || normalizeText(first(row, ["Mobile"])) === normalizeText(mobile);
  });
  if (duplicateClient) throw coded("DUPLICATE_CLIENT", "A client with this email or mobile already exists");

  var existingCredentials = readRows(credentialsSheet);
  var duplicateLogin = existingCredentials.some(function(row) {
    return normalizeLogin(first(row, ["ClientId (Login ID)", "Login ID", "ClientId", "Client ID"])) === normalizeLogin(clientId);
  });
  if (duplicateLogin) throw coded("DUPLICATE_LOGIN", "Generated client login already exists");

  appendRecord(payload, ["CLIENTS", "Client", "Clients"], {
    ClientId: clientId,
    ClientName: cleanString(payload.fullName),
    Email: email,
    Mobile: mobile,
    DOB: cleanString(payload.dateOfBirth),
    Gender: cleanString(payload.gender),
    Occupation: cleanString(payload.occupation),
    RiskProfile: cleanString(payload.riskProfile || "Medium"),
    Status: "pending",
    CreatedDate: new Date()
  });

  appendRecord(payload, ["CLIENT_CREDENTIALS", "Credentials", "Users"], {
    "ClientId (Login ID)": clientId,
    ClientName: cleanString(payload.fullName),
    Password: cleanString(payload.password),
    Role: "client",
    Status: "pending",
    LastPasswordChange: new Date()
  });

  appendIfSheetExists(payload, ["KYC"], {
    ClientId: clientId,
    PAN: "",
    Aadhaar: "",
    KYCStatus: "pending",
    VerificationDate: "",
    Remarks: "Created from portal registration"
  });

  appendIfSheetExists(payload, ["BANK_DETAILS", "Bank Details"], {
    ClientId: clientId,
    AccountHolder: cleanString(payload.fullName),
    BankName: "",
    AccountNumber: "",
    IFSC: "",
    Branch: "",
    UPI: ""
  });

  appendIfSheetExists(payload, ["DASHBOARD", "Dashboard"], {
    ClientId: clientId,
    "Total Invested": 0,
    "Total Payout": 0,
    "Total Withdrawal": 0,
    "Total Referral": 0,
    "Net Portfolio": 0
  });

  audit({ actorId: clientId, role: "client", requestId: payload.requestId }, "register", "CLIENTS", clientId);
  return { clientId: clientId, status: "pending" };
}

function dashboard(payload) {
  var clientId = payload.role === "admin" ? "" : String(payload.clientId || "");
  var dashboardRows = readModule(payload, ["DASHBOARD", "Dashboard"], mapDashboard, true);
  var adminPayload = clonePayload(payload, { role: "admin" });
  var allDashboardRows = readModule(adminPayload, ["DASHBOARD", "Dashboard"], mapDashboard, false);
  var investments = getInvestments(payload);
  var transactions = getTransactions(payload);
  var withdrawals = getWithdrawals(payload);
  var referrals = getReferrals(payload);
  var documents = getDocuments(payload);
  var notifications = getNotifications(payload);
  var dashboardRow = dashboardRows[0] || {};
  var sourceDashboardRows = payload.role === "admin" ? allDashboardRows : dashboardRows;
  var totalInvested = sum(sourceDashboardRows, "totalInvestedAmount") || sum(investments, "principalAmount");
  var currentValue = sum(sourceDashboardRows, "currentPortfolioValue") || sum(investments, "currentValue") || totalInvested;
  var monthlyReturn = sum(investments, "monthlyReturn");
  var credits = sum(transactions, "credit");
  var debits = sum(transactions, "debit");
  var paidReferrals = sum(referrals, "paidAmount");
  var pendingWithdrawals = withdrawals.filter(function(row) { return row.status === "pending"; }).length;
  var client = clientId ? getProfile(payload) : null;
  var activeInvestments = investments.filter(function(row) { return row.status === "active"; }).length;
  var response = {
    client: client,
    totalInvestedAmount: totalInvested,
    currentPortfolioValue: currentValue,
    totalReturns: currentValue - totalInvested,
    monthlyReturn: monthlyReturn,
    walletBalance: payload.role === "admin" ? sum(sourceDashboardRows, "walletBalance") : number(dashboardRow.walletBalance) || credits - debits,
    activeInvestments: activeInvestments,
    pendingWithdrawals: pendingWithdrawals,
    referralEarnings: paidReferrals,
    nextPayoutDate: "",
    recentTransactions: transactions.slice(-8).reverse(),
    investments: investments,
    documents: documents.slice(-6).reverse(),
    notifications: notifications.slice(-6).reverse(),
    kycStatus: client && client.kycStatus,
    agreementStatus: investments.some(function(row) { return row.agreementDetails; }) ? "available" : "pending"
  };
  if (payload.role === "admin") {
    var clients = getClients(payload);
    var allKycRows = readModule(adminPayload, ["KYC"], function(row) {
      return {
        clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
        kycStatus: normalizeStatus(first(row, ["KYCStatus", "KYC Status", "KYC"]) || "pending")
      };
    }, false);
    response.admin = {
      totalClients: clients.length,
      activeClients: clients.filter(function(row) { return row.accountStatus === "active"; }).length,
      totalInvestment: totalInvested,
      portfolioValue: currentValue,
      monthlyPayoutAmount: monthlyReturn,
      pendingWithdrawals: pendingWithdrawals,
      pendingKyc: allKycRows.length ? allKycRows.filter(function(row) { return row.kycStatus !== "verified"; }).length : clients.filter(function(row) { return row.kycStatus !== "verified"; }).length,
      activeInvestments: activeInvestments,
      referralLiabilities: sum(referrals, "rewardAmount") - paidReferrals
    };
  }
  return response;
}

function getClients(payload) {
  return readModule(payload, ["CLIENTS", "Client", "Clients", "Profile"], mapProfile, false);
}

function getClient(payload) {
  return byId(getClients(payload), payload.id, "clientId");
}

function createClient(payload) {
  return appendRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], payload);
}

function updateClient(payload) {
  return updateRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], "ClientId", payload.id || payload.clientId, payload);
}

function getProfile(payload) {
  var rows = getClients(payload);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeText(rows[i].clientId) === normalizeText(payload.clientId)) return rows[i];
  }
  return null;
}

function updateProfile(payload) {
  return updateRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], "ClientId", payload.clientId, payload);
}

function getInvestments(payload) {
  return readModule(payload, ["INVESTMENT_PLANS", "Investment", "Investments"], mapInvestment, false);
}

function getInvestment(payload) {
  return byId(getInvestments(payload), payload.id, "id");
}

function createInvestment(payload) {
  return appendRecord(payload, ["Investment", "Investments"], payload);
}

function updateInvestment(payload) {
  return updateRecord(payload, ["Investment", "Investments"], "Investment ID", payload.id, payload);
}

function getTransactions(payload) {
  return readModule(payload, ["TRANSACTIONS", "Transaction", "Transactions", "Ledger"], mapTransaction, true);
}

function getTransaction(payload) {
  return byId(getTransactions(payload), payload.id, "id");
}

function createTransaction(payload) {
  return appendRecord(payload, ["TRANSACTIONS", "Transaction", "Transactions", "Ledger"], payload, ["TxId", "Reference"]);
}

function getWithdrawals(payload) {
  return readModule(payload, ["Withdrawals", "Withdrawal"], mapWithdrawal, true);
}

function createWithdrawal(payload) {
  return appendRecord(payload, ["Withdrawals", "Withdrawal"], {
    "Withdrawal ID": "WDR-" + Date.now(),
    "Client ID": payload.clientId,
    Amount: payload.amount,
    "Request Date": new Date(),
    "Bank Account": payload.bankAccount,
    Remarks: payload.remarks,
    Status: "pending"
  });
}

function approveWithdrawal(payload) {
  return updateWithdrawalStatus(payload, "approved");
}

function rejectWithdrawal(payload) {
  return updateWithdrawalStatus(payload, "rejected");
}

function markWithdrawalPaid(payload) {
  return updateWithdrawalStatus(payload, "paid");
}

function updateWithdrawalStatus(payload, status) {
  return updateRecord(payload, ["Withdrawals", "Withdrawal"], "Withdrawal ID", payload.id, {
    Status: status,
    "Approval Date": new Date(),
    "Payment Reference": payload.paymentReference,
    "Admin Remarks": payload.adminRemarks
  });
}

function getReferrals(payload) {
  return readModule(payload, ["Referrals", "Referral"], mapReferral, true);
}

function createReferral(payload) {
  return appendRecord(payload, ["Referrals", "Referral"], payload);
}

function updateReferral(payload) {
  return updateRecord(payload, ["Referrals", "Referral"], "Referral ID", payload.id, payload);
}

function getDocuments(payload) {
  return readModule(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], mapDocument, true);
}

function createDocument(payload) {
  return appendRecord(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], payload);
}

function deleteDocument(payload) {
  return updateRecord(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], "DocumentId", payload.id, { Status: "archived" });
}

function getNotifications(payload) {
  var rows = readModule(payload, ["Notifications", "Notification"], mapNotification, false);
  if (payload.role === "admin") return rows;
  return rows.filter(function(row) { return !row.clientId || normalizeText(row.clientId) === normalizeText(payload.clientId); });
}

function createNotification(payload) {
  return appendRecord(payload, ["Notifications", "Notification"], payload);
}

function markNotificationRead(payload) {
  return updateRecord(payload, ["Notifications", "Notification"], "Notification ID", payload.id, { Read: true });
}

function markAllNotificationsRead(payload) {
  var items = getNotifications(payload);
  items.forEach(function(item) { payload.id = item.id; markNotificationRead(payload); });
  return { updated: items.length };
}

function getReports(payload) {
  return {
    investmentSummary: getInvestments(payload),
    transactionStatement: getTransactions(payload),
    monthlyReturnReport: getInvestments(payload).map(function(row) { return { id: row.id, clientId: row.clientId, monthlyReturn: row.monthlyReturn }; }),
    portfolioReport: dashboard(payload),
    referralReport: getReferrals(payload),
    withdrawalReport: getWithdrawals(payload),
    taxSummary: []
  };
}

function getSettings(payload) {
  var sheet = findSheet(getSpreadsheet(payload), ["PlatformSettings", "Settings", "PortalSettings"]);
  if (!sheet) return {};
  var rows = readRows(sheet);
  var settings = {};
  rows.forEach(function(row) {
    var key = first(row, ["Key", "Setting", "Name"]);
    if (key) settings[String(key)] = first(row, ["Value", "Setting Value", "Value Text"]);
  });
  return settings;
}

function mapDashboard(row) {
  return {
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    totalInvestedAmount: number(first(row, ["Total Invested"])),
    totalReturns: number(first(row, ["Total Payout"])),
    walletBalance: number(first(row, ["Net Portfolio"])),
    referralEarnings: number(first(row, ["Total Referral"])),
    totalWithdrawal: number(first(row, ["Total Withdrawal"])),
    currentPortfolioValue: number(first(row, ["Net Portfolio"]))
  };
}

function updateSettings(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = requireSheet(getSpreadsheet(payload), ["PlatformSettings", "Settings", "PortalSettings"]);
    var headers = getHeaders(sheet);
    Object.keys(payload).forEach(function(key) {
      if (["action", "role", "actorId", "requestId", "spreadsheetId"].indexOf(key) >= 0) return;
      upsertKeyValue(sheet, headers, key, payload[key]);
    });
    audit(payload, "updateSettings", "PlatformSettings", "");
    return getSettings(payload);
  } finally {
    lock.releaseLock();
  }
}

function getClientDashboard(payload) {
  return dashboard(payload);
}

function getAccountOverview(payload) {
  var profile = getProfile(payload);
  var investments = getInvestments(payload);
  var transactions = getTransactions(payload);
  var withdrawals = getWithdrawals(payload);
  var referrals = getReferrals(payload);
  var documents = getClientDocuments(payload);
  var bank = getBankDetails(payload);
  var agreements = getClientAgreements(payload);
  return {
    profile: profile,
    investmentSummary: {
      totalInvested: sum(investments, "principalAmount"),
      currentValue: sum(investments, "currentValue") || sum(investments, "principalAmount"),
      activeInvestments: investments.filter(function(row) { return row.status === "active"; }).length
    },
    transactionSummary: {
      credits: sum(transactions, "credit"),
      debits: sum(transactions, "debit"),
      count: transactions.length
    },
    withdrawalSummary: {
      pending: withdrawals.filter(function(row) { return row.status === "pending"; }).length,
      paid: withdrawals.filter(function(row) { return row.status === "paid"; }).length,
      count: withdrawals.length
    },
    referralSummary: {
      rewards: sum(referrals, "rewardAmount"),
      paid: sum(referrals, "paidAmount"),
      count: referrals.length
    },
    documentCompletion: documents.length,
    bankVerificationStatus: bank && bank.verificationStatus,
    agreementsStatus: agreements.length ? agreements[0].signingStatus || agreements[0].documentStatus : "pending"
  };
}

function getBankDetails(payload) {
  var rows = readModule(payload, ["BANK_DETAILS", "Bank Details", "Bank"], mapBankDetails, true);
  return rows[0] || null;
}

function updateBankDetails(payload) {
  var values = bankPayload(payload, "pending_verification");
  upsertClientRecord(payload, ["BANK_DETAILS", "Bank Details", "Bank"], ["ClientId", "Client ID"], payload.clientId, values);
  logClientActivity(clonePayload(payload, { actionName: "updateBankDetails", recordId: payload.clientId }));
  return getBankDetails(payload);
}

function createBankChangeRequest(payload) {
  var requestId = "BCR-" + Date.now();
  appendRecord(payload, ["Bank Change Requests"], clonePayload(bankPayload(payload, "pending"), {
    "Request ID": requestId,
    "Client ID": payload.clientId,
    "Request Date": new Date(),
    Status: "Pending",
    Remarks: payload.remarks || ""
  }));
  logClientActivity(clonePayload(payload, { actionName: "createBankChangeRequest", recordId: requestId }));
  return { requestId: requestId, status: "Pending" };
}

function getInvestmentPlans(payload) {
  var sheet = findSheet(getSpreadsheet(payload), ["Investment Plans", "INVESTMENT_PLANS", "Plans"]);
  if (!sheet) return [];
  return readRows(sheet).map(function(row) {
    return {
      id: String(first(row, ["Plan ID", "PlanId", "Investment ID", "ID"]) || ""),
      planName: String(first(row, ["Plan Name", "PlanName", "Investment Plan", "Plan"]) || ""),
      category: first(row, ["Category"]),
      minimumAmount: number(first(row, ["Minimum Amount", "Min Amount", "Min"])),
      maximumAmount: number(first(row, ["Maximum Amount", "Max Amount", "Max"])),
      returnRate: number(first(row, ["Return Rate", "ROI"])),
      duration: first(row, ["Duration", "Tenure"]),
      payoutFrequency: first(row, ["Payout Frequency", "Frequency"]),
      riskCategory: first(row, ["Risk Category", "Risk"]),
      description: first(row, ["Description", "Notes"]),
      termsUrl: first(row, ["Terms URL", "Terms Link", "Agreement"]),
      status: normalizeStatus(first(row, ["Status"]) || "active")
    };
  }).filter(function(row) { return row.status !== "inactive"; });
}

function getInvestmentRequests(payload) {
  return readModule(payload, ["Investment Requests"], mapInvestmentRequest, true);
}

function createInvestmentRequest(payload) {
  var requestId = "INVREQ-" + Date.now();
  appendRecord(payload, ["Investment Requests"], {
    "Request ID": requestId,
    "Client ID": payload.clientId,
    "Client Name": first(getProfile(payload) || {}, ["fullName", "Full Name", "Client Name"]),
    "Plan ID": payload.planId,
    "Plan Name": payload.planName,
    Amount: payload.amount,
    "Payment Mode": payload.paymentMode,
    "Payment Reference": payload.paymentReference,
    "Payment Date": payload.paymentDate,
    "Payment Proof URL": payload.paymentProofUrl,
    "Request Date": new Date(),
    Status: "Pending",
    "Admin Remarks": "",
    "Approved Investment ID": "",
    "Approved Date": ""
  }, ["Payment Reference"]);
  logClientActivity(clonePayload(payload, { actionName: "createInvestmentRequest", recordId: requestId }));
  return { requestId: requestId, status: "Pending" };
}

function cancelWithdrawal(payload) {
  var rows = getWithdrawals(payload);
  var row = byId(rows, payload.id, "id");
  if (row.status !== "pending") throw coded("WITHDRAWAL_CANCEL_NOT_ALLOWED", "Only pending withdrawal requests can be cancelled");
  var result = updateRecord(payload, ["Withdrawals", "Withdrawal"], "Withdrawal ID", payload.id, { Status: "cancelled", "Client Remarks": payload.remarks || "" });
  logClientActivity(clonePayload(payload, { actionName: "cancelWithdrawal", recordId: payload.id }));
  return result;
}

function getClientAgreements(payload) {
  return readModule(payload, ["Agreements", "Agreement"], mapAgreement, true);
}

function uploadSignedAgreement(payload) {
  var upload = uploadDriveFile(clonePayload(payload, { category: "Agreements", folderType: "Agreements" }));
  var agreementId = payload.id || payload.recordId;
  upsertClientRecord(payload, ["Agreements", "Agreement"], ["Agreement ID", "AgreementId"], agreementId, {
    "Agreement ID": agreementId,
    "Client ID": payload.clientId,
    "Signed File ID": upload.fileId,
    "Signed File URL": upload.fileUrl,
    "Signed File Name": upload.fileName,
    "Upload Date": new Date(),
    "Signing Status": "Under Verification",
    "Document Status": "Uploaded"
  });
  logClientActivity(clonePayload(payload, { actionName: "uploadSignedAgreement", recordId: agreementId }));
  return upload;
}

function getClientDocuments(payload) {
  return getDocuments(payload);
}

function uploadClientDocument(payload) {
  var upload = uploadDriveFile(payload);
  var documentId = "DOC-" + Date.now();
  appendRecord(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], {
    DocumentId: documentId,
    "Client ID": payload.clientId,
    Name: payload.fileName,
    Category: payload.category,
    Description: payload.description,
    FileName: upload.fileName,
    FileType: payload.category,
    MimeType: upload.mimeType,
    FileSize: upload.fileSize,
    GoogleDriveFileId: upload.fileId,
    FileURL: upload.fileUrl,
    "Upload Date": new Date(),
    Status: "Under Verification",
    "Admin Remarks": "",
    UploadedBy: payload.actorId || payload.clientId,
    IsActive: true
  });
  logClientActivity(clonePayload(payload, { actionName: "uploadClientDocument", recordId: documentId }));
  return clonePayload(upload, { documentId: documentId, status: "Under Verification" });
}

function replaceClientDocument(payload) {
  var existing = byId(getClientDocuments(payload), payload.id, "id");
  if (existing.status === "verified") throw coded("VERIFIED_DOCUMENT_LOCKED", "Verified documents require an admin-controlled replacement request");
  var upload = uploadDriveFile(payload);
  updateRecord(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], "DocumentId", payload.id, {
    FileName: upload.fileName,
    MimeType: upload.mimeType,
    FileSize: upload.fileSize,
    GoogleDriveFileId: upload.fileId,
    FileURL: upload.fileUrl,
    "Upload Date": new Date(),
    Status: "Under Verification"
  });
  logClientActivity(clonePayload(payload, { actionName: "replaceClientDocument", recordId: payload.id }));
  return upload;
}

function archiveClientDocument(payload) {
  var existing = byId(getClientDocuments(payload), payload.id, "id");
  if (existing.status === "verified") throw coded("VERIFIED_DOCUMENT_LOCKED", "Verified documents cannot be deleted directly");
  var result = updateRecord(payload, ["DOCUMENTS", "Documents", "Document", "Docs"], "DocumentId", payload.id, { Status: "archived", IsActive: false });
  logClientActivity(clonePayload(payload, { actionName: "archiveClientDocument", recordId: payload.id }));
  return result;
}

function uploadProfilePhoto(payload) {
  var upload = uploadDriveFile(clonePayload(payload, { category: "Profile", folderType: "Profile" }));
  upsertClientRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], ["ClientId", "Client ID", "CLIENT_ID"], payload.clientId, {
    ClientId: payload.clientId,
    "Client ID": payload.clientId,
    "Profile Photo URL": upload.fileUrl,
    ProfilePhotoUrl: upload.fileUrl
  });
  logClientActivity(clonePayload(payload, { actionName: "uploadProfilePhoto", recordId: payload.clientId }));
  return upload;
}

function removeProfilePhoto(payload) {
  upsertClientRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], ["ClientId", "Client ID", "CLIENT_ID"], payload.clientId, {
    ClientId: payload.clientId,
    "Client ID": payload.clientId,
    "Profile Photo URL": "",
    ProfilePhotoUrl: ""
  });
  logClientActivity(clonePayload(payload, { actionName: "removeProfilePhoto", recordId: payload.clientId }));
  return { removed: true };
}

function getFaqs(payload) {
  var sheet = findSheet(getSpreadsheet(payload), ["FAQ", "FAQs"]);
  if (!sheet) return [];
  return readRows(sheet).map(function(row) {
    return {
      id: String(first(row, ["FAQ ID", "ID"]) || ""),
      category: first(row, ["Category"]) || "General",
      question: first(row, ["Question"]),
      answer: first(row, ["Answer"]),
      status: normalizeStatus(first(row, ["Status"]) || "active")
    };
  }).filter(function(row) { return row.status !== "inactive"; });
}

function getSupportRequests(payload) {
  var rows = readModule(payload, ["Support Requests", "Support"], mapSupportRequest, true);
  if (payload.id) return byId(rows, payload.id, "ticketId");
  return rows;
}

function createSupportRequest(payload) {
  var ticketId = "SUP-" + Date.now();
  appendRecord(payload, ["Support Requests", "Support"], {
    "Ticket ID": ticketId,
    "Client ID": payload.clientId,
    Subject: payload.subject,
    Category: payload.category,
    Priority: payload.priority || "normal",
    Message: payload.message,
    "Attachment URL": payload.attachmentUrl,
    "Created Date": new Date(),
    Status: "Open",
    "Admin Response": "",
    "Updated Date": new Date()
  });
  logClientActivity(clonePayload(payload, { actionName: "createSupportRequest", recordId: ticketId }));
  return { ticketId: ticketId, status: "Open" };
}

function getClientPreferences(payload) {
  var rows = readModule(payload, ["Client Preferences", "Preferences"], function(row) {
    return {
      clientId: String(first(row, ["Client ID", "ClientId"]) || ""),
      emailNotifications: bool(first(row, ["Email Notifications"])),
      smsNotifications: bool(first(row, ["SMS Notifications"])),
      whatsappNotifications: bool(first(row, ["WhatsApp Notifications"])),
      preferredLanguage: first(row, ["Preferred Language"]) || "English"
    };
  }, true);
  return rows[0] || { emailNotifications: true, smsNotifications: true, whatsappNotifications: true, preferredLanguage: "English" };
}

function updateClientPreferences(payload) {
  upsertClientRecord(payload, ["Client Preferences", "Preferences"], ["Client ID", "ClientId"], payload.clientId, {
    "Client ID": payload.clientId,
    "Email Notifications": payload.emailNotifications,
    "SMS Notifications": payload.smsNotifications,
    "WhatsApp Notifications": payload.whatsappNotifications,
    "Preferred Language": payload.preferredLanguage || "English",
    "Updated Date": new Date()
  });
  logClientActivity(clonePayload(payload, { actionName: "updateClientPreferences", recordId: payload.clientId }));
  return getClientPreferences(payload);
}

function uploadDriveFile(payload) {
  requireFields(payload, ["fileName", "mimeType", "fileSize", "base64Data", "category", "clientId"]);
  validateUpload(payload);
  var folder = getClientFolder(payload.clientId, payload.folderType || payload.category || "Other");
  var bytes = Utilities.base64Decode(String(payload.base64Data).replace(/^data:[^,]+,/, ""));
  var safeName = uniqueFileName(payload.clientId, payload.fileName);
  var blob = Utilities.newBlob(bytes, payload.mimeType, safeName);
  var file = folder.createFile(blob);
  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: safeName,
    mimeType: payload.mimeType,
    fileSize: Number(payload.fileSize),
    uploadedTimestamp: new Date().toISOString()
  };
}

function getSecureFile(payload) {
  if (!payload.fileId) throw coded("VALIDATION_ERROR", "fileId is required");
  var file = DriveApp.getFileById(payload.fileId);
  return { fileId: file.getId(), fileName: file.getName(), fileUrl: file.getUrl(), mimeType: file.getMimeType(), fileSize: file.getSize() };
}

function logClientActivity(payload) {
  var recordId = payload.recordId || "";
  var actionName = payload.actionName || "clientActivity";
  audit(payload, actionName, "Client Portal", recordId);
  return { logged: true };
}

function readModule(payload, sheetNames, mapper, scoped) {
  var sheet = findSheet(getSpreadsheet(payload), sheetNames);
  if (!sheet) return [];
  var rows = readRows(sheet).map(mapper);
  if (scoped && payload.role !== "admin") {
    rows = rows.filter(function(row) { return normalizeText(row.clientId) === normalizeText(payload.clientId); });
  }
  return rows;
}

function appendRecord(payload, sheetNames, values, duplicateHeaders) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var spreadsheet = getSpreadsheet(payload);
    var sheet = findSheet(spreadsheet, sheetNames) || ensureSheet(spreadsheet, sheetNames[0], Object.keys(values));
    ensureHeaders(sheet, Object.keys(values));
    var headers = getHeaders(sheet);
    if (duplicateHeaders) preventDuplicate(sheet, duplicateHeaders, values);
    var row = headers.map(function(header) { return values[header] !== undefined ? values[header] : values[camel(header)]; });
    sheet.appendRow(row);
    audit(payload, "append", sheet.getName(), String(values.id || values["ID"] || values["Client ID"] || ""));
    return values;
  } finally {
    lock.releaseLock();
  }
}

function appendIfSheetExists(payload, sheetNames, values) {
  var sheet = findSheet(getSpreadsheet(payload), sheetNames);
  if (!sheet) return null;
  return appendRecord(payload, sheetNames, values);
}

function updateRecord(payload, sheetNames, idHeader, idValue, updates) {
  if (!idValue) throw coded("INVALID_ID", "Record ID is required");
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = requireSheet(getSpreadsheet(payload), sheetNames);
    ensureHeaders(sheet, Object.keys(updates));
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(String);
    var idIndex = findHeaderIndex(headers, [idHeader, "ID", "Request ID"]);
    if (idIndex < 0) throw coded("MISSING_COLUMN", "Missing ID column in " + sheet.getName());
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (normalizeText(values[i][idIndex]) === normalizeText(idValue)) rowIndex = i + 1;
    }
    if (rowIndex < 0) throw coded("RECORD_NOT_FOUND", "Record not found: " + idValue);
    headers.forEach(function(header, index) {
      var value = updates[header] !== undefined ? updates[header] : updates[camel(header)];
      if (value !== undefined) sheet.getRange(rowIndex, index + 1).setValue(value);
    });
    audit(payload, "update", sheet.getName(), String(idValue));
    return { id: idValue, updated: true };
  } finally {
    lock.releaseLock();
  }
}

function preventDuplicate(sheet, headersToCheck, values) {
  var headers = getHeaders(sheet);
  var rows = sheet.getDataRange().getValues();
  headersToCheck.forEach(function(header) {
    var index = findHeaderIndex(headers, [header]);
    if (index < 0) return;
    var nextValue = values[header] || values[camel(header)];
    if (!nextValue) return;
    for (var i = 1; i < rows.length; i++) {
      if (normalizeText(rows[i][index]) === normalizeText(nextValue)) throw coded("DUPLICATE_RECORD", "Duplicate value for " + header);
    }
  });
}

function audit(payload, action, sheet, recordId) {
  var auditSheet = findSheet(getSpreadsheet(payload), ["Activity Log", "Audit Log", "Activity"]);
  if (!auditSheet) return;
  auditSheet.appendRow([new Date(), payload.actorId || "", payload.role || "", action, sheet, recordId || "", payload.requestId || ""]);
}

function mapProfile(row) {
  return {
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID", "clientId"]) || ""),
    fullName: String(first(row, ["Full Name", "Client Name", "Name"]) || ""),
    profilePhotoUrl: first(row, ["Profile Photo URL", "Photo URL"]),
    mobile: first(row, ["Mobile", "Phone"]),
    email: first(row, ["Email"]),
    dateOfBirth: first(row, ["Date of Birth", "DOB"]),
    address: first(row, ["Address"]),
    pan: first(row, ["PAN"]),
    aadhaar: first(row, ["Aadhaar", "Aadhar"]),
    kycStatus: normalizeStatus(first(row, ["KYC Status", "KYC"])),
    bankAccount: first(row, ["Bank Account", "Account Number"]),
    ifsc: first(row, ["IFSC"]),
    branch: first(row, ["Branch"]),
    nomineeName: first(row, ["Nominee Name"]),
    nomineeRelationship: first(row, ["Nominee Relationship"]),
    nomineeMobile: first(row, ["Nominee Mobile"]),
    riskProfile: first(row, ["Risk Profile"]),
    accountStatus: normalizeStatus(first(row, ["Account Status", "Status"]))
  };
}

function mapInvestment(row) {
  return {
    id: String(first(row, ["PlanId", "Investment ID", "ID"]) || ""),
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    plan: String(first(row, ["PlanName", "Investment Plan", "Plan"]) || ""),
    category: first(row, ["Category"]),
    principalAmount: number(first(row, ["Principal Amount", "Amount", "Invested Amount"])),
    startDate: first(row, ["Start Date", "Investment Date"]),
    maturityDate: first(row, ["Maturity Date"]),
    returnRate: number(first(row, ["Return Rate", "ROI"])),
    monthlyReturn: number(first(row, ["Monthly Return", "Monthly Payout"])),
    currentValue: number(first(row, ["Current Value", "Portfolio Value"])),
    status: normalizeStatus(first(row, ["Status"])),
    agreementDetails: first(row, ["Agreement Details", "Agreement"]),
    paymentMode: first(row, ["Payment Mode"]),
    notes: first(row, ["Notes", "Remarks"])
  };
}

function mapTransaction(row) {
  return {
    id: String(first(row, ["TxId", "Transaction ID", "Txn ID", "ID"]) || ""),
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    date: first(row, ["Date"]),
    type: normalizeStatus(first(row, ["Type", "Transaction Type"])),
    description: first(row, ["Description", "Particulars"]),
    credit: transactionAmount(row, "credit"),
    debit: transactionAmount(row, "debit"),
    balance: number(first(row, ["Balance"])),
    reference: first(row, ["Reference", "Payment Reference"]),
    status: normalizeStatus(first(row, ["Status"]))
  };
}

function mapWithdrawal(row) {
  return {
    id: String(first(row, ["Withdrawal ID", "Request ID", "ID"]) || ""),
    clientId: String(first(row, ["Client ID", "CLIENT_ID"]) || ""),
    amount: number(first(row, ["Amount", "Requested Amount"])),
    requestDate: first(row, ["Request Date", "Date"]),
    bankAccount: first(row, ["Bank Account"]),
    remarks: first(row, ["Remarks"]),
    status: normalizeStatus(first(row, ["Status"])),
    approvalDate: first(row, ["Approval Date", "Approved Date"]),
    paymentReference: first(row, ["Payment Reference", "UTR"]),
    adminRemarks: first(row, ["Admin Remarks"])
  };
}

function mapReferral(row) {
  return {
    id: String(first(row, ["Referral ID", "ID"]) || ""),
    clientId: String(first(row, ["Client ID", "CLIENT_ID"]) || ""),
    code: first(row, ["Referral Code", "Code"]),
    referredClientName: first(row, ["Referred Client Name", "Referred Name"]),
    referredClientId: first(row, ["Referred Client ID", "Referred ID"]),
    status: normalizeStatus(first(row, ["Status"])),
    rewardAmount: number(first(row, ["Reward Amount", "Commission"])),
    paidAmount: number(first(row, ["Paid Amount"])),
    createdAt: first(row, ["Date", "Created At"])
  };
}

function mapDocument(row) {
  return {
    id: String(first(row, ["DocumentId", "Document ID", "Doc ID", "ID"]) || ""),
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    name: String(first(row, ["Name", "Document Name", "DocumentType"]) || "Document"),
    type: String(first(row, ["Category", "FileType", "File Type", "Type", "Document Type"]) || "Other"),
    uploadDate: first(row, ["Upload Date", "Date"]),
    status: normalizeStatus(first(row, ["Status"])),
    driveUrl: first(row, ["FileURL", "Google Drive URL", "Drive URL", "URL", "Link"])
  };
}

function mapNotification(row) {
  return {
    id: String(first(row, ["Notification ID", "ID"]) || ""),
    clientId: first(row, ["Client ID", "CLIENT_ID"]),
    title: String(first(row, ["Title", "Subject"]) || "Notification"),
    message: String(first(row, ["Message", "Body"]) || ""),
    date: first(row, ["Date", "Created At"]),
    type: first(row, ["Type"]),
    read: bool(first(row, ["Read", "Is Read"])),
    priority: normalizeStatus(first(row, ["Priority"]) || "normal")
  };
}

function mapBankDetails(row) {
  return {
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    accountHolderName: first(row, ["Account Holder", "AccountHolder", "Account Holder Name"]),
    bankName: first(row, ["Bank Name", "BankName"]),
    accountNumber: first(row, ["Account Number", "AccountNumber", "Bank Account"]),
    ifsc: first(row, ["IFSC", "IFSC Code"]),
    branch: first(row, ["Branch"]),
    accountType: first(row, ["Account Type"]),
    upiId: first(row, ["UPI", "UPI ID"]),
    cancelledChequeUrl: first(row, ["Cancelled Cheque URL", "Bank Proof URL"]),
    verificationStatus: normalizeStatus(first(row, ["Verification Status", "Status"]) || "pending"),
    adminRemarks: first(row, ["Admin Remarks", "Remarks"]),
    lastUpdatedDate: first(row, ["Last Updated Date", "Updated Date"])
  };
}

function mapInvestmentRequest(row) {
  return {
    requestId: String(first(row, ["Request ID", "RequestId", "ID"]) || ""),
    clientId: String(first(row, ["Client ID", "ClientId", "CLIENT_ID"]) || ""),
    planId: first(row, ["Plan ID", "PlanId"]),
    planName: first(row, ["Plan Name", "PlanName"]),
    amount: number(first(row, ["Amount"])),
    paymentMode: first(row, ["Payment Mode"]),
    paymentReference: first(row, ["Payment Reference"]),
    paymentDate: first(row, ["Payment Date"]),
    paymentProofUrl: first(row, ["Payment Proof URL"]),
    requestDate: first(row, ["Request Date"]),
    status: normalizeStatus(first(row, ["Status"]) || "pending"),
    adminRemarks: first(row, ["Admin Remarks"]),
    approvedInvestmentId: first(row, ["Approved Investment ID"]),
    approvedDate: first(row, ["Approved Date"])
  };
}

function mapAgreement(row) {
  return {
    agreementId: String(first(row, ["Agreement ID", "AgreementId", "ID"]) || ""),
    clientId: String(first(row, ["Client ID", "ClientId", "CLIENT_ID"]) || ""),
    investmentId: first(row, ["Investment ID", "InvestmentId"]),
    agreementName: first(row, ["Agreement Name", "Name"]),
    agreementType: first(row, ["Agreement Type", "Type"]),
    issueDate: first(row, ["Issue Date"]),
    effectiveDate: first(row, ["Effective Date"]),
    maturityDate: first(row, ["Maturity Date", "Expiry Date"]),
    signingStatus: normalizeStatus(first(row, ["Signing Status"]) || "draft"),
    documentStatus: normalizeStatus(first(row, ["Document Status", "Status"]) || "draft"),
    adminRemarks: first(row, ["Admin Remarks"]),
    driveUrl: first(row, ["Google Drive URL", "Drive URL", "FileURL", "Signed File URL"])
  };
}

function mapSupportRequest(row) {
  return {
    ticketId: String(first(row, ["Ticket ID", "TicketId", "ID"]) || ""),
    clientId: String(first(row, ["Client ID", "ClientId", "CLIENT_ID"]) || ""),
    subject: first(row, ["Subject"]),
    category: first(row, ["Category"]),
    priority: normalizeStatus(first(row, ["Priority"]) || "normal"),
    message: first(row, ["Message"]),
    attachmentUrl: first(row, ["Attachment URL"]),
    createdDate: first(row, ["Created Date"]),
    status: normalizeStatus(first(row, ["Status"]) || "open"),
    adminResponse: first(row, ["Admin Response"]),
    updatedDate: first(row, ["Updated Date"])
  };
}

function credentialLoginId(row) {
  return first(row, ["ClientId (Login ID)", "Login ID", "LoginId", "User ID", "UserId", "Admin ID", "AdminId", "ClientId", "Client ID", "CLIENT_ID", "clientId"]);
}

function credentialRole(row) {
  return normalizeRole(first(row, ["Role", "role", "User Role", "Portal Role", "Access Role"]) || "client") || "client";
}

function normalizeRole(value) {
  var role = normalizeStatus(value || "");
  if (["admin", "administrator", "super_admin", "superadmin", "owner", "main_admin", "mainadmin"].indexOf(role) >= 0) return "admin";
  if (["client", "customer", "investor", "user"].indexOf(role) >= 0) return "client";
  return "";
}

function getSpreadsheet(payload) {
  var id = payload.spreadsheetId || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || DEFAULT_SPREADSHEET_ID;
  if (!id) throw coded("MISSING_SPREADSHEET_ID", "Spreadsheet ID is required");
  return SpreadsheetApp.openById(id);
}

function bankPayload(payload, status) {
  return {
    ClientId: payload.clientId,
    "Client ID": payload.clientId,
    "Account Holder": payload.accountHolderName,
    "Bank Name": payload.bankName,
    "Account Number": payload.accountNumber,
    IFSC: String(payload.ifsc || "").toUpperCase(),
    Branch: payload.branch,
    "Account Type": payload.accountType,
    UPI: payload.upiId,
    "Verification Status": status,
    Status: status,
    "Admin Remarks": "",
    "Last Updated Date": new Date()
  };
}

function upsertClientRecord(payload, sheetNames, idHeaders, idValue, values) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureSheet(getSpreadsheet(payload), sheetNames[0], Object.keys(values));
    var headers = getHeaders(sheet);
    var idIndex = findHeaderIndex(headers, idHeaders);
    if (idIndex < 0) {
      sheet.getRange(1, headers.length + 1).setValue(idHeaders[0]);
      headers = getHeaders(sheet);
      idIndex = findHeaderIndex(headers, idHeaders);
    }
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (normalizeText(rows[i][idIndex]) === normalizeText(idValue)) rowIndex = i + 1;
    }
    if (rowIndex < 0) {
      sheet.appendRow(headers.map(function(header) { return values[header] !== undefined ? values[header] : values[camel(header)] || ""; }));
    } else {
      headers.forEach(function(header, index) {
        var value = values[header] !== undefined ? values[header] : values[camel(header)];
        if (value !== undefined) sheet.getRange(rowIndex, index + 1).setValue(value);
      });
    }
    return { updated: true, id: idValue };
  } finally {
    lock.releaseLock();
  }
}

function ensureSheet(spreadsheet, name, headers) {
  var sheet = findSheet(spreadsheet, [name]);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
    return sheet;
  }
  var existing = getHeaders(sheet);
  if (!existing.length) {
    sheet.appendRow(headers);
    return sheet;
  }
  headers.forEach(function(header) {
    if (findHeaderIndex(existing, [header]) < 0) {
      sheet.getRange(1, existing.length + 1).setValue(header);
      existing.push(header);
    }
  });
  return sheet;
}

function ensureHeaders(sheet, headers) {
  var existing = getHeaders(sheet);
  if (!existing.length) {
    sheet.appendRow(headers);
    return;
  }
  headers.forEach(function(header) {
    if (findHeaderIndex(existing, [header]) < 0) {
      sheet.getRange(1, existing.length + 1).setValue(header);
      existing.push(header);
    }
  });
}

function getClientFolder(clientId, category) {
  var root = getOrCreateFolder(DriveApp.getRootFolder(), "Kalpavruksha Portal");
  var clients = getOrCreateFolder(root, "Clients");
  var client = getOrCreateFolder(clients, sanitizeName(clientId));
  return getOrCreateFolder(client, sanitizeName(category || "Other"));
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function validateUpload(payload) {
  var allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (allowed.indexOf(String(payload.mimeType)) < 0) throw coded("INVALID_FILE_TYPE", "Only PDF, JPG, JPEG, and PNG files are allowed");
  if (Number(payload.fileSize) > 10 * 1024 * 1024) throw coded("FILE_TOO_LARGE", "Maximum upload size is 10 MB");
}

function uniqueFileName(clientId, fileName) {
  var parts = String(fileName || "file").split(".");
  var ext = parts.length > 1 ? "." + sanitizeName(parts.pop()) : "";
  var base = sanitizeName(parts.join(".") || "file");
  return sanitizeName(clientId) + "-" + new Date().getTime() + "-" + base + ext;
}

function sanitizeName(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

function findSheet(spreadsheet, names) {
  var normalized = names.map(normalizeKey);
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (normalized.indexOf(normalizeKey(sheets[i].getName())) >= 0) return sheets[i];
  }
  return null;
}

function requireSheet(spreadsheet, names) {
  var sheet = findSheet(spreadsheet, names);
  if (!sheet) throw coded("MISSING_SHEET", "Missing spreadsheet tab: " + names.join(" or "));
  return sheet;
}

function readRows(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function(row) {
    return row.some(function(cell) { return cell !== ""; });
  }).map(function(row) {
    var item = {};
    headers.forEach(function(header, index) { item[header] = row[index]; });
    return item;
  });
}

function getHeaders(sheet) {
  var values = sheet.getDataRange().getValues();
  return values.length ? values[0].map(String) : [];
}

function first(row, names) {
  var keys = Object.keys(row);
  for (var i = 0; i < names.length; i++) {
    var wanted = normalizeKey(names[i]);
    for (var j = 0; j < keys.length; j++) {
      if (normalizeKey(keys[j]) === wanted) return row[keys[j]];
    }
  }
  return "";
}

function byId(rows, id, key) {
  for (var i = 0; i < rows.length; i++) {
    if (normalizeText(rows[i][key]) === normalizeText(id)) return rows[i];
  }
  throw coded("RECORD_NOT_FOUND", "Record not found");
}

function findHeaderIndex(headers, aliases) {
  var wanted = aliases.map(normalizeKey);
  for (var i = 0; i < headers.length; i++) {
    if (wanted.indexOf(normalizeKey(headers[i])) >= 0) return i;
  }
  return -1;
}

function upsertKeyValue(sheet, headers, key, value) {
  var keyIndex = findHeaderIndex(headers, ["Key", "Setting", "Name"]);
  var valueIndex = findHeaderIndex(headers, ["Value", "Setting Value"]);
  if (keyIndex < 0 || valueIndex < 0) throw coded("MISSING_COLUMN", "Settings sheet requires Key and Value columns");
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (normalizeText(values[i][keyIndex]) === normalizeText(key)) {
      sheet.getRange(i + 1, valueIndex + 1).setValue(value);
      return;
    }
  }
  var row = headers.map(function(_, index) { return index === keyIndex ? key : index === valueIndex ? value : ""; });
  sheet.appendRow(row);
}

function sum(rows, field) {
  return rows.reduce(function(total, row) { return total + number(row[field]); }, 0);
}

function clonePayload(payload, extra) {
  var next = {};
  Object.keys(payload || {}).forEach(function(key) { next[key] = payload[key]; });
  Object.keys(extra || {}).forEach(function(key) { next[key] = extra[key]; });
  return next;
}

function transactionAmount(row, side) {
  var explicit = side === "credit" ? first(row, ["Credit"]) : first(row, ["Debit"]);
  if (explicit !== "") return number(explicit);
  var type = normalizeStatus(first(row, ["Type", "Transaction Type"]));
  var amount = number(first(row, ["Amount"]));
  if (side === "credit") return ["credit", "deposit", "payout", "referral", "bonus", "interest"].indexOf(type) >= 0 ? amount : 0;
  return ["debit", "withdrawal", "fee", "charge"].indexOf(type) >= 0 ? amount : 0;
}

function nextClientId(sheet) {
  var rows = readRows(sheet);
  var max = rows.reduce(function(current, row) {
    var id = cleanString(first(row, ["ClientId", "Client ID", "CLIENT_ID"]));
    var match = id.match(/KWM?(\d+)/i);
    if (!match) return current;
    return Math.max(current, Number(match[1]));
  }, 0);
  var next = leftPad(String(max + 1), 4, "0");
  return "KWM" + next;
}

function leftPad(value, length, char) {
  value = String(value);
  while (value.length < length) value = char + value;
  return value;
}

function number(value) {
  var parsed = Number(String(value || 0).replace(/[₹,\s%]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

function bool(value) {
  return ["true", "yes", "1", "read"].indexOf(String(value || "").toLowerCase()) >= 0;
}

function cleanString(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function normalizeLogin(value) {
  return cleanString(value).toLowerCase();
}

function normalizePassword(value) {
  return cleanString(value);
}

function normalizeStatus(value) {
  return cleanString(value || "pending").toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value) {
  return cleanString(value).toLowerCase();
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "").replace(/[^a-z0-9]/g, "");
}

function camel(value) {
  var parts = String(value || "").trim().split(/[\s_-]+/);
  return parts.map(function(part, index) {
    part = part.toLowerCase();
    return index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1);
  }).join("");
}

function requireFields(payload, fields) {
  fields.forEach(function(field) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") throw coded("VALIDATION_ERROR", field + " is required");
  });
}

function requestId(payload) {
  return payload.requestId || Utilities.getUuid();
}

function safeRequestId(payload) {
  try {
    return requestId(payload || {});
  } catch (error) {
    return "apps-script-error-" + new Date().getTime();
  }
}

function coded(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}

function jsonResponse(success, message, data, error, id) {
  var output = {
    success: success,
    message: message,
    data: success ? data : null,
    error: error,
    meta: { timestamp: new Date().toISOString(), requestId: id }
  };
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
