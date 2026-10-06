import { createServer, type RequestListener } from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const handler = require("../../api/index.js") as RequestListener;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
  vi.stubEnv("SPREADSHEET_ID", "spreadsheet_test_id_12345");
  vi.stubEnv("JWT_SECRET", "test_secret_that_is_long_enough_for_jwt_testing");
  vi.stubEnv("APPS_SCRIPT_TIMEOUT_MS", "60000");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Vercel API timeout budget", () => {
  it("keeps the upstream deadline below the configured function duration", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: { appsScript: "ok" } }))));
    const response = await request(createServer(handler)).get("/api/system/health");
    expect(response.status).toBe(200);
    const duration = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")).functions["api/index.js"].maxDuration;
    expect(timeout).toHaveBeenCalledWith(55000);
    expect(55000).toBeLessThan(duration * 1000);
  });

  it("ignores invalid timeout values and keeps a safe default", async () => {
    vi.stubEnv("APPS_SCRIPT_TIMEOUT_MS", "invalid");
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: {} }))));
    await request(createServer(handler)).get("/api/system/health");
    expect(timeout).toHaveBeenCalledWith(55000);
  });

  it("raises a legacy short timeout to leave room for Google response recovery", async () => {
    vi.stubEnv("APPS_SCRIPT_TIMEOUT_MS", "1500");
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: {} }))));
    await request(createServer(handler)).get("/api/system/health");
    expect(timeout).toHaveBeenCalledWith(45000);
  });

  it("returns a JSON 504 for login timeouts without retrying credentials", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetchMock = vi.fn(async () => {
      controller.abort();
      throw new Error("The operation was aborted due to timeout");
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).post("/api/auth/login").send({ identifier: "test", password: "test-password" });
    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe("APPS_SCRIPT_TIMEOUT");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves invalid-credential handling", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      success: false, data: null, error: { code: "INVALID_CREDENTIALS", details: "Invalid credentials" }
    })));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).post("/api/auth/login").send({ identifier: "test", password: "wrong-password" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers from a transient Google login 404 using a fresh POST", async () => {
    const user = { id: "test-user", name: "Test User", role: "client", status: "active", clientId: "TEST0001" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html>Page Not Found window['ppConfig'] = {};</html>", { status: 404, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { user }, error: null })));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).post("/api/auth/login").send({ identifier: "test-user", password: "test-password" });
    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("client");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const secondUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(firstUrl.searchParams.has("identifier")).toBe(false);
    expect(firstUrl.searchParams.has("password")).toBe(false);
    expect(firstUrl.searchParams.get("_portalRequest")).not.toBe(secondUrl.searchParams.get("_portalRequest"));
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).password).toBe("test-password");
  });

  it("returns a safe service error for a persistent Google 404", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>Page Not Found window['ppConfig'] = {};</html>", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).post("/api/auth/login").send({ identifier: "test-user", password: "test-password" });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toMatch(/ppConfig|<html>|Page Not Found/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers from an HTML response for a safe read", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html>Error</html>", { headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { appsScript: "ok" }, error: null })));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).get("/api/system/health");
    expect(response.status).toBe(200);
    expect(response.body.data.upstream.data.appsScript).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not repeat registration after an HTTP or HTML failure", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>Page Not Found</html>", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(createServer(handler)).post("/api/auth/register").send({ fullName: "Test", password: "test-password" });
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["client", "admin"])("preserves %s login, role and authenticated data access", async (role) => {
    const clientId = role === "client" ? "TEST0001" : undefined;
    const user = { id: "test-user", name: "Test User", role, status: "active", clientId };
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const action = new URL(String(input)).searchParams.get("action");
      return new Response(JSON.stringify({ success: true, data: action === "login" ? { user } : { totalInvested: 1000 }, error: null }));
    }));
    const agent = request.agent(createServer(handler));
    const login = await agent.post("/api/auth/login").send({ identifier: "test-user", password: "test-password", expectedRole: role });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe(role);
    const dashboard = await agent.get("/api/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalInvested).toBe(1000);
    const restricted = await agent.get(role === "client" ? "/api/admin/spreadsheet-schema" : "/api/client/dashboard");
    expect(restricted.status).toBe(403);
  });
});
