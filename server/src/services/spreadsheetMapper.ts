import type {
  ClientDocument,
  ClientNotification,
  Investment,
  Profile,
  Referral,
  SpreadsheetSchema,
  Transaction,
  Withdrawal
} from "../types/domain.js";
import { normalizeClientId, normalizeKey, normalizeStatus, toBoolean, toDateString, toNumber } from "../utils/format.js";

type AliasMap = Record<string, string[]>;
type Row = Record<string, unknown>;

export const sheetAliases: Record<string, string[]> = {
  credentials: ["clientcredentials", "credentials", "login", "users", "usercredentials"],
  clients: ["client", "clients", "profile", "profiles"],
  investments: ["investment", "investments"],
  transactions: ["transaction", "transactions", "ledger"],
  withdrawals: ["withdrawal", "withdrawals", "withdrawalrequests"],
  documents: ["document", "documents", "docs"],
  referrals: ["referral", "referrals"],
  notifications: ["notification", "notifications"],
  settings: ["platformsettings", "settings", "portalsettings"],
  activity: ["activitylog", "auditlog", "activity"],
  kyc: ["kyc"],
  bankDetails: ["bankdetails", "bank"]
};

const common: AliasMap = {
  id: ["id", "recordid", "uid"],
  clientId: ["clientid", "clientcode", "customerid", "investorid"],
  name: ["name", "fullname", "clientname", "investorname"],
  email: ["email", "emailid", "mail"],
  mobile: ["mobile", "phone", "phonenumber", "contactnumber"],
  status: ["status", "accountstatus", "recordstatus"],
  date: ["date", "createdat", "timestamp"]
};

const fieldAliases: Record<string, AliasMap> = {
  clients: {
    ...common,
    profilePhotoUrl: ["profilephotourl", "photourl", "imageurl"],
    fullName: ["fullname", "clientname", "name", "investorname"],
    dateOfBirth: ["dateofbirth", "dob", "birthdate"],
    address: ["address", "residentialaddress"],
    pan: ["pan", "pannumber", "pan card"],
    aadhaar: ["aadhaar", "aadhar", "aadhaarnumber", "aadharnumber"],
    kycStatus: ["kycstatus", "kyc"],
    bankAccount: ["bankaccount", "accountnumber", "bankaccountnumber"],
    ifsc: ["ifsc", "ifsccode"],
    branch: ["branch", "bankbranch"],
    nomineeName: ["nomineename"],
    nomineeRelationship: ["nomineerelationship", "relationship"],
    nomineeMobile: ["nomineemobile", "nomineephone"],
    riskProfile: ["riskprofile", "riskcategory"],
    accountStatus: ["accountstatus", "status"]
  },
  profile: {
    ...common,
    profilePhotoUrl: ["profilephotourl", "photourl", "imageurl"],
    fullName: ["fullname", "clientname", "name", "investorname"],
    dateOfBirth: ["dateofbirth", "dob", "birthdate"],
    address: ["address", "residentialaddress"],
    pan: ["pan", "pannumber", "pan card"],
    aadhaar: ["aadhaar", "aadhar", "aadhaarnumber", "aadharnumber"],
    kycStatus: ["kycstatus", "kyc"],
    bankAccount: ["bankaccount", "accountnumber", "bankaccountnumber"],
    ifsc: ["ifsc", "ifsccode"],
    branch: ["branch", "bankbranch"],
    nomineeName: ["nomineename"],
    nomineeRelationship: ["nomineerelationship", "relationship"],
    nomineeMobile: ["nomineemobile", "nomineephone"],
    riskProfile: ["riskprofile", "riskcategory"],
    accountStatus: ["accountstatus", "status"]
  },
  investment: {
    ...common,
    id: ["investmentid", "planid", "id"],
    plan: ["investmentplan", "plan", "scheme", "planname"],
    category: ["category", "assetclass"],
    principalAmount: ["principalamount", "amount", "investedamount", "investmentamount"],
    startDate: ["startdate", "investmentdate"],
    maturityDate: ["maturitydate", "enddate"],
    returnRate: ["returnrate", "roi", "interestrate"],
    monthlyReturn: ["monthlyreturn", "monthlypayout", "monthlyinterest"],
    currentValue: ["currentvalue", "portfolio value", "value"],
    agreementDetails: ["agreementdetails", "agreement", "agreementid"],
    paymentMode: ["paymentmode", "mode"],
    notes: ["notes", "remarks"]
  },
  transaction: {
    ...common,
    id: ["transactionid", "txnid", "txid", "id"],
    type: ["type", "transactiontype"],
    description: ["description", "particulars", "details"],
    credit: ["credit", "creditamount", "amount"],
    debit: ["debit", "debitamount"],
    balance: ["balance", "closingbalance"],
    reference: ["reference", "ref", "paymentreference"]
  },
  withdrawal: {
    ...common,
    id: ["withdrawalid", "requestid", "id"],
    amount: ["amount", "requestedamount", "withdrawalamount"],
    requestDate: ["requestdate", "requesteddate", "date"],
    bankAccount: ["bankaccount", "accountnumber"],
    remarks: ["remarks", "clientremarks", "notes"],
    approvalDate: ["approvaldate", "approveddate"],
    paymentReference: ["paymentreference", "utr", "transactionreference"],
    adminRemarks: ["adminremarks", "rejectionreason"]
  },
  referral: {
    ...common,
    id: ["referralid", "id"],
    clientId: ["clientid", "referrerclientid"],
    code: ["referralcode", "code"],
    referredClientName: ["referredclientname", "referredname"],
    referredClientId: ["referredclientid", "referredid"],
    rewardAmount: ["rewardamount", "commission", "bonusamount"],
    paidAmount: ["paidamount", "amountpaid"]
  },
  document: {
    ...common,
    id: ["documentid", "docid", "id"],
    name: ["name", "documentname", "documenttype"],
    type: ["type", "documenttype"],
    uploadDate: ["uploaddate", "uploadedat", "date"],
    driveUrl: ["googledriveurl", "driveurl", "url", "link", "fileurl"]
  },
  notification: {
    ...common,
    id: ["notificationid", "id"],
    title: ["title", "subject"],
    message: ["message", "body", "description"],
    type: ["type", "notificationtype"],
    read: ["read", "isread", "readstatus"],
    priority: ["priority", "importance"]
  }
};

