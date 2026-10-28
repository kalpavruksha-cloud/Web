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
  it("reads new DASHBOARD amounts directly, scopes clients and sums admin values only once", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.DASHBOARD[0].push(" present_investment ", "MONTHLY PAYOUT");
    harness.rows.DASHBOARD[1].push("INR 95,000", 1500);
    harness.rows.DASHBOARD[2].push(48000, "2,500");
    const admin = harness.snapshot();
    expect(admin.presentInvestment).toBe(143000);
    expect(admin.monthlyPayout).toBe(4000);
    expect(admin.adminAnalytics?.sources?.find((row) => row.module === "dashboard")?.headers).toContain("MONTHLY PAYOUT");
    expect(harness.reads.DASHBOARD).toHaveBeenCalledTimes(1);
    const client = harness.snapshot("client", "C001");
    expect(client.presentInvestment).toBe(95000);
    expect(client.monthlyPayout).toBe(1500);
    expect(client.admin).toBeUndefined();
    expect(admin.adminAnalytics?.payoutScheduleSource).toBe("dashboard");
    expect(admin.admin?.scheduledMonthlyPayout).toBe(4000);
    expect(admin.admin?.remainingMonthlyPayout).toBe(4000);
  });

  it("preserves genuine zeros and does not derive missing new columns from old totals", () => {
    const harness = createSpreadsheetHarness();
    expect(harness.snapshot().presentInvestment).toBeUndefined();
    expect(harness.snapshot().monthlyPayout).toBeUndefined();
    harness.rows.DASHBOARD[0].push("Present Investment", "Monthly Payout");
    harness.rows.DASHBOARD[1].push(0, 0);
    harness.rows.DASHBOARD[2].push(0, 0);
    const result = harness.snapshot();
    expect(result.presentInvestment).toBe(0);
    expect(result.monthlyPayout).toBe(0);
  });

  it("flags incomplete new column values instead of showing partial totals or fake zero", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.DASHBOARD[0].push("Present Investment", "Monthly Payout");
    harness.rows.DASHBOARD[1].push(95000, "#REF!");
    harness.rows.DASHBOARD[2].push("", 2000);
    const result = harness.snapshot();
    expect(result.presentInvestment).toBeNull();
    expect(result.monthlyPayout).toBeNull();
    expect(result.adminAnalytics?.warnings.some((warning) => warning.includes("Monthly Payout has blank or invalid"))).toBe(true);
    expect(result.availableBalance).toBe(143000);
    expect(harness.snapshot("client", "C001").presentInvestment).toBe(95000);
    expect(harness.snapshot("client", "C002").monthlyPayout).toBe(2000);
  });

  it("does not add a footer total to client-row sums in the new columns", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.DASHBOARD[0].push("Present Investment", "Monthly Payout");
    harness.rows.DASHBOARD[1].push(95000, 1500);
    harness.rows.DASHBOARD[2].push(48000, 2500);
    harness.rows.DASHBOARD.push(["", "", "", "", "", 143000, 4000]);
    expect(harness.snapshot().presentInvestment).toBe(143000);
    expect(harness.snapshot().monthlyPayout).toBe(4000);
  });

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

  it("prefers actual master/register tabs even when a plan catalog and old ledger come first", () => {
    const harness = createSpreadsheetHarness();
    const originalSheets = harness.getSheets();
    const catalogRead = vi.fn(() => [["Plan ID", "Plan Name"], ["CATALOG", "Not a client investment"]]);
    const ledgerRead = vi.fn(() => [["Transaction ID", "Client ID", "Txn Date", "Txn Type", "Credit Amount", "Debit Amount", "Transaction Status"], ["ACTUAL-1", "C001", "15/09/2026", "investment", "₹50,000", 0, "Posted"]]);
    harness.getSheets.mockReturnValue([
      { getName: () => "INVESTMENT_PLANS", getSheetId: () => 90, getDataRange: () => ({ getValues: catalogRead }) },
      ...originalSheets,
      { getName: () => "Transaction_Register", getSheetId: () => 91, getDataRange: () => ({ getValues: ledgerRead }) }
    ]);
    const result = harness.snapshot();
    expect(result.adminData?.investments[0].id).toBe("I001");
    expect(result.adminData?.transactions[0].id).toBe("ACTUAL-1");
    expect(result.adminData?.transactions[0].credit).toBe(50000);
    expect(result.adminAnalytics?.investmentSource).toBe("investment_master");
    expect(result.adminAnalytics?.investmentMonths).toEqual([{ month: "2026-01", amount: 1000 }, { month: "2026-02", amount: 2000 }]);
    expect(result.adminAnalytics?.sources?.find((source) => source.module === "transactions")?.sheet).toBe("Transaction_Register");
    expect(result.adminAnalytics?.sources?.find((source) => source.module === "investments")?.sheet).toBe("Investment_Master");
    expect(catalogRead).not.toHaveBeenCalled();
    expect(harness.reads.TRANSACTIONS).not.toHaveBeenCalled();
    expect(ledgerRead).toHaveBeenCalledTimes(1);
    expect(harness.openById).toHaveBeenCalledTimes(1);
  });

  it("charts dated investment and withdrawal master records without requiring workflow status", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.Investment_Master = [["Investment ID", "Client_ID", "Date of Investment", "Investment Amount", "Investment Status"],
      ["I001", "C001", "10/01/2026", "INR 10,000", ""], ["I002", "C002", "15/02/2026", 20000, "Active"],
      ["I003", "C001", "15/02/2026", 90000, "Pending"], ["I004", "C001", "15/02/2026", 80000, "Rejected"]];
    const historyRead = vi.fn(() => [["Client_ID", "Withdrawal Date", "Withdrawal Amount", "Status"],
      ["C001", "20/03/2026", "INR 2,000", ""], ["C002", "25/04/2026", 3000, "Paid"],
      ["C001", "25/04/2026", 8000, "Pending"], ["C001", "25/04/2026", 9000, "Rejected"],
      ["C001", "25/04/2026", 7000, "Approved"]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), {
      getName: () => "Withdrawal_Master", getSheetId: () => 92, getDataRange: () => ({ getValues: historyRead })
    }]);
    const result = harness.snapshot();
    expect(result.adminAnalytics?.investmentMonths).toEqual([{ month: "2026-01", amount: 10000 }, { month: "2026-02", amount: 20000 }]);
    expect(result.adminAnalytics?.withdrawalSource).toBe("withdrawal_master");
    expect(result.adminAnalytics?.withdrawalMonths).toEqual([{ month: "2026-03", amount: 2000 }, { month: "2026-04", amount: 3000 }]);
    expect(result.admin?.pendingWithdrawalAmount).toBe(5000);
    expect(result.adminAnalytics?.sources?.find((item) => item.module === "withdrawal_history")?.sheet).toBe("Withdrawal_Master");
    expect(result.adminData?.withdrawals.filter((row) => row.readOnly)).toHaveLength(5);
    expect(result.adminData?.withdrawals.find((row) => row.recordSource === "withdrawal_master" && row.amount === 2000)).toMatchObject({ clientId: "C001", amount: 2000, requestDate: "", paymentDate: "2026-03-20", readOnly: true });
    expect(historyRead).toHaveBeenCalledTimes(1);
    expect(harness.openById).toHaveBeenCalledTimes(1);
  });

  it("returns only the signed-in client's historical withdrawals and refuses unscoped reads", () => {
    const harness = createSpreadsheetHarness();
    const historyRead = vi.fn(() => [["Client ID", "Date", "Amount"], ["C002", "2026-01-01", 9000], [" c001 ", "2026-02-01", 2000]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), { getName: () => "Withdrawal_Master", getSheetId: () => 93, getDataRange: () => ({ getValues: historyRead }) }]);
    const result = runInContext('getWithdrawals({role:"client",clientId:"C001"})', harness.context) as Array<{ clientId: string; readOnly?: boolean }>;
    expect(result).toHaveLength(2);
    expect(result.filter((row) => row.readOnly)).toMatchObject([{ clientId: "c001", readOnly: true }]);
    expect(result.some((row) => row.clientId === "C002")).toBe(false);
    expect(historyRead).toHaveBeenCalledTimes(1);
    expect(() => runInContext('getWithdrawals({role:"client"})', harness.context)).toThrow("A client session is required");
    expect(() => runInContext('readAdminWithdrawalHistory({role:"client",clientId:"C001"})', harness.context)).toThrow("Administrator access");
  });

  it("uses an explicit INR monthly amount on a dated master investment without inventing an ROI", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.Investment_Master = [["Investment ID", "Client ID", "Amount", "Monthly Payout Amount", "Date of Investment"], ["I001", "C001", 100000, "INR 1,500", "2026-01-01"]];
    const result = harness.snapshot();
    expect(result.admin?.scheduledMonthlyPayout).toBe(1500);
    expect(result.admin?.paidMonthlyPayout).toBe(0);
    expect(result.admin?.remainingMonthlyPayout).toBe(1500);
  });

  it("deduplicates only explicit matching client/record IDs, not coincident amounts and dates", () => {
    const harness = createSpreadsheetHarness();
    const historyRead = vi.fn(() => [["Withdrawal ID", "Client ID", "Date", "Amount"],
      ["W001", " c001 ", "2026-01-01", 5000], ["", "C001", "2026-01-01", 5000], ["", "C001", "2026-01-01", 5000]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), { getName: () => "Withdrawal_Master", getSheetId: () => 93, getDataRange: () => ({ getValues: historyRead }) }]);
    const result = harness.snapshot();
    expect(result.adminData?.withdrawals).toHaveLength(3);
    expect(result.adminData?.withdrawals.filter((row) => row.id === "W001")).toHaveLength(1);
    expect(result.adminAnalytics?.withdrawalMonths).toEqual([{ month: "2026-01", amount: 15000 }]);
    expect(historyRead).toHaveBeenCalledTimes(1);
  });
});

