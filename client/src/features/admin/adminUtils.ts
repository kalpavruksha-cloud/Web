import type {
  ClientDocument,
  ClientNotification,
  DashboardSummary,
  Investment,
  Profile,
  Referral,
  SpreadsheetSchema,
  Transaction,
  Withdrawal
} from "../../types/domain";

export type AdminCollections = {
  dashboard?: DashboardSummary;
  clients: Profile[];
  investments: Investment[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  documents: ClientDocument[];
  referrals: Referral[];
  notifications: ClientNotification[];
  schema?: SpreadsheetSchema;
};

export function computeAdminMetrics(data: AdminCollections) {
  const activeClients = data.clients.filter((row) => isStatus(row.accountStatus, "active")).length;
  const verifiedKyc = data.clients.filter((row) => isStatus(row.kycStatus, "verified")).length;
  const totalInvestment = data.dashboard?.admin?.totalInvestment ?? sum(data.investments, "principalAmount");
  const portfolioValue = data.dashboard?.admin?.portfolioValue ?? (sum(data.investments, "currentValue") || totalInvestment);
  const monthlyPayout = data.dashboard?.admin?.monthlyPayoutAmount ?? sum(data.investments, "monthlyReturn");
  const paidReferral = sum(data.referrals, "paidAmount");
  const rewardReferral = sum(data.referrals, "rewardAmount");

  return {
    totalClients: data.dashboard?.admin?.totalClients ?? data.clients.length,
    activeClients,
    inactiveClients: Math.max(data.clients.length - activeClients, 0),
    verifiedKyc,
    pendingKyc: data.dashboard?.admin?.pendingKyc ?? Math.max(data.clients.length - verifiedKyc, 0),
    totalInvestment,
    portfolioValue,
    monthlyPayout,
    pendingWithdrawals: data.withdrawals.filter((row) => isStatus(row.status, "pending")).length,
    approvedWithdrawals: data.withdrawals.filter((row) => isStatus(row.status, "approved")).length,
    paidWithdrawals: data.withdrawals.filter((row) => isStatus(row.status, "paid")).length,
    totalReferralCommission: rewardReferral,
    pendingReferralCommission: Math.max(rewardReferral - paidReferral, 0),
    documentsUploaded: data.documents.length,
    unreadNotifications: data.notifications.filter((row) => !row.read).length,
    activeInvestments: data.dashboard?.admin?.activeInvestments ?? data.investments.filter((row) => isStatus(row.status, "active")).length
  };
}

export function monthlySeries<T>(rows: T[], dateSelector: (row: T) => string | undefined, valueSelector: (row: T) => number, fallbackLabel = "Undated") {
  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    const label = monthLabel(dateSelector(row)) || fallbackLabel;
    buckets.set(label, (buckets.get(label) ?? 0) + valueSelector(row));
  });
  return Array.from(buckets.entries()).map(([month, value]) => ({ month, value })).slice(-12);
}

export function distribution<T>(rows: T[], labelSelector: (row: T) => string | undefined, valueSelector: (row: T) => number) {
  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    const label = title(labelSelector(row) || "Unassigned");
    buckets.set(label, (buckets.get(label) ?? 0) + valueSelector(row));
  });
  return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
}

export function recentActivity(data: AdminCollections) {
  return [
    ...data.transactions.map((row) => ({
      id: row.id,
      date: row.date,
      title: `${title(row.type)} transaction`,
      detail: `${row.clientId} - credit ${row.credit || 0}, debit ${row.debit || 0}`
    })),
    ...data.withdrawals.map((row) => ({
      id: row.id,
      date: row.requestDate,
      title: `${title(row.status)} withdrawal`,
      detail: `${row.clientId} - ${row.amount}`
    })),
    ...data.documents.map((row) => ({
      id: row.id,
      date: row.uploadDate,
      title: `${title(row.type)} document`,
      detail: `${row.clientId} - ${row.name}`
    })),
    ...data.clients.map((row) => ({
      id: row.clientId,
      date: row.dateOfBirth,
      title: "Client record",
      detail: `${row.clientId} - ${row.fullName}`
    }))
  ].sort((a, b) => sortableDate(b.date) - sortableDate(a.date));
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function title(value?: string) {
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isStatus(value: string | undefined, expected: string) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_") === expected;
}

function sum<T>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function monthLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(date);
}

function sortableDate(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}
