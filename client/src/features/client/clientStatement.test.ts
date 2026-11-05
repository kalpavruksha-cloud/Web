import { afterEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "../../types/domain";
import { clientStatementTransaction, downloadStatementCsv, statementCsv, statementDate, type ClientStatementDetails } from "./clientStatement";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const row: Transaction = { id: "INV1", clientId: "C001", date: "2026-09-10", type: "investment", credit: 100000, debit: 0, balance: 100000, reference: "PRIVATE-REF", description: "Private description", status: "posted" };
const details: ClientStatementDetails = { clientName: "Client One", clientId: "C001", totalInvested: 250000, totalPayout: 17500, fromDate: "2026-09-01", toDate: "2026-09-30", type: "", status: "", search: "" };

describe("client statement presentation", () => {
  it.each(["investment", "deposit", "Investment Credit", "capital_investment", "add-investment"])("places %s in Debit without mutating the source", (type) => {
    const source = { ...row, type };
    expect(clientStatementTransaction(source)).toMatchObject({ credit: 0, debit: 100000 });
    expect(source.credit).toBe(100000);
    expect(source.debit).toBe(0);
  });

  it.each(["payout", "Monthly Payout", "interest_credit", "monthly_return", "interest_payout"])("places %s in Credit", (type) => {
    expect(clientStatementTransaction({ ...row, type, credit: 0, debit: 2500 })).toMatchObject({ credit: 2500, debit: 0 });
  });

  it("preserves corrections, dual-sided entries and other transaction types", () => {
    expect(clientStatementTransaction({ ...row, credit: -100 })).toMatchObject({ credit: 0, debit: -100 });
    const dual = { ...row, credit: 200, debit: 100 };
    expect(clientStatementTransaction(dual)).toBe(dual);
    const withdrawal = { ...row, type: "withdrawal", credit: 0, debit: 500 };
    expect(clientStatementTransaction(withdrawal)).toBe(withdrawal);
    const alreadyCorrect = { ...row, credit: 0, debit: 100000 };
    expect(clientStatementTransaction(alreadyCorrect)).toEqual(alreadyCorrect);
  });

  it("normalizes Indian dates and ISO timestamps to inclusive India calendar days", () => {
    expect(statementDate("2026-09-10")).toBe("2026-09-10");
    expect(statementDate("10/09/2026")).toBe("2026-09-10");
    expect(statementDate("2026-09-20T18:29:59.999Z")).toBe("2026-09-20");
    expect(statementDate("2026-09-20T18:30:00Z")).toBe("2026-09-21");
    for (const value of [undefined, "", "2026-02-30", "31/02/2026", "unavailable"]) expect(statementDate(value)).toBe("");
  });

  it("includes identity, authoritative dashboard totals, period and only the requested ledger columns in CSV", () => {
    const csv = statementCsv([clientStatementTransaction(row)], details);
    expect(csv).toContain('"Client Name","Client One"');
    expect(csv).toContain('"Client ID","C001"');
    expect(csv).toContain('"Total Invested","250000"');
    expect(csv).toContain('"Total Payout","17500"');
    expect(csv).toMatch(/"From Date","01 Sept? 2026"/);
    expect(csv).toMatch(/"To Date","30 Sept? 2026"/);
    expect(csv).toContain('"Transaction ID","Date","Scheduled Payout Date","Type","Credit","Debit","Status"');
    expect(csv).toContain('"Investment","0","100000","Posted"');
    for (const field of ["Balance", "Reference", "Description", "PRIVATE-REF", "Private description"]) expect(csv).not.toContain(field);
  });

  it("escapes CSV text and formula-like strings without changing signed numeric amounts", () => {
    const csv = statementCsv([{ ...row, id: '=HYPERLINK("https://example.com")', credit: -100 }], { ...details, clientName: 'One, "Client"\nTwo', search: "+formula" });
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"One, ""Client""\nTwo"');
    expect(csv).toContain('"\'+formula"');
    expect(csv).toContain('"-100"');
  });

  it("retains metadata and headers for an empty date range", () => {
    const csv = statementCsv([], details);
    expect(csv).toContain('"Client ID","C001"');
    expect(csv).toContain('"Transaction ID","Date"');
  });

  it("downloads a UTF-8 CSV with a date-range filename and releases its object URL", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:statement");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const downloads: Array<{ filename: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloads.push({ filename: this.download, href: this.href }); });
    downloadStatementCsv([clientStatementTransaction(row)], details);
    expect(downloads).toEqual([{ filename: "kalpavruksha-statement-2026-09-01-2026-09-30.csv", href: "blob:statement" }]);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe("text/csv;charset=utf-8");
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:statement");
  });
});