describe("client history and linked financial totals", () => {
  it("joins CLIENTS Date of payout by client without replacing historical transaction dates", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.CLIENTS[0].push(" Date of payout ");
    harness.rows.CLIENTS[1].push("15/11/2026");
    harness.rows.CLIENTS[2].push(20);
    const result = harness.snapshot();
    expect(result.adminData?.transactions.find((row) => row.clientId === "C001")).toMatchObject({ date: "2026-01-01", scheduledPayoutDate: "2026-11-15" });
    expect(result.adminData?.transactions.find((row) => row.clientId === "C002")).toMatchObject({ date: "2026-02-01", scheduledPayoutDate: "20" });
    expect(harness.reads.CLIENTS).toHaveBeenCalledTimes(1);
    const client = runInContext('getTransactions({role:"client",clientId:"C001"})', harness.context) as Array<{ clientId: string; scheduledPayoutDate?: string }>;
    expect(client).toHaveLength(1);
    expect(client[0].scheduledPayoutDate).toBe("2026-11-15");
    expect(client.some((row) => row.clientId === "C002")).toBe(false);
  });

  it("reads schedule edits on the next request and does not guess blank or conflicting dates", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.CLIENTS[0].push("date_of_payout");
    harness.rows.CLIENTS[1].push("5th");
    harness.rows.CLIENTS[2].push("");
    const rows = () => runInContext('getTransactions({role:"admin"})', harness.context) as Array<{ clientId: string; scheduledPayoutDate?: string | null }>;
    expect(rows()[0].scheduledPayoutDate).toBe("5");
    expect(rows()[1].scheduledPayoutDate).toBe("");
    harness.rows.CLIENTS[1][3] = 10;
    expect(rows()[0].scheduledPayoutDate).toBe("10");
    harness.rows.CLIENTS.push([" c001 ", "Duplicate", "active", 15]);
    expect(rows()[0].scheduledPayoutDate).toBeNull();
  });

  it("normalizes only explicit calendar dates or recurring payout days", () => {
    const harness = createSpreadsheetHarness();
    expect(runInContext('clientPayoutDate(new Date("2026-10-28T00:00:00Z"))', harness.context)).toBe("2026-10-28");
    expect(runInContext('clientPayoutDate("21st of every month")', harness.context)).toBe("21");
    expect(runInContext('clientPayoutDate("31/02/2026")', harness.context)).toBeNull();
    expect(runInContext('clientPayoutDate("32")', harness.context)).toBeNull();
    expect(runInContext('clientPayoutDate("pending")', harness.context)).toBeNull();
    expect(runInContext('clientPayoutDate("")', harness.context)).toBeUndefined();
    expect(runInContext('mapProfile({"Client ID":"C001","Date of payout":"10th"}).payoutDate', harness.context)).toBe("10");
  });

  it("builds 12 client months from the entire ledger, including its opening balance", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.Investment_Master = [harness.rows.Investment_Master[0]];
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    harness.rows.TRANSACTIONS = [["Transaction ID", "Client ID", "Date", "Type", "Credit", "Debit", "Status"],
      ["OPEN", "C001", "2020-01-01", "investment", 100000, 0, "posted"]];
    for (let index = 0; index < 50; index++) harness.rows.TRANSACTIONS.push([String(index), "C001", new Date(Date.UTC(year, month - 2, 1 + index)).toISOString().slice(0, 10), "investment", 100, 0, "posted"]);
    harness.rows.TRANSACTIONS.push(["PENDING", "C001", "2020-01-01", "investment", 900000, 0, "pending"], ["OTHER", "C002", "2020-01-01", "investment", 800000, 0, "posted"]);
    const result = harness.snapshot("client", "C001");
    expect(result.portfolioHistory?.months).toHaveLength(12);
    expect(result.portfolioHistory?.months[0].amount).toBe(100000);
    expect(result.portfolioHistory?.months[11].amount).toBe(105000);
    expect(result.portfolioHistory?.matchesCurrentPortfolio).toBe(false);
    expect(result.adminClientSummaries).toBeUndefined();
    expect(result.adminAnalytics).toBeUndefined();
    expect(harness.reads.TRANSACTIONS).toHaveBeenCalledTimes(1);
  });

  it("shows only a current snapshot when historical dates do not exist", () => {
    const harness = createSpreadsheetHarness();
    harness.rows.Investment_Master = [harness.rows.Investment_Master[0]];
    harness.rows.TRANSACTIONS = [harness.rows.TRANSACTIONS[0]];
    const result = harness.snapshot("client", "C001");
    expect(result.portfolioHistory?.source).toBe("current_snapshot");
    expect(result.portfolioHistory?.months.slice(0, 11).every((row) => row.amount === null)).toBe(true);
    expect(result.portfolioHistory?.months[11].amount).toBe(110000);
  });

  it("uses the actual register and normalized financial fields for client reads too", () => {
    const harness = createSpreadsheetHarness();
    const register = vi.fn(() => [["Transaction ID", "Client ID", "Txn Date", "Txn Type", "Credit Amount", "Transaction Status"],
      ["ACTUAL", "C001", "15/09/2026", "investment", "INR 5,000", "posted"], ["OTHER", "C002", "15/09/2026", "investment", 9000, "posted"]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), { getName: () => "Transaction_Register", getSheetId: () => 99, getDataRange: () => ({ getValues: register }) }]);
    const result = harness.snapshot("client", "C001");
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0]).toMatchObject({ id: "ACTUAL", date: "2026-09-15", credit: 5000 });
    expect(harness.reads.TRANSACTIONS).not.toHaveBeenCalled();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("returns four client-linked DASHBOARD totals in the existing admin snapshot", () => {
    const harness = createSpreadsheetHarness();
    const result = harness.snapshot();
    expect(result.adminClientSummaries).toEqual([
      { clientId: "C001", totalInvestment: 100000, totalWithdrawal: 5000, totalPayout: 10000, totalPortfolio: 110000 },
      { clientId: "C002", totalInvestment: 50000, totalWithdrawal: 2000, totalPayout: 5000, totalPortfolio: 55000 }
    ]);
    harness.rows.DASHBOARD[1][2] = "#REF!";
    expect(harness.snapshot().adminClientSummaries?.[0].totalPayout).toBeNull();
    expect(harness.snapshot("client", "C001").adminClientSummaries).toBeUndefined();
  });

  it("does not allow clients to cancel a historical pending entry", () => {
    const harness = createSpreadsheetHarness();
    harness.context.getWithdrawals = () => [{ id: "OLD", clientId: "C001", status: "pending", readOnly: true }];
    const update = vi.fn();
    harness.context.updateRecord = update;
    expect(() => runInContext('cancelWithdrawal({role:"client",clientId:"C001",id:"OLD"})', harness.context)).toThrow("Only pending portal");
    expect(update).not.toHaveBeenCalled();
  });

  it("scopes supported client-code headers and reads paid-status/date aliases", () => {
    const harness = createSpreadsheetHarness();
    const read = vi.fn(() => [["Client_Code", "Paid On", "Withdrawal Amount", "Payment Status"], ["C001", "15/10/2026", 2000, "Paid"], ["C002", "15/10/2026", 9000, "Paid"]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), { getName: () => "Withdrawal_Master", getSheetId: () => 94, getDataRange: () => ({ getValues: read }) }]);
    const rows = runInContext('getWithdrawals({role:"client",clientId:"C001"})', harness.context) as Array<{ clientId: string; status: string; paymentDate?: string }>;
    expect(rows.find((row) => row.paymentDate)).toMatchObject({ clientId: "C001", status: "paid", paymentDate: "2026-10-15" });
    expect(rows.some((row) => row.clientId === "C002")).toBe(false);
    expect(runInContext('mapAdminWithdrawal({"Withdrawal Status":"Paid"}).status', harness.context)).toBe("paid");
    expect(runInContext('mapAdminInvestment({"Client Code":"C001"}).clientId', harness.context)).toBe("C001");
    expect(runInContext('mapAdminTransaction({"Investor ID":"C001"}).clientId', harness.context)).toBe("C001");
  });
});

