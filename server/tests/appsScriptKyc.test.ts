import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { signKycPayload } from "../src/utils/kycProof.js";
import type { KycRecord } from "../src/types/kyc.js";

const source = readFileSync(new URL("../../google-apps-script/Code.gs", import.meta.url), "utf8");
const secret = "test_only_kyc_signing_secret_not_for_production";
const pan = "ABCDE1234F";
const aadhaar = "234567890123";

function harness() {
  const rows: Record<string, unknown[][]> = {
    CLIENTS: [["ClientId ", "ClientName", "Status", "KYC Status"], ["C001", "First client", "active", "verified"], ["C002", "Second client", "active", "verified"]],
    KYC: [["ClientId", "PAN", "Aadhaar", "KYCStatus", "VerificationDate", "Remarks"], ["C001", pan, aadhaar, "pending", "", ""], ["C002", "FGHIJ5678K", "345678901234", "pending", "", ""]],
    DOCUMENTS: [["DocumentId", "ClientId", "Category", "FileURL", "UploadDate", "Status", "IsActive", "GoogleDriveFileId", "Name", "Admin Remarks"],
      ["PAN1", "C001", "PAN Card", "https://drive.google.com/file/d/test-pan/view", "2026-10-01", "under_verification", true, "test-pan", "PAN document", ""],
      ["AAD1", "C001", "Aadhaar Card", "https://drive.google.com/file/d/test-aadhaar/view", "2026-10-01", "under_verification", true, "test-aadhaar", "Aadhaar document", ""],
      ["PAN2", "C002", "PAN Card", "https://drive.google.com/file/d/other-pan/view", "2026-10-01", "under_verification", true, "other-pan", "Other PAN document", ""]],
    ACTIVITY_LOG: [["Timestamp", "User", "Role", "Action", "Module", "RecordId", "RequestId"]],
    DASHBOARD: [["ClientId", "Total Invested", "Total Payout", "Total Withdrawal", "Net Portfolio", "Present Investment", "Monthly Payout"], ["C001", 0, 0, 0, 0, 0, 0], ["C002", 0, 0, 0, 0, 0, 0]]
  };
  const writes: Array<{ sheet: string; row: number; column: number; value: unknown }> = [];
  const format = vi.fn();
  const sheets = Object.keys(rows).map((name, index) => ({
    getName: () => name, getSheetId: () => index + 1, getLastRow: () => rows[name].length,
    getDataRange: () => ({ getValues: () => rows[name].map((row) => Array.from({ length: rows[name][0].length }, (_, column) => row[column] ?? "")) }),
    appendRow: (row: unknown[]) => { rows[name].push([...row]); writes.push({ sheet: name, row: rows[name].length, column: 0, value: row }); },
    getRange: (row: number, column: number) => ({
      setValue(value: unknown) { (rows[name][row - 1] ??= [])[column - 1] = value; writes.push({ sheet: name, row, column, value }); },
      setNumberFormat(value: string) { format(name, row, column, value); }
    })
  }));
  let configured = true;
  const releaseLock = vi.fn();
  const context = createContext({
    SpreadsheetApp: { openById: () => ({ getId: () => "test-sheet", getSheets: () => sheets }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => key === "PORTAL_JWT_SECRET" && configured ? secret : null }) },
    LockService: { getScriptLock: () => ({ waitLock: vi.fn(), releaseLock }) },
    Utilities: {
      Charset: { UTF_8: "UTF-8" }, DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_algorithm: string, value: string) => [...createHash("sha256").update(value).digest()],
      computeHmacSha256Signature: (value: string, key: string) => [...createHmac("sha256", key).update(value).digest()],
      base64EncodeWebSafe: (bytes: number[]) => Buffer.from(bytes).toString("base64url")
    }
  });
  runInContext(source, context);
  function call(action: string, data: Record<string, unknown> = {}, role = "client", clientId = "C001", issuedAt = Date.now()) {
    const payload = { ...signKycPayload(action, { ...data, role, actorId: role === "admin" ? "ADMIN" : clientId, clientId }, "test-sheet", "test-request", secret, issuedAt), action, spreadsheetId: "test-sheet", requestId: "test-request" };
    context.input = payload;
    return runInContext(`${action}(input)`, context) as KycRecord;
  }
  const get = (role = "client", clientId = "C001") => call("getKyc", {}, role, clientId);
  const verify = (overrides = {}) => call("reviewKyc", { expectedRevision: get("admin").revision, decision: "verified", panDocumentId: "PAN1", aadhaarDocumentId: "AAD1", confirmDocumentsReviewed: true, remarks: "Reviewed supporting documents", ...overrides }, "admin");
  return { rows, writes, format, context, call, get, verify, releaseLock, unconfigure: () => { configured = false; } };
}

