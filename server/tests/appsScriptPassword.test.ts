import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../google-apps-script/Code.gs", import.meta.url), "utf8");
const oldPassword = "old-test-password";
const newPassword = "new-test-password";

function harness() {
  const rows: Record<string, unknown[][]> = {
    CLIENT_CREDENTIALS: [["ClientId (Login ID)", "ClientName", "Password", "Role", "Status", "LastPasswordChange"],
      ["C001", "First client", oldPassword, "client", "active", ""],
      ["C002", "Second client", "other-test-password", "client", "active", ""],
      ["ADMIN", "Administrator", "admin-test-password", "admin", "active", ""]],
    CLIENTS: [["ClientId ", "ClientName", "Email", "Status"], ["C001", "First client", "first@example.test", "active"], ["C002", "Second client", "second@example.test", "active"]],
    ACTIVITY_LOG: [["Timestamp", "User", "Role", "Action", "Module", "RecordId", "RequestId"]]
  };
  const writes: Array<{ sheet: string; row: number; column: number; value: unknown }> = [];
  const format = vi.fn();
  let ignorePasswordWrite = false;
  const sheets = Object.keys(rows).map((name) => ({
    getName: () => name,
    getDataRange: () => ({ getValues: () => rows[name].map((row) => [...row]) }),
    appendRow: (row: unknown[]) => { rows[name].push([...row]); },
    getRange: (row: number, column: number) => ({
      setNumberFormat: (value: string) => { format(name, row, column, value); },
      setValue(value: unknown) {
        writes.push({ sheet: name, row, column, value });
        if (ignorePasswordWrite && name === "CLIENT_CREDENTIALS" && row === 2 && column === 3) return;
        (rows[name][row - 1] ??= [])[column - 1] = typeof value === "string" && value.startsWith("'=") ? value.slice(1) : value;
      }
    })
  }));
  const waitLock = vi.fn();
  const releaseLock = vi.fn();
  const flush = vi.fn();
  const context = createContext({
    SpreadsheetApp: { openById: () => ({ getSheets: () => sheets }), flush },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    LockService: { getScriptLock: () => ({ waitLock, releaseLock }) },
    Utilities: { getUuid: () => "test-request" },
    ContentService: { MimeType: { JSON: "application/json" }, createTextOutput: (value: string) => ({ setMimeType: () => JSON.parse(value) }) }
  });
  runInContext(source, context);
  function change(overrides: Record<string, unknown> = {}) {
    context.input = { clientId: "C001", actorId: "C001", role: "client", currentPassword: oldPassword, newPassword, confirmPassword: newPassword, spreadsheetId: "test-sheet", requestId: "test-request", ...overrides };
    return runInContext("changeClientPassword(input)", context);
  }
  function login(identifier = "C001", password = oldPassword) {
    context.loginInput = { identifier, password, spreadsheetId: "test-sheet" };
    return runInContext("login(loginInput)", context);
  }
  return { rows, writes, format, change, login, context, waitLock, releaseLock, flush, ignoreWrite: () => { ignorePasswordWrite = true; } };
}