export function detectSheetName(schema: SpreadsheetSchema | null | undefined, moduleName: keyof typeof sheetAliases): string | undefined {
  if (!schema) return undefined;
  const wanted = new Set(sheetAliases[moduleName]);
  return schema.sheets.find((sheet) => wanted.has(normalizeKey(sheet.name)))?.name;
}

export function buildHeaderMap(headers: string[], aliases: AliasMap): Map<string, string> {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeKey(header), header]));
  const map = new Map<string, string>();
  for (const [field, names] of Object.entries(aliases)) {
    const found = names.map(normalizeKey).map((name) => normalizedHeaders.get(name)).find(Boolean);
    if (found) map.set(field, found);
  }
  return map;
}

export function value(row: Row, map: Map<string, string>, field: string): unknown {
  const header = map.get(field);
  return header ? row[header] : undefined;
}

export function mapRows<T>(rows: Row[], headers: string[], moduleName: keyof typeof fieldAliases, mapper: (row: Row, map: Map<string, string>) => T): T[] {
  const headerMap = buildHeaderMap(headers, fieldAliases[moduleName]);
  return rows.map((row) => mapper(row, headerMap));
}

export function toProfile(row: Row, map: Map<string, string>): Profile {
  return {
    clientId: normalizeClientId(value(row, map, "clientId")),
    fullName: String(value(row, map, "fullName") ?? value(row, map, "name") ?? ""),
    profilePhotoUrl: optionalString(value(row, map, "profilePhotoUrl")),
    mobile: optionalString(value(row, map, "mobile")),
    email: optionalString(value(row, map, "email")),
    dateOfBirth: toDateString(value(row, map, "dateOfBirth")),
    address: optionalString(value(row, map, "address")),
    pan: optionalString(value(row, map, "pan")),
    aadhaar: optionalString(value(row, map, "aadhaar")),
    kycStatus: optionalString(value(row, map, "kycStatus")),
    bankAccount: optionalString(value(row, map, "bankAccount")),
    ifsc: optionalString(value(row, map, "ifsc")),
    branch: optionalString(value(row, map, "branch")),
    nomineeName: optionalString(value(row, map, "nomineeName")),
    nomineeRelationship: optionalString(value(row, map, "nomineeRelationship")),
    nomineeMobile: optionalString(value(row, map, "nomineeMobile")),
    riskProfile: optionalString(value(row, map, "riskProfile")),
    accountStatus: normalizeStatus(value(row, map, "accountStatus"), "active")
  };
}

export function toInvestment(row: Row, map: Map<string, string>): Investment {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: normalizeClientId(value(row, map, "clientId")),
    plan: String(value(row, map, "plan") ?? ""),
    category: optionalString(value(row, map, "category")),
    principalAmount: toNumber(value(row, map, "principalAmount")),
    startDate: toDateString(value(row, map, "startDate")),
    maturityDate: toDateString(value(row, map, "maturityDate")),
    returnRate: toNumber(value(row, map, "returnRate")),
    monthlyReturn: toNumber(value(row, map, "monthlyReturn")),
    currentValue: toNumber(value(row, map, "currentValue")),
    status: normalizeStatus(value(row, map, "status"), "active"),
    agreementDetails: optionalString(value(row, map, "agreementDetails")),
    paymentMode: optionalString(value(row, map, "paymentMode")),
    notes: optionalString(value(row, map, "notes"))
  };
}

