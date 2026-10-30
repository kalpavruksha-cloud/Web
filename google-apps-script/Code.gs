var DEFAULT_SPREADSHEET_ID = "19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI";
var DEPLOYMENT_MARKER = "KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_30_EMAIL_LOGIN_DASHBOARD_FORMULAS_V28";
var DASHBOARD_READ_CONTEXT = null;

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
  driveAuthorizationTest: driveAuthorizationTest,
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
  repairDocumentClientIds: repairDocumentClientIds,
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
  downloadClientDocument: downloadClientDocument,
  replaceClientDocument: replaceClientDocument,
  archiveClientDocument: archiveClientDocument,
  uploadProfilePhoto: uploadProfilePhoto,
  removeProfilePhoto: removeProfilePhoto,
  getFaqs: getFaqs,
  getSupportRequests: getSupportRequests,
  createSupportRequest: createSupportRequest,
  getClientPreferences: getClientPreferences,
  updateClientPreferences: updateClientPreferences,
  changeClientPassword: changeClientPassword,
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

function driveAuthorizationTest(payload) {
  payload = payload || {};
  var root = DriveApp.getRootFolder();
  var testFolder = root.createFolder("Kalpavruksha Portal Authorization Test " + new Date().getTime());
  var testFolderId = testFolder.getId();
  testFolder.setTrashed(true);
  return {
    driveApp: "write_authorized",
    rootFolderId: root.getId(),
    rootFolderName: root.getName(),
    testFolderCreated: true,
    testFolderId: testFolderId,
    testFolderTrashed: true,
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
  var spreadsheet = getSpreadsheet(payload);
  var sheet = requireSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var rows = readRows(sheet);
  var clientSheet = findSheet(spreadsheet, ["CLIENTS", "Client", "Clients", "Profile"]);
  var clientRows = clientSheet ? readRows(clientSheet) : [];
  var loginId = normalizeLogin(payload.identifier);
  var loginPassword = normalizePassword(payload.password);
  var expectedRole = normalizeRole(payload.expectedRole);
  var match = uniqueLoginRow(findLoginMatches(rows, loginId, clientRows));
  if (expectedRole && match && credentialRole(match) !== expectedRole) {
    throw coded("WRONG_PORTAL_ROLE", expectedRole === "admin" ? "This credential is not marked as admin in CLIENT_CREDENTIALS" : "This credential is not marked as client in CLIENT_CREDENTIALS");
  }
  var clientRow = findClientLoginRow(clientRows, loginId, match);
  var credentialMissing = false;
  if (!match && (!expectedRole || expectedRole === "client")) {
    match = clientRow;
    credentialMissing = !!match;
  }
  if (!match) throw coded("LOGIN_ID_NOT_FOUND", "Login ID was not found in CLIENT_CREDENTIALS or CLIENTS");
  var stored = String(first(match, passwordHeaders()) || "");
  if (!stored && clientRow) stored = String(first(clientRow, passwordHeaders()) || "");
  if (!stored && credentialMissing) throw coded("CLIENT_CREDENTIALS_MISSING", "Client exists in CLIENTS, but no password was found. Add a matching row in CLIENT_CREDENTIALS with ClientId, Password, Role=client, Status=active, or add a Portal Password column to the client row once and login again.");
  if (!stored) throw coded("PASSWORD_NOT_CONFIGURED", "Password is not configured for this login");
  if (normalizePassword(stored) !== loginPassword) throw coded("PASSWORD_MISMATCH", "Password does not match the CLIENT_CREDENTIALS row");
  var status = effectiveLoginStatus(match, clientRow);
  var role = credentialMissing ? "client" : credentialRole(match);
  if (credentialMissing && role === "client") {
    upsertCredentialFromClient(payload, clientRow || match, stored);
  }
  return {
    user: {
      id: cleanString(first(match, ["User ID", "ID", "Admin ID", "AdminId", "ClientId (Login ID)", "Login ID", "ClientId", "Client ID", "Email"]) || payload.identifier),
      clientId: role === "admin" ? "" : cleanString(credentialLoginId(match) || credentialLoginId(clientRow || {}) || ""),
      email: cleanString(first(match, ["Email", "email"]) || first(clientRow || {}, ["Email", "email"]) || ""),
      name: cleanString(first(match, ["Name", "Full Name", "ClientName", "Client Name"]) || first(clientRow || {}, ["Name", "Full Name", "ClientName", "Client Name"]) || payload.identifier),
      role: role,
      status: status
    }
  };
}

function loginDiagnostics(payload) {
  var spreadsheet = getSpreadsheet(payload);
  var sheet = requireSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var clientSheet = findSheet(spreadsheet, ["CLIENTS", "Client", "Clients", "Profile"]);
  var clientRows = clientSheet ? readRows(clientSheet) : [];
  var credentialRows = readRows(sheet);
  var credentialSummary = credentialRows.map(function(row) {
    var loginId = cleanString(credentialLoginId(row));
    var clientRow = findClientLoginRow(clientRows, normalizeLogin(loginId), row);
    var password = cleanString(first(row, passwordHeaders()));
    return {
      loginId: loginId,
      clientName: cleanString(first(row, ["ClientName", "Client Name", "Name", "Full Name"])),
      role: credentialRole(row),
      rawRole: cleanString(first(row, ["Role", "role", "User Role", "Portal Role", "Access Role"])),
      status: effectiveLoginStatus(row, clientRow),
      credentialStatus: normalizeStatus(first(row, ["Status", "Account Status", "status"]) || "active"),
      clientSheetStatus: normalizeOptionalStatus(first(clientRow || {}, ["Status", "Account Status", "AccountStatus", "status"])),
      clientRowFound: !!clientRow,
      passwordConfigured: password.length > 0,
      passwordLength: password.length
    };
  });
  var missingCredentialClients = clientRows.filter(function(row) {
    var id = normalizeLogin(credentialLoginId(row));
    if (!id) return false;
    return !credentialRows.some(function(credential) { return normalizeLogin(credentialLoginId(credential)) === id; });
  }).map(function(row) {
    var password = cleanString(first(row, passwordHeaders()));
    return {
      loginId: cleanString(credentialLoginId(row)),
      clientName: cleanString(first(row, ["ClientName", "Client Name", "Name", "Full Name"])),
      status: normalizeOptionalStatus(first(row, ["Status", "Account Status", "AccountStatus", "status"])),
      passwordConfiguredInClientSheet: password.length > 0,
      passwordLength: password.length,
      issue: password ? "will_auto_sync_on_successful_login" : "missing_client_credentials_row"
    };
  });
  return {
    credentialsCount: credentialRows.length,
    clientRowsCount: clientRows.length,
    credentials: credentialSummary,
    missingCredentialClients: missingCredentialClients
  };
}

function registerClient(payload) {
  requireFields(payload, ["fullName", "email", "mobile", "password"]);
  var spreadsheet = getSpreadsheet(payload);
  var clientsSheet = requireSheet(spreadsheet, ["CLIENTS", "Client", "Clients"]);
  var credentialsSheet = requireSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var email = cleanString(payload.email).toLowerCase();
  var mobile = cleanString(payload.mobile);
  var existingClients = readRows(clientsSheet);
  var duplicateClient = existingClients.some(function(row) {
    return normalizeText(first(row, ["Email"])) === email || normalizeText(first(row, ["Mobile"])) === normalizeText(mobile);
  });
  if (duplicateClient) throw coded("DUPLICATE_CLIENT", "A client with this email or mobile already exists");

  var existingCredentials = readRows(credentialsSheet);
  var clientId = nextClientId([clientsSheet, credentialsSheet]);

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

  appendRegistrationDashboard(payload, clientId);

  audit({ actorId: clientId, role: "client", requestId: payload.requestId }, "register", "CLIENTS", clientId);
  return { clientId: clientId, status: "pending" };
}

function appendRegistrationDashboard(payload, clientId) {
  var sheet = findSheet(getSpreadsheet(payload), ["DASHBOARD", "Dashboard"]);
  if (!sheet) return null;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var financialHeaders = ["Total Invested", "Total Payout", "Total Withdrawal", "Total Referral", "Net Portfolio", "Present Investment", "Monthly Payout"];
    var record = { ClientId: clientId };
    financialHeaders.forEach(function(header) { record[header] = 0; });
    ensureHeaders(sheet, Object.keys(record));
    var range = sheet.getDataRange();
    var values = range.getValues();
    var formulas = range.getFormulasR1C1();
    var headers = values[0].map(String);
    var clientIndex = findHeaderIndex(headers, ["ClientId", "Client ID", "CLIENT_ID"]);
    if (values.slice(1).some(function(row) { return normalizeLogin(row[clientIndex]) === normalizeLogin(clientId); })) {
      throw coded("DUPLICATE_RECORD", "A dashboard record already exists for this client");
    }
    var nextRow = 0;
    for (var candidate = 1; candidate < values.length; candidate++) {
      if (!cleanString(values[candidate][clientIndex]) && formulas[candidate] && formulas[candidate][clientIndex]
        && values[candidate].every(function(value) { return value === "" || value === 0; })) {
        nextRow = candidate + 1;
        break;
      }
    }
    if (nextRow) {
      // Earlier INDEX/COUNTIF rows must see this ID before it enters the transaction ledger.
      sheet.getRange(nextRow, clientIndex + 1).setValue(clientId);
    } else {
      nextRow = sheet.getLastRow() + 1;
      sheet.appendRow(headers.map(function(header) { return first(record, [header]); }));
    }
    // Native R1C1 templates preserve the workbook's formulas without guessing financial rules.
    headers.forEach(function(header, column) {
      if (findHeaderIndex(financialHeaders, [header]) < 0) return;
      for (var row = 1; row < values.length; row++) {
        if (cleanString(values[row][clientIndex]) && formulas[row] && formulas[row][column]) {
          sheet.getRange(nextRow, column + 1).setFormulaR1C1(formulas[row][column]);
          return;
        }
      }
      sheet.getRange(nextRow, column + 1).setValue(0);
    });
    audit(payload, "append", sheet.getName(), clientId);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function dashboard(payload) {
  var previousContext = DASHBOARD_READ_CONTEXT;
  DASHBOARD_READ_CONTEXT = { spreadsheets: {}, sheets: {}, values: {}, sources: [] };
  try {
    return buildDashboardSnapshot(payload);
  } finally {
    // Keep spreadsheet rows within this request, never across clients or writes.
    DASHBOARD_READ_CONTEXT = previousContext;
  }
}

function buildDashboardSnapshot(payload) {
  var isAdmin = payload.role === "admin";
  var clientId = isAdmin ? "" : String(payload.clientId || "");
  var dashboardRows = readModule(payload, ["DASHBOARD", "Dashboard"], mapDashboard, true, isAdmin ? "dashboard" : "");
  var adminPayload = isAdmin ? clonePayload(payload, { role: "admin" }) : null;
  var allDashboardRows = isAdmin ? dashboardRows : [];
  var investments = getInvestments(payload);
  var transactions = getTransactions(payload);
  var sortedTransactions = sortRowsByDate(transactions);
  var withdrawals = getWithdrawals(payload);
  var referrals = getReferrals(payload);
  var documents = getDocuments(payload);
  var notifications = getNotifications(payload);
  var dashboardRow = dashboardRows[0] || {};
  var sourceDashboardRows = isAdmin ? allDashboardRows : dashboardRows;
  var hasDashboardRows = sourceDashboardRows.length > 0;
  var totalInvested = hasDashboardRows ? sum(sourceDashboardRows, "totalInvestedAmount") : sum(investments, "principalAmount");
  var totalPayout = hasDashboardRows ? sum(sourceDashboardRows, "totalReturns") : 0;
  var totalWithdrawal = hasDashboardRows ? sum(sourceDashboardRows, "totalWithdrawal") : sum(withdrawals, "amount");
  var currentValue = hasDashboardRows ? sum(sourceDashboardRows, "currentPortfolioValue") : sum(investments, "currentValue") || totalInvested;
  var presentInvestment = dashboardColumnTotal(sourceDashboardRows, "presentInvestment");
  var monthlyPayout = dashboardColumnTotal(sourceDashboardRows, "monthlyPayout");
  var availableBalance = typeof presentInvestment === "number" ? presentInvestment : totalInvested - totalWithdrawal;
  var monthlyReturn = sum(investments, "monthlyReturn");
  var paidReferrals = sum(referrals, "paidAmount");
  var pendingWithdrawals = withdrawals.filter(function(row) { return row.status === "pending" && !row.readOnly; }).length;
  var client = clientId ? getProfile(payload) : null;
  var activeInvestments = investments.filter(function(row) { return row.status === "active"; }).length;
  var portfolioGrowth = buildPortfolioGrowth(sortedTransactions, investments, sourceDashboardRows);
  var response = {
    client: client,
    totalInvestedAmount: totalInvested,
    currentPortfolioValue: currentValue,
    totalReturns: hasDashboardRows ? totalPayout : currentValue - totalInvested,
    totalPayouts: totalPayout,
    totalWithdrawal: totalWithdrawal,
    presentInvestment: presentInvestment,
    monthlyPayout: monthlyPayout,
    monthlyReturn: monthlyReturn,
    walletBalance: availableBalance,
    availableBalance: availableBalance,
    activeInvestments: activeInvestments,
    pendingWithdrawals: pendingWithdrawals,
    referralEarnings: paidReferrals,
    nextPayoutDate: "",
    recentTransactions: sortedTransactions.slice(-8).reverse(),
    portfolioGrowth: portfolioGrowth,
    investmentGrowth: portfolioGrowth,
    investments: investments,
    documents: documents.slice(-6).reverse(),
    notifications: notifications.slice(-6).reverse(),
    kycStatus: client && client.kycStatus,
    agreementStatus: investments.some(function(row) { return row.agreementDetails; }) ? "available" : "pending"
  };
  if (payload.role === "admin") {
    var clients = getClients(payload);
    var allKycRows = readModule(adminPayload || payload, ["KYC"], function(row) {
      return {
        clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
        kycStatus: normalizeStatus(first(row, ["KYCStatus", "KYC Status", "KYC", "Verification Status", "Status"]) || "pending")
      };
    }, false);
    var withdrawalHistory = readAdminWithdrawalHistory(payload);
    var investmentSource = DASHBOARD_READ_CONTEXT.sources.filter(function(source) { return source.module === "investments"; })[0];
    var analytics = buildAdminFinancialAnalytics(investments, transactions, withdrawals, totalInvested, new Date(), {
      preferInvestmentMaster: investmentSource && normalizeKey(investmentSource.sheet) === "investmentmaster",
      withdrawalHistory: withdrawalHistory,
      dashboardRows: sourceDashboardRows,
      clients: clients
    });
    applyAdminPayoutCalendar(analytics, investments, transactions, withdrawalHistory, clients, new Date(analytics.asOf), investmentSource && normalizeKey(investmentSource.sheet) === "investmentmaster", sourceDashboardRows);
    addAdminOverviewSeries(analytics, clients, investments, transactions, withdrawals, sourceDashboardRows);
    reconcileAdminPortfolio(analytics, currentValue);
    if (response.presentInvestment === null) analytics.warnings.push("DASHBOARD Present Investment has blank or invalid client amounts; its total is unavailable.");
    if (response.monthlyPayout === null) analytics.warnings.push("DASHBOARD Monthly Payout has blank or invalid client amounts; its total is unavailable.");
    analytics.sources = DASHBOARD_READ_CONTEXT.sources;
    var kycByClient = {};
    allKycRows.forEach(function(row) { kycByClient[normalizeText(row.clientId)] = row.kycStatus; });
    var verifiedKyc = clients.filter(function(row) {
      return (kycByClient[normalizeText(row.clientId)] || row.kycStatus) === "verified";
    }).length;
    var actualWithdrawal = hasDashboardRows ? totalWithdrawal : analytics.completedWithdrawalTotal;
    response.availableBalance = typeof presentInvestment === "number" ? presentInvestment : totalInvested - actualWithdrawal;
    response.totalWithdrawal = actualWithdrawal;
    response.admin = {
      totalClients: clients.length,
      activeClients: clients.filter(function(row) { return row.accountStatus === "active"; }).length,
      totalInvestment: totalInvested,
      portfolioValue: currentValue,
      monthlyPayoutAmount: monthlyReturn,
      estimatedMonthlyPayout: analytics.estimatedMonthlyPayout,
      scheduledMonthlyPayout: analytics.estimatedMonthlyPayout,
      paidMonthlyPayout: analytics.paidMonthlyPayout,
      remainingMonthlyPayout: analytics.remainingMonthlyPayout,
      payoutCalendarReady: analytics.payoutCalendarReady,
      upcomingPayoutAmount: analytics.upcomingPayoutAmount,
      upcomingPayoutPeriod: analytics.upcomingPayoutPeriod,
      payoutEstimateMissingRecords: analytics.payoutEstimateMissingRecords,
      totalPayoutAmount: hasDashboardRows ? totalPayout : analytics.recordedPayoutTotal,
      totalWithdrawalAmount: actualWithdrawal,
      netInvestment: response.availableBalance,
      pendingWithdrawalAmount: sum(withdrawals.filter(function(row) { return row.status === "pending" && !row.readOnly; }), "amount"),
      verifiedKyc: verifiedKyc,
      pendingWithdrawals: pendingWithdrawals,
      pendingKyc: clients.length - verifiedKyc,
      activeInvestments: activeInvestments,
      referralLiabilities: sum(referrals, "rewardAmount") - paidReferrals
    };
    response.adminAnalytics = analytics;
    response.adminClientSummaries = buildAdminClientSummaries(sourceDashboardRows);
    response.adminData = {
      clients: clients,
      investments: investments,
      transactions: transactions,
      withdrawals: withdrawals,
      documents: documents,
      referrals: referrals,
      notifications: notifications
    };
  } else {
    var clientAnalytics = buildAdminFinancialAnalytics(investments, transactions, withdrawals, totalInvested, new Date(), {
      preferInvestmentMaster: investments.some(function(row) { return row.statusProvided !== undefined; }),
      withdrawalHistory: readClientWithdrawalHistory(payload),
      dashboardRows: sourceDashboardRows
    });
    reconcileAdminPortfolio(clientAnalytics, currentValue);
    response.portfolioHistory = {
      asOf: clientAnalytics.asOf,
      months: clientAnalytics.portfolioHistoryMonths.slice(-12),
      source: clientAnalytics.portfolioHistorySource,
      matchesCurrentPortfolio: clientAnalytics.portfolioReconciliation.matches
    };
    response.portfolioGrowth = response.portfolioHistory.months.filter(function(row) { return row.amount !== null; }).map(function(row) {
      return { date: row.month + "-01", value: row.amount };
    });
    response.investmentGrowth = response.portfolioGrowth;
  }
  return response;
}

function adminCalendarDay(value) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return new Date(value.getTime() + 19800000).toISOString().slice(0, 10);
  }
  var text = cleanString(value);
  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  var indian = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (iso || indian) {
    var year = Number(iso ? iso[1] : indian[3]);
    var month = Number(iso ? iso[2] : indian[2]);
    var day = Number(iso ? iso[3] : indian[1]);
    var date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
    return date.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return value > 59 && value < 100000 ? new Date((Math.floor(value) - 25569) * 86400000).toISOString().slice(0, 10) : "";
  }
  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? "" : adminCalendarDay(parsed);
}

