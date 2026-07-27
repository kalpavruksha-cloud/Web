import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.SPREADSHEET_ID = "spreadsheet_test_id_12345";
  process.env.JWT_SECRET = "test_secret_that_is_long_enough_for_jwt_testing";
});

describe("auth and role protection", () => {
  it("rejects unauthenticated admin schema access", async () => {
    const { createApp } = await import("../src/app.js");
    const response = await request(createApp()).get("/api/admin/spreadsheet-schema");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns validation errors for malformed login", async () => {
    const { createApp } = await import("../src/app.js");
    const response = await request(createApp()).post("/api/auth/login").send({ identifier: "", password: "" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("checks health without authentication", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, error: "Invalid action" }), { status: 200 })));
    const { createApp } = await import("../src/app.js");
    const response = await request(createApp()).get("/api/system/health");
    expect(response.status).toBe(503);
    expect(response.body.data.appsScriptConnectivity).toBe("reachable");
  });
});
