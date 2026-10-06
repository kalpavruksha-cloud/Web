import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.SPREADSHEET_ID = "spreadsheet_test_id_12345";
  process.env.JWT_SECRET = "test_secret_that_is_long_enough_for_jwt_testing";
  process.env.APPS_SCRIPT_TIMEOUT_MS = "60000";
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pendingFetch(_input: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
}

describe("Apps Script request deadline", () => {
  it("accepts a successful response that takes longer than the old frontend timeout", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      setTimeout(() => resolve(new Response(JSON.stringify({ success: true, data: { value: 10 } }))), 16000);
    })));
    const result = appsScriptService.call("getClientDashboard", { requestId: "slow-read", method: "GET" });
    await vi.advanceTimersByTimeAsync(16000);
    expect((await result).success).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not retry a read after exhausting its deadline", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    vi.useFakeTimers();
    const fetchMock = vi.fn(pendingFetch);
    vi.stubGlobal("fetch", fetchMock);
    const result = appsScriptService.call("getTransactions", { requestId: "read-timeout", method: "GET", retryRead: true });
    await vi.advanceTimersByTimeAsync(60000);
    expect((await result).error?.code).toBe("APPS_SCRIPT_TIMEOUT");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shares the deadline with a safe read retry", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    vi.useFakeTimers();
    const fetchMock = vi.fn(pendingFetch).mockImplementationOnce(() => new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error("Connection reset")), 20000);
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = appsScriptService.call("getProfile", { requestId: "retry-budget", method: "GET", retryRead: true });
    await vi.advanceTimersByTimeAsync(60000);
    expect((await result).error?.code).toBe("APPS_SCRIPT_TIMEOUT");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never retries a failed write", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    const fetchMock = vi.fn().mockRejectedValue(new Error("Connection reset"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await appsScriptService.call("createWithdrawal", { requestId: "write-failure", method: "POST", retryRead: true });
    expect(result.error?.code).toBe("APPS_SCRIPT_UNAVAILABLE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers login from a transient 404 without placing credentials in the URL", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html>Page Not Found</html>", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { user: { role: "client" } } })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await appsScriptService.login("test-user", "test-password", "login-recovery");
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.has("password")).toBe(false);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).password).toBe("test-password");
  });

  it("does not expose a persistent Google HTML error", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    const fetchMock = vi.fn(async () => new Response("<html>window['ppConfig'] = {}; Page Not Found</html>", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await appsScriptService.login("test-user", "test-password", "persistent-error");
    expect(result.error?.code).toBe("APPS_SCRIPT_DEPLOYMENT_UNAVAILABLE");
    expect(JSON.stringify(result)).not.toMatch(/ppConfig|<html>/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a legacy mutation transported through GET", async () => {
    const { appsScriptService } = await import("../src/services/appsScriptService.js");
    const fetchMock = vi.fn(async () => new Response("<html>Error</html>", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await appsScriptService.call("updateProfile", { requestId: "legacy-write", method: "GET", retryRead: true });
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
