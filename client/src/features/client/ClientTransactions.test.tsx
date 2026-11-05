import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResource } from "../../api/queries";
import type { Transaction } from "../../types/domain";
import { formatPayoutDate } from "../../utils/format";
import * as statement from "./clientStatement";
import { ClientTransactionsPage } from "./pages/ClientPages";

vi.mock("../../api/queries", () => ({ useResource: vi.fn(), useAction: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Client One", clientId: "C001", role: "client" } }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));

function respond(rows: Partial<Transaction>[] = [], summary: Record<string, unknown> = {}) {
  vi.mocked(useResource).mockImplementation((name) => (name === "client-dashboard" ? {
    data: { client: { fullName: "Client One", clientId: "C001" }, totalInvestedAmount: 250000, totalPayouts: 17500 },
    isLoading: false, error: null, ...summary
  } : {
    data: rows.map((row) => ({ clientId: "C001", date: "2026-09-10", type: "payout", credit: 0, debit: 0, status: "posted", ...row })),
    isLoading: false, error: null
  }) as unknown as ReturnType<typeof useResource>);
}

beforeEach(() => respond());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

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
    respond([{ id: "T001", clientId: "C001", date: "2026-09-10", scheduledPayoutDate: "15", type: "payout", credit: 500, debit: 0, status: "posted" }]);
    vi.useFakeTimers();
    const { write, printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    expect(screen.getByRole("columnheader", { name: "Scheduled Payout Date" })).toBeInTheDocument();
    const row = screen.getByText("T001").closest("tr")!;
    expect(within(row).getByText("15th of each month")).toBeInTheDocument();
    expect(within(row).getByText(/10 Sept? 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(write.mock.calls[0][0]).toContain("Scheduled Payout Date");
    expect(write.mock.calls[0][0]).toContain("15th of each month");
    const logo = printDocument.querySelector<HTMLImageElement>(".statement-logo")!;
    expect(logo.alt).toBe("Kalpavruksha Wealth");
    expect(new URL(logo.src).pathname).toContain("group-kalpavruksha-wealth");
    expect(logo.closest("header")).not.toBeNull();
    expect(logo.closest(".statement-brand")!.querySelector("svg, canvas")).toBeNull();
    expect(logo.closest(".statement-brand")!.children).toHaveLength(1);
    expect(write.mock.calls[0][0]).not.toContain("#0b1525");
    expect(write.mock.calls[0][0]).not.toContain(".statement-brand svg");
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
    const { printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    printDocument.querySelector(".statement-logo")!.dispatchEvent(new Event("error"));
    expect(printDocument.getElementById("statement-print-error")!.hasAttribute("hidden")).toBe(false);
    vi.runAllTimers();
    expect(print).not.toHaveBeenCalled();
  });

  it("shows a useful message instead of printing before a slow logo has loaded", () => {
    vi.useFakeTimers();
    const { printDocument, print } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
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
    respond([
      { id: '<img src=x onerror="alert(1)">', type: "payout", credit: 100, debit: 0, balance: 100, description: "Hidden description", status: "posted" },
      { id: "T002", type: "investment", credit: 200, debit: 0, balance: 300, status: "posted" }
    ]);
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "payout" } });
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(printDocument.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(printDocument.body.textContent).toContain('<img src=x onerror="alert(1)">');
    expect(printDocument.body.textContent).not.toContain("T002");
    expect(printDocument.querySelectorAll("img")).toHaveLength(1);
    expect(printDocument.querySelector("tbody img")).toBeNull();
    expect(printDocument.body.textContent).not.toContain("Hidden description");
  });

  it("includes the client, dashboard totals and inclusive selected dates in the printable statement", () => {
    respond([
      { id: "BEFORE", date: "2026-09-09", credit: 10 },
      { id: "START", date: "2026-09-10", credit: 20 },
      { id: "END", date: "2026-09-20T18:29:59.999Z", credit: 30 },
      { id: "AFTER", date: "2026-09-20T18:30:00Z", credit: 40 },
      { id: "UNDATED", date: undefined, credit: 50 }
    ]);
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-09-20" } });
    expect(screen.getByText("START")).toBeInTheDocument();
    expect(screen.getByText("END")).toBeInTheDocument();
    for (const id of ["BEFORE", "AFTER", "UNDATED"]) expect(screen.queryByText(id)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    const summary = printDocument.querySelector(".statement-summary")!;
    expect(summary.textContent).toContain("Client One");
    expect(summary.textContent).toContain("C001");
    expect(summary.textContent).toContain("\u20b92,50,000");
    expect(summary.textContent).toContain("\u20b917,500");
    expect(summary.textContent).toMatch(/10 Sept? 2026/);
    expect(summary.textContent).toMatch(/20 Sept? 2026/);
    expect(printDocument.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(vi.mocked(useResource)).toHaveBeenCalledWith("client-dashboard", "/client/dashboard");
  });

  it("places investments in Debit and payouts in Credit, with only the seven requested columns", () => {
    respond([{ id: "INV", type: "investment", credit: 100000 }, { id: "PAY", type: "payout", debit: 2500 }]);
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    const headers = ["Transaction ID", "Date", "Scheduled Payout Date", "Type", "Credit", "Debit", "Status"];
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(headers);
    const investment = within(screen.getByText("INV").closest("tr")!).getAllByRole("cell");
    expect(investment[4]).toHaveTextContent("\u20b90");
    expect(investment[5]).toHaveTextContent("\u20b91,00,000");
    const payout = within(screen.getByText("PAY").closest("tr")!).getAllByRole("cell");
    expect(payout[4]).toHaveTextContent("\u20b92,500");
    expect(payout[5]).toHaveTextContent("\u20b90");
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(Array.from(printDocument.querySelectorAll("th"), (cell) => cell.textContent)).toEqual(headers);
    const printed = printDocument.querySelectorAll("tbody tr");
    expect(printed[0].querySelectorAll("td")[5].textContent).toBe("\u20b91,00,000");
    expect(printed[1].querySelectorAll("td")[4].textContent).toBe("\u20b92,500");
  });

  it("exports all matching records across pagination, then respects search and status as well as dates", () => {
    respond(Array.from({ length: 25 }, (_, index) => ({ id: `PAY${index}`, credit: 100, status: index === 24 ? "pending" : "posted" })));
    const download = vi.spyOn(statement, "downloadStatementCsv").mockImplementation(() => undefined);
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    expect(screen.getAllByRole("row")).toHaveLength(21);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(download.mock.calls[0][0]).toHaveLength(25);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "PAY24" } });
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(download.mock.calls[1][0].map((row) => row.id)).toEqual(["PAY24"]);
    expect(download.mock.calls[1][1]).toMatchObject({ clientName: "Client One", clientId: "C001", totalInvested: 250000, totalPayout: 17500, fromDate: "2026-09-10", toDate: "2026-09-10", search: "PAY24" });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "pending" } });
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(printDocument.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(printDocument.querySelector("tbody")!.textContent).toContain("PAY24");
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getAllByRole("row")).toHaveLength(21);
  });

  it("blocks invalid date ranges and restores exports after correction", () => {
    respond([{ id: "PAY", credit: 100 }]);
    render(<ClientTransactionsPage />);
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-09-10" } });
    expect(screen.getByRole("alert")).toHaveTextContent("To Date must be on or after From Date.");
    expect(screen.getByRole("button", { name: "CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-09-10" } });
    expect(screen.getByRole("button", { name: "CSV" })).toBeEnabled();
  });

  it("does not invent dashboard totals when summary data is missing or still loading", () => {
    respond([{ id: "PAY", credit: 100 }], { data: undefined, isLoading: true });
    const { rerender } = render(<ClientTransactionsPage />);
    expect(screen.getByText("PAY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
    const refetch = vi.fn();
    respond([{ id: "PAY", credit: 100 }], { data: undefined, error: new Error("Account summary unavailable"), refetch });
    rerender(<ClientTransactionsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Account summary unavailable");
    expect(screen.getByRole("button", { name: "CSV" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload Summary" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("preserves valid zero dashboard totals and prints an empty selected period safely", () => {
    respond([], { data: { totalInvestedAmount: 0, totalPayouts: 0 } });
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-09-01" } });
    expect(screen.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(printDocument.querySelector("tbody td")!.getAttribute("colspan")).toBe("7");
    expect(printDocument.querySelector("tbody")!.textContent).toContain("No transactions available for this filter.");
  });

  it("uses the full available period by default and escapes client identity and search in print", () => {
    const unsafeName = '<img src=x onerror="alert(1)">';
    respond([{ id: "OLDER", date: "2026-01-01" }, { id: "NEWER", date: "2026-09-30" }], {
      data: { client: { fullName: unsafeName, clientId: "C001" }, totalInvestedAmount: 5000, totalPayouts: 500 }
    });
    const { printDocument } = printPreview();
    render(<ClientTransactionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    const summary = printDocument.querySelector(".statement-summary")!;
    expect(summary.textContent).toContain("01 Jan 2026");
    expect(summary.textContent).toMatch(/30 Sept? 2026/);
    expect(summary.textContent).toContain(unsafeName);
    expect(summary.querySelector("img")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: '<script>alert(1)</script>' } });
    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(printDocument.querySelector(".statement-summary")!.textContent).toContain('<script>alert(1)</script>');
    expect(printDocument.querySelector("script")).toBeNull();
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
