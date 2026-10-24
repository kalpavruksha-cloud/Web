import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAction, useResource } from "../../api/queries";
import type { DashboardSummary } from "../../types/domain";
import { ClientDashboardPage, ClientWithdrawalsPage } from "./pages/ClientPages";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Client One", clientId: "C001", role: "client" } }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));

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
  it("displays historical withdrawals with recorded dates and keeps them read-only", () => {
    vi.mocked(useAction).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useAction>);
    resource.mockImplementation((name) => ({ data: name === "client-dashboard" ? dashboard : [
      { id: "OLD-CLIENT", clientId: "C001", amount: 2500, status: "pending", paymentDate: "2026-10-01", readOnly: true, recordSource: "withdrawal_master" },
      { id: "REQUEST", clientId: "C001", amount: 500, status: "pending", requestDate: "2026-10-02" }
    ], isLoading: false, error: null }) as unknown as ReturnType<typeof useResource>);
    render(<ClientWithdrawalsPage />);
    const old = screen.getByText("OLD-CLIENT").closest("tr")!;
    expect(within(old).getByText("Recorded history")).toBeInTheDocument();
    expect(within(old).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(within(screen.getByText("REQUEST").closest("tr")!).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(resource).toHaveBeenCalledWith("client-withdrawals", "/client/withdrawals");
  });

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
