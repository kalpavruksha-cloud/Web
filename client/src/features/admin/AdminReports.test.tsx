import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AdminReports } from "./pages/AdminRecordsPages";
import { AdminDashboard } from "./pages/AdminDashboard";
import { useAdminOverview } from "./useAdminOverview";

vi.mock("./useAdminOverview", () => ({ useAdminOverview: vi.fn() }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ data }: { data: unknown[] }) => <div data-testid="chart-data">{JSON.stringify(data)}</div>,
  AreaChart: () => null, PieChart: () => null,
  Bar: () => null, Area: () => null, Pie: () => null, Cell: () => null, Legend: () => null,
  CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("admin dashboard and report chart wiring", () => {
  it("uses the same withdrawal snapshot on both pages and includes payout and gross flow reports", () => {
    vi.mocked(useAdminOverview).mockReturnValue({
      data: {
        clients: [], investments: [], transactions: [], withdrawals: [], documents: [], referrals: [], notifications: [],
        dashboard: {
          totalInvestedAmount: 0, currentPortfolioValue: 0, totalReturns: 0, monthlyReturn: 0,
          walletBalance: 0, activeInvestments: 0, pendingWithdrawals: 0, referralEarnings: 0,
          recentTransactions: [], investments: [], documents: [], notifications: [],
          adminAnalytics: {
            asOf: "2026-10-27T08:00:00Z", currentYear: 2026, currentMonth: 10,
            investmentSource: "transaction_ledger", withdrawalSource: "withdrawal_master",
            investmentMonths: [], withdrawalMonths: [{ month: "2026-09", amount: 2500 }],
            withdrawalDays: [{ date: "2026-09-10", amount: 2500 }],
            payoutMonths: [{ month: "2026-09", amount: 1500 }], warnings: [],
            transactionFlowMonths: [{ month: "2026-09", credit: 6000, debit: 6000, net: 0, count: 4 }]
          }
        }
      }, isPending: false, isFetching: false, error: null, refetch: vi.fn()
    } as unknown as ReturnType<typeof useAdminOverview>);
    const view = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    const dashboardWithdrawal = screen.getByRole("heading", { name: "Monthly Withdrawals" }).closest("section")!;
    const dashboardSeries = within(dashboardWithdrawal).getByTestId("chart-data").textContent;
    expect(within(dashboardWithdrawal).getByText("\u20b92,500")).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter><AdminReports /></MemoryRouter>);
    const withdrawal = screen.getByRole("heading", { name: "Monthly Withdrawals" }).closest("section")!;
    expect(within(withdrawal).getByTestId("chart-data").textContent).toBe(dashboardSeries);
    const payout = screen.getByRole("heading", { name: "Monthly Payout Report" }).closest("section")!;
    expect(within(payout).getByText("\u20b91,500")).toBeInTheDocument();
    const flow = screen.getByRole("heading", { name: "Transaction Flow" }).closest("section")!;
    expect(within(flow).getByTestId("chart-data")).toHaveTextContent('"credit":6000,"debit":6000');
    expect(within(flow).queryByRole("status")).not.toBeInTheDocument();
  });
});
