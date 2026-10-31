import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResource } from "../../api/queries";
import { formatPayoutDate } from "../../utils/format";
import { ClientTransactionsPage } from "./pages/ClientPages";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Client One", clientId: "C001", role: "client" } }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

function printPreview() {
  const printDocument = document.implementation.createHTMLDocument("Statement");
  const write = vi.spyOn(printDocument, "write");
  const print = vi.fn();
  const popup = { document: printDocument, focus: vi.fn(), print, closed: false };
  vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
  return { printDocument, write, print, popup };
}

describe("client payout date in the transaction statement", () => {
  it("shows the client schedule separately from the posted transaction date and includes it in print", () => {
    vi.mocked(useResource).mockReturnValue({ data: [{ id: "T001", clientId: "C001", date: "2026-09-10", scheduledPayoutDate: "15", type: "payout", credit: 500, debit: 0, status: "posted" }], isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
    vi.useFakeTimers();
    const { write, printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    expect(screen.getByRole("columnheader", { name: "Scheduled Payout Date" })).toBeInTheDocument();
    const row = screen.getByText("T001").closest("tr")!;
    expect(within(row).getByText("15th of each month")).toBeInTheDocument();
    expect(within(row).getByText(/10 Sept? 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(write.mock.calls[0][0]).toContain("Scheduled Payout Date");
    expect(write.mock.calls[0][0]).toContain("15th of each month");
    const logo = printDocument.querySelector<HTMLImageElement>(".statement-logo")!;
    expect(logo.alt).toBe("Kalpavruksha Wealth");
    expect(new URL(logo.src).pathname).toContain("group-kalpavruksha-wealth");
    expect(logo.closest("header")).not.toBeNull();
    expect(print).not.toHaveBeenCalled();
    Object.defineProperty(logo, "naturalWidth", { value: 468 });
    logo.dispatchEvent(new Event("load"));
    expect(print).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(print).toHaveBeenCalledOnce();
    expect(vi.mocked(useResource)).toHaveBeenCalledWith("client-transactions", "/client/transactions");
  });

  it("does not print a statement missing its logo if the image fails to load", () => {
    vi.useFakeTimers();
    vi.mocked(useResource).mockReturnValue({ data: [], isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
    const { printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    printDocument.querySelector(".statement-logo")!.dispatchEvent(new Event("error"));
    expect(printDocument.getElementById("statement-print-error")!.hasAttribute("hidden")).toBe(false);
    vi.runAllTimers();
    expect(print).not.toHaveBeenCalled();
  });

  it("shows a useful message instead of printing before a slow logo has loaded", () => {
    vi.useFakeTimers();
    vi.mocked(useResource).mockReturnValue({ data: [], isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
    const { printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    vi.advanceTimersByTime(15_000);
    expect(printDocument.getElementById("statement-print-error")!.hasAttribute("hidden")).toBe(false);
    expect(print).not.toHaveBeenCalled();
    const logo = printDocument.querySelector<HTMLImageElement>(".statement-logo")!;
    Object.defineProperty(logo, "naturalWidth", { value: 468 });
    logo.dispatchEvent(new Event("load"));
    expect(print).toHaveBeenCalledOnce();
    expect(printDocument.getElementById("statement-print-error")!.hasAttribute("hidden")).toBe(true);
  });

  it("keeps spreadsheet text escaped and prints only the filtered transactions", () => {
    vi.useFakeTimers();
    vi.mocked(useResource).mockReturnValue({ data: [
      { id: "T001", type: "payout", credit: 100, debit: 0, balance: 100, description: '<img src=x onerror="alert(1)">', status: "posted" },
      { id: "T002", type: "investment", credit: 200, debit: 0, balance: 300, status: "posted" }
    ], isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "payout" } });
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(printDocument.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(printDocument.body.textContent).toContain("T001");
    expect(printDocument.body.textContent).not.toContain("T002");
    expect(printDocument.querySelectorAll("img")).toHaveLength(1);
    expect(printDocument.querySelector("tbody img")).toBeNull();
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