function adminTransactionPosted(row) {
  // DASHBOARD SUMIFS treats Approved ledger rows as posted; this is not request approval.
  return ["approved", "completed", "posted", "paid", "success", "successful", "settled"].indexOf(row.status) >= 0;
}

function buildAdminFinancialAnalytics(investments, transactions, withdrawals, totalInvested, now, history) {
  var today = adminCalendarDay(now);
  var month = today.slice(0, 7);
  var monthStart = month + "-01";
  var monthEnd = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10);
  var warnings = [];
  var completed = transactions.filter(adminTransactionPosted);
  var investmentLedger = completed.filter(function(row) {
    return ["investment", "deposit", "investment_credit", "capital_investment", "add_investment"].indexOf(row.type) >= 0;
  });
  var withdrawalLedger = completed.filter(function(row) {
    return ["withdrawal", "withdrawal_paid", "withdrawal_debit", "redemption"].indexOf(row.type) >= 0;
  });
  var paidWithdrawals = withdrawals.filter(function(row) { return row.status === "paid" && !row.readOnly; });
  var recordedInvestments = investments.filter(function(row) {
    return ["active", "closed", "matured", "completed", "posted", "paid", "settled"].indexOf(row.status) >= 0
      || (history && history.preferInvestmentMaster && row.statusProvided === false && row.clientId && row.startDate);
  });
  var recordedWithdrawals = ((history && history.withdrawalHistory) || []).filter(function(row) {
    return ["recorded", "paid", "withdrawn", "completed", "posted", "settled", "success", "successful"].indexOf(row.status) >= 0
      || (row.status === "approved" && row.recordSource === "withdrawal_master" && row.readOnly === true);
  });
  var useInvestmentRecords = !!(history && history.preferInvestmentMaster && recordedInvestments.some(function(row) { var date = adminCalendarDay(row.startDate); return date && date <= today && row.principalAmount > 0; }));
  var investmentSource = useInvestmentRecords ? "investment_master" : investmentLedger.length ? "transaction_ledger" : "investment_records";
  var withdrawalSelection = adminWithdrawalPoints(recordedWithdrawals, withdrawalLedger, paidWithdrawals, today, warnings);
  var withdrawalSource = withdrawalSelection.source;
  var investmentPoints = !useInvestmentRecords && investmentLedger.length ? investmentLedger.map(function(row) {
    return { date: row.date, amount: Math.max(row.credit - row.debit, 0), clientId: row.clientId };
  }) : recordedInvestments.map(function(row) { return { date: row.startDate, amount: row.principalAmount, clientId: row.clientId }; });
  var withdrawalPoints = withdrawalSelection.points;
  var investmentDays = adminDailyAmounts(investmentPoints, today, "investment", warnings);
  var withdrawalDays = adminDailyAmounts(withdrawalPoints, today, "paid withdrawal", warnings);
  var eligible = investments.filter(function(row) {
    var start = adminCalendarDay(row.startDate);
    var maturity = adminCalendarDay(row.maturityDate);
    var nextPayout = adminCalendarDay(row.nextPayoutDate);
    var funded = row.status === "active" || (history && history.preferInvestmentMaster && row.statusProvided === false && row.clientId && start);
    return funded && (!start || start <= monthEnd) && (!maturity || maturity >= monthStart)
      && (!nextPayout || nextPayout.slice(0, 7) === month);
  });
  var dashboardPayoutRows = (history && history.dashboardRows) || [];
  var useDashboardPayout = dashboardPayoutRows.some(function(row) { return row.monthlyPayout !== undefined; });
  if (useDashboardPayout) eligible = dashboardPayoutRows.filter(function(row) { return normalizeText(row.clientId) !== ""; }).map(function(row) {
    return { clientId: row.clientId, monthlyReturn: row.monthlyPayout };
  });
  var missing = 0;
  var estimate = 0;
  eligible.forEach(function(row) {
    if (typeof row.monthlyReturn !== "number" || !isFinite(row.monthlyReturn) || row.monthlyReturn < 0
      || (row.payoutFrequency && ["monthly", "month", "every_month"].indexOf(row.payoutFrequency) < 0)) {
      missing += 1;
    } else {
      estimate += row.monthlyReturn;
    }
  });
  if (useDashboardPayout && !eligible.length) missing += 1;
  if (!useDashboardPayout && !investments.length && totalInvested > 0) {
    missing += 1;
    warnings.push("Investment payout terms are missing for the recorded invested balance.");
  }
  if (missing) warnings.push(useDashboardPayout ? "The current-month payout estimate is unavailable because DASHBOARD Monthly Payout contains missing/invalid amounts or client IDs." : "The current-month payout estimate is unavailable because payout amounts or frequency are missing or unsupported. Generic ROI is not assumed to be monthly or annual.");
  var payoutLedger = completed.filter(function(row) {
    return ["payout", "interest", "interest_credit", "monthly_return", "monthly_payout"].indexOf(row.type) >= 0;
  });
  var payoutDays = adminDailyAmounts(payoutLedger.map(function(row) {
    return { date: row.date, amount: row.credit - row.debit };
  }), today, "payout", warnings, true);
  var payoutRemainder = buildAdminPayoutRemainder(eligible, payoutLedger, missing ? null : Math.round(estimate * 100) / 100, now, warnings, history && history.clients, history && history.preferInvestmentMaster ? investments : []);
  var portfolioEvents = investmentPoints.concat(withdrawalPoints.map(function(row) {
    return { date: row.date, amount: -row.amount, clientId: row.clientId };
  }), payoutLedger.map(function(row) { return { date: row.date, amount: row.credit - row.debit, clientId: row.clientId }; }),
  completed.filter(function(row) { return ["adjustment", "referral", "bonus", "fee", "charge"].indexOf(row.type) >= 0; }).map(function(row) {
    return { date: row.date, amount: row.credit - row.debit, clientId: row.clientId };
  }));
  var portfolioHistory = buildAdminPortfolioHistory(portfolioEvents, completed, now, warnings);
  return {
    asOf: now.toISOString(), currentYear: Number(today.slice(0, 4)), currentMonth: Number(today.slice(5, 7)),
    investmentSource: investmentSource, withdrawalSource: withdrawalSource,
    payoutScheduleSource: useDashboardPayout ? "dashboard" : "investment_records",
    investmentMonths: adminMonthlyAmounts(investmentDays), withdrawalMonths: adminMonthlyAmounts(withdrawalDays),
    payoutMonths: adminMonthlyAmounts(payoutDays),
    portfolioHistoryMonths: portfolioHistory.months,
    portfolioHistorySource: portfolioHistory.source,
    withdrawalDays: withdrawalDays, warnings: warnings,
    estimatedMonthlyPayout: missing ? null : Math.round(estimate * 100) / 100,
    paidMonthlyPayout: payoutRemainder.paid,
    remainingMonthlyPayout: payoutRemainder.remaining,
    pendingPayouts: payoutRemainder.clients,
    pendingPayoutWarnings: payoutRemainder.warnings,
    payoutEstimateMissingRecords: missing,
    completedWithdrawalTotal: sum(withdrawalPoints, "amount"),
    recordedPayoutTotal: sum(payoutDays, "amount")
  };
}

