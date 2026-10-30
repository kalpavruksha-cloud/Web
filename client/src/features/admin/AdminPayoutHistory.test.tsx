import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPayoutHistory } from "./pages/AdminPayoutHistory";
import { useAdminOverview } from "./useAdminOverview";
import { exportCsv } from "./adminUtils";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

vi.mock("./useAdminOverview", () => ({ useAdminOverview: vi.fn() }));
vi.mock("./adminUtils", async (original) => ({ ...await original<typeof import("./adminUtils")>(), exportCsv: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

const refetch = vi.fn();
const snapshot = {
  clients: [{ clientId: "C001", fullName: "First client", payoutDate: "5" }, { clientId: "C002", fullName: "Second client" }],
  investments: [], withdrawals: [], documents: [], referrals: [], notifications: [],
  transactions: [
    { id: "P001", clientId: "C001", type: "monthly_payout", date: "2026-09-05", credit: 250, debit: 0, status: "approved" },
    { id: "P002", clientId: "C002", type: "payout", date: "2026-10-06", credit: 500, debit: 0, status: "completed" }
  ],
  dashboard: { adminClientSummaries: [
    { clientId: "C001", totalInvestment: 10000, totalWithdrawal: 0, totalPayout: 250, totalPortfolio: 10250 },
    { clientId: "C002", totalInvestment: 20000, totalWithdrawal: 1000, totalPayout: 500, totalPortfolio: 19500 }
  ] }
};

beforeEach(() => {
  vi.mocked(useAdminOverview).mockReturnValue({ data: snapshot, isPending: false, isFetching: false, error: null, refetch } as unknown as ReturnType<typeof useAdminOverview>);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("admin payout history", () => {
  it("filters by client ID and date and exports exactly the filtered records", () => {
    render(<MemoryRouter><AdminPayoutHistory /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Client ID"), { target: { value: "c001" } });
    fireEvent.change(screen.getByLabelText("Payout to"), { target: { value: "2026-09-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(exportCsv).toHaveBeenCalledOnce();
    const rows = vi.mocked(exportCsv).mock.calls[0][1];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ "Transaction ID": "P001", "Client ID": "C001", "Client total withdrawn INR": 0 });
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(vi.mocked(exportCsv).mock.calls[1][1]).toHaveLength(2);
  });

  it("rejects invalid ranges and disables export and printing", () => {
    render(<MemoryRouter><AdminPayoutHistory /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Payout from"), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText("Payout to"), { target: { value: "2026-10-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("End date must be on or after start date");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
  });

  it("paginates by 20 while retaining every filtered record for print", () => {
    vi.mocked(useAdminOverview).mockReturnValue({ data: { ...snapshot, transactions: Array.from({ length: 25 }, (_, i) => ({ ...snapshot.transactions[0], id: `P${i}` })) }, isPending: false, isFetching: false, error: null, refetch } as unknown as ReturnType<typeof useAdminOverview>);
    render(<MemoryRouter><AdminPayoutHistory /></MemoryRouter>);
    const table = screen.getByRole("table");
    const bodies = table.querySelectorAll("tbody");
    expect(within(bodies[0]).getAllByRole("row")).toHaveLength(20);
    expect(bodies[1].querySelectorAll("tr")).toHaveLength(25);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(within(bodies[0]).getAllByRole("row")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows API failures rather than a fabricated empty history", () => {
    vi.mocked(useAdminOverview).mockReturnValue({ data: undefined, isPending: false, isFetching: false, error: new Error("Spreadsheet unavailable"), refetch } as unknown as ReturnType<typeof useAdminOverview>);
    render(<MemoryRouter><AdminPayoutHistory /></MemoryRouter>);
    expect(screen.getByText("Spreadsheet unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("uses the existing admin guard and never loads payout data for a client", () => {
    vi.mocked(useAuth).mockReturnValue({ loading: false, user: { role: "client" } } as ReturnType<typeof useAuth>);
    render(<MemoryRouter initialEntries={["/admin/payout-history"]}><Switch><ProtectedRoute role="admin" path="/admin"><AdminPayoutHistory /></ProtectedRoute><Route path="/client">Client portal</Route></Switch></MemoryRouter>);
    expect(screen.getByText("Client portal")).toBeInTheDocument();
    expect(useAdminOverview).not.toHaveBeenCalled();
  });
});
