import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type { User } from "../src/types/domain.js";

const source = readFileSync(new URL("../../google-apps-script/Code.gs", import.meta.url), "utf8");

function loginHarness() {
  const rows: Record<string, unknown[][]> = {
    CLIENT_CREDENTIALS: [["ClientId (Login ID)", "ClientName", "Password", "Role", "Status"],
      ["KWM0901", "First client", "test-client-password", "Client", "active"],
      ["KWM0902", "Second client", "different-test-password", "Client", "active"],
      ["ADMIN", "Administrator", "test-admin-password", "Admin", "active"]],
    CLIENTS: [["ClientId ", "ClientName", "Email", "Mobile", "Status", "Role"],
      ["KWM0901", "First client", "first@example.test", "9000000001", "active", "client"],
      ["KWM0902", "Second client", "second@example.test", "9000000002", "active", "client"]]
  };
  const sheets = Object.keys(rows).map((name) => ({ getName: () => name, getDataRange: () => ({ getValues: () => rows[name] }) }));
  const sync = vi.fn();
  const context = createContext({
    SpreadsheetApp: { openById: () => ({ getSheets: () => sheets }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }
  });
  runInContext(source, context);
  context.upsertCredentialFromClient = sync;
  const login = (identifier = "KWM0901", password = "test-client-password", expectedRole?: "client" | "admin") => runInContext(
    `login(${JSON.stringify({ identifier, password, expectedRole, spreadsheetId: "test-sheet" })})`, context
  ) as { user: User };
  return { rows, login, sync };
}

describe("Apps Script email and client-ID authentication", () => {
  it("joins a CLIENTS-only email to the existing credential password by Client ID", () => {
    const harness = loginHarness();
    const idLogin = harness.login();
    const emailLogin = harness.login("  FIRST@EXAMPLE.TEST  ");
    expect(emailLogin.user).toEqual(idLogin.user);
    expect(emailLogin.user).toMatchObject({ clientId: "KWM0901", role: "client", status: "active" });
    expect(harness.sync).not.toHaveBeenCalled();
  });

  it("never accepts another client's password for the selected email", () => {
    const harness = loginHarness();
    expect(() => harness.login("first@example.test", "different-test-password")).toThrow("Password does not match");
    expect(harness.sync).not.toHaveBeenCalled();
  });

  it("preserves client-ID aliases and mobile matching", () => {
    const harness = loginHarness();
    expect(harness.login("KMW0901").user.clientId).toBe("KWM0901");
    expect(harness.login("9000000001").user.clientId).toBe("KWM0901");
  });

  it("does not bypass disabled credentials or pending client status through email", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS[1][4] = "inactive";
    expect(harness.login("first@example.test").user.status).toBe("inactive");
    harness.rows.CLIENT_CREDENTIALS[1][4] = "active";
    harness.rows.CLIENTS[1][4] = "pending";
    expect(harness.login("first@example.test").user.status).toBe("pending");
  });

  it("rejects duplicate profile emails instead of selecting the first account", () => {
    const harness = loginHarness();
    harness.rows.CLIENTS[2][2] = "FIRST@example.test";
    expect(() => harness.login("first@example.test")).toThrow("More than one account");
    expect(harness.login().user.clientId).toBe("KWM0901");
  });

  it("rejects conflicting credential-email and profile-email identities", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS[0].push("Email");
    harness.rows.CLIENT_CREDENTIALS[2].push("first@example.test");
    expect(() => harness.login("first@example.test")).toThrow("More than one account");
  });

  it("does not filter duplicate credentials into an arbitrary requested role", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS.push(["KWM0901", "Conflicting account", "test-client-password", "Admin", "active"]);
    expect(() => harness.login("KWM0901", "test-client-password", "admin")).toThrow("More than one account");
  });

  it("uses the credential role, not an editable CLIENTS role field", () => {
    const harness = loginHarness();
    harness.rows.CLIENTS[1][5] = "Admin";
    expect(harness.login("first@example.test").user.role).toBe("client");
    expect(() => harness.login("first@example.test", "test-client-password", "admin")).toThrow("not marked as admin");
    expect(harness.login("ADMIN", "test-admin-password", "admin").user).toMatchObject({ role: "admin", clientId: "" });
  });

  it("continues to support explicit credential emails without a linked profile", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS[0].push("Email");
    harness.rows.CLIENT_CREDENTIALS[3].push("admin@example.test");
    expect(harness.login("ADMIN@example.test", "test-admin-password", "admin").user.role).toBe("admin");
  });

  it("never attaches a different client's profile merely because its email matches", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS[0].push("Email");
    harness.rows.CLIENT_CREDENTIALS[1].push("unrelated@example.test");
    harness.rows.CLIENTS = [harness.rows.CLIENTS[0], ["KWM0999", "Unrelated profile", "unrelated@example.test", "", "inactive", "client"]];
    expect(harness.login("unrelated@example.test").user).toMatchObject({ clientId: "KWM0901", name: "First client", status: "active" });
  });

  it("preserves the existing explicit profile-password migration only after verification", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS.splice(1, 1);
    expect(() => harness.login("first@example.test")).toThrow("no password was found");
    expect(harness.sync).not.toHaveBeenCalled();
    harness.rows.CLIENTS[0].push("Portal Password");
    harness.rows.CLIENTS[1].push("test-client-password");
    expect(harness.login("first@example.test").user.clientId).toBe("KWM0901");
    expect(harness.sync).toHaveBeenCalledOnce();
  });

  it("rejects unknown identifiers without writing credentials", () => {
    const harness = loginHarness();
    expect(() => harness.login("unknown@example.test")).toThrow("Login ID was not found");
    expect(harness.sync).not.toHaveBeenCalled();
  });

  it("reports a missing profile ID link without guessing by name or password", () => {
    const harness = loginHarness();
    harness.rows.CLIENTS[1][0] = "";
    expect(() => harness.login("first@example.test")).toThrow("email is missing its Client ID link");
    expect(harness.sync).not.toHaveBeenCalled();
    expect(harness.login().user.clientId).toBe("KWM0901");
  });

  it("keeps legacy profile-password migration client-only even when a profile claims admin", () => {
    const harness = loginHarness();
    harness.rows.CLIENT_CREDENTIALS.splice(1, 1);
    harness.rows.CLIENTS[0].push("Portal Password");
    harness.rows.CLIENTS[1].push("test-client-password");
    harness.rows.CLIENTS[1][5] = "Admin";
    expect(harness.login("first@example.test").user.role).toBe("client");
    expect(harness.sync).toHaveBeenCalledOnce();
    expect(() => harness.login("first@example.test", "test-client-password", "admin")).toThrow("Login ID was not found");
  });
});