export function toTransaction(row: Row, map: Map<string, string>): Transaction {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: normalizeClientId(value(row, map, "clientId")),
    date: toDateString(value(row, map, "date")),
    type: normalizeStatus(value(row, map, "type"), "transaction"),
    description: optionalString(value(row, map, "description")),
    credit: toNumber(value(row, map, "credit")),
    debit: toNumber(value(row, map, "debit")),
    balance: toNumber(value(row, map, "balance")),
    reference: optionalString(value(row, map, "reference")),
    status: normalizeStatus(value(row, map, "status"), "posted")
  };
}

export function toWithdrawal(row: Row, map: Map<string, string>): Withdrawal {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: normalizeClientId(value(row, map, "clientId")),
    amount: toNumber(value(row, map, "amount")),
    requestDate: toDateString(value(row, map, "requestDate")),
    bankAccount: optionalString(value(row, map, "bankAccount")),
    remarks: optionalString(value(row, map, "remarks")),
    status: normalizeStatus(value(row, map, "status"), "pending") as Withdrawal["status"],
    approvalDate: toDateString(value(row, map, "approvalDate")),
    paymentReference: optionalString(value(row, map, "paymentReference")),
    adminRemarks: optionalString(value(row, map, "adminRemarks"))
  };
}

export function toReferral(row: Row, map: Map<string, string>): Referral {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: normalizeClientId(value(row, map, "clientId")),
    code: optionalString(value(row, map, "code")),
    referredClientName: optionalString(value(row, map, "referredClientName")),
    referredClientId: optionalString(value(row, map, "referredClientId")),
    status: normalizeStatus(value(row, map, "status"), "pending"),
    rewardAmount: toNumber(value(row, map, "rewardAmount")),
    paidAmount: toNumber(value(row, map, "paidAmount")),
    createdAt: toDateString(value(row, map, "date"))
  };
}

export function toDocument(row: Row, map: Map<string, string>): ClientDocument {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: normalizeClientId(value(row, map, "clientId")),
    name: String(value(row, map, "name") ?? "Document"),
    type: String(value(row, map, "type") ?? "Other"),
    uploadDate: toDateString(value(row, map, "uploadDate")),
    status: normalizeStatus(value(row, map, "status"), "available"),
    driveUrl: optionalString(value(row, map, "driveUrl"))
  };
}

export function toNotification(row: Row, map: Map<string, string>): ClientNotification {
  return {
    id: String(value(row, map, "id") ?? ""),
    clientId: optionalString(value(row, map, "clientId")),
    title: String(value(row, map, "title") ?? "Notification"),
    message: String(value(row, map, "message") ?? ""),
    date: toDateString(value(row, map, "date")),
    type: optionalString(value(row, map, "type")),
    read: toBoolean(value(row, map, "read")),
    priority: normalizeStatus(value(row, map, "priority"), "normal") as ClientNotification["priority"]
  };
}

export function analyzeSchema(schema: SpreadsheetSchema): SpreadsheetSchema {
  const required: Record<string, string[]> = {
    clients: ["clientId", "fullName"],
    investments: ["id", "clientId", "principalAmount", "status"],
    transactions: ["id", "clientId", "type", "credit", "debit"],
    withdrawals: ["id", "clientId", "amount", "status"],
    documents: ["id", "clientId", "name", "driveUrl"],
    referrals: ["id", "clientId"],
    notifications: ["id", "title", "message"]
  };
  const warnings = Object.entries(required).flatMap(([moduleName, fields]) => {
    const sheetName = detectSheetName(schema, moduleName as keyof typeof sheetAliases);
    if (!sheetName) return [{ sheet: moduleName, missingRequiredColumns: fields, unresolvedColumns: [] }];
    const sheet = schema.sheets.find((item) => item.name === sheetName);
    const aliases = fieldAliases[moduleName] ?? fieldAliases[moduleName.replace(/s$/, "")];
    const headerMap = buildHeaderMap(sheet?.headers ?? [], aliases);
    const missingRequiredColumns = fields.filter((field) => !headerMap.has(field));
    const known = new Set(Object.values(aliases).flat().map(normalizeKey));
    const unresolvedColumns = (sheet?.headers ?? []).filter((header) => !known.has(normalizeKey(header)));
    return [{ sheet: sheetName, missingRequiredColumns, unresolvedColumns }];
  });
  return { ...schema, warnings };
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim();
}
