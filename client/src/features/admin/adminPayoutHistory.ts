import { z } from "zod";
import type { DashboardSummary, Investment, Profile, Transaction } from "../../types/domain";

const key = (value?: string) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
const clientKey = (value?: string) => String(value ?? "").trim().toUpperCase();
const payoutTypes = new Set(["payout", "monthly_payout", "monthly_return", "interest", "interest_credit", "interest_payout", "payout_credit"]);
const postedStatuses = new Set(["approved", "completed", "posted", "paid", "success", "successful", "settled"]);
const monetary = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

export type PayoutHistoryRow = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  payout: number | null;
  totalInvestment: number | null;
  totalWithdrawal: number | null;
  totalPortfolio: number | null;
  plans: string[];
  scheduledPayoutDate?: string | null;
  status: string;
  reference: string;
};

export function buildPayoutHistory(data: { clients: Profile[]; investments: Investment[]; transactions: Transaction[]; dashboard: DashboardSummary }): PayoutHistoryRow[] {
  const clients = new Map(data.clients.map((row) => [clientKey(row.clientId), row]));
  const summaries = new Map((data.dashboard.adminClientSummaries ?? []).map((row) => [clientKey(row.clientId), row]));
  const plans = new Map<string, Investment[]>();
  for (const investment of data.investments) {
    const id = clientKey(investment.clientId);
    plans.set(id, [...(plans.get(id) ?? []), investment]);
  }
  return data.transactions.filter((row) => payoutTypes.has(key(row.type))).map((row) => {
    const id = clientKey(row.clientId), profile = clients.get(id), summary = summaries.get(id);
    const date = historyDate(row.date);
    const credit = monetary(row.credit), debit = monetary(row.debit);
    // Client plan context is not an allocation of this payout to any individual investment.
    const clientPlans = (plans.get(id) ?? []).filter((investment) => {
      const start = historyDate(investment.startDate);
      return !date || !start || start <= date;
    }).map((investment) => investment.plan?.trim()).filter((plan): plan is string => !!plan);
    return {
      id: row.id, clientId: row.clientId.trim(), clientName: profile?.fullName?.trim() || "Name unavailable",
      date, payout: credit === null || debit === null ? null : credit - debit,
      totalInvestment: monetary(summary?.totalInvestment), totalWithdrawal: monetary(summary?.totalWithdrawal),
      totalPortfolio: monetary(summary?.totalPortfolio), plans: [...new Set(clientPlans)].sort(),
      scheduledPayoutDate: row.scheduledPayoutDate ?? profile?.payoutDate,
      status: key(row.status), reference: row.reference ?? ""
    };
  });
}

export function historyDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? date.toISOString().slice(0, 10) === value ? value : "" : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const amount = z.preprocess((value) => value === "" || value === undefined ? undefined : Number(value), z.number().finite().optional());
const date = z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) && historyDate(value) === value, "Enter a valid date");
export const payoutHistoryFiltersSchema = z.object({
  clientName: z.string(), clientId: z.string(), plan: z.string(), status: z.string(),
  from: date, to: date, payoutMin: amount, payoutMax: amount,
  investmentMin: amount, investmentMax: amount, withdrawalMin: amount, withdrawalMax: amount,
  sort: z.enum(["newest", "oldest", "highest", "lowest"])
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: "custom", path: ["to"], message: "End date must be on or after start date" });
  for (const [min, max] of [["payoutMin", "payoutMax"], ["investmentMin", "investmentMax"], ["withdrawalMin", "withdrawalMax"]] as const) {
    if (value[min] !== undefined && value[max] !== undefined && value[min]! > value[max]!) context.addIssue({ code: "custom", path: [max], message: "Maximum must be at least the minimum" });
  }
});

export type PayoutHistoryFilters = z.input<typeof payoutHistoryFiltersSchema>;
export const defaultPayoutHistoryFilters: PayoutHistoryFilters = {
  clientName: "", clientId: "", plan: "all", status: "posted", from: "", to: "",
  payoutMin: "", payoutMax: "", investmentMin: "", investmentMax: "", withdrawalMin: "", withdrawalMax: "", sort: "newest"
};

export function filterPayoutHistory(rows: PayoutHistoryRow[], filters: z.output<typeof payoutHistoryFiltersSchema>) {
  const within = (value: number | null, min?: number, max?: number) => min === undefined && max === undefined || value !== null && (min === undefined || value >= min) && (max === undefined || value <= max);
  return rows.filter((row) =>
    row.clientName.toLowerCase().includes(filters.clientName.trim().toLowerCase()) &&
    clientKey(row.clientId).includes(clientKey(filters.clientId)) &&
    (filters.plan === "all" || (filters.plan === "unlinked" ? row.plans.length === 0 : row.plans.includes(filters.plan))) &&
    (filters.status === "all" || (filters.status === "posted" ? postedStatuses.has(row.status) : row.status === filters.status)) &&
    (!filters.from || !!row.date && row.date >= filters.from) && (!filters.to || !!row.date && row.date <= filters.to) &&
    within(row.payout, filters.payoutMin, filters.payoutMax) &&
    within(row.totalInvestment, filters.investmentMin, filters.investmentMax) &&
    within(row.totalWithdrawal, filters.withdrawalMin, filters.withdrawalMax)
  ).sort((a, b) => {
    if (filters.sort === "highest" || filters.sort === "lowest") {
      if (a.payout === null || b.payout === null) return a.payout === b.payout ? 0 : a.payout === null ? 1 : -1;
      return filters.sort === "highest" ? b.payout - a.payout : a.payout - b.payout;
    }
    return (filters.sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.id.localeCompare(b.id);
  });
}

export function payoutHistoryCsv(rows: PayoutHistoryRow[]) {
  return rows.map((row) => ({
    "Transaction ID": row.id, "Payout date": row.date, "Client ID": row.clientId, "Client name": row.clientName,
    "Net payout INR": row.payout ?? "Not available",
    "Client total invested INR": row.totalInvestment ?? "Not available", "Client total withdrawn INR": row.totalWithdrawal ?? "Not available",
    "Client portfolio INR": row.totalPortfolio ?? "Not available", "Client plans (not payout allocation)": row.plans.join("; ") || "Not linked",
    "Scheduled payout date/day": row.scheduledPayoutDate ?? "Not available", Status: row.status, Reference: row.reference
  }));
}