type AnalyticsResult = AdminFinancialAnalytics & {
  estimatedMonthlyPayout: number | null;
  payoutEstimateMissingRecords: number;
  completedWithdrawalTotal: number;
  recordedPayoutTotal: number;
  paidMonthlyPayout: number | null;
  remainingMonthlyPayout: number | null;
};

function analytics(investments: Array<Record<string, unknown>>, transactions: Array<Record<string, unknown>>, withdrawals: Array<Record<string, unknown>>, totalInvested = 0): AnalyticsResult {
  const harness = createSpreadsheetHarness();
  return runInContext(`buildAdminFinancialAnalytics(${JSON.stringify(investments)}, ${JSON.stringify(transactions)}, ${JSON.stringify(withdrawals)}, ${totalInvested}, new Date("2026-10-14T08:00:00Z"))`, harness.context) as AnalyticsResult;
}

describe("admin financial analytics", () => {
  it("keeps later ledger months when the same client has older withdrawal master history", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`buildAdminFinancialAnalytics([], [
      {clientId:"C001",date:"2026-03-10",type:"withdrawal",status:"paid",debit:1000,credit:0},
      {clientId:"C001",date:"2026-09-10",type:"withdrawal",status:"paid",debit:2000,credit:0}],
      [{clientId:"C001",paymentDate:"2026-09-10",status:"paid",amount:2000},
       {clientId:"C001",paymentDate:"2026-10-10",status:"paid",amount:500}],0,new Date("2026-10-27T08:00:00Z"),
      {withdrawalHistory:[{clientId:"C001",paymentDate:"2026-03-10",status:"recorded",amount:1000}]})`, harness.context) as AnalyticsResult;
    expect(result.withdrawalSource).toBe("combined_records");
    expect(result.withdrawalMonths).toEqual([{ month: "2026-03", amount: 1000 }, { month: "2026-09", amount: 2000 }, { month: "2026-10", amount: 500 }]);
    expect(result.completedWithdrawalTotal).toBe(3500);
  });

  it("maps explicit historical withdrawal headers and excludes uncompleted history", () => {
    const harness = createSpreadsheetHarness();
    const historyRead = vi.fn(() => [["Client_ID", "Withdrawal Dt", "Withdraw Amount", "Withdrawal Status"],
      ["C001", "15/09/2026", "INR 2,500", "Withdrawn"], ["C001", "20/09/2026", 8000, "Approved"]]);
    harness.getSheets.mockReturnValue([...harness.getSheets(), { getName: () => "Withdrawal_Master", getSheetId: () => 94, getDataRange: () => ({ getValues: historyRead }) }]);
    const result = harness.snapshot();
    expect(result.adminAnalytics?.withdrawalMonths).toEqual([{ month: "2026-09", amount: 2500 }]);
    expect(result.adminAnalytics?.sources?.find((row) => row.module === "withdrawal_history")?.warnings).toEqual([]);
    expect(historyRead).toHaveBeenCalledTimes(1);
  });

  it("charts signed payout reversals, excluding future and undated payments from totals", () => {
    const result = analytics([], [
      { clientId: "C001", type: "payout", status: "posted", date: "2026-09-01", credit: 1000, debit: 0 },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-09-02", credit: 0, debit: 200 },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-10-01", credit: 0, debit: 100 },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-11-01", credit: 9999, debit: 0 },
      { clientId: "C001", type: "payout", status: "posted", date: "", credit: 9999, debit: 0 }
    ], []);
    expect(result.payoutMonths).toEqual([{ month: "2026-09", amount: 800 }, { month: "2026-10", amount: -100 }]);
    expect(result.recordedPayoutTotal).toBe(700);
  });

  it("maps payout amount and specific transaction type aliases without guessing unrelated categories", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext('mapAdminTransaction({"Txn Date":"15/09/2026","Txn Type":"Interest Payment","Payout Amount":"INR 1,500"})', harness.context);
    expect(result).toMatchObject({ type: "payout", date: "2026-09-15", credit: 1500, debit: 0 });
    expect(runInContext('adminTransactionType("Withdrawal-Paid")', harness.context)).toBe("withdrawal_paid");
    expect(runInContext('adminTransactionType("Bank Transfer")', harness.context)).toBe("bank_transfer");
  });

  it("returns both credit and debit flow even when the net monthly amount is zero", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`var balancedFlow={asOf:"2026-10-27T08:00:00Z",investmentMonths:[],warnings:[]};
      addAdminOverviewSeries(balancedFlow,[],[],[
        {date:"2026-09-01",status:"posted",credit:5000,debit:0},
        {date:"2026-09-02",status:"posted",credit:0,debit:5000},
        {date:"2026-09-03",status:"pending",credit:9000,debit:0},
        {date:"2026-11-01",status:"posted",credit:9000,debit:0}],[],[]); balancedFlow;`, harness.context) as AdminFinancialAnalytics;
    expect(result.transactionMonths).toEqual([{ month: "2026-09", amount: 0 }]);
    expect(result.transactionFlowMonths).toEqual([{ month: "2026-09", credit: 5000, debit: 5000, net: 0, count: 2 }]);
  });

  it("selects a usable withdrawal source per client instead of dropping clients missing from the master", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`buildAdminFinancialAnalytics([], [
      {clientId:"C001",date:"2026-10-01",type:"withdrawal",status:"paid",debit:1000,credit:0},
      {clientId:"C002",date:"2026-10-02",type:"withdrawal",status:"paid",debit:2000,credit:0}],
      [{clientId:"C003",paymentDate:"2026-10-03",status:"paid",amount:3000}],0,new Date("2026-10-24T08:00:00Z"),
      {withdrawalHistory:[{clientId:"C001",paymentDate:"2026-10-01",status:"recorded",amount:1000},{clientId:"C002",paymentDate:"invalid",status:"recorded",amount:9000}]})`, harness.context) as AnalyticsResult;
    expect(result.withdrawalSource).toBe("combined_records");
    expect(result.withdrawalMonths).toEqual([{ month: "2026-10", amount: 6000 }]);
    expect(result.withdrawalDays).toHaveLength(3);
    expect(result.completedWithdrawalTotal).toBe(6000);
    expect(result.warnings.some((warning) => warning.includes("invalid dates"))).toBe(true);
  });

  it("uses the DASHBOARD schedule for the remainder even when investment payout terms are missing", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`buildAdminFinancialAnalytics(
      [{clientId:"C001",status:"active",principalAmount:800000}],
      [{clientId:"C001",type:"payout",status:"posted",date:"2026-10-05",credit:5000,debit:0}],
      [],800000,new Date("2026-10-21T08:00:00Z"),
      {dashboardRows:[{clientId:"C001",monthlyPayout:20000},{clientId:"C002",monthlyPayout:2500}]})`, harness.context) as AnalyticsResult;
    expect(result.payoutScheduleSource).toBe("dashboard");
    expect(result.estimatedMonthlyPayout).toBe(22500);
    expect(result.paidMonthlyPayout).toBe(5000);
    expect(result.remainingMonthlyPayout).toBe(17500);
    expect(result.payoutEstimateMissingRecords).toBe(0);
  });

  it("does not replace an incomplete DASHBOARD schedule with a different investment estimate", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`buildAdminFinancialAnalytics(
      [{clientId:"C001",status:"active",monthlyReturn:9999}],[],[],800000,new Date("2026-10-21T08:00:00Z"),
      {dashboardRows:[{clientId:"C001",monthlyPayout:null},{clientId:"C002",monthlyPayout:2500}]})`, harness.context) as AnalyticsResult;
    expect(result.estimatedMonthlyPayout).toBeNull();
    expect(result.remainingMonthlyPayout).toBeNull();
    expect(result.warnings.some((warning) => warning.includes("DASHBOARD Monthly Payout"))).toBe(true);
  });

  it("subtracts completed current-month payouts to calculate the remaining payout", () => {
    const result = analytics([{ clientId: "C001", status: "active", monthlyReturn: 1500, startDate: "2026-01-01" }], [
      { clientId: " c001 ", type: "payout", status: "posted", date: "2026-10-05", credit: 500, debit: 0 },
      { clientId: "C001", type: "payout", status: "pending", date: "2026-10-06", credit: 9000, debit: 0 },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-09-05", credit: 200, debit: 0 },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-10-20", credit: 8000, debit: 0 }
    ], []);
    expect(result.estimatedMonthlyPayout).toBe(1500);
    expect(result.paidMonthlyPayout).toBe(500);
    expect(result.remainingMonthlyPayout).toBe(1000);
  });

  it("does not use another client's overpayment to erase an unpaid scheduled payout", () => {
    const result = analytics([{ clientId: "C001", status: "active", monthlyReturn: 1000 }, { clientId: "C002", status: "active", monthlyReturn: 2000 }], [
      { clientId: "C001", type: "interest", status: "completed", date: "2026-10-01", credit: 5000, debit: 0 }
    ], []);
    expect(result.estimatedMonthlyPayout).toBe(3000);
    expect(result.paidMonthlyPayout).toBe(5000);
    expect(result.remainingMonthlyPayout).toBe(2000);
    expect(result.warnings.some((warning) => warning.includes("does not reduce other clients"))).toBe(true);
  });

  it("honors an explicit payout period and does not apply arrears to this month's schedule", () => {
    const result = analytics([{ clientId: "C001", status: "active", monthlyReturn: 1000 }], [
      { clientId: "C001", type: "payout", status: "posted", date: "2026-10-01", credit: 700, debit: 0, payoutPeriodProvided: true, payoutPeriod: "2026-09" },
      { clientId: "C001", type: "payout", status: "posted", date: "2026-10-02", credit: 300, debit: 0, payoutPeriodProvided: true, payoutPeriod: "2026-10" }
    ], []);
    expect(result.remainingMonthlyPayout).toBe(700);
    expect(result.paidMonthlyPayout).toBe(300);
    const harness = createSpreadsheetHarness();
    expect(runInContext('mapAdminTransaction({"Payout Month":"2026-10"}).payoutPeriod', harness.context)).toBe("2026-10");
    expect(runInContext('adminPayoutPeriod("2026-13")', harness.context)).toBe("");
  });

  it("returns unavailable instead of a false zero when payout matching data is missing", () => {
    expect(analytics([{ status: "active", monthlyReturn: 1000 }], [], []).remainingMonthlyPayout).toBeNull();
    expect(analytics([{ clientId: "C001", status: "active", returnRate: 12 }], [], []).remainingMonthlyPayout).toBeNull();
    const result = analytics([{ clientId: "C001", status: "active", monthlyReturn: 1000 }], [
      { clientId: "C001", type: "payout", status: "posted", date: "2026-10-01", credit: 500, debit: 0, payoutPeriodProvided: true, payoutPeriod: "" }
    ], []);
    expect(result.paidMonthlyPayout).toBeNull();
    expect(result.remainingMonthlyPayout).toBeNull();
  });

  it("supports partial payout reversals and genuine fully paid zero balances", () => {
    const schedule = [{ clientId: "C001", status: "active", monthlyReturn: 1000 }];
    const payments = [{ clientId: "C001", type: "payout", status: "posted", date: "2026-10-01", credit: 1000, debit: 0 }];
    expect(analytics(schedule, payments, []).remainingMonthlyPayout).toBe(0);
    expect(analytics(schedule, [...payments, { clientId: "C001", type: "payout", status: "posted", date: "2026-10-02", credit: 0, debit: 200 }], []).remainingMonthlyPayout).toBe(200);
  });

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
    expect(runInContext('dateMillis("2026-10-01T09:00:00Z")-dateMillis("2026-10-01T08:00:00Z")', harness.context)).toBe(3600000);
    expect(runInContext('dateMillis("15/10/2026")', harness.context)).toBe(Date.UTC(2026, 9, 15));
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

  it("parses actual dated admin credit/debit fields and Indian currency text", () => {
    const harness = createSpreadsheetHarness();
    const credit = runInContext('mapAdminTransaction({"Txn Date":"15/10/2026","Txn Type":"Investment","Credit Amount":"₹1,00,000.50","Transaction Status":"Posted"})', harness.context) as { date: string; credit: number; type: string; status: string };
    expect(credit).toMatchObject({ date: "2026-10-15", credit: 100000.5, type: "investment", status: "posted" });
    const debit = runInContext('mapAdminTransaction({"Date":"15/10/2026","Type":"Withdrawal","Amount":"INR 5,000"})', harness.context) as { debit: number };
    expect(debit.debit).toBe(5000);
    expect(runInContext('adminMoney("(1,000)")', harness.context)).toBe(-1000);
  });

  it("distinguishes an explicit zero balance from an empty or invalid balance", () => {
    const harness = createSpreadsheetHarness();
    expect(runInContext('mapAdminTransaction({"Balance":"pending"}).balance', harness.context)).toBeUndefined();
    expect(runInContext('mapAdminTransaction({"Balance":""}).balance', harness.context)).toBeUndefined();
    expect(runInContext('mapAdminTransaction({"Balance":0}).balance', harness.context)).toBe(0);
    expect(runInContext('mapAdminTransaction({"Balance":"INR 5,000"}).balance', harness.context)).toBe(5000);
  });

  it("does not manufacture registration history from date of birth or historical portfolio valuations", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`
      var chartResult = {asOf:"2026-10-15T08:00:00Z", investmentMonths:[], warnings:[]};
      addAdminOverviewSeries(chartResult,
        [{registrationDate:"2026-09-15"},{dateOfBirth:"1990-01-01"}], [], [], [],
        [{clientId:"C001",currentPortfolioValue:150000}]);
      chartResult;
    `, harness.context) as AdminFinancialAnalytics;
    expect(result.registrationMonths).toEqual([{ month: "2026-09", count: 1 }]);
    expect(result.portfolioMonths).toEqual([{ month: "2026-10", amount: 150000 }]);
    expect(result.portfolioGrowthSource).toBe("current_snapshot");
    expect(result.portfolioDistribution).toEqual([{ name: "C001", amount: 150000 }]);
    expect(result.registrationMonths).not.toContainEqual({ month: "1990-01", count: 1 });
  });

  it("keeps signed monthly cash flow chronological and excludes pending transactions", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`
      var flowResult = {asOf:"2026-10-15T08:00:00Z",investmentMonths:[],warnings:[]};
      addAdminOverviewSeries(flowResult,[],[],[
        {date:"2026-10-01",status:"posted",credit:1000,debit:0},
        {date:"2026-01-01",status:"posted",credit:0,debit:200},
        {date:"2026-10-02",status:"pending",credit:90000,debit:0}],[],[]);
      flowResult;
    `, harness.context) as AdminFinancialAnalytics;
    expect(result.transactionMonths).toEqual([{ month: "2026-01", amount: -200 }, { month: "2026-10", amount: 1000 }]);
    expect(result.portfolioMonths).toEqual([{ month: "2026-01", amount: -200 }, { month: "2026-10", amount: 800 }]);
    expect(result.excludedTransactionStatuses).toEqual({ pending: 1 });
  });

  it("uses actual DASHBOARD portfolio totals when investment-level valuations are missing", () => {
    const harness = createSpreadsheetHarness();
    const result = harness.snapshot();
    expect(result.adminAnalytics?.portfolioDistributionSource).toBe("dashboard_clients");
    expect(result.adminAnalytics?.portfolioDistributionBasis).toBe("current_portfolio");
    expect(result.adminAnalytics?.portfolioDistribution?.reduce((total, row) => total + row.amount, 0)).toBe(result.currentPortfolioValue);
  });
});

