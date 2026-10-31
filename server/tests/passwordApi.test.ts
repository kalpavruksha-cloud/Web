import { createServer, type RequestListener } from "node:http";
import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const vercelHandler = require("../../api/index.js") as RequestListener;
let createApp: typeof import("../src/app.js").createApp;
let service: typeof import("../src/services/appsScriptService.js").appsScriptService;
const previousPassword = "old-test-password";
const nextPassword = "new-test-password";
const validBody = { currentPassword: previousPassword, newPassword: nextPassword, confirmPassword: nextPassword };
const ok = (data: unknown) => ({ success: true, data, message: "Completed", error: null, meta: { requestId: "test", timestamp: new Date().toISOString() } });
const failure = (code: string, details: string) => ({ ...ok(null), success: false, error: { code, details } });

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.SPREADSHEET_ID = "spreadsheet_test_id_12345";
  process.env.JWT_SECRET = "test_secret_that_is_long_enough_for_jwt_testing";
  ({ createApp } = await import("../src/app.js"));
  ({ appsScriptService: service } = await import("../src/services/appsScriptService.js"));
}, 60000);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function setup(mode: "express" | "vercel", role: "client" | "admin" = "client") {
  let storedPassword = previousPassword;
  let forced: Record<string, unknown> | undefined;
  const calls: Array<{ action: string; method: string; payload: Record<string, unknown>; url?: string }> = [];
  const user = { id: role === "admin" ? "ADMIN" : "C001", clientId: role === "client" ? "C001" : "", role, name: "Test account", email: "first@example.test", status: "active" };
  const login = (password: string) => password === storedPassword ? ok({ user }) : failure("PASSWORD_MISMATCH", "Invalid password");
  function upstream(action: string, payload: Record<string, unknown>, method: string, url?: string) {
    calls.push({ action, method, payload, url });
    if (forced) return forced;
    if (payload.currentPassword !== storedPassword) return failure("PASSWORD_MISMATCH", "Current password is incorrect");
    storedPassword = String(payload.newPassword);
    return ok({ updated: true, verified: true, clientId: "C001", changedAt: new Date().toISOString() });
  }
  if (mode === "express") {
    vi.spyOn(service, "login").mockImplementation(async (_identifier, password) => login(password) as Awaited<ReturnType<typeof service.login>>);
    vi.spyOn(service, "action").mockImplementation(async (action, payload, _requestId, method = "GET") => upstream(action, payload, method) as unknown as Awaited<ReturnType<typeof service.action>>);
  } else {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      return new Response(JSON.stringify(payload.action === "login" ? login(payload.password) : upstream(payload.action, payload, init.method || "GET", String(url))));
    }));
  }
  const app = mode === "express" ? createApp() : createServer(vercelHandler);
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ identifier: user.id, password: previousPassword })).status).toBe(200);
  return { app, agent, calls, force(value: Record<string, unknown>) { forced = value; } };
}

describe.each(["express", "vercel"] as const)("%s password change API", (mode) => {
  it("requires a client session and blocks admin accounts", async () => {
    const h = await setup(mode, "admin");
    expect((await request(h.app).put("/api/client/password").send(validBody)).status).toBe(401);
    expect((await h.agent.put("/api/client/password").send(validBody)).status).toBe(403);
    expect(h.calls).toHaveLength(0);
  });

  it("uses POST to the spreadsheet, confirms persistence, and rejects the old password at login", async () => {
    const h = await setup(mode);
    const result = await h.agent.put("/api/client/password").send(validBody);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body.data).toMatchObject({ updated: true, verified: true, clientId: "C001" });
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]).toMatchObject({ action: "changeClientPassword", method: "POST", payload: { ...validBody, clientId: "C001", actorId: "C001", role: "client" } });
    expect(h.calls[0].url || "").not.toContain(previousPassword);
    expect(h.calls[0].url || "").not.toContain(nextPassword);
    expect((await h.agent.post("/api/auth/login").send({ identifier: "C001", password: previousPassword })).status).toBe(401);
    expect((await h.agent.post("/api/auth/login").send({ identifier: "first@example.test", password: nextPassword })).status).toBe(200);
    expect(JSON.stringify(result.body)).not.toContain(nextPassword);
  });

  it.each([
    { ...validBody, confirmPassword: "not-the-same" },
    { ...validBody, newPassword: "short", confirmPassword: "short" },
    { ...validBody, newPassword: previousPassword, confirmPassword: previousPassword },
    { ...validBody, newPassword: ` ${previousPassword} `, confirmPassword: ` ${previousPassword} ` },
    { ...validBody, role: "admin" }
  ])("rejects invalid or scope-overriding requests before sending passwords upstream", async (body) => {
    const h = await setup(mode);
    expect((await h.agent.put("/api/client/password").send(body)).status).toBe(400);
    expect(h.calls).toHaveLength(0);
  });

  it("does not permit changing another client's password", async () => {
    const h = await setup(mode);
    expect((await h.agent.put("/api/client/password").send({ ...validBody, clientId: "C002" })).status).toBe(403);
    expect(h.calls).toHaveLength(0);
  });

  it("returns a useful error for an incorrect current password", async () => {
    const h = await setup(mode);
    const result = await h.agent.put("/api/client/password").send({ ...validBody, currentPassword: "wrong-test-password" });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("PASSWORD_MISMATCH");
    expect((await h.agent.post("/api/auth/login").send({ identifier: "C001", password: previousPassword })).status).toBe(200);
  });

  it.each([null, { updated: true, clientId: "C001" }, { updated: true, verified: true, clientId: "C002" }])("never reports unconfirmed or wrong-client writes as successful", async (data) => {
    const h = await setup(mode);
    h.force(ok(data));
    const result = await h.agent.put("/api/client/password").send(validBody);
    expect(result.status).toBe(502);
    expect(result.body.success).toBe(false);
    expect(result.body.error.code).toBe("PASSWORD_CHANGE_UNCONFIRMED");
  });

  it("hides spreadsheet internals and never retries unsafe password writes", async () => {
    const h = await setup(mode);
    h.force(failure("APPS_SCRIPT_ERROR", "private spreadsheet details"));
    const result = await h.agent.put("/api/client/password").send(validBody);
    expect(result.status).toBe(502);
    expect(result.body.error.code).toBe("PASSWORD_CHANGE_FAILED");
    expect(JSON.stringify(result.body)).not.toContain("private spreadsheet details");
    expect(h.calls).toHaveLength(1);
  });
});
