import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route } from "react-router-dom";
import { useResource } from "../../api/queries";
import type { Withdrawal } from "../../types/domain";
import { AdminClientDetails, AdminWithdrawals } from "./pages/AdminRecordsPages";
import { sameClientId } from "./adminUtils";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: () => ({ mutateAsync: vi.fn(), isPending: false }), useDashboard: vi.fn() }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));
const resource = vi.mocked(useResource);
const withdrawals: Withdrawal[] = [
  { id: "OLD-1", clientId: " c001 ", amount: 2500, status: "recorded", requestDate: "2026-10-01", paymentDate: "2026-10-01", recordSource: "withdrawal_master", readOnly: true },
  { id: "REQ-1", clientId: "C001", amount: 500, status: "pending" },
  { id: "REQ-2", clientId: "C001", amount: 800, status: "approved" },
  { id: "REQ-3", clientId: "C002", amount: 700, status: "paid" }
];

beforeEach(() => {
  resource.mockImplementation((name) => ({ data: name === "admin-withdrawals" ? withdrawals : [], isLoading: false, error: null }) as unknown as ReturnType<typeof useResource>);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("admin historical withdrawals", () => {
  it("shows historical dates and source without offering payment actions for history or paid rows", () => {
    render(<MemoryRouter><AdminWithdrawals /></MemoryRouter>);
    const history = screen.getByText("OLD-1").closest("tr")!;
    expect(within(history).getByText("Withdrawal master")).toBeInTheDocument();
    expect(within(history).getByText("Historical record")).toBeInTheDocument();
    expect(within(history).queryByRole("button")).not.toBeInTheDocument();
    expect(within(screen.getByText("REQ-1").closest("tr")!).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(screen.getByText("REQ-1").closest("tr")!).queryByRole("button", { name: "Paid" })).not.toBeInTheDocument();
    expect(within(screen.getByText("REQ-2").closest("tr")!).getByRole("button", { name: "Paid" })).toBeInTheDocument();
    expect(within(screen.getByText("REQ-3").closest("tr")!).queryByRole("button")).not.toBeInTheDocument();
  });

  it("links historical withdrawals to the correct client despite case and spacing differences", () => {
    resource.mockImplementation((name) => ({ data: name === "admin-clients" ? [{ clientId: "C001", fullName: "Client One", accountStatus: "active" }] : name === "admin-withdrawals" ? withdrawals : [], isLoading: false, error: null }) as unknown as ReturnType<typeof useResource>);
    render(<MemoryRouter initialEntries={["/admin/clients/c001"]}><Route path="/admin/clients/:id"><AdminClientDetails /></Route></MemoryRouter>);
    expect(screen.getByText(/OLD-1 -/)).toBeInTheDocument();
    expect(screen.getByText(/REQ-1 -/)).toBeInTheDocument();
    expect(screen.queryByText(/REQ-3 -/)).not.toBeInTheDocument();
  });

  it("does not guess different client codes or match empty IDs", () => {
    expect(sameClientId(" c001 ", "C001")).toBe(true);
    expect(sameClientId("KMW0201", "KWM0201")).toBe(false);
    expect(sameClientId("", undefined)).toBe(false);
  });
});