describe("24-month admin portfolio history", () => {
  function history(events: Array<Record<string, unknown>>, transactions: Array<Record<string, unknown>> = []) {
    const harness = createSpreadsheetHarness();
    return runInContext(`buildAdminPortfolioHistory(${JSON.stringify(events)}, ${JSON.stringify(transactions)}, new Date("2026-10-16T08:00:00Z"), [])`, harness.context) as { months: Array<{ month: string; amount: number | null }>; source: string };
  }

  it("includes the opening balance before the window and carries recorded month-end balances", () => {
    const result = history([{ date: "2024-10-01", clientId: "C001", amount: 1000 },
      { date: "2025-02-01", clientId: "C001", amount: -200 }, { date: "2026-10-01", clientId: "C001", amount: 100 }]);
    expect(result.months).toHaveLength(24);
    expect(result.months[0]).toEqual({ month: "2024-11", amount: 1000 });
    expect(result.months.find((point) => point.month === "2025-02")?.amount).toBe(800);
    expect(result.months[23]).toEqual({ month: "2026-10", amount: 900 });
    expect(result.source).toBe("recorded_cash_flow");
  });

  it("leaves unknown history blank, preserves genuine zero and excludes future records", () => {
    const result = history([{ date: "2026-01-01", clientId: "C001", amount: 1000 },
      { date: "2026-02-01", clientId: "C001", amount: -1000 }, { date: "2026-11-01", clientId: "C001", amount: 9000 }]);
    expect(result.months[0].amount).toBeNull();
    expect(result.months.find((point) => point.month === "2026-01")?.amount).toBe(1000);
    expect(result.months[23].amount).toBe(0);
  });

  it("sums clients and replaces each client's cash flow with the recorded closing balance", () => {
    const result = history([{ date: "2026-01-01", clientId: "C001", amount: 1000 }], [
      { date: "2026-01-01", clientId: "C001", balance: 1000 },
      { date: "2026-01-01", clientId: "C002", balance: 2000 },
      { date: "2026-02-01", clientId: "C002", balance: 2200 }]);
    expect(result.months.find((point) => point.month === "2026-01")?.amount).toBe(3000);
    expect(result.months[23].amount).toBe(3200);
    expect(result.source).toBe("recorded_balances");
  });

  it("flags a reconciliation mismatch without rewriting historical data", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`var result = {portfolioHistoryMonths:buildAdminPortfolioHistory([{date:"2026-01-01",clientId:"C001",amount:1000}],[],new Date("2026-10-16T08:00:00Z"),[]).months,portfolioHistorySource:"recorded_cash_flow",warnings:[]}; reconcileAdminPortfolio(result,1500); result;`, harness.context) as AdminFinancialAnalytics;
    expect(result.portfolioHistoryMonths?.[23].amount).toBe(1000);
    expect(result.portfolioReconciliation).toMatchObject({ calculated: 1000, recorded: 1500, difference: 500, matches: false });
    expect(result.warnings[0]).toContain("have not been adjusted");
  });

  it("uses only the current snapshot when no historical financial records exist", () => {
    const harness = createSpreadsheetHarness();
    const result = runInContext(`var result = {portfolioHistoryMonths:buildAdminPortfolioHistory([],[],new Date("2026-10-16T08:00:00Z"),[]).months,portfolioHistorySource:"current_snapshot",warnings:[]}; reconcileAdminPortfolio(result,1500); result;`, harness.context) as AdminFinancialAnalytics;
    expect(result.portfolioHistoryMonths?.slice(0, 23).every((point) => point.amount === null)).toBe(true);
    expect(result.portfolioHistoryMonths?.[23]).toEqual({ month: "2026-10", amount: 1500 });
  });
});
