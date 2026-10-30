import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../google-apps-script/Code.gs", import.meta.url), "utf8");
const financialHeaders = ["Total Invested", "Total Payout", "Total Withdrawal", "Total Referral", "Net Portfolio", "Present Investment", "Monthly Payout"];

function registrationHarness() {
  const rows: unknown[][] = [["ClientId", ...financialHeaders], ["C001", 100000, 1000, 5000, 0, 96000, 95000, 2375]];
  const templates: string[][] = [[], ["", "=SUM(RC[-1])", "=SUM(RC[-2])", "=SUM(RC[-3])", "=SUM(RC[-4])", "=RC[-4]+RC[-3]-RC[-2]+RC[-1]", "=RC[-5]-RC[-3]", "=SUMIF(Investment_Master!C1,RC1,Investment_Master!C4)"]];
  const formulaWrites: Array<{ row: number; column: number; formula: string }> = [];
  const releaseLock = vi.fn();
  const sheet = {
    getName: () => "DASHBOARD",
    getDataRange: () => ({ getValues: () => rows, getFormulasR1C1: () => templates }),
    getLastRow: () => rows.length,
    appendRow: vi.fn((row: unknown[]) => { rows.push(row); }),
    getRange: (row: number, column: number) => ({
      setValue: (value: unknown) => { (rows[row - 1] ??= [])[column - 1] = value; },
      setFormulaR1C1: (formula: string) => { formulaWrites.push({ row, column, formula }); }
    })
  };
  const context = createContext({ LockService: { getScriptLock: () => ({ waitLock: vi.fn(), releaseLock }) } });
  runInContext(source, context);
  context.getSpreadsheet = vi.fn(() => ({}));
  context.findSheet = vi.fn(() => sheet);
  context.audit = vi.fn();
  const append = (clientId = "C002") => runInContext(`appendRegistrationDashboard({},${JSON.stringify(clientId)})`, context);
  return { rows, templates, formulaWrites, releaseLock, sheet, context, append };
}

describe("new-registration DASHBOARD financial cells", () => {
  it("writes registration fields through trimmed, case-insensitive spreadsheet headers", () => {
    const harness = registrationHarness();
    harness.rows[0] = [" ClientId ", "CLIENT_NAME", "Email", "Status", "Enabled", "Amount"];
    harness.rows[1] = ["C001", "First investor", "old@example.test", "active", true, 100];
    runInContext('appendRecord({},["CLIENTS"],{ClientId:"C002",ClientName:"New investor",Email:"new@example.test",Status:"pending",Enabled:false,Amount:0})', harness.context);
    expect(harness.rows[2]).toEqual(["C002", "New investor", "new@example.test", "pending", false, 0]);
    expect(harness.rows[0]).toHaveLength(6);
  });

  it("initializes every financial column and inherits native formulas for the new row only", () => {
    const harness = registrationHarness();
    const previous = harness.rows.map((row) => [...row]);
    harness.append();
    expect(harness.rows[2]).toEqual(["C002", 0, 0, 0, 0, 0, 0, 0]);
    expect(harness.formulaWrites).toHaveLength(7);
    expect(harness.formulaWrites).toContainEqual({ row: 3, column: 7, formula: "=RC[-5]-RC[-3]" });
    expect(harness.formulaWrites).toContainEqual({ row: 3, column: 8, formula: harness.templates[1][7] });
    expect(harness.rows.slice(0, 2)).toEqual(previous);
    expect(harness.releaseLock).toHaveBeenCalledOnce();
  });

  it("uses actual reordered headers instead of hardcoding G and H", () => {
    const harness = registrationHarness();
    harness.rows[0] = ["monthly_payout", "Client ID", "present_investment", "Total Invested", "Total Payout", "Total Withdrawal", "Total Referral", "Net Portfolio"];
    harness.rows[1] = [2375, "C001", 95000, 100000, 1000, 5000, 0, 96000];
    harness.templates[1] = ["=SUM(RC[3])", "", "=RC[1]-RC[3]", "", "", "", "", ""];
    harness.append();
    expect(harness.rows[2]).toEqual([0, "C002", 0, 0, 0, 0, 0, 0]);
    expect(harness.formulaWrites).toEqual([{ row: 3, column: 1, formula: "=SUM(RC[3])" }, { row: 3, column: 3, formula: "=RC[1]-RC[3]" }]);
  });

  it("fills missing new headers for a newly registered zero-balance account", () => {
    const harness = registrationHarness();
    harness.rows.forEach((row) => row.splice(6));
    harness.templates[1] = [];
    harness.append();
    expect(harness.rows[0].slice(-2)).toEqual(["Present Investment", "Monthly Payout"]);
    expect(harness.rows[2].slice(-2)).toEqual([0, 0]);
    expect(harness.formulaWrites).toHaveLength(0);
  });

  it("does not copy formulas from unlinked/footer rows", () => {
    const harness = registrationHarness();
    harness.rows[1][0] = "";
    harness.append();
    expect(harness.formulaWrites).toHaveLength(0);
  });

  it("rejects a duplicate client row and releases the spreadsheet lock", () => {
    const harness = registrationHarness();
    expect(() => harness.append(" c001 ")).toThrow("dashboard record already exists");
    expect(harness.sheet.appendRow).not.toHaveBeenCalled();
    expect(harness.releaseLock).toHaveBeenCalledOnce();
  });

  it("continues to leave an absent optional dashboard tab alone", () => {
    const harness = registrationHarness();
    vi.mocked(harness.context.findSheet).mockReturnValue(null);
    expect(harness.append()).toBeNull();
    expect(harness.sheet.appendRow).not.toHaveBeenCalled();
  });

  it("reserves an unused formula-generated client slot instead of appending a future duplicate", () => {
    const harness = registrationHarness();
    harness.rows.push(["", "", "", "", "", "", "", ""]);
    harness.templates.push(["=IFERROR(INDEX(TRANSACTIONS!C3,1),\"\")", "", "", "", "", "", "", ""]);
    harness.append();
    expect(harness.sheet.appendRow).not.toHaveBeenCalled();
    expect(harness.rows).toHaveLength(3);
    expect(harness.rows[2][0]).toBe("C002");
    expect(harness.formulaWrites).toHaveLength(7);
    expect(harness.formulaWrites.every((write) => write.row === 3)).toBe(true);
  });

  it("never overwrites a row with amounts just because its Client ID is blank", () => {
    const harness = registrationHarness();
    harness.rows.push(["", 50000, "", "", "", "", "", ""]);
    harness.templates.push(["=IFERROR(INDEX(TRANSACTIONS!C3,1),\"\")"]);
    harness.append();
    expect(harness.rows[2][0]).toBe("");
    expect(harness.rows[2][1]).toBe(50000);
    expect(harness.rows[3][0]).toBe("C002");
    expect(harness.sheet.appendRow).toHaveBeenCalledOnce();
  });
});
