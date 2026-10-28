import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResource } from "../../api/queries";
import { formatPayoutDate } from "../../utils/format";
import { ClientTransactionsPage } from "./pages/ClientPages";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Client One", clientId: "C001", role: "client" } }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("client payout date in the transaction statement", () => {
  it("shows the client schedule separately from the posted transaction date and includes it in print", () => {
    vi.mocked(useResource).mockReturnValue({ data: [{ id: "T001", clientId: "C001", date: "2026-09-10", scheduledPayoutDate: "15", type: "payout", credit: 500, debit: 0, status: "posted" }], isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
    const write = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() } as unknown as Window);
    render(<ClientTransactionsPage />);
    expect(screen.getByRole("columnheader", { name: "Scheduled Payout Date" })).toBeInTheDocument();
    const row = screen.getByText("T001").closest("tr")!;
    expect(within(row).getByText("15th of each month")).toBeInTheDocument();
    expect(within(row).getByText(/10 Sept? 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(write.mock.calls[0][0]).toContain("Scheduled Payout Date");
    expect(write.mock.calls[0][0]).toContain("15th of each month");
    expect(vi.mocked(useResource)).toHaveBeenCalledWith("client-transactions", "/client/transactions");
  });

  it("formats dates and recurring days without inventing a next payment", () => {
    expect(formatPayoutDate("1")).toBe("1st of each month");
    expect(formatPayoutDate("2")).toBe("2nd of each month");
    expect(formatPayoutDate("3")).toBe("3rd of each month");
    expect(formatPayoutDate("11")).toBe("11th of each month");
    expect(formatPayoutDate("21")).toBe("21st of each month");
    expect(formatPayoutDate("2026-11-15")).toBe("15 Nov 2026");
    expect(formatPayoutDate()).toBe("Not available");
    expect(formatPayoutDate("")).toBe("Not set");
    expect(formatPayoutDate(null)).toBe("Not available");
    expect(formatPayoutDate("32")).toBe("Not available");
  });
});
