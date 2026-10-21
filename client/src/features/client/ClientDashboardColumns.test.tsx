import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResource } from "../../api/queries";
import type { DashboardSummary } from "../../types/domain";
import { ClientDashboardPage } from "./pages/ClientPages";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Client One", clientId: "C001", role: "client" } }) }));

const resource = vi.mocked(useResource);
const dashboard: DashboardSummary = {
  client: { clientId: "C001", fullName: "Client One", accountStatus: "active" },
  totalInvestedAmount: 100000, currentPortfolioValue: 110000, totalReturns: 10000,
  monthlyReturn: 1000, totalWithdrawal: 5000, walletBalance: 95000,
  activeInvestments: 1, pendingWithdrawals: 0, referralEarnings: 0,
  recentTransactions: [], investments: [], documents: [], notifications: [], kycStatus: "verified"
};

function respond(values: Partial<DashboardSummary> = {}) {
  resource.mockImplementation((name) => ({ data: name === "client-dashboard" ? { ...dashboard, ...values } : [], isLoading: false, error: null }) as unknown as ReturnType<typeof useResource>);
}

beforeEach(() => respond());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("client spreadsheet dashboard columns", () => {
  it("shows direct spreadsheet amounts without replacing existing balances", () => {
    respond({ presentInvestment: 96000, monthlyPayout: 1750 });
    render(<ClientDashboardPage />);
    expect(within(screen.getByText("Present Investment").closest("section")!).getByText("\u20b996,000")).toBeInTheDocument();
    expect(within(screen.getByText("Monthly Payout").closest("section")!).getByText("\u20b91,750")).toBeInTheDocument();
    expect(within(screen.getByText("Available Balance").closest("section")!).getByText("\u20b995,000")).toBeInTheDocument();
    expect(resource).toHaveBeenCalledWith("client-dashboard", "/client/dashboard");
  });

  it("preserves explicit zero and shows an invalid amount as unavailable", () => {
    respond({ presentInvestment: null, monthlyPayout: 0 });
    render(<ClientDashboardPage />);
    expect(within(screen.getByText("Present Investment").closest("section")!).getByText("Not available")).toBeInTheDocument();
    expect(within(screen.getByText("Monthly Payout").closest("section")!).getByText("\u20b90")).toBeInTheDocument();
  });

  it("keeps older deployments compatible without inventing the missing values", () => {
    render(<ClientDashboardPage />);
    expect(screen.queryByText("Present Investment")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Payout")).not.toBeInTheDocument();
  });
});