function adminWithdrawalPoints(history, ledger, requests, today, warnings) {
  var groups = Object.create(null);
  function collect(rows, source, dateKey, amount) {
    var invalid = 0;
    rows.forEach(function(row) {
      var date = adminCalendarDay(row[dateKey]);
      if (!date) { invalid += 1; return; }
      if (date > today) return;
      var value = amount(row);
      if (!isFinite(value) || value <= 0) return;
      // Prefer one source per client and month, not a client's entire lifetime.
      var key = (normalizeText(row.clientId) || "__unlinked__") + "|" + date.slice(0, 7);
      if (!groups[key]) groups[key] = { withdrawal_master: [], transaction_ledger: [], paid_withdrawals: [] };
      groups[key][source].push({ date: date, amount: value, clientId: row.clientId });
    });
    if (invalid) warnings.push(String(invalid) + " " + source + " withdrawal records have missing or invalid dates and are excluded.");
  }
  collect(history, "withdrawal_master", "paymentDate", function(row) { return row.amount; });
  collect(ledger, "transaction_ledger", "date", function(row) { return row.debit - row.credit; });
  collect(requests, "paid_withdrawals", "paymentDate", function(row) { return row.amount; });
  var points = [];
  var sources = Object.create(null);
  Object.keys(groups).forEach(function(key) {
    var group = groups[key];
    var source = group.withdrawal_master.length ? "withdrawal_master" : group.transaction_ledger.length ? "transaction_ledger" : "paid_withdrawals";
    sources[source] = true;
    points = points.concat(group[source]);
  });
  var names = Object.keys(sources);
  return { points: points, source: names.length > 1 ? "combined_records" : names[0] || "paid_withdrawals" };
}

function adminPayoutPeriod(value) {
  var text = cleanString(value);
  var month = text.match(/^(\d{4})-(\d{1,2})$/);
  if (month) return Number(month[2]) >= 1 && Number(month[2]) <= 12 ? month[1] + "-" + ("0" + month[2]).slice(-2) : "";
  var day = adminCalendarDay(value);
  return day ? day.slice(0, 7) : "";
}

function buildAdminPayoutRemainder(eligible, payments, scheduled, now, warnings, clients, investments, targetPeriod) {
  var today = adminCalendarDay(now);
  var month = targetPeriod || today.slice(0, 7);
  var due = Object.create(null);
  var paid = Object.create(null);
  var clientIds = Object.create(null);
  var profiles = Object.create(null);
  var duplicateProfiles = Object.create(null);
  var detailWarnings = [];
  var missingClient = false;
  var invalidPayment = false;
  eligible.forEach(function(row) {
    var clientId = normalizeText(row.clientId);
    if (!clientId) { missingClient = true; return; }
    clientIds[clientId] = cleanString(row.clientId);
    due[clientId] = (due[clientId] || 0) + (row.monthlyReturn || 0);
  });
  (clients || []).forEach(function(row) {
    var clientId = normalizeText(row.clientId);
    if (!clientId) return;
    if (profiles[clientId]) duplicateProfiles[clientId] = true;
    profiles[clientId] = row;
  });
  payments.forEach(function(row) {
    if (!adminTransactionPosted(row)) return;
    var date = adminCalendarDay(row.date);
    if (!date) { invalidPayment = true; return; }
    if (date > today) return;
    var period = row.payoutPeriodProvided ? row.payoutPeriod : date.slice(0, 7);
    if (!period) { invalidPayment = true; return; }
    if (period !== month) return;
    var clientId = normalizeText(row.clientId);
    if (!clientId) { invalidPayment = true; return; }
    paid[clientId] = (paid[clientId] || 0) + row.credit - row.debit;
  });
  var paidTotal = Object.keys(paid).reduce(function(total, clientId) { return total + Math.max(paid[clientId], 0); }, 0);
  var remaining = Object.keys(due).reduce(function(total, clientId) { return total + Math.max(due[clientId] - Math.max(paid[clientId] || 0, 0), 0); }, 0);
  if (missingClient || invalidPayment) warnings.push("Monthly payout remainder is unavailable: a schedule or completed payout has a missing client ID, payment date, or invalid payout period.");
  var unapplied = Object.keys(paid).reduce(function(total, clientId) { return total + Math.max(paid[clientId] - (due[clientId] || 0), 0); }, 0);
  var unappliedAmount = Math.round(unapplied * 100) / 100;
  if (unappliedAmount > 0) warnings.push("INR " + unappliedAmount + " of recorded payouts exceeds or has no matching client schedule " + (targetPeriod ? "for " + targetPeriod : "this month") + "; it does not reduce other clients' remaining payouts.");
  var remainderAvailable = scheduled !== null && !missingClient && !invalidPayment;
  var pendingClients = remainderAvailable ? Object.keys(due).map(function(clientId) {
    var recorded = Math.max(paid[clientId] || 0, 0);
    var unpaid = Math.round(Math.max(due[clientId] - recorded, 0) * 100) / 100;
    if (unpaid <= 0) return null;
    var profile = !duplicateProfiles[clientId] && profiles[clientId];
    var dueDate = profile ? adminPayoutDueDate(profile.payoutDate, month) : null;
    var hasNewFunding = (investments || []).some(function(row) {
      var date = adminCalendarDay(row.startDate);
      return normalizeText(row.clientId) === clientId && date && date.slice(0, 7) === month && date <= today
        && (row.statusProvided === false || ["active", "closed", "matured", "completed", "posted", "paid", "settled"].indexOf(row.status) >= 0);
    });
    var nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 7);
    var nextScheduledDate = hasNewFunding && profile ? adminPayoutDueDate(profile.payoutDate, nextMonth) : null;
    if (!dueDate) detailWarnings.push("Confirm CLIENTS Date of payout for " + clientIds[clientId] + "; a current-month due date could not be verified.");
    return {
      clientId: profile && cleanString(profile.clientId) || clientIds[clientId],
      clientName: profile && cleanString(profile.fullName) || "",
      period: month,
      scheduledAmount: Math.round(due[clientId] * 100) / 100,
      recordedAmount: Math.round(recorded * 100) / 100,
      remainingAmount: unpaid,
      dueDate: hasNewFunding ? null : dueDate,
      nextScheduledDate: nextScheduledDate,
      note: hasNewFunding ? "New funding this month can contribute next-cycle amounts to the current run-rate estimate. Confirm the cycle balance before treating it as overdue." : "",
      dueStatus: hasNewFunding ? "review_required" : !dueDate ? "date_unavailable" : dueDate < today ? "overdue" : dueDate === today ? "due_today" : "upcoming"
    };
  }).filter(function(row) { return row !== null; }).sort(function(a, b) {
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || a.clientId.localeCompare(b.clientId);
  }) : null;
  var remainingTotal = remainderAvailable ? Math.round(remaining * 100) / 100 : null;
  if (pendingClients && Math.abs(sum(pendingClients, "remainingAmount") - remainingTotal) >= 0.01) {
    detailWarnings.push("Per-client amounts rounded to paise differ from the aggregate remainder. Reconcile source precision before making payments.");
  }
  return { paid: invalidPayment ? null : Math.round(paidTotal * 100) / 100, remaining: remainingTotal, clients: pendingClients, warnings: detailWarnings };
}

