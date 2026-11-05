import type { Transaction } from "../../types/domain";
import { formatDate, formatPayoutDate } from "../../utils/format";
import { statusText } from "./clientUtils";

export type ClientStatementDetails = {
  clientName: string;
  clientId: string;
  totalInvested: number;
  totalPayout: number;
  fromDate: string;
  toDate: string;
  type: string;
  status: string;
  search: string;
};

const investmentTypes = new Set(["investment", "deposit", "investment_credit", "capital_investment", "add_investment"]);
const payoutTypes = new Set(["payout", "interest", "interest_credit", "monthly_return", "monthly_payout", "payout_credit", "interest_payout", "monthly_interest", "interest_payment"]);
const indiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

export function clientStatementTransaction(row: Transaction): Transaction {
  const type = row.type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  // Change the client-facing side only for one-sided entries; preserve signed
  // corrections and two-sided adjustments without changing the source ledger.
  if (investmentTypes.has(type) && row.debit === 0) return { ...row, credit: 0, debit: row.credit };
  if (payoutTypes.has(type) && row.credit === 0) return { ...row, credit: row.debit, debit: 0 };
  return row;
}

export function statementDate(value?: string): string {
  if (!value) return "";
  const text = value.trim();
  const indianDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const day = indianDate ? `${indianDate[3]}-${indianDate[2].padStart(2, "0")}-${indianDate[1].padStart(2, "0")}` : text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : "";
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(text)) return "";
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return "";
  return indiaDay.format(date);
}

export function statementCsv(rows: Transaction[], details: ClientStatementDetails): string {
  const records: unknown[][] = [
    ["Kalpavruksha Wealth - Transaction Statement"],
    ["Client Name", details.clientName],
    ["Client ID", details.clientId],
    ["Dashboard Review (overall totals)"],
    ["Total Invested", details.totalInvested],
    ["Total Payout", details.totalPayout],
    ["From Date", formatDate(details.fromDate)],
    ["To Date", formatDate(details.toDate)],
    ["Type", details.type ? statusText(details.type) : "All types"],
    ["Status", details.status ? statusText(details.status) : "All statuses"],
    ["Search", details.search || "All records"],
    [],
    ["Transaction ID", "Date", "Scheduled Payout Date", "Type", "Credit", "Debit", "Status"],
    ...rows.map((row) => [row.id, formatDate(statementDate(row.date) || row.date), formatPayoutDate(row.scheduledPayoutDate), statusText(row.type), row.credit, row.debit, statusText(row.status)])
  ];
  return records.map((record) => record.map((value) => {
    const text = String(value ?? "");
    const safe = typeof value === "string" && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function downloadStatementCsv(rows: Transaction[], details: ClientStatementDetails) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", statementCsv(rows, details)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `kalpavruksha-statement-${details.fromDate || "start"}-${details.toDate || "end"}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