describe("Apps Script password authority and persistence", () => {
  it("writes and reads back the credential password; old password fails for both ID and email", () => {
    const h = harness();
    expect(h.login().user.clientId).toBe("C001");
    const other = [...h.rows.CLIENT_CREDENTIALS[2]];
    expect(h.change()).toMatchObject({ updated: true, verified: true, clientId: "C001" });
    expect(h.rows.CLIENT_CREDENTIALS[1][2]).toBe(newPassword);
    expect(h.rows.CLIENT_CREDENTIALS[1][5]).toBeTruthy();
    expect(h.rows.CLIENT_CREDENTIALS[2]).toEqual(other);
    expect(h.login("C001", newPassword).user.clientId).toBe("C001");
    expect(h.login("first@example.test", newPassword).user.clientId).toBe("C001");
    expect(() => h.login("C001", oldPassword)).toThrow("Password does not match");
    expect(() => h.login("first@example.test", oldPassword)).toThrow("Password does not match");
    expect(h.waitLock).toHaveBeenCalledWith(15000);
    expect(h.releaseLock).toHaveBeenCalledOnce();
    expect(h.flush).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(h.rows.ACTIVITY_LOG)).not.toContain(oldPassword);
    expect(JSON.stringify(h.rows.ACTIVITY_LOG)).not.toContain(newPassword);
  });

  it("uses canonical Password even when a legacy password column comes first; updates every mirror", () => {
    const h = harness();
    h.rows.CLIENT_CREDENTIALS.forEach((row, index) => row.unshift(index ? "stale-legacy-value" : "Portal Password"));
    h.rows.CLIENTS[0].push("Portal Password", "Temp Password");
    h.rows.CLIENTS[1].push("old-profile-value", "old-temporary-value");
    expect(h.login().user.clientId).toBe("C001");
    expect(h.change().verified).toBe(true);
    expect(h.rows.CLIENT_CREDENTIALS[1][0]).toBe(newPassword);
    expect(h.rows.CLIENT_CREDENTIALS[1][3]).toBe(newPassword);
    expect(h.rows.CLIENTS[1].slice(-2)).toEqual([newPassword, newPassword]);
    expect(() => h.login("C001", "stale-legacy-value")).toThrow("Password does not match");
  });

  it("never falls back to a stale CLIENTS password when a credential row exists", () => {
    const h = harness();
    h.rows.CLIENTS[0].push("Portal Password");
    h.rows.CLIENTS[1].push(oldPassword);
    h.rows.CLIENT_CREDENTIALS[1][2] = "";
    expect(() => h.login()).toThrow("Password is not configured");
    expect(h.writes).toHaveLength(0);
  });

  it("rejects duplicate credential IDs before any write", () => {
    const h = harness();
    h.rows.CLIENT_CREDENTIALS.push([...h.rows.CLIENT_CREDENTIALS[1]]);
    expect(() => h.change()).toThrow("More than one credential row");
    expect(() => h.login()).toThrow("More than one account");
    expect(h.writes).toHaveLength(0);
    expect(h.releaseLock).toHaveBeenCalledOnce();
  });

  it("rejects wrong current passwords, mismatched confirmation and whitespace-equivalent replacements", () => {
    const h = harness();
    expect(() => h.change({ currentPassword: "wrong-password" })).toThrow("Current password is incorrect");
    expect(() => h.change({ confirmPassword: "different-password" })).toThrow("do not match");
    expect(() => h.change({ newPassword: ` ${oldPassword} `, confirmPassword: ` ${oldPassword} ` })).toThrow("start or end with spaces");
    expect(() => h.change({ newPassword: oldPassword, confirmPassword: oldPassword })).toThrow("different from current");
    expect(() => h.change({ newPassword: "short", confirmPassword: "short" })).toThrow("between 6 and 100");
    expect(h.writes).toHaveLength(0);
  });

  it("never allows client settings to alter an admin account or inactive account", () => {
    const h = harness();
    expect(() => h.change({ clientId: "ADMIN", currentPassword: "admin-test-password" })).toThrow("cannot be changed from client settings");
    h.rows.CLIENTS[1][3] = "inactive";
    expect(() => h.change()).toThrow("not active");
    expect(() => h.change({ role: "admin" })).toThrow("client account settings");
    expect(h.writes).toHaveLength(0);
  });

  it("does not report success if the credential write did not persist", () => {
    const h = harness();
    h.ignoreWrite();
    expect(() => h.change()).toThrow("saved password could not be confirmed");
    expect(h.login().user.clientId).toBe("C001");
    expect(() => h.login("C001", newPassword)).toThrow("Password does not match");
    expect(h.rows.ACTIVITY_LOG).toHaveLength(1);
    expect(h.rows.CLIENT_CREDENTIALS[1][5]).toBe("");
  });

  it("preserves leading zeros and formula-like characters as literal password text", () => {
    const h = harness();
    expect(h.change({ newPassword: "00001234", confirmPassword: "00001234" }).verified).toBe(true);
    expect(h.rows.CLIENT_CREDENTIALS[1][2]).toBe("00001234");
    expect(h.change({ currentPassword: "00001234", newPassword: "=secret123", confirmPassword: "=secret123" }).verified).toBe(true);
    expect(h.writes.some((write) => write.value === "'=secret123")).toBe(true);
    expect(h.login("C001", "=secret123").user.clientId).toBe("C001");
    expect(h.format).toHaveBeenCalledWith("CLIENT_CREDENTIALS", 2, 3, "@");
  });

  it("handles normalized headers and legacy client-ID spellings without appending a shadow ID column", () => {
    const h = harness();
    h.rows.CLIENT_CREDENTIALS[0][0] = " client_id ";
    h.rows.CLIENT_CREDENTIALS[0][2] = " LOGIN_PASSWORD ";
    h.rows.CLIENT_CREDENTIALS[1][0] = "KWM0901";
    h.rows.CLIENTS[1][0] = "KWM0901";
    const headers = [...h.rows.CLIENT_CREDENTIALS[0]];
    expect(h.change({ clientId: "KMW0901" }).verified).toBe(true);
    expect(h.login("KWM0901", newPassword).user.clientId).toBe("KWM0901");
    expect(h.rows.CLIENT_CREDENTIALS[0]).toEqual(headers);
  });

  it("serializes repeated submissions so the old password cannot change the account twice", () => {
    const h = harness();
    h.change();
    expect(() => h.change({ newPassword: "another-test-password", confirmPassword: "another-test-password" })).toThrow("Current password is incorrect");
    expect(h.rows.CLIENT_CREDENTIALS[1][2]).toBe(newPassword);
    expect(h.waitLock).toHaveBeenCalledTimes(2);
    expect(h.releaseLock).toHaveBeenCalledTimes(2);
  });

  it("rejects password changes transported in Google URL parameters", () => {
    const h = harness();
    h.context.event = { parameter: { action: "changeClientPassword", clientId: "C001", currentPassword: oldPassword, newPassword } };
    expect(runInContext("doGet(event)", h.context).error.code).toBe("METHOD_NOT_ALLOWED");
    h.context.event = { parameter: { payload: JSON.stringify({ action: " changeClientPassword ", ...h.context.input }) } };
    expect(runInContext("doGet(event)", h.context).error.code).toBe("METHOD_NOT_ALLOWED");
    expect(h.writes).toHaveLength(0);
  });
});