function adminPayoutDueDate(value, month) {
  var schedule = clientPayoutDate(value);
  if (typeof schedule !== "string") return null;
  if (/^\d{1,2}$/.test(schedule)) {
    var year = Number(month.slice(0, 4));
    var monthNumber = Number(month.slice(5, 7));
    var lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return month + "-" + ("0" + Math.min(Number(schedule), lastDay)).slice(-2);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(schedule) && schedule.slice(0, 7) === month ? schedule : null;
}

function applyAdminPayoutCalendar(analytics, investments, transactions, withdrawalHistory, clients, now, nativeMaster, dashboardRows) {
  var today = adminCalendarDay(now);
  var month = today.slice(0, 7);
  var nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 7);
  var warnings = [];
  var profiles = Object.create(null);
  var duplicates = Object.create(null);
  clients.forEach(function(row) {
    var id = normalizeText(row.clientId);
    if (profiles[id]) duplicates[id] = true;
    profiles[id] = row;
  });
  var funded = investments.filter(function(row) {
    var start = adminCalendarDay(row.startDate);
    return row.clientId && start && start <= today && row.principalAmount > 0
      && (row.statusProvided === false || row.status === "active");
  });
  var incomplete = !nativeMaster;
  investments.forEach(function(row) { if (row.principalAmount > 0 && (!row.clientId || !adminCalendarDay(row.startDate))) incomplete = true; });
  (dashboardRows || []).forEach(function(row) {
    if (row.monthlyPayout > 0 && !funded.some(function(investment) { return normalizeText(investment.clientId) === normalizeText(row.clientId); })) incomplete = true;
  });
  funded.forEach(function(row) {
    var id = normalizeText(row.clientId);
    if (typeof row.monthlyPayoutRate !== "number" || !isFinite(row.monthlyPayoutRate) || row.monthlyPayoutRate < 0 || duplicates[id] || !profiles[id]
      || !adminPayoutDueDate(profiles[id].payoutDate, month) || !adminPayoutDueDate(profiles[id].payoutDate, nextMonth)) incomplete = true;
  });
  var history = withdrawalHistory.filter(function(row) {
    return row.readOnly === true && row.recordSource === "withdrawal_master"
      && ["approved", "recorded", "paid", "withdrawn", "completed", "posted", "settled", "success", "successful"].indexOf(row.status) >= 0;
  });
  history.forEach(function(row) { if (row.amount > 0 && (!row.clientId || !adminCalendarDay(row.paymentDate))) incomplete = true; });
  analytics.payoutCalendarReady = false;
  analytics.pendingPayouts = null;
  analytics.upcomingPayouts = null;
  analytics.upcomingPayoutAmount = null;
  analytics.upcomingPayoutPeriod = nextMonth;
  analytics.payoutCalendarWarnings = warnings;
  if (incomplete) {
    warnings.push("Cycle-specific payouts are unavailable: confirm Investment_Master monthly ROI terms, funded dates and unique CLIENTS payout dates. The old run-rate comparison is not a verified amount due.");
    return;
  }
  var payments = transactions.filter(function(row) { return ["payout", "interest", "interest_credit", "monthly_return", "monthly_payout"].indexOf(row.type) >= 0; });
  function periodBalance(period) {
    var due = Object.create(null);
    Object.keys(profiles).forEach(function(id) {
      if (duplicates[id]) return;
      var date = adminPayoutDueDate(profiles[id].payoutDate, period);
      if (!date) return;
      var principal = 0;
      var coupon = 0;
      funded.forEach(function(row) {
        if (normalizeText(row.clientId) !== id || row.startDate > date) return;
        principal += row.principalAmount;
        // The verified workbook starts each deposit's first payout in the following calendar month.
        if (row.startDate.slice(0, 7) < period && (!row.maturityDate || row.maturityDate >= date)) coupon += row.principalAmount * row.monthlyPayoutRate / 100;
      });
      var withdrawn = history.reduce(function(total, row) {
        var paidDate = adminCalendarDay(row.paymentDate);
        return normalizeText(row.clientId) === id && paidDate <= today && paidDate <= date ? total + row.amount : total;
      }, 0);
      due[id] = { clientId: profiles[id].clientId, monthlyReturn: principal ? coupon * Math.max(0, 1 - withdrawn / principal) : 0 };
    });
    var schedule = Object.keys(due).map(function(id) { return due[id]; });
    return { scheduled: sum(schedule, "monthlyReturn"), balance: buildAdminPayoutRemainder(schedule, payments, sum(schedule, "monthlyReturn"), now, warnings, clients, [], period) };
  }
  var current = periodBalance(month);
  var upcoming = periodBalance(nextMonth);
  if (current.balance.remaining === null || upcoming.balance.remaining === null) return;
  analytics.payoutCalendarReady = true;
  analytics.payoutScheduleSource = "investment_calendar";
  analytics.payoutEstimateMissingRecords = 0;
  analytics.estimatedMonthlyPayout = Math.round(current.scheduled * 100) / 100;
  analytics.paidMonthlyPayout = current.balance.paid;
  analytics.remainingMonthlyPayout = current.balance.remaining;
  analytics.pendingPayouts = current.balance.clients;
  analytics.upcomingPayouts = upcoming.balance.clients;
  analytics.upcomingPayoutAmount = upcoming.balance.remaining;
  analytics.pendingPayoutWarnings = current.balance.warnings.concat(upcoming.balance.warnings);
  analytics.warnings = analytics.warnings.filter(function(warning) {
    return warning.indexOf("of recorded payouts exceeds or has no matching client schedule this month;") < 0
      && warning.indexOf("The current-month payout estimate is unavailable") !== 0
      && warning !== "Investment payout terms are missing for the recorded invested balance.";
  }).concat(warnings);
}

function buildAdminPortfolioHistory(events, transactions, now, warnings) {
  var today = adminCalendarDay(now);
  var year = Number(today.slice(0, 4));
  var month = Number(today.slice(5, 7));
  var days = {};
  var invalid = 0;
  var hasBalances = false;
  events.forEach(function(row) {
    var day = adminCalendarDay(row.date);
    var clientId = normalizeText(row.clientId);
    if (!day || !clientId) { invalid += 1; return; }
    if (day > today || !isFinite(row.amount) || row.amount === 0) return;
    if (!days[day]) days[day] = { events: [], balances: {} };
    days[day].events.push({ clientId: clientId, amount: row.amount });
  });
  transactions.forEach(function(row) {
    var day = adminCalendarDay(row.date);
    var clientId = normalizeText(row.clientId);
    if (!day || day > today || !clientId || typeof row.balance !== "number" || !isFinite(row.balance)) return;
    if (!days[day]) days[day] = { events: [], balances: {} };
    days[day].balances[clientId] = row.balance;
    hasBalances = true;
  });
  var balances = {};
  var monthEnd = {};
  Object.keys(days).sort().forEach(function(day) {
    days[day].events.forEach(function(row) { balances[row.clientId] = (balances[row.clientId] || 0) + row.amount; });
    // A recorded closing balance replaces that client's reconstructed balance; it is not another credit.
    Object.keys(days[day].balances).forEach(function(clientId) { balances[clientId] = days[day].balances[clientId]; });
    var total = Object.keys(balances).reduce(function(amount, clientId) { return amount + balances[clientId]; }, 0);
    monthEnd[day.slice(0, 7)] = Math.round(total * 100) / 100;
  });
  var startMonth = new Date(Date.UTC(year, month - 24, 1)).toISOString().slice(0, 7);
  var opening = null;
  Object.keys(monthEnd).sort().forEach(function(key) { if (key < startMonth) opening = monthEnd[key]; });
  var points = [];
  for (var index = 0; index < 24; index++) {
    var key = new Date(Date.UTC(year, month - 24 + index, 1)).toISOString().slice(0, 7);
    if (monthEnd[key] !== undefined) opening = monthEnd[key];
    points.push({ month: key, amount: opening });
  }
  if (invalid) warnings.push(String(invalid) + " financial history records lack a usable date or client ID and are excluded from portfolio history.");
  return { months: points, source: Object.keys(monthEnd).length ? hasBalances ? "recorded_balances" : "recorded_cash_flow" : "current_snapshot" };
}

function reconcileAdminPortfolio(analytics, currentValue) {
  var points = analytics.portfolioHistoryMonths;
  if (analytics.portfolioHistorySource === "current_snapshot") {
    points[points.length - 1].amount = currentValue;
  }
  var calculated = points[points.length - 1].amount;
  var difference = Math.round((currentValue - calculated) * 100) / 100;
  analytics.portfolioReconciliation = { calculated: calculated, recorded: currentValue, difference: difference, matches: Math.abs(difference) < 0.01 };
  if (Math.abs(difference) >= 0.01) analytics.warnings.push("Recorded portfolio history differs from the current DASHBOARD total by INR " + difference + ". Historical values have not been adjusted to hide the difference.");
}

function adminDailyAmounts(points, today, label, warnings, signed) {
  var totals = {};
  var invalid = 0;
  points.forEach(function(row) {
    var day = adminCalendarDay(row.date);
    if (!day) { invalid += 1; return; }
    if (day > today || !isFinite(row.amount) || (signed ? row.amount === 0 : row.amount <= 0)) return;
    totals[day] = (totals[day] || 0) + row.amount;
  });
  if (invalid) warnings.push(String(invalid) + " " + label + " records have missing or invalid dates and are excluded from the dated charts.");
  return Object.keys(totals).sort().map(function(day) { return { date: day, amount: Math.round(totals[day] * 100) / 100 }; });
}

function adminMonthlyAmounts(days) {
  var totals = {};
  days.forEach(function(row) {
    var month = row.date.slice(0, 7);
    totals[month] = (totals[month] || 0) + row.amount;
  });
  return Object.keys(totals).sort().map(function(month) { return { month: month, amount: Math.round(totals[month] * 100) / 100 }; });
}

function mapAdminInvestment(row) {
  var result = mapInvestment(row);
  result.clientId = cleanString(first(row, ["Client ID", "Client Code", "Customer ID", "Investor ID"]));
  var sourceStatus = first(row, ["Status", "Investment Status"]);
  result.statusProvided = sourceStatus !== "";
  if (result.statusProvided) result.status = normalizeStatus(sourceStatus);
  result.principalAmount = adminMoney(first(row, ["Principal Amount", "Amount", "Invested Amount", "Investment Amount"]));
  result.currentValue = adminMoney(first(row, ["Current Value", "Portfolio Value"]));
  result.startDate = adminCalendarDay(first(row, ["Start Date", "Investment Date", "Invested Date", "Date of Investment", "Investment Start Date", "Date"]));
  result.maturityDate = adminCalendarDay(result.maturityDate);
  result.nextPayoutDate = adminCalendarDay(first(row, ["Next Payout Date", "Scheduled Payout Date"]));
  result.payoutFrequency = normalizeOptionalStatus(first(row, ["Payout Frequency", "Payment Frequency"]));
  var explicitMonthly = first(row, ["Monthly Return", "Monthly Payout", "Monthly Interest", "Monthly Payout Amount"]);
  var parsedMonthly = adminMoney(explicitMonthly, NaN);
  result.monthlyReturn = isFinite(parsedMonthly) ? parsedMonthly : undefined;
  var explicitMonthlyRate = adminMoney(first(row, ["Monthly ROI %", "Monthly ROI", "Monthly Return Rate %"]), NaN);
  result.monthlyPayoutRate = isFinite(explicitMonthlyRate) ? explicitMonthlyRate : undefined;
  return result;
}

