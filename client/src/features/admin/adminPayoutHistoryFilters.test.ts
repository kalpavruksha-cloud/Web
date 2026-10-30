import { describe, expect, it } from "vitest";
import type { DashboardSummary, Investment, Profile, Transaction } from "../../types/domain";
import { buildPayoutHistory, defaultPayoutHistoryFilters, filterPayoutHistory, historyDate, payoutHistoryCsv, payoutHistoryFiltersSchema } from "./adminPayoutHistory";

const data = {
  clients: [{ clientId: "C001", fullName: "First client", payoutDate: "5" }, { clientId: "C002", fullName: "Second client" }] as Profile[],
  investments: [
    { id: "I1", clientId: "C001", plan: "Income", principalAmount: 10000, startDate: "2025-01-01", status: "active" },
    { id: "I2", clientId: "C001", plan: "Future plan", principalAmount: 5000, startDate: "2027-01-01", status: "pending" }
  ] as Investment[],
  transactions: [
    { id: "P1", clientId: " c001 ", type: "Monthly Payout", date: "2026-09-05", credit: 250, debit: 0, status: "Approved", reference: "R1" },
    { id: "P2", clientId: "C001", type: "payout", date: "2026-10-05", credit: 0, debit: 50, status: "paid" },
    { id: "P3", clientId: "C002", type: "interest_credit", date: "2026-10-06", credit: 600, debit: 0, status: "pending" },
    { id: "I3", clientId: "C001", type: "investment", date: "2026-01-01", credit: 10000, debit: 0, status: "approved" }
  ] as Transaction[],
  dashboard: { adminClientSummaries: [{ clientId: "C001", totalInvestment: 10000, totalWithdrawal: 0, totalPayout: 200, totalPortfolio: 10200 }] } as DashboardSummary
};
const filters = (patch: Record<string, unknown> = {}) => payoutHistoryFiltersSchema.parse({ ...defaultPayoutHistoryFilters, ...patch });

describe("payout history joins and filters", () => {
  it("joins case-insensitive client IDs, keeps reversals and uses backend totals without multiplying them", () => {
    const rows = buildPayoutHistory(data);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ clientName: "First client", payout: 250, totalInvestment: 10000, totalWithdrawal: 0, scheduledPayoutDate: "5", plans: ["Income"] });
    expect(rows[1].payout).toBe(-50);
    expect(rows[2]).toMatchObject({ totalInvestment: null, totalWithdrawal: null, plans: [] });
  });

  it("does not substitute an investment catalogue plan or fabricated totals for unlinked records", () => {
    const rows = buildPayoutHistory({ ...data, investments: [], dashboard: {} as DashboardSummary });
    expect(rows[0]).toMatchObject({ totalInvestment: null, totalWithdrawal: null, totalPortfolio: null, plans: [] });
  });

  it("shows posted payouts by default and supports name, ID, date, amount, plan and total filters together", () => {
    const rows = buildPayoutHistory(data);
    expect(filterPayoutHistory(rows, filters()).map((r) => r.id)).toEqual(["P2", "P1"]);
    const result = filterPayoutHistory(rows, filters({ clientName: "FIRST", clientId: "c001", from: "2026-09-01", to: "2026-09-30", plan: "Income", payoutMin: "200", payoutMax: "300", investmentMin: "10000", investmentMax: "10000", withdrawalMin: "0", withdrawalMax: "0" }));
    expect(result.map((r) => r.id)).toEqual(["P1"]);
    expect(filterPayoutHistory(rows, filters({ status: "pending", plan: "unlinked" })).map((r) => r.id)).toEqual(["P3"]);
  });

  it("sorts amounts and dates and exports only the selected rows", () => {
    const rows = buildPayoutHistory(data);
    expect(filterPayoutHistory(rows, filters({ status: "all", sort: "highest" })).map((r) => r.id)).toEqual(["P3", "P1", "P2"]);
    expect(filterPayoutHistory(rows, filters({ sort: "oldest" })).map((r) => r.id)).toEqual(["P1", "P2"]);
    const exported = payoutHistoryCsv(filterPayoutHistory(rows, filters({ to: "2026-09-30" })));
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ "Transaction ID": "P1", "Net payout INR": 250, "Client total withdrawn INR": 0 });
    expect(Object.keys(exported[0])).not.toContain("password");
  });

  it("rejects invalid date/amount ranges, nonfinite amounts and impossible dates", () => {
    for (const patch of [{ from: "2026-10-10", to: "2026-10-01" }, { payoutMin: "50", payoutMax: "20" }, { payoutMin: "NaN" }, { payoutMax: "Infinity" }, { from: "2026-02-31" }]) {
      expect(payoutHistoryFiltersSchema.safeParse({ ...defaultPayoutHistoryFilters, ...patch }).success).toBe(false);
    }
    expect(historyDate("2026-10-05T20:00:00Z")).toBe("2026-10-06");
  });

  it("does not turn invalid or missing monetary values into a zero payout", () => {
    const rows = buildPayoutHistory({ ...data, transactions: [{ ...data.transactions[0], credit: undefined } as unknown as Transaction] });
    expect(rows[0].payout).toBeNull();
    expect(filterPayoutHistory(rows, filters({ payoutMin: "0" }))).toHaveLength(0);
    expect(payoutHistoryCsv(rows)[0]["Net payout INR"]).toBe("Not available");
  });
});
