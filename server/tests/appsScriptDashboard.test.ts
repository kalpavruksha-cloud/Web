import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type { DashboardSummary, AdminFinancialAnalytics } from "../src/types/domain.js";

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
  ) as DashboardSummary;
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
    expect(result.admin?.netInvestment).toBe(143000);
    expect(result.admin?.totalPayoutAmount).toBe(15000);
    expect(result.admin?.pendingWithdrawalAmount).toBe(5000);
    expect(result.admin?.verifiedKyc).toBe(1);
    expect(result.admin?.pendingKyc).toBe(1);
  });

  it("never includes admin collections or another client's rows in a client response", () => {
    const harness = createSpreadsheetHarness();
    harness.snapshot();
    const result = harness.snapshot("client", "C001");
    expect(result.admin).toBeUndefined();
    expect(result.adminData).toBeUndefined();
    expect(result.adminAnalytics).toBeUndefined();
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

type AnalyticsResult = AdminFinancialAnalytics & {
  estimatedMonthlyPayout: number | null;
  payoutEstimateMissingRecords: number;
  completedWithdrawalTotal: number;
  recordedPayoutTotal: number;
};

function analytics(investments: Array<Record<string, unknown>>, transactions: Array<Record<string, unknown>>, withdrawals: Array<Record<string, unknown>>, totalInvested = 0): AnalyticsResult {
  const harness = createSpreadsheetHarness();
  return runInContext(`buildAdminFinancialAnalytics(${JSON.stringify(investments)}, ${JSON.stringify(transactions)}, ${JSON.stringify(withdrawals)}, ${totalInvested}, new Date("2026-10-14T08:00:00Z"))`, harness.context) as AnalyticsResult;
}

describe("admin financial analytics", () => {
  it("uses completed investment ledger entries without double counting master records", () => {
    const result = analytics([{ status: "active", principalAmount: 999999, startDate: "2026-01-01", monthlyReturn: 100 }], [
      { type: "investment", status: "posted", date: "14/02/2026", credit: 2000, debit: 0 },
      { type: "investment", status: "completed", date: "05/01/2026", credit: 1000, debit: 0 },
      { type: "interest", status: "completed", date: "2026-01-01", credit: 50, debit: 0 },
      { type: "investment", status: "pending", date: "2026-01-01", credit: 7000, debit: 0 },
      { type: "investment", status: "posted", date: "2026-11-01", credit: 9000, debit: 0 }
    ], []);
    expect(result.currentYear).toBe(2026);
    expect(result.currentMonth).toBe(10);
    expect(result.investmentSource).toBe("transaction_ledger");
    expect(result.investmentMonths).toEqual([{ month: "2026-01", amount: 1000 }, { month: "2026-02", amount: 2000 }]);
    expect(result.payoutMonths).toEqual([{ month: "2026-01", amount: 50 }]);
  });

  it("excludes pending/rejected withdrawals and avoids counting the same payout in two modules", () => {
    const result = analytics([], [
      { type: "withdrawal", status: "paid", date: "08/10/2026", debit: 5000, credit: 0 },
      { type: "withdrawal", status: "pending", date: "2026-10-09", debit: 9000, credit: 0 },
      { type: "withdrawal", status: "rejected", date: "2026-10-10", debit: 8000, credit: 0 }
    ], [{ status: "paid", paymentDate: "2026-10-08", amount: 5000 }]);
    expect(result.withdrawalSource).toBe("transaction_ledger");
    expect(result.withdrawalDays).toEqual([{ date: "2026-10-08", amount: 5000 }]);
    expect(result.completedWithdrawalTotal).toBe(5000);
  });

  it("uses paid dates, not request dates, for withdrawal-record charts", () => {
    const result = analytics([], [], [
      { status: "paid", requestDate: "2026-01-01", paymentDate: "2026-02-20", amount: 1000 },
      { status: "pending", requestDate: "2026-03-01", amount: 9999 },
      { status: "paid", requestDate: "2026-04-01", amount: 3000 }
    ]);
    expect(result.withdrawalMonths).toEqual([{ month: "2026-02", amount: 1000 }]);
    expect(result.warnings.some((warning) => warning.includes("missing or invalid dates"))).toBe(true);
  });

  it("estimates the current month from eligible recurring and explicitly scheduled payouts", () => {
    const result = analytics([
      { status: "active", startDate: "2026-01-01", monthlyReturn: 1000 },
      { status: "active", nextPayoutDate: "20/10/2026", monthlyReturn: 500, payoutFrequency: "monthly" },
      { status: "closed", monthlyReturn: 9000 },
      { status: "active", startDate: "2026-11-01", monthlyReturn: 8000 },
      { status: "active", maturityDate: "2026-09-30", monthlyReturn: 7000 },
      { status: "active", nextPayoutDate: "2026-11-15", monthlyReturn: 6000 }
    ], [], []);
    expect(result.estimatedMonthlyPayout).toBe(1500);
    expect(result.payoutEstimateMissingRecords).toBe(0);
  });

  it("does not invent a payout from an unspecified ROI or a missing investment schedule", () => {
    expect(analytics([{ status: "active", principalAmount: 100000, returnRate: 12 }], [], []).estimatedMonthlyPayout).toBeNull();
    expect(analytics([], [], [], 100000).estimatedMonthlyPayout).toBeNull();
    expect(analytics([{ status: "active", monthlyReturn: 0 }], [], []).estimatedMonthlyPayout).toBe(0);
    expect(analytics([{ status: "active", monthlyReturn: 1000, payoutFrequency: "quarterly" }], [], []).estimatedMonthlyPayout).toBeNull();
  });

  it("maps explicit admin investment aliases and flags invalid monthly amounts", () => {
    const harness = createSpreadsheetHarness();
    const mapped = runInContext('mapAdminInvestment({"Investment Amount":100000,"Invested Date":"14/10/2026","Monthly Interest":"1,500","Status":"Active"})', harness.context) as { principalAmount: number; startDate: string; monthlyReturn?: number };
    expect(mapped).toMatchObject({ principalAmount: 100000, startDate: "2026-10-14", monthlyReturn: 1500 });
    const invalid = runInContext('mapAdminInvestment({"Monthly Return":"pending","ROI":12})', harness.context) as { monthlyReturn?: number };
    expect(invalid.monthlyReturn).toBeUndefined();
  });

  it("handles Indian dates, leap years, invalid dates and India calendar boundaries", () => {
    const harness = createSpreadsheetHarness();
    expect(runInContext('adminCalendarDay("29/02/2024")', harness.context)).toBe("2024-02-29");
    expect(runInContext('adminCalendarDay("31/02/2026")', harness.context)).toBe("");
    expect(runInContext('adminCalendarDay(new Date("2026-09-30T20:00:00Z"))', harness.context)).toBe("2026-10-01");
  });

  it("records an actual payment timestamp only when a withdrawal is marked paid", () => {
    const harness = createSpreadsheetHarness();
    const update = vi.fn();
    harness.context.updateRecord = update;
    runInContext('markWithdrawalPaid({id:"W001",paymentReference:"REF-001"})', harness.context);
    const paidValues = update.mock.calls[0][4] as Record<string, unknown>;
    expect(paidValues.Status).toBe("paid");
    expect(paidValues["Payment Reference"]).toBe("REF-001");
    expect(new Date(String(paidValues["Payment Date"])).getTime()).toBeGreaterThan(0);
    runInContext('approveWithdrawal({id:"W001"})', harness.context);
    expect(update.mock.calls[1][4]).not.toHaveProperty("Payment Date");
  });
});