function mapAdminWithdrawal(row) {
  var result = mapWithdrawal(row);
  result.status = normalizeOptionalStatus(first(row, ["Status", "Withdrawal Status", "Payment Status"])) || "pending";
  result.clientId = cleanString(first(row, ["Client ID", "Client Code", "Customer ID", "Investor ID"]));
  result.requestDate = adminCalendarDay(first(row, ["Request Date", "Requested Date", "Date"]));
  result.amount = adminMoney(first(row, ["Amount", "Requested Amount", "Withdrawal Amount"]));
  result.paymentDate = adminCalendarDay(first(row, ["Payment Date", "Paid Date", "Withdrawal Date", "Paid On"]));
  return result;
}

function mapAdminWithdrawalHistory(row) {
  var result = mapAdminWithdrawal(row);
  result.paymentDate = adminCalendarDay(first(row, ["Payment Date", "Paid Date", "Paid On", "Withdrawal Date", "Withdraw Date", "Withdrawn Date", "Date of Withdrawal", "Withdrawal Dt", "Transaction Date", "Date"]));
  result.amount = adminMoney(first(row, ["Amount", "Withdrawal Amount", "Withdraw Amount", "Withdrawn Amount", "Withdrawal", "Debit", "Debit Amount"]));
  result.status = normalizeOptionalStatus(first(row, ["Status", "Payment Status", "Withdrawal Status"])) || "recorded";
  result.requestDate = adminCalendarDay(first(row, ["Request Date", "Requested Date"]));
  result.recordSource = "withdrawal_master";
  result.readOnly = true;
  return result;
}

function adminMoney(value, invalidValue) {
  var fallback = arguments.length > 1 ? invalidValue : 0;
  if (typeof value === "number") return isFinite(value) ? value : fallback;
  var text = cleanString(value).replace(/^(?:INR|Rs\.?)\s*/i, "").replace(/[\u20b9,\s]/g, "");
  if (/^\(\d+(?:\.\d+)?\)$/.test(text)) text = "-" + text.slice(1, -1);
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : fallback;
}

function mapAdminTransaction(row) {
  var result = mapTransaction(row);
  result.clientId = cleanString(first(row, ["Client ID", "Client Code", "Customer ID", "Investor ID", "Client"]));
  result.date = adminCalendarDay(first(row, ["Date", "Transaction Date", "Txn Date", "Value Date"]));
  result.type = adminTransactionType(first(row, ["Type", "Transaction Type", "Transaction", "Txn Type", "Transaction Category"]));
  result.status = normalizeStatus(first(row, ["Status", "Transaction Status", "Posting Status"]) || "completed");
  var payoutPeriod = first(row, ["Payout Period", "Payout Month", "For Month", "Accrual Month"]);
  result.payoutPeriodProvided = payoutPeriod !== "";
  result.payoutPeriod = payoutPeriod === "" ? "" : adminPayoutPeriod(payoutPeriod);
  var credit = first(row, ["Credit", "Credit Amount", "Amount Credit", "Cr"]);
  var debit = first(row, ["Debit", "Debit Amount", "Amount Debit", "Dr"]);
  var amount = first(row, ["Amount", "Transaction Amount", "Value"]);
  if (amount === "" && ["payout", "interest", "interest_credit", "monthly_return", "monthly_payout"].indexOf(result.type) >= 0) {
    amount = first(row, ["Payout Amount", "Interest Amount", "Monthly Payout Amount", "Payout", "Interest"]);
  }
  if (credit !== "") result.credit = adminMoney(credit);
  if (debit !== "") result.debit = adminMoney(debit);
  var balance = first(row, ["Balance", "Running Balance", "Closing Balance", "Net Balance"]);
  var parsedBalance = adminMoney(balance, NaN);
  result.balance = isFinite(parsedBalance) ? parsedBalance : undefined;
  if (credit === "" && debit === "" && amount !== "") {
    if (["investment", "deposit", "investment_credit", "capital_investment", "add_investment", "payout", "interest", "interest_credit", "monthly_return", "monthly_payout", "referral", "bonus"].indexOf(result.type) >= 0) result.credit = adminMoney(amount);
    if (["withdrawal", "withdrawal_paid", "withdrawal_debit", "redemption", "fee", "charge"].indexOf(result.type) >= 0) result.debit = adminMoney(amount);
  }
  result.netAmount = result.credit - result.debit;
  return result;
}

function adminTransactionType(value) {
  var type = normalizeOptionalStatus(value).replace(/-/g, "_");
  var aliases = {
    withdraw: "withdrawal", withdrawal_payment: "withdrawal", capital_withdrawal: "withdrawal", withdrawl: "withdrawal",
    payout_credit: "payout", interest_payout: "payout", monthly_interest: "monthly_payout", interest_payment: "payout"
  };
  return Object.prototype.hasOwnProperty.call(aliases, type) ? aliases[type] : type || "pending";
}

function mapAdminProfile(row) {
  var result = mapProfile(row);
  result.registrationDate = adminCalendarDay(first(row, ["Registration Date", "Created Date", "Created At", "Joining Date", "Account Opening Date", "Registered On"]));
  return result;
}

function adminSourceWarnings(module, headers) {
  var requirements = {
    investments: [["investment date", "Start Date", "Investment Date", "Invested Date", "Date of Investment", "Investment Start Date", "Date"], ["principal", "Principal Amount", "Amount", "Invested Amount", "Investment Amount"]],
    transactions: [["transaction date", "Date", "Transaction Date", "Txn Date", "Value Date"], ["transaction type", "Type", "Transaction Type", "Transaction", "Txn Type", "Transaction Category"], ["amount", "Credit", "Credit Amount", "Amount Credit", "Cr", "Debit", "Debit Amount", "Amount Debit", "Dr", "Amount", "Transaction Amount", "Value", "Payout Amount", "Interest Amount", "Monthly Payout Amount", "Payout", "Interest"]],
    withdrawals: [["withdrawal amount", "Amount", "Requested Amount", "Withdrawal Amount"], ["payment date", "Payment Date", "Paid Date", "Withdrawal Date", "Paid On"]],
    withdrawal_history: [["withdrawal date", "Payment Date", "Paid Date", "Paid On", "Withdrawal Date", "Withdraw Date", "Withdrawn Date", "Date of Withdrawal", "Withdrawal Dt", "Transaction Date", "Date"], ["withdrawal amount", "Amount", "Withdrawal Amount", "Withdraw Amount", "Withdrawn Amount", "Withdrawal", "Debit", "Debit Amount"]],
    clients: [["registration date", "Registration Date", "Created Date", "Created At", "Joining Date", "Account Opening Date", "Registered On"]]
  };
  return (requirements[module] || []).filter(function(aliases) { return findHeaderIndex(headers, aliases.slice(1)) < 0; }).map(function(aliases) {
    return "Missing " + aliases[0] + " column.";
  });
}

function addAdminOverviewSeries(analytics, clients, investments, transactions, withdrawals, dashboardRows) {
  var today = adminCalendarDay(new Date(analytics.asOf));
  var completed = transactions.filter(adminTransactionPosted);
  var dated = completed.filter(function(row) { return row.date && row.date <= today; });
  var flow = {};
  var creditDebit = {};
  dated.forEach(function(row) {
    var month = row.date.slice(0, 7);
    flow[month] = (flow[month] || 0) + row.credit - row.debit;
    if (!creditDebit[month]) creditDebit[month] = { month: month, credit: 0, debit: 0, net: 0, count: 0 };
    creditDebit[month].credit += row.credit;
    creditDebit[month].debit += row.debit;
    creditDebit[month].count += 1;
  });
  analytics.transactionFlowMonths = Object.keys(creditDebit).sort().map(function(month) {
    var row = creditDebit[month];
    row.credit = Math.round(row.credit * 100) / 100;
    row.debit = Math.round(row.debit * 100) / 100;
    row.net = Math.round((row.credit - row.debit) * 100) / 100;
    return row;
  });
  if (completed.some(function(row) { return !row.date; })) analytics.warnings.push("Completed transactions with missing or invalid dates are excluded from monthly transaction flow.");
  analytics.transactionMonths = Object.keys(flow).sort().map(function(month) { return { month: month, amount: Math.round(flow[month] * 100) / 100 }; });
  var running = 0;
  analytics.portfolioMonths = analytics.transactionMonths.map(function(row) {
    running += row.amount;
    return { month: row.month, amount: Math.round(running * 100) / 100 };
  });
  analytics.portfolioGrowthSource = "transaction_ledger";
  if (!analytics.portfolioMonths.length) {
    analytics.portfolioGrowthSource = "investment_records";
    analytics.portfolioMonths = analytics.investmentMonths.map(function(row) {
      running += row.amount;
      return { month: row.month, amount: Math.round(running * 100) / 100 };
    });
  }
  if (!analytics.portfolioMonths.length && dashboardRows.length) {
    analytics.portfolioGrowthSource = "current_snapshot";
    analytics.portfolioMonths = [{ month: today.slice(0, 7), amount: sum(dashboardRows, "currentPortfolioValue") }];
  }
  var groups = {};
  var valuedInvestments = investments.filter(function(row) { return row.currentValue > 0 || row.principalAmount > 0; });
  var completeValuations = valuedInvestments.length && valuedInvestments.every(function(row) { return row.currentValue > 0; });
  var useDashboardValues = !completeValuations && dashboardRows.some(function(row) { return row.currentPortfolioValue > 0; });
  analytics.portfolioDistributionSource = useDashboardValues ? "dashboard_clients" : "investment_records";
  analytics.portfolioDistributionBasis = useDashboardValues ? "current_portfolio" : completeValuations ? "current_value" : "principal";
  if (useDashboardValues) {
    dashboardRows.forEach(function(row) { groups[row.clientId || "Unassigned"] = (groups[row.clientId || "Unassigned"] || 0) + row.currentPortfolioValue; });
  } else {
    valuedInvestments.forEach(function(row) {
      var category = row.category || row.plan || "Unassigned";
      groups[category] = (groups[category] || 0) + (completeValuations ? row.currentValue : row.principalAmount);
    });
  }
  analytics.portfolioDistribution = Object.keys(groups).filter(function(name) { return groups[name] > 0; }).map(function(name) { return { name: name, amount: Math.round(groups[name] * 100) / 100 }; });
  var registered = clients.filter(function(row) { return row.registrationDate && row.registrationDate <= today; });
  var registrations = {};
  registered.forEach(function(row) {
    var month = row.registrationDate.slice(0, 7);
    registrations[month] = (registrations[month] || 0) + 1;
  });
  analytics.registrationMonths = Object.keys(registrations).sort().map(function(month) { return { month: month, count: registrations[month] }; });
  var statuses = {};
  withdrawals.forEach(function(row) { statuses[row.status] = (statuses[row.status] || 0) + row.amount; });
  analytics.withdrawalStatus = Object.keys(statuses).map(function(status) { return { name: status, amount: Math.round(statuses[status] * 100) / 100 }; });
  var excluded = {};
  transactions.filter(function(row) { return !adminTransactionPosted(row); }).forEach(function(row) { excluded[row.status] = (excluded[row.status] || 0) + 1; });
  analytics.excludedTransactionStatuses = excluded;
  if (transactions.length && !dated.length) analytics.warnings.push("No completed transactions have usable dates. Check transaction status, date headers, and the selected source tab.");
}

function getClients(payload) {
  return readModule(payload, ["CLIENTS", "Client", "Clients", "Profile"], payload.role === "admin" ? mapAdminProfile : mapProfile, false, payload.role === "admin" ? "clients" : "");
}

function getClient(payload) {
  return byId(getClients(payload), payload.id, "clientId");
}

