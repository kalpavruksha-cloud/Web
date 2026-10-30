import { createServer, type RequestListener } from "node:http";
import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { signKycPayload } from "../src/utils/kycProof.js";

const require = createRequire(import.meta.url);
const vercelHandler = require("../../api/index.js") as RequestListener;
const secret = "test_only_kyc_signing_secret_not_for_production";
const sheetId = "spreadsheet_test_id_12345";
let createApp: typeof import("../src/app.js").createApp;
let service: typeof import("../src/services/appsScriptService.js").appsScriptService;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.SPREADSHEET_ID = sheetId;
  process.env.JWT_SECRET = secret;
  ({ createApp } = await import("../src/app.js"));
  ({ appsScriptService: service } = await import("../src/services/appsScriptService.js"));
}, 60000);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const record = { clientId: "TEST0001", pan: "ABCDE1234F", aadhaar: "234567890123", aadhaarLast4: "0123", aadhaarConfigured: true, status: "under_review", remarks: "", verificationDate: "", verifiedBy: "", revision: "revision-one", panDocumentId: "", aadhaarDocumentId: "", documents: [] };
const response = (data: unknown) => ({ success: true, message: "Operation completed", data, error: null, meta: { timestamp: new Date().toISOString(), requestId: "test-request" } });

async function setup(mode: "express" | "vercel", role: "admin" | "client" = "client") {
  let upstream: Record<string, unknown> = response(record);
  const calls: Array<{ action: string; payload: Record<string, unknown>; method: string }> = [];
  const user = { id: role === "admin" ? "ADMIN" : "TEST0001", clientId: role === "admin" ? "" : "TEST0001", name: "Test account", email: "test@example.test", role, status: "active" as const };
  if (mode === "express") {
    vi.spyOn(service, "login").mockResolvedValue(response({ user }));
    vi.spyOn(service, "action").mockImplementation(async (action, payload, requestId, method = "GET") => {
      calls.push({ action, payload: { action, spreadsheetId: sheetId, requestId, ...payload }, method });
      return upstream as unknown as Awaited<ReturnType<typeof service.action>>;
    });
  } else {
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      if (payload.action === "login") return new Response(JSON.stringify(response({ user })));
      calls.push({ action: payload.action, payload, method: init.method || "GET" });
      return new Response(JSON.stringify(upstream));
    }));
  }
  const agent = request.agent(mode === "express" ? createApp() : createServer(vercelHandler));
  const login = await agent.post("/api/auth/login").send({ identifier: user.id, password: "test-only-password" });
  expect(login.status).toBe(200);
  return { agent, calls, reply(value: Record<string, unknown>) { upstream = value; } };
}

describe.each(["express", "vercel"] as const)("%s KYC API authorization and contracts", (mode) => {
  it("requires authentication before KYC reads or writes", async () => {
    const app = mode === "express" ? createApp() : createServer(vercelHandler);
    const result = await request(app).get("/api/client/kyc");
    expect(result.status).toBe(401);
  });

  it("does not allow clients to use admin verification routes", async () => {
    const h = await setup(mode);
    expect((await h.agent.get("/api/clients/TEST0001/kyc")).status).toBe(403);
    expect((await h.agent.put("/api/clients/TEST0001/kyc/review").send({ decision: "verified" })).status).toBe(403);
    expect(h.calls).toHaveLength(0);
  });

  it("signs session-scoped reads over POST and strips full Aadhaar from client responses", async () => {
    const h = await setup(mode);
    const result = await h.agent.get("/api/client/kyc");
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(JSON.stringify(result.body)).not.toContain(record.aadhaar);
    const call = h.calls[0];
    expect(call.method).toBe("POST");
    expect(call.payload).toMatchObject({ clientId: "TEST0001", role: "client", actorId: "TEST0001" });
    const proof = call.payload.kycProof as { issuedAt: number; signature: string };
    const expected = signKycPayload("getKyc", call.payload, sheetId, String(call.payload.requestId), secret, proof.issuedAt);
    expect(proof.signature).toBe(expected.kycProof.signature);
  });

  it("validates numbers and blocks body-based scope or role overrides", async () => {
    const h = await setup(mode);
    expect((await h.agent.put("/api/client/kyc").send({ expectedRevision: "revision-one", pan: "invalid" })).status).toBe(400);
    expect((await h.agent.put("/api/client/kyc").send({ expectedRevision: "revision-one", pan: record.pan, role: "admin" })).status).toBe(400);
    expect((await h.agent.put("/api/client/kyc").send({ expectedRevision: "revision-one", pan: record.pan, clientId: "OTHER" })).status).toBe(403);
    expect(h.calls).toHaveLength(0);
    const saved = await h.agent.put("/api/client/kyc").send({ expectedRevision: "revision-one", pan: "abcde1234f", aadhaar: "2345 6789 0123" });
    expect(saved.status).toBe(200);
    expect(h.calls[0].payload).toMatchObject({ pan: record.pan, aadhaar: record.aadhaar, expectedRevision: "revision-one", role: "client" });
  });

  it("requires an explicit admin review and binds the route Client ID", async () => {
    const h = await setup(mode, "admin");
    expect((await h.agent.put("/api/clients/TEST0001/kyc/review").send({ expectedRevision: "revision-one", decision: "verified" })).status).toBe(400);
    expect(h.calls).toHaveLength(0);
    const result = await h.agent.put("/api/clients/TEST0001/kyc/review").send({ expectedRevision: "revision-one", decision: "verified", panDocumentId: "PAN1", aadhaarDocumentId: "AAD1", confirmDocumentsReviewed: true });
    expect(result.status).toBe(200);
    expect(h.calls[0]).toMatchObject({ action: "reviewKyc", method: "POST", payload: { role: "admin", actorId: "ADMIN", clientId: "TEST0001" } });
    expect(result.body.data.aadhaar).toBe(record.aadhaar);
  });

  it("rejects mismatched upstream client records without returning their identity data", async () => {
    const h = await setup(mode);
    h.reply(response({ ...record, clientId: "OTHER" }));
    const result = await h.agent.get("/api/client/kyc");
    expect(result.status).toBe(502);
    expect(result.body.error.code).toBe("KYC_SCOPE_MISMATCH");
    expect(JSON.stringify(result.body)).not.toContain(record.pan);
  });

  it.each(["MISSING_SHEET", "APPS_SCRIPT_ERROR"])("hides internal %s errors", async (code) => {
    const h = await setup(mode);
    h.reply({ ...response(null), success: false, error: { code, details: "private spreadsheet internals" } });
    const result = await h.agent.get("/api/client/kyc");
    expect(result.body.error.code).toBe("KYC_UNAVAILABLE");
    expect(JSON.stringify(result.body)).not.toContain("private spreadsheet");
  });

  it("preserves conflict errors so stale approvals must be reviewed again", async () => {
    const h = await setup(mode, "admin");
    h.reply({ ...response(null), success: false, error: { code: "KYC_REVISION_CONFLICT", details: "Reload the latest KYC record" } });
    const result = await h.agent.put("/api/clients/TEST0001/kyc/review").send({ expectedRevision: "old", decision: "rejected", remarks: "Review required" });
    expect(result.status).toBe(409);
  });
});
