import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

afterEach(() => vi.restoreAllMocks());

describe("portal request timeouts", () => {
  it("leaves time for the backend deadline and response delivery", () => {
    expect(api.defaults.timeout).toBeGreaterThan(60000);
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("shows a useful read timeout message", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout of 75000ms exceeded", "ECONNABORTED", config);
    });
    await expect(api.get("/client/dashboard", { adapter })).rejects.toThrow("taking longer than expected");
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("does not resubmit a timed-out write", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout", "ETIMEDOUT", config);
    });
    await expect(api.post("/client/withdrawals", { amount: 1000 }, { adapter })).rejects.toThrow("Check the latest status");
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("preserves the backend error message", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Request failed with status code 504", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
        config, status: 504, statusText: "Gateway Timeout", headers: {},
        data: { success: false, error: { code: "APPS_SCRIPT_TIMEOUT", details: "The spreadsheet service took too long to respond." } }
      });
    });
    await expect(api.get("/client/profile", { adapter })).rejects.toThrow("The spreadsheet service took too long");
  });
});