function createClient(payload) {
  var spreadsheet = getSpreadsheet(payload);
  var clientsSheet = requireSheet(spreadsheet, ["CLIENTS", "Client", "Clients", "Profile"]);
  var credentialsSheet = findSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  var clientId = cleanString(payload.clientId || payload.ClientId || payload["Client ID"] || payload["ClientId"]);
  if (!clientId) clientId = nextClientId([clientsSheet, credentialsSheet]);
  var clientPayload = clonePayload(payload, {
    ClientId: clientId,
    clientId: clientId,
    Role: payload.role || payload.Role || "client",
    Status: payload.status || payload.Status || "active"
  });
  var created = appendRecord(clientPayload, ["CLIENTS", "Client", "Clients", "Profile"], clientPayload);
  if (cleanString(first(clientPayload, passwordHeaders()) || clientPayload.password)) {
    upsertCredentialFromClient(clientPayload, clientPayload, cleanString(first(clientPayload, passwordHeaders()) || clientPayload.password));
  }
  return created;
}

function updateClient(payload) {
  var updated = updateRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], "ClientId", payload.id || payload.clientId, payload);
  if (cleanString(first(payload, passwordHeaders()) || payload.password)) {
    upsertCredentialFromClient(payload, payload, cleanString(first(payload, passwordHeaders()) || payload.password));
  }
  return updated;
}

function getProfile(payload) {
  var rows = readModule(payload, ["CLIENTS", "Client", "Clients", "Profile"], mapProfile, true);
  return rows[0] ? attachProfilePhotoPreview(rows[0], payload) : null;
}

function updateProfile(payload) {
  return updateRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], "ClientId", payload.clientId, payload);
}

function getInvestments(payload) {
  return readModule(payload, ["Investment_Master", "Investment Master", "Investment", "Investments", "INVESTMENT_PLANS"], mapAdminInvestment, true, payload.role === "admin" ? "investments" : "", true);
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
  var transactions = readModule(payload, ["Transaction_Register", "Transaction Register", "Raw_Transactions", "Raw Transactions", "TRANSACTIONS", "Transaction", "Transactions", "Ledger"], mapAdminTransaction, true, payload.role === "admin" ? "transactions" : "", true);
  if (!transactions.length) return transactions;
  var clients = readModule(payload, ["CLIENTS", "Client", "Clients", "Profile"], function(row) {
    return { clientId: first(row, ["Client ID", "Client Code", "Customer ID", "Investor ID"]), payoutDate: clientPayoutDate(first(row, ["Date of payout", "Payout Date", "Scheduled Payout Date"])) };
  }, true);
  var dates = Object.create(null);
  clients.forEach(function(client) {
    var key = normalizeText(client.clientId);
    if (!key) return;
    // Conflicting duplicate client schedules are unavailable, never chosen arbitrarily.
    if (Object.prototype.hasOwnProperty.call(dates, key) && dates[key] !== client.payoutDate) dates[key] = null;
    else dates[key] = client.payoutDate;
  });
  transactions.forEach(function(row) {
    var key = normalizeText(row.clientId);
    if (Object.prototype.hasOwnProperty.call(dates, key)) row.scheduledPayoutDate = dates[key] === undefined ? "" : dates[key];
  });
  return transactions;
}

function getTransaction(payload) {
  return byId(getTransactions(payload), payload.id, "id");
}

function createTransaction(payload) {
  return appendRecord(payload, ["TRANSACTIONS", "Transaction", "Transactions", "Ledger"], payload, ["TxId", "Reference"]);
}

function getWithdrawals(payload) {
  if (payload.role !== "admin" && !normalizeText(payload.clientId)) throw coded("INVALID_CLIENT_ID", "A client session is required");
  var requests = readModule(payload, ["Withdrawals", "Withdrawal"], mapAdminWithdrawal, true, payload.role === "admin" ? "withdrawals" : "", true);
  var history = payload.role === "admin" ? readAdminWithdrawalHistory(payload)
    : readClientWithdrawalHistory(payload);
  // Only a matching client and explicit record ID establish the same record across tabs.
  // Matching by amount/date could erase two legitimate withdrawals.
  var requestIds = Object.create(null);
  requests.forEach(function(row) { if (row.id && row.clientId) requestIds[normalizeText(row.clientId) + "|" + normalizeText(row.id)] = true; });
  return sortRowsByDate(requests.concat(history.filter(function(row) {
    return !row.id || !row.clientId || !requestIds[normalizeText(row.clientId) + "|" + normalizeText(row.id)];
  }))).reverse();
}

function readClientWithdrawalHistory(payload) {
  var key = normalizeText(payload.clientId);
  if (payload.role !== "client" || !key) throw coded("INVALID_CLIENT_ID", "A client session is required");
  if (DASHBOARD_READ_CONTEXT && DASHBOARD_READ_CONTEXT.clientWithdrawalHistory && DASHBOARD_READ_CONTEXT.clientWithdrawalHistory[key]) return DASHBOARD_READ_CONTEXT.clientWithdrawalHistory[key];
  var rows = readModule(payload, ["Withdrawal_Master", "Withdrawal Master"], mapAdminWithdrawalHistory, true, "", true);
  if (DASHBOARD_READ_CONTEXT) {
    if (!DASHBOARD_READ_CONTEXT.clientWithdrawalHistory) DASHBOARD_READ_CONTEXT.clientWithdrawalHistory = Object.create(null);
    DASHBOARD_READ_CONTEXT.clientWithdrawalHistory[key] = rows;
  }
  return rows;
}

function readAdminWithdrawalHistory(payload) {
  if (payload.role !== "admin") throw coded("FORBIDDEN", "Administrator access is required");
  if (DASHBOARD_READ_CONTEXT && DASHBOARD_READ_CONTEXT.withdrawalHistory) return DASHBOARD_READ_CONTEXT.withdrawalHistory;
  var rows = readModule(payload, ["Withdrawal_Master", "Withdrawal Master"], mapAdminWithdrawalHistory, false, "withdrawal_history");
  if (DASHBOARD_READ_CONTEXT) DASHBOARD_READ_CONTEXT.withdrawalHistory = rows;
  return rows;
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
  var updates = {
    Status: status,
    "Approval Date": new Date(),
    "Payment Reference": payload.paymentReference,
    "Admin Remarks": payload.adminRemarks
  };
  if (status === "paid") updates["Payment Date"] = new Date();
  return updateRecord(payload, ["Withdrawals", "Withdrawal"], "Withdrawal ID", payload.id, updates);
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

function repairDocumentClientIds(payload) {
  var sheet = requireSheet(getSpreadsheet(payload), ["DOCUMENTS", "Documents", "Document", "Docs"]);
  var headers = getHeaders(sheet);
  ensureHeaders(sheet, ["ClientId", "Client ID", "CLIENT_ID"]);
  headers = getHeaders(sheet);
  var clientIndexes = ["ClientId", "Client ID", "CLIENT_ID"].map(function(header) {
    return findHeaderIndex(headers, [header]);
  }).filter(function(index) { return index >= 0; });
  var fileIndex = findHeaderIndex(headers, ["FileName", "File Name"]);
  var nameIndex = findHeaderIndex(headers, ["Name", "Document Name"]);
  var rows = sheet.getDataRange().getValues();
  var repaired = 0;
  for (var i = 1; i < rows.length; i++) {
    var hasClientId = clientIndexes.some(function(index) { return cleanString(rows[i][index]); });
    if (hasClientId) continue;
    var source = cleanString(fileIndex >= 0 ? rows[i][fileIndex] : "") || cleanString(nameIndex >= 0 ? rows[i][nameIndex] : "");
    var match = source.match(/(K(?:WM|MW|W)[-_]?\d+)/i);
    if (!match) continue;
    var clientId = match[1].replace(/[-_]/g, "").toUpperCase();
    clientIndexes.forEach(function(index) {
      sheet.getRange(i + 1, index + 1).setValue(clientId);
    });
    repaired += 1;
  }
  audit(payload || {}, "repairDocumentClientIds", sheet.getName(), String(repaired));
  return { repaired: repaired };
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

function dashboardColumnAmount(row, header) {
  if (findHeaderIndex(Object.keys(row), [header]) < 0) return undefined;
  var amount = adminMoney(first(row, [header]), NaN);
  return isFinite(amount) ? amount : null;
}

function dashboardColumnTotal(rows, key) {
  if (!rows.length || rows.every(function(row) { return row[key] === undefined; })) return undefined;
  var clients = rows.filter(function(row) { return normalizeText(row.clientId) !== ""; });
  if (!clients.length || clients.some(function(row) { return typeof row[key] !== "number" || !isFinite(row[key]); })) return null;
  return Math.round(sum(clients, key) * 100) / 100;
}

function mapDashboard(row) {
  return {
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    totalInvestedAmount: number(first(row, ["Total Invested"])),
    totalReturns: number(first(row, ["Total Payout"])),
    walletBalance: number(first(row, ["Net Portfolio"])),
    referralEarnings: number(first(row, ["Total Referral"])),
    totalWithdrawal: number(first(row, ["Total Withdrawal"])),
    presentInvestment: dashboardColumnAmount(row, "Present Investment"),
    monthlyPayout: dashboardColumnAmount(row, "Monthly Payout"),
    clientTotals: {
      totalInvestment: dashboardColumnAmount(row, "Total Invested"),
      totalWithdrawal: dashboardColumnAmount(row, "Total Withdrawal"),
      totalPayout: dashboardColumnAmount(row, "Total Payout"),
      totalPortfolio: dashboardColumnAmount(row, "Net Portfolio")
    },
    currentPortfolioValue: number(first(row, ["Net Portfolio"]))
  };
}

function buildAdminClientSummaries(rows) {
  var groups = Object.create(null);
  rows.forEach(function(row) {
    var key = normalizeText(row.clientId);
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ clientId: row.clientId, totals: row.clientTotals });
  });
  return Object.keys(groups).map(function(key) {
    var records = groups[key];
    var summary = { clientId: records[0].clientId };
    ["totalInvestment", "totalWithdrawal", "totalPayout", "totalPortfolio"].forEach(function(field) {
      var invalid = records.some(function(row) { return !row.totals || typeof row.totals[field] !== "number" || !isFinite(row.totals[field]); });
      summary[field] = invalid ? null : Math.round(records.reduce(function(total, row) { return total + row.totals[field]; }, 0) * 100) / 100;
    });
    return summary;
  });
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
      pending: withdrawals.filter(function(row) { return row.status === "pending" && !row.readOnly; }).length,
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
      duration: cleanString(first(row, ["Duration", "Tenure", "Duration Text", "Duration/Term", "Term", "Period", "Lock-in Period", "Lock In Period", "Plan Duration", "Investment Duration"])),
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
  if (row.readOnly || row.status !== "pending") throw coded("WITHDRAWAL_CANCEL_NOT_ALLOWED", "Only pending portal withdrawal requests can be cancelled");
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
    ClientId: payload.clientId,
    "Client ID": payload.clientId,
    CLIENT_ID: payload.clientId,
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

function downloadClientDocument(payload) {
  requireFields(payload, ["id"]);
  var existing = byId(getClientDocuments(payload), payload.id, "id");
  var fileId = existing.fileId || extractDriveFileId(existing.driveUrl);
  if (!fileId) throw coded("DOCUMENT_FILE_NOT_FOUND", "The selected document does not have a Google Drive file ID");
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  logClientActivity(clonePayload(payload, { actionName: "downloadClientDocument", recordId: payload.id }));
  return {
    documentId: existing.id,
    fileId: file.getId(),
    fileName: existing.fileName || file.getName(),
    mimeType: existing.mimeType || blob.getContentType(),
    fileSize: existing.fileSize || file.getSize(),
    base64Data: Utilities.base64Encode(blob.getBytes())
  };
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
    ProfilePhotoUrl: upload.fileUrl,
    "Profile Photo File ID": upload.fileId,
    ProfilePhotoFileId: upload.fileId
  });
  logClientActivity(clonePayload(payload, { actionName: "uploadProfilePhoto", recordId: payload.clientId }));
  return clonePayload(upload, { profilePhotoPreviewUrl: driveImageDataUrl(upload.fileId) });
}