describe("canonical KYC and admin verification", () => {
  it("returns only the signed client's record and masks Aadhaar for clients", () => {
    const h = harness();
    const result = h.get();
    expect(result).toMatchObject({ clientId: "C001", pan, aadhaarLast4: "0123", status: "pending" });
    expect(JSON.stringify(result)).not.toContain(aadhaar);
    expect(result.documents.map((document) => document.id)).toEqual(["AAD1", "PAN1"]);
    expect(h.get("admin").aadhaar).toBe(aadhaar);
    expect(h.writes).toHaveLength(0);
  });

  it("rejects unsigned direct Apps Script calls and tampered roles/client IDs", () => {
    const h = harness();
    expect(() => runInContext('reviewKyc({role:"admin",clientId:"C001",actorId:"ADMIN"})', h.context)).toThrow("not authorized");
    h.get();
    const signed = h.context.input;
    h.context.input = { ...signed, role: "admin" };
    expect(() => runInContext("getKyc(input)", h.context)).toThrow("not authorized");
    h.context.input = { ...signed, clientId: "C002" };
    expect(() => runInContext("getKyc(input)", h.context)).toThrow("not authorized");
    expect(h.writes).toHaveLength(0);
  });

  it("rejects expired proofs and fails closed when the signing property is unset", () => {
    const h = harness();
    expect(() => h.call("getKyc", {}, "client", "C001", Date.now() - 300001)).toThrow("not authorized");
    h.unconfigure();
    expect(() => h.get()).toThrow("setup is incomplete");
    expect(h.writes).toHaveLength(0);
  });

  it("allows clients to submit numbers, never to verify themselves", () => {
    const h = harness();
    const result = h.call("saveKyc", { expectedRevision: h.get().revision, pan: "ABCDE4321F", aadhaar });
    expect(result.status).toBe("under_review");
    expect(result.pan).toBe("ABCDE4321F");
    expect(h.format).toHaveBeenCalledWith("KYC", 2, 2, "@");
    expect(h.format).toHaveBeenCalledWith("KYC", 2, 3, "@");
    expect(() => h.call("reviewKyc", { expectedRevision: result.revision, decision: "verified" })).toThrow("Only an administrator");
    expect(h.rows.KYC).toHaveLength(3);
  });

  it("validates number format without writing or claiming government verification", () => {
    const h = harness();
    expect(() => h.call("saveKyc", { expectedRevision: h.get().revision, pan: "invalid", aadhaar: "123" })).toThrow("valid PAN");
    expect(h.writes).toHaveLength(0);
  });

  it("records an explicit admin approval, selected documents, audit and shared status", () => {
    const h = harness();
    const result = h.verify();
    expect(result.status).toBe("verified");
    expect(result.verifiedBy).toBe("ADMIN");
    expect(result.verificationDate).toBeTruthy();
    expect(result.panDocumentId).toBe("PAN1");
    expect(result.aadhaarDocumentId).toBe("AAD1");
    expect(h.rows.DOCUMENTS[1][5]).toBe("verified");
    expect(h.rows.DOCUMENTS[2][5]).toBe("verified");
    expect(h.rows.DOCUMENTS[3][5]).toBe("under_verification");
    const profile = runInContext('getProfile({role:"client",clientId:"C001",spreadsheetId:"test-sheet"})', h.context);
    expect(profile.kycStatus).toBe("verified");
    expect(profile.pan).not.toBe(pan);
    expect(profile.aadhaar).toBe("XXXX XXXX 0123");
    const dashboard = runInContext('dashboard({role:"admin",spreadsheetId:"test-sheet"})', h.context);
    expect(dashboard.admin.verifiedKyc).toBe(1);
    expect(dashboard.admin.pendingKyc).toBe(1);
    const audit = JSON.stringify(h.rows.ACTIVITY_LOG);
    expect(audit).toContain("reviewKyc_verified");
    expect(audit).not.toContain(pan);
    expect(audit).not.toContain(aadhaar);
  });

  it("validates both client-owned documents before changing either status", () => {
    const h = harness();
    expect(() => h.verify({ aadhaarDocumentId: "PAN2" })).toThrow("belonging to this client");
    expect(h.writes).toHaveLength(0);
    expect(() => h.verify({ confirmDocumentsReviewed: false })).toThrow("Confirm");
    expect(h.writes).toHaveLength(0);
    h.rows.DOCUMENTS[2][6] = false;
    expect(() => h.verify()).toThrow("belonging to this client");
    expect(h.writes).toHaveLength(0);
  });

  it("requires rejection/reopen reasons and locks verified client edits", () => {
    const h = harness();
    const verified = h.verify();
    expect(() => h.call("saveKyc", { expectedRevision: verified.revision, pan })).toThrow("read-only");
    expect(() => h.call("reviewKyc", { expectedRevision: verified.revision, decision: "pending", remarks: "" }, "admin")).toThrow("review reason");
    const reopened = h.call("reviewKyc", { expectedRevision: verified.revision, decision: "pending", remarks: "Client requested a correction" }, "admin");
    expect(reopened.status).toBe("pending");
    expect(reopened.verifiedBy).toBe("");
    expect(h.call("saveKyc", { expectedRevision: reopened.revision, pan: "ABCDE4321F" }).status).toBe("under_review");
  });

  it("rejects stale form/review revisions instead of overwriting new submissions", () => {
    const h = harness();
    const initial = h.get();
    h.call("saveKyc", { expectedRevision: initial.revision, pan: "ABCDE4321F" });
    expect(() => h.call("saveKyc", { expectedRevision: initial.revision, pan })).toThrow("changed");
    expect(() => h.call("reviewKyc", { expectedRevision: initial.revision, decision: "rejected", remarks: "Old review" }, "admin")).toThrow("changed");
    expect(h.get().pan).toBe("ABCDE4321F");
  });

  it("invalidates approval when identity evidence changes, without changing uploaded bytes", () => {
    const h = harness();
    h.verify();
    h.rows.DOCUMENTS[1][7] = "replacement-file";
    expect(h.get().status).toBe("under_review");
    runInContext('invalidateKycDocumentReview({clientId:"C001",role:"client",actorId:"C001",spreadsheetId:"test-sheet"},"PAN Card")', h.context);
    expect(h.rows.KYC[1][3]).toBe("under_review");
    expect(h.rows.DOCUMENTS[1][7]).toBe("replacement-file");
  });

  it("rejects ambiguous KYC rows and never takes verification from CLIENTS", () => {
    const h = harness();
    const profiles = runInContext('getClients({role:"admin",spreadsheetId:"test-sheet"})', h.context);
    expect(profiles.every((profile: { kycStatus: string }) => profile.kycStatus === "pending")).toBe(true);
    h.rows.KYC.push(["c001", pan, aadhaar, "verified", "", "duplicate"]);
    expect(() => h.get()).toThrow("Multiple KYC records");
    expect(runInContext('getClients({role:"admin",spreadsheetId:"test-sheet"})', h.context)[0].kycStatus).toBe("review_required");
  });

  it("prevents the old generic profile/client write routes from approving KYC", () => {
    const h = harness();
    expect(() => runInContext('updateProfile({role:"client",clientId:"C001",kycStatus:"verified"})', h.context)).toThrow("KYC details and admin review");
    expect(() => runInContext('updateClient({role:"admin",id:"C001",PAN:"ABCDE4321F"})', h.context)).toThrow("KYC details and admin review");
    expect(h.writes).toHaveLength(0);
  });
});
