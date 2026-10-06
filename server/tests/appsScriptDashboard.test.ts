import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../google-apps-script/Code.gs", import.meta.url), "utf8");

function createSpreadsheetHarness() {
  const rows: Record<string, unknown[][]> = {
    CLIENTS: [["Client ID", "Name", "Account Status"], ["C001", "First client", "active"], ["C002", "Second client", "inactive"]],
    DASHBOARD: [["Client ID", "Total Invested", "Total Payout", "Net Portfolio", "Total Withdrawal"],
      ["C001", 100000, 10000, 110000, 5000], ["C002", 50000, 5000, 55000, 2000]],
    Investment_Master: [["Investment ID", "Client ID", "Amount", "Monthly Return", "Status", "Start Date"],
      ["I001", "C001", 1000, 100, "active", "2026-01-01"], ["I002", "C002", 2000, 200, "active", "2026-02-01"]],
    TRANSACTIONS: [["Transaction ID", "Client ID", "Date", "Type", "Credit", "Debit"],
      ["T001", "C001", "2026-01-01", "investment", 1000, 0], ["T002", "C002", "2026-02-01", "investment", 2000, 0]],
    Withdrawals: [["Withdrawal ID", "Client ID", "Amount", "Status"], ["W001", "C001", 5000, "pending"]],
    Referrals: [["Referral ID", "Client ID", "Reward Amount", "Paid Amount"], ["R001", "C001", 100, 50]],
    DOCUMENTS: [["Document ID", "Client ID", "Name"], ["D001", "C001", "PAN"], ["D002", "C002", "PAN"]],
    Notifications: [["Notification ID", "Client ID", "Title"], ["N001", "C001", "First message"], ["N002", "C002", "Second message"]],
    KYC: [["Client ID", "KYC Status"], ["C001", "verified"], ["C002", "pending"]]
  };
  const reads = Object.fromEntries(Object.keys(rows).map((name) => [name, vi.fn(() => rows[name])]));
  const sheets = Object.keys(rows).map((name, index) => ({
    getName: () => name, getSheetId: () => index + 1,
    getDataRange: () => ({ getValues: reads[name] })
  }));
  const getSheets = vi.fn(() => sheets);
  const openById = vi.fn(() => ({ getId: () => "test-spreadsheet", getSheets }));
  const context = createContext({
    SpreadsheetApp: { openById },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }
  });
  runInContext(source, context);
  const snapshot = (role = "admin", clientId = "") => runInContext(
    `dashboard(${JSON.stringify({ role, clientId, spreadsheetId: "test-spreadsheet" })})`, context
  ) as {
    totalInvestedAmount: number; currentPortfolioValue: number; availableBalance: number;
    admin?: { totalClients: number }; adminData?: Record<string, Array<{ clientId: string }>>;
    recentTransactions: Array<{ clientId: string }>; documents: Array<{ clientId: string }>;
  };
  return { rows, reads, openById, getSheets, snapshot, context };
}

describe("Apps Script dashboard snapshot", () => {
  it("opens the spreadsheet once and reads each required tab once", () => {
    const harness = createSpreadsheetHarness();
    const result = harness.snapshot();
    expect(harness.openById).toHaveBeenCalledTimes(1);
    expect(harness.getSheets).toHaveBeenCalledTimes(1);
    Object.values(harness.reads).forEach((read) => expect(read).toHaveBeenCalledTimes(1));
    expect(result.admin?.totalClients).toBe(2);
    expect(Object.keys(result.adminData ?? {})).toHaveLength(7);
    expect(result.adminData?.clients).toHaveLength(2);
    expect(result.totalInvestedAmount).toBe(150000);
    expect(result.currentPortfolioValue).toBe(165000);
    expect(result.availableBalance).toBe(143000);
  });

  it("never includes admin collections or another client's rows in a client response", () => {
    const harness = createSpreadsheetHarness();
    harness.snapshot();
    const result = harness.snapshot("client", "C001");
    expect(result.admin).toBeUndefined();
    expect(result.adminData).toBeUndefined();
    expect(result.totalInvestedAmount).toBe(100000);
    expect(result.recentTransactions.map((row) => row.clientId)).toEqual(["C001"]);
    expect(result.documents.map((row) => row.clientId)).toEqual(["C001"]);
    expect(harness.openById).toHaveBeenCalledTimes(2);
  });

  it("reads changed spreadsheet values on the next request", () => {
    const harness = createSpreadsheetHarness();
    harness.snapshot();
    harness.rows.DASHBOARD[1][1] = 120000;
    expect(harness.snapshot().totalInvestedAmount).toBe(170000);
    expect(harness.reads.DASHBOARD).toHaveBeenCalledTimes(2);
    expect(runInContext("DASHBOARD_READ_CONTEXT", harness.context)).toBeNull();
  });

  it("cleans up request-local caches even when a sheet read fails", () => {
    const harness = createSpreadsheetHarness();
    harness.reads.DASHBOARD.mockImplementationOnce(() => { throw new Error("Spreadsheet read failed"); });
    expect(() => harness.snapshot()).toThrow("Spreadsheet read failed");
    expect(runInContext("DASHBOARD_READ_CONTEXT", harness.context)).toBeNull();
    expect(harness.snapshot().totalInvestedAmount).toBe(150000);
    expect(harness.openById).toHaveBeenCalledTimes(2);
  });
});