function removeProfilePhoto(payload) {
  upsertClientRecord(payload, ["CLIENTS", "Client", "Clients", "Profile"], ["ClientId", "Client ID", "CLIENT_ID"], payload.clientId, {
    ClientId: payload.clientId,
    "Client ID": payload.clientId,
    "Profile Photo URL": "",
    ProfilePhotoUrl: "",
    "Profile Photo File ID": "",
    ProfilePhotoFileId: ""
  });
  logClientActivity(clonePayload(payload, { actionName: "removeProfilePhoto", recordId: payload.clientId }));
  return { removed: true };
}

function changeClientPassword(payload) {
  requireFields(payload, ["clientId", "currentPassword", "newPassword"]);
  if (cleanString(payload.newPassword).length < 6) throw coded("WEAK_PASSWORD", "New password must be at least 6 characters");
  var spreadsheet = getSpreadsheet(payload);
  var sheet = requireSheet(spreadsheet, ["CLIENT_CREDENTIALS", "Credentials", "Users"]);
  ensureHeaders(sheet, ["ClientId (Login ID)", "Password", "LastPasswordChange"]);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var loginIndex = findHeaderIndex(headers, ["ClientId (Login ID)", "Login ID", "LoginId", "User ID", "UserId", "ClientId", "Client ID", "CLIENT_ID"]);
  var passwordIndex = findHeaderIndex(headers, passwordHeaders());
  var changedIndex = findHeaderIndex(headers, ["LastPasswordChange", "Last Password Change", "Password Updated At"]);
  if (loginIndex < 0 || passwordIndex < 0) throw coded("MISSING_COLUMN", "CLIENT_CREDENTIALS requires login ID and Password columns");
  var targetRow = -1;
  for (var i = 1; i < values.length; i++) {
    if (normalizeLogin(values[i][loginIndex]) === normalizeLogin(payload.clientId)) targetRow = i + 1;
  }
  if (targetRow < 0) throw coded("CREDENTIAL_NOT_FOUND", "No CLIENT_CREDENTIALS row was found for this client");
  var storedPassword = values[targetRow - 1][passwordIndex];
  if (normalizePassword(storedPassword) !== normalizePassword(payload.currentPassword)) throw coded("PASSWORD_MISMATCH", "Current password is incorrect");
  sheet.getRange(targetRow, passwordIndex + 1).setValue(cleanString(payload.newPassword));
  if (changedIndex >= 0) sheet.getRange(targetRow, changedIndex + 1).setValue(new Date());
  syncClientPasswordColumn(payload, cleanString(payload.newPassword));
  audit(payload, "changeClientPassword", "CLIENT_CREDENTIALS", payload.clientId);
  return { updated: true, clientId: payload.clientId };
}

function syncClientPasswordColumn(payload, password) {
  var sheet = findSheet(getSpreadsheet(payload), ["CLIENTS", "Client", "Clients", "Profile"]);
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  if (!values.length) return;
  var headers = values[0].map(String);
  var clientIdIndex = findHeaderIndex(headers, ["ClientId", "Client ID", "CLIENT_ID", "ClientId (Login ID)"]);
  var passwordIndex = findHeaderIndex(headers, passwordHeaders());
  if (clientIdIndex < 0 || passwordIndex < 0) return;
  for (var i = 1; i < values.length; i++) {
    if (normalizeLogin(values[i][clientIdIndex]) === normalizeLogin(payload.clientId)) {
      sheet.getRange(i + 1, passwordIndex + 1).setValue(password);
      return;
    }
  }
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

function extractDriveFileId(url) {
  var text = cleanString(url);
  if (!text) return "";
  var patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match) return match[1];
  }
  return "";
}

function logClientActivity(payload) {
  var recordId = payload.recordId || "";
  var actionName = payload.actionName || "clientActivity";
  audit(payload, actionName, "Client Portal", recordId);
  return { logged: true };
}

