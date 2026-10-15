import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AdminFinancialAnalytics, DashboardSummary } from "../../types/domain";
import { AdminOverviewCards } from "./AdminOverviewCards";
import { AdminMoneyCharts } from "./AdminMoneyCharts";
import type { AdminCollections } from "./adminUtils";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ data }: { data: Array<{ label: string; amount: number }> }) => <div data-testid="money-chart">{JSON.stringify(data)}</div>,
  Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
  Area: () => null, AreaChart: () => null, Pie: () => null, PieChart: () => null, Cell: () => null, Legend: () => null
}));

afterEach(cleanup);

const analytics: AdminFinancialAnalytics = {
  asOf: "2026-10-14T08:00:00Z", currentYear: 2026, currentMonth: 10,
  investmentSource: "transaction_ledger", withdrawalSource: "transaction_ledger",
  investmentMonths: [{ month: "2026-01", amount: 100000 }],
  withdrawalMonths: [{ month: "2025-06", amount: 7000 }, { month: "2026-09", amount: 1000 }, { month: "2026-10", amount: 2000 }],
  withdrawalDays: [{ date: "2025-06-10", amount: 7000 }, { date: "2026-09-10", amount: 1000 }, { date: "2026-10-10", amount: 2000 }],
  payoutMonths: [], warnings: []
};

const dashboard: DashboardSummary = {
  totalInvestedAmount: 100000, currentPortfolioValue: 110000, totalReturns: 10000,
  totalPayouts: 10000, monthlyReturn: 1500, walletBalance: 97000, totalWithdrawal: 3000,
  activeInvestments: 1, pendingWithdrawals: 1, referralEarnings: 0,
  recentTransactions: [], investments: [], documents: [], notifications: [], adminAnalytics: analytics,
  admin: { totalClients: 2, activeClients: 2, totalInvestment: 100000, portfolioValue: 110000,
    monthlyPayoutAmount: 1500, estimatedMonthlyPayout: 1500, totalPayoutAmount: 10000,
    netInvestment: 97000, pendingWithdrawalAmount: 5000, verifiedKyc: 1, pendingKyc: 1,
    pendingWithdrawals: 1, activeInvestments: 1, referralLiabilities: 0 }
};
const data: AdminCollections = { dashboard, clients: [], investments: [], transactions: [], withdrawals: [], documents: [], referrals: [], notifications: [] };

describe("shared admin dashboard and report financial views", () => {
  it("shows net investment, estimated payout and historical total as distinct figures", () => {
    render(<AdminOverviewCards data={data} />);
    expect(screen.getByText("Net investment: ₹97,000")).toBeInTheDocument();
    expect(screen.getByText("₹1,500")).toBeInTheDocument();
    expect(screen.getByText("Total payouts: ₹10,000")).toBeInTheDocument();
    expect(screen.getByText("1 client needs KYC review")).toBeInTheDocument();
    expect(screen.getByText("Awaiting approval: ₹5,000")).toBeInTheDocument();
    expect(screen.getByText("Documents Uploaded")).toBeInTheDocument();
  });

  it("does not show a missing estimate as zero", () => {
    render(<AdminOverviewCards data={{ ...data, dashboard: { ...dashboard, admin: { ...dashboard.admin!, estimatedMonthlyPayout: null } } }} />);
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });

  it("filters completed withdrawals by year and month without a new API request", () => {
    render(<AdminMoneyCharts analytics={analytics} />);
    fireEvent.change(screen.getByLabelText("Withdrawal Month"), { target: { value: "10" } });
    expect(screen.getByText("Oct 2026 - daily totals")).toBeInTheDocument();
    expect(screen.getByText("₹2,000")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Withdrawal Year"), { target: { value: "2025" } });
    expect(screen.getByLabelText("Withdrawal Month")).toHaveValue("all");
    expect(screen.getByText("₹7,000")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Withdrawal Month")).getByRole("option", { name: "Dec" })).toBeInTheDocument();
  });

  it("shows explicit data quality and deployment errors instead of fabricated chart data", () => {
    const result = render(<AdminMoneyCharts />);
    expect(screen.getByRole("status")).toHaveTextContent("Apps Script V19");
    result.rerender(<AdminMoneyCharts analytics={{ ...analytics, warnings: ["Payment dates are missing."] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Payment dates are missing.");
  });

  it("keeps filters valid when a background snapshot advances into a new year", () => {
    const result = render(<AdminMoneyCharts analytics={{ ...analytics, withdrawalMonths: [], withdrawalDays: [] }} />);
    fireEvent.change(screen.getByLabelText("Withdrawal Month"), { target: { value: "10" } });
    result.rerender(<AdminMoneyCharts analytics={{ ...analytics, currentYear: 2027, currentMonth: 1, asOf: "2027-01-01T08:00:00Z", withdrawalMonths: [], withdrawalDays: [] }} />);
    expect(screen.getByLabelText("Withdrawal Month")).toHaveValue("all");
    expect(screen.getByText("Completed withdrawals in 2027")).toBeInTheDocument();
  });
});