function readModule(payload, sheetNames, mapper, scoped, adminModule, preferAliasOrder) {
  var sheet = findSheet(getSpreadsheet(payload), sheetNames, !!adminModule || !!preferAliasOrder);
  if (!sheet) {
    if (adminModule && DASHBOARD_READ_CONTEXT) DASHBOARD_READ_CONTEXT.sources.push({ module: adminModule, sheet: null, recordCount: 0, headers: [], warnings: ["No supported tab exists for " + adminModule + "."] });
    return [];
  }
  var clientScoped = scoped && payload.role !== "admin";
  var rows = clientScoped ? readRowsForClient(sheet, payload.clientId) : readRows(sheet);
  if (adminModule && DASHBOARD_READ_CONTEXT) {
    var headers = readDashboardSheetValues(sheet)[0] || [];
    DASHBOARD_READ_CONTEXT.sources.push({ module: adminModule, sheet: sheet.getName(), recordCount: rows.length, headers: headers.map(String), warnings: adminSourceWarnings(adminModule, headers) });
  }
  return rows.map(mapper);
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
    var row = headers.map(function(header) { return first(values, [header]); });
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
    profilePhotoUrl: profilePhotoUrlFromRow(row),
    profilePhotoFileId: first(row, ["Profile Photo File ID", "ProfilePhotoFileId", "Photo File ID", "GoogleDriveFileId", "Drive File ID"]),
    mobile: first(row, ["Mobile", "Phone"]),
    email: first(row, ["Email"]),
    dateOfBirth: first(row, ["Date of Birth", "DOB"]),
    payoutDate: clientPayoutDate(first(row, ["Date of payout", "Payout Date", "Scheduled Payout Date"])),
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

function clientPayoutDate(value) {
  if (value === undefined || value === null || cleanString(value) === "") return undefined;
  if (value instanceof Date) return adminCalendarDay(value) || null;
  var text = cleanString(value);
  var day = text.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?(?:each|every)\s+month)?$/i);
  if (day) return Number(day[1]) >= 1 && Number(day[1]) <= 31 ? String(Number(day[1])) : null;
  if (typeof value === "number" || /\b\d{4}\b/.test(text)) return adminCalendarDay(value) || null;
  return null;
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
  var credit = transactionAmount(row, "credit");
  var debit = transactionAmount(row, "debit");
  var balanceRaw = first(row, ["Balance", "Running Balance", "Closing Balance", "Net Balance"]);
  return {
    id: String(first(row, ["TxId", "Trx ID", "Transaction ID", "Txn ID", "TxnId", "ID"]) || ""),
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID", "Client"]) || ""),
    date: first(row, ["Date", "Transaction Date"]),
    type: normalizeStatus(first(row, ["Type", "Transaction Type", "Transaction"])),
    description: first(row, ["Description", "Particulars", "Narration", "Remarks"]),
    credit: credit,
    debit: debit,
    balance: balanceRaw === "" ? undefined : number(balanceRaw),
    reference: first(row, ["Reference", "Payment Reference", "UTR", "Ref No", "Ref"]),
    status: normalizeStatus(first(row, ["Status"]) || "completed"),
    netAmount: credit - debit
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
  var driveUrl = first(row, ["FileURL", "Google Drive URL", "Drive URL", "URL", "Link"]);
  return {
    id: String(first(row, ["DocumentId", "Document ID", "Doc ID", "ID"]) || ""),
    clientId: String(first(row, ["ClientId", "Client ID", "CLIENT_ID"]) || ""),
    name: String(first(row, ["Name", "Document Name", "DocumentType"]) || "Document"),
    type: String(first(row, ["Category", "FileType", "File Type", "Type", "Document Type"]) || "Other"),
    uploadDate: first(row, ["Upload Date", "Date"]),
    status: normalizeStatus(first(row, ["Status"])),
    driveUrl: driveUrl,
    fileId: first(row, ["GoogleDriveFileId", "Google Drive File ID", "Drive File ID", "File ID"]) || extractDriveFileId(driveUrl),
    fileName: first(row, ["FileName", "File Name", "Name"]),
    mimeType: first(row, ["MimeType", "Mime Type", "Content Type"]),
    fileSize: number(first(row, ["FileSize", "File Size", "Size"]))
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

function findLoginMatches(rows, loginId, clientRows) {
  var exact = rows.filter(function(row) {
    return normalizeLogin(credentialLoginId(row)) === loginId;
  });
  if (exact.length) return exact;
  var client = uniqueLoginRow((clientRows || []).filter(function(row) {
    return normalizeLogin(first(row, ["Email", "email"])) === loginId
      || normalizeLogin(first(row, ["Mobile", "Phone", "Contact", "Mobile Number"])) === loginId;
  }));
  var linkedId = client ? normalizeLogin(credentialLoginId(client)) : "";
  if (client && !linkedId) throw coded("CLIENT_LINK_MISSING", "Your email is missing its Client ID link. Please contact support or sign in with your Client ID.");
  return rows.filter(function(row) {
    return normalizeLogin(first(row, ["Email", "email"])) === loginId
      || normalizeLogin(first(row, ["Mobile", "Phone", "Contact", "Mobile Number"])) === loginId
      || (linkedId && normalizeLogin(credentialLoginId(row)) === linkedId);
  });
}

function findClientLoginRow(rows, loginId, credentialRow) {
  if (!rows || !rows.length) return null;
  var credentialClientId = credentialRow ? normalizeLogin(credentialLoginId(credentialRow)) : "";
  if (credentialClientId) return uniqueLoginRow(rows.filter(function(row) {
    return normalizeLogin(credentialLoginId(row)) === credentialClientId;
  }));
  var exact = rows.filter(function(row) { return normalizeLogin(credentialLoginId(row)) === loginId; });
  if (exact.length) return uniqueLoginRow(exact);
  return uniqueLoginRow(rows.filter(function(row) {
    return normalizeLogin(first(row, ["Email", "email"])) === loginId
      || normalizeLogin(first(row, ["Mobile", "Phone", "Contact", "Mobile Number"])) === loginId;
  }));
}

function uniqueLoginRow(rows) {
  if (rows.length > 1) throw coded("AMBIGUOUS_LOGIN", "More than one account matches this login. Please use your Client ID and contact support.");
  return rows[0] || null;
}

function effectiveLoginStatus(credentialRow, clientRow) {
  var credentialStatus = normalizeOptionalStatus(first(credentialRow || {}, ["Status", "Account Status", "AccountStatus", "status"])) || "active";
  var clientStatus = normalizeOptionalStatus(first(clientRow || {}, ["Status", "Account Status", "AccountStatus", "status"]));
  if (["blocked", "inactive", "disabled", "suspended"].indexOf(credentialStatus) >= 0) return credentialStatus;
  if (clientStatus) return clientStatus;
  return credentialStatus || "active";
}

function passwordHeaders() {
  return ["Password", "password", "Portal Password", "PortalPassword", "Login Password", "LoginPassword", "Temporary Password", "Temp Password", "PASSWORD"];
}

function upsertCredentialFromClient(payload, clientRow, password) {
  var clientId = cleanString(credentialLoginId(clientRow));
  if (!clientId) throw coded("MISSING_CLIENT_ID", "Cannot create login credentials without ClientId");
  var status = normalizeStatus(first(clientRow, ["Status", "Account Status", "AccountStatus"]) || "active");
  var values = {
    "ClientId (Login ID)": clientId,
    ClientId: clientId,
    ClientName: cleanString(first(clientRow, ["ClientName", "Client Name", "Name", "Full Name", "fullName"]) || clientId),
    Email: cleanString(first(clientRow, ["Email", "email"]) || ""),
    Mobile: cleanString(first(clientRow, ["Mobile", "Phone", "Contact", "Mobile Number", "mobile"]) || ""),
    Password: cleanString(password),
    Role: "client",
    Status: status || "active",
    LastPasswordChange: new Date()
  };
  upsertClientRecord(payload, ["CLIENT_CREDENTIALS", "Credentials", "Users"], ["ClientId (Login ID)", "Login ID", "ClientId", "Client ID", "User ID"], clientId, values);
  audit(payload, "syncCredentialFromClient", "CLIENT_CREDENTIALS", clientId);
  return values;
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
  if (!DASHBOARD_READ_CONTEXT) return SpreadsheetApp.openById(id);
  if (!DASHBOARD_READ_CONTEXT.spreadsheets[id]) {
    DASHBOARD_READ_CONTEXT.spreadsheets[id] = SpreadsheetApp.openById(id);
  }
  return DASHBOARD_READ_CONTEXT.spreadsheets[id];
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

function findSheet(spreadsheet, names, preferAliasOrder) {
  var normalized = names.map(normalizeKey);
  var sheets;
  if (DASHBOARD_READ_CONTEXT) {
    var spreadsheetId = spreadsheet.getId();
    if (!DASHBOARD_READ_CONTEXT.sheets[spreadsheetId]) DASHBOARD_READ_CONTEXT.sheets[spreadsheetId] = spreadsheet.getSheets();
    sheets = DASHBOARD_READ_CONTEXT.sheets[spreadsheetId];
  } else {
    sheets = spreadsheet.getSheets();
  }
  if (preferAliasOrder) {
    for (var nameIndex = 0; nameIndex < normalized.length; nameIndex++) {
      for (var sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
        if (normalized[nameIndex] === normalizeKey(sheets[sheetIndex].getName())) return sheets[sheetIndex];
      }
    }
    return null;
  }
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
  var values = readDashboardSheetValues(sheet);
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return rowsToObjects(headers, values.slice(1));
}

function readRowsForClient(sheet, clientId) {
  var values = readDashboardSheetValues(sheet);
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var clientIndex = findHeaderIndex(headers, ["ClientId", "Client ID", "CLIENT_ID", "clientId", "client_id", "Client Code", "Customer ID", "Investor ID", "KWM ID", "KWMID", "Login ID", "LoginId"]);
  if (clientIndex < 0) return [];
  var wanted = normalizeText(clientId);
  return rowsToObjects(headers, values.slice(1).filter(function(row) {
    return normalizeText(row[clientIndex]) === wanted;
  }));
}

function readDashboardSheetValues(sheet) {
  if (!DASHBOARD_READ_CONTEXT) return sheet.getDataRange().getValues();
  var key = String(sheet.getSheetId());
  if (!DASHBOARD_READ_CONTEXT.values[key]) DASHBOARD_READ_CONTEXT.values[key] = sheet.getDataRange().getValues();
  return DASHBOARD_READ_CONTEXT.values[key];
}

function rowsToObjects(headers, rows) {
  return rows.filter(function(row) {
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
  var emptyValue = "";
  for (var i = 0; i < names.length; i++) {
    var wanted = normalizeKey(names[i]);
    for (var j = 0; j < keys.length; j++) {
      if (normalizeKey(keys[j]) === wanted) {
        if (row[keys[j]] !== undefined && row[keys[j]] !== null && row[keys[j]] !== "") return row[keys[j]];
        emptyValue = row[keys[j]];
      }
    }
  }
  return emptyValue;
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

function buildPortfolioGrowth(transactions, investments, dashboardRows) {
  var points = [];
  var running = 0;
  transactions.forEach(function(row) {
    var credit = number(row.credit);
    var debit = number(row.debit);
    if (row.balance !== undefined && row.balance !== null && row.balance !== "") {
      running = number(row.balance);
    } else {
      running += credit - debit;
    }
    if (row.date || running || credit || debit) {
      points.push({ date: row.date || "", value: running, credit: credit, debit: debit, transactionId: row.id || "" });
    }
  });
  if (points.length) return compactGrowthPoints(points);

  var investmentRunning = 0;
  sortRowsByDate(investments).forEach(function(row) {
    investmentRunning += number(row.principalAmount);
    var value = number(row.currentValue) || investmentRunning;
    if (row.startDate || value) points.push({ date: row.startDate || row.maturityDate || "", value: value, investmentId: row.id || "" });
  });
  if (points.length) return compactGrowthPoints(points);

  dashboardRows.forEach(function(row) {
    var value = number(row.currentPortfolioValue) || number(row.totalInvestedAmount);
    if (value) points.push({ date: new Date().toISOString(), value: value });
  });
  return compactGrowthPoints(points);
}

function compactGrowthPoints(points) {
  if (points.length <= 18) return points;
  return points.slice(points.length - 18);
}

function sortRowsByDate(rows) {
  return (rows || []).slice().sort(function(a, b) {
    return dateMillis(a.date || a.startDate || a.requestDate || a.paymentDate || a.uploadDate) - dateMillis(b.date || b.startDate || b.requestDate || b.paymentDate || b.uploadDate);
  });
}

function dateMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) {
    var timestamp = new Date(value).getTime();
    if (!isNaN(timestamp)) return timestamp;
  }
  var day = adminCalendarDay(value);
  var parsed = day ? new Date(day + "T00:00:00Z").getTime() : NaN;
  return isNaN(parsed) ? 0 : parsed;
}

function attachProfilePhotoPreview(profile, payload) {
  if (!profile) return profile;
  var fileId = latestProfilePhotoFileId(profile, payload);
  if (!fileId) return profile;
  var preview = driveImageDataUrl(fileId);
  return preview ? clonePayload(profile, { profilePhotoFileId: fileId, profilePhotoPreviewUrl: preview }) : clonePayload(profile, { profilePhotoFileId: fileId });
}

function latestProfilePhotoFileId(profile, payload) {
  var fileId = profile.profilePhotoFileId || extractDriveFileId(profile.profilePhotoUrl);
  if (fileId || !payload || !payload.clientId) return fileId;
  try {
    var profileDocs = getDocuments(payload).filter(function(doc) {
      var type = normalizeText(doc.type || doc.name || "");
      return normalizeText(doc.clientId) === normalizeText(payload.clientId)
        && normalizeStatus(doc.status) !== "archived"
        && (type.indexOf("profile") >= 0 || type.indexOf("photo") >= 0 || type.indexOf("image") >= 0);
    });
    if (!profileDocs.length) return "";
    var sorted = sortRowsByDate(profileDocs);
    var latest = sorted[sorted.length - 1];
    return latest.fileId || extractDriveFileId(latest.driveUrl);
  } catch (error) {
    return "";
  }
}

function profilePhotoUrlFromRow(row) {
  var direct = first(row, ["Profile Photo URL", "ProfilePhotoUrl", "Photo URL", "PhotoUrl", "Profile Image URL", "Image URL", "Photo"]);
  if (direct) return direct;
  var fileId = first(row, ["Profile Photo File ID", "ProfilePhotoFileId", "Photo File ID", "GoogleDriveFileId", "Drive File ID"]);
  return fileId ? "drive-file:" + cleanString(fileId) : "";
}

function driveImageDataUrl(fileId) {
  try {
    if (!fileId) return "";
    var blob = DriveApp.getFileById(fileId).getBlob();
    var mimeType = blob.getContentType();
    if (String(mimeType).indexOf("image/") !== 0) return "";
    return "data:" + mimeType + ";base64," + Utilities.base64Encode(blob.getBytes());
  } catch (error) {
    return "";
  }
}
function clonePayload(payload, extra) {
  var next = {};
  Object.keys(payload || {}).forEach(function(key) { next[key] = payload[key]; });
  Object.keys(extra || {}).forEach(function(key) { next[key] = extra[key]; });
  return next;
}

function transactionAmount(row, side) {
  var aliases = side === "credit"
    ? ["Credit", "Amount Credit", "Cr", "Payout", "Interest", "Referral", "Bonus"]
    : ["Debit", "Amount Debit", "Dr", "Withdrawal", "Withdrawn Amount", "Fee", "Charge"];
  var total = 0;
  var found = false;
  aliases.forEach(function(alias) {
    var value = first(row, [alias]);
    if (value !== "") {
      total += number(value);
      found = true;
    }
  });
  if (found) return total;
  var type = normalizeStatus(first(row, ["Type", "Transaction Type", "Transaction"]));
  var amount = number(first(row, ["Amount", "Transaction Amount", "Value"]));
  if (side === "credit") return ["credit", "deposit", "investment", "payout", "referral", "bonus", "interest"].indexOf(type) >= 0 ? amount : 0;
  return ["debit", "withdrawal", "fee", "charge"].indexOf(type) >= 0 ? amount : 0;
}

function nextClientId(sheets) {
  var used = {};
  var max = 0;
  var headers = ["ClientId (Login ID)", "Login ID", "LoginId", "User ID", "UserId", "ClientId", "Client ID", "CLIENT_ID", "clientId", "ID"];
  sheets.forEach(function(sheet) {
    if (!sheet) return;
    readRows(sheet).forEach(function(row) {
      var id = cleanString(first(row, headers));
      if (!id) return;
      used[normalizeLogin(id)] = true;
      var match = id.match(/K(?:WM|MW|W)(\d+)/i);
      if (match) max = Math.max(max, Number(match[1]));
    });
  });
  do {
    max += 1;
    var next = "KWM" + leftPad(String(max), 4, "0");
  } while (used[normalizeLogin(next)]);
  return next;
}

function leftPad(value, length, char) {
  value = String(value);
  while (value.length < length) value = char + value;
  return value;
}

function number(value) {
  var parsed = Number(String(value || 0).replace(/[Ã¢â€šÂ¹,\s%]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

function bool(value) {
  return ["true", "yes", "1", "read"].indexOf(String(value || "").toLowerCase()) >= 0;
}

function cleanString(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function normalizeLogin(value) {
  var login = cleanString(value).toLowerCase().replace(/\s+/g, "");
  var clientMatch = login.match(/^k(?:wm|mw|w)[-_]?(\d+)$/i);
  if (clientMatch) return "kwm" + clientMatch[1];
  return login;
}

function normalizePassword(value) {
  return cleanString(value);
}

function normalizeStatus(value) {
  return cleanString(value || "pending").toLowerCase().replace(/\s+/g, "_");
}

function normalizeOptionalStatus(value) {
  var cleaned = cleanString(value);
  return cleaned ? cleaned.toLowerCase().replace(/\s+/g, "_") : "";
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
