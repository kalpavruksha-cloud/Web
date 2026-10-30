import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Printer, RefreshCw, RotateCcw, Users, Banknote, ReceiptText } from "lucide-react";
import { ErrorState } from "../../../components/State";
import { formatDate, formatPayoutDate } from "../../../utils/format";
import { AdminCard, AdminLoading, AdminPage, AdminTable, CommandButton, Field, Input, MetricCard, Select, StatusBadge } from "../AdminComponents";
import { buildPayoutHistory, defaultPayoutHistoryFilters, filterPayoutHistory, payoutHistoryCsv, payoutHistoryFiltersSchema, type PayoutHistoryFilters } from "../adminPayoutHistory";
import { exportCsv, title } from "../adminUtils";
import { useAdminOverview } from "../useAdminOverview";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value: number | null) => value === null ? "Not available" : rupees.format(value);

export function AdminPayoutHistory() {
  const overview = useAdminOverview();
  const [filters, setFilters] = useState<PayoutHistoryFilters>({ ...defaultPayoutHistoryFilters });
  const rows = useMemo(() => overview.data ? buildPayoutHistory(overview.data) : [], [overview.data]);
  const parsed = payoutHistoryFiltersSchema.safeParse(filters);
  const filtered = parsed.success ? filterPayoutHistory(rows, parsed.data) : [];
  const plans = [...new Set(rows.flatMap((row) => row.plans))].sort();
  const statuses = [...new Set(rows.map((row) => row.status))].sort();
  const amountAvailable = filtered.every((row) => row.payout !== null);
  const total = parsed.success && amountAvailable ? filtered.reduce((sum, row) => sum + row.payout!, 0) : null;
  const set = (name: keyof PayoutHistoryFilters, value: string) => setFilters((previous) => ({ ...previous, [name]: value }));

  if (overview.isPending) return <AdminLoading label="Loading payout history" />;
  if (!overview.data) return <><ErrorState title="Payout history unavailable" message={overview.error instanceof Error ? overview.error.message : "The spreadsheet did not return admin records."} /><CommandButton onClick={() => void overview.refetch()}><RefreshCw className="h-4 w-4" />Retry</CommandButton></>;

  return <div className="admin-payout-history"><AdminPage title="Payout History" eyebrow="Client payout ledger" actions={<span className="no-print flex flex-wrap gap-2">
    <CommandButton tone="secondary" disabled={overview.isFetching} onClick={() => void overview.refetch()}><RefreshCw className="h-4 w-4" />Refresh data</CommandButton>
    <CommandButton tone="secondary" disabled={!filtered.length} onClick={() => exportCsv("payout-history.csv", payoutHistoryCsv(filtered))}><Download className="h-4 w-4" />Export CSV</CommandButton>
    <CommandButton tone="secondary" disabled={!filtered.length} onClick={() => window.print()}><Printer className="h-4 w-4" />Print</CommandButton>
  </span>}>
    {overview.error && <ErrorState title="Payout refresh failed" message="The last loaded records are shown. The latest spreadsheet data could not be retrieved." />}
    <div className="no-print grid gap-4 sm:grid-cols-3">
      <MetricCard label="Selected net payouts" value={money(total)} icon={<Banknote className="h-5 w-5" />} />
      <MetricCard label="Payout entries" value={String(filtered.length)} icon={<ReceiptText className="h-5 w-5" />} />
      <MetricCard label="Clients in selection" value={String(new Set(filtered.map((row) => row.clientId.trim().toUpperCase())).size)} icon={<Users className="h-5 w-5" />} />
    </div>
    <div className="no-print mt-6">
      <AdminCard><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Filters</h2><CommandButton tone="secondary" onClick={() => setFilters({ ...defaultPayoutHistoryFilters })}><RotateCcw className="h-4 w-4" />Reset filters</CommandButton></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Client name"><Input value={filters.clientName} onChange={(event) => set("clientName", event.target.value)} /></Field>
          <Field label="Client ID"><Input value={filters.clientId} onChange={(event) => set("clientId", event.target.value)} /></Field>
          <Field label="Client plan"><Select value={filters.plan} onChange={(event) => set("plan", event.target.value)}><option value="all">All client plans</option><option value="unlinked">Not linked</option>{plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</Select></Field>
          <Field label="Posting status"><Select value={filters.status} onChange={(event) => set("status", event.target.value)}><option value="posted">Completed / posted entries</option><option value="all">All statuses</option>{statuses.filter((status) => status !== "posted").map((status) => <option key={status} value={status}>{title(status)}</option>)}</Select></Field>
          <Field label="Payout from"><Input type="date" value={filters.from} onChange={(event) => set("from", event.target.value)} /></Field>
          <Field label="Payout to"><Input type="date" value={filters.to} onChange={(event) => set("to", event.target.value)} /></Field>
          <Field label="Sort payouts"><Select value={filters.sort} onChange={(event) => set("sort", event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest payout first</option><option value="lowest">Lowest payout first</option></Select></Field>
        </div>
        <details className="mt-4 border-t border-forest-100 pt-4 dark:border-white/10"><summary className="cursor-pointer font-semibold">Amount filters</summary><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {([ ["payoutMin", "Minimum payout"], ["payoutMax", "Maximum payout"], ["investmentMin", "Minimum client investment"], ["investmentMax", "Maximum client investment"], ["withdrawalMin", "Minimum client withdrawal"], ["withdrawalMax", "Maximum client withdrawal"] ] as const).map(([name, label]) => <Field key={name} label={`${label} (INR)`}><Input type="number" step="0.01" value={String(filters[name] ?? "")} onChange={(event) => set(name, event.target.value)} /></Field>)}
        </div></details>
        {!parsed.success && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{parsed.error.issues.map((issue) => issue.message).join(". ")}</p>}
      </AdminCard>
    </div>
    <div className="mt-6 print:mt-0"><AdminCard>
      <div className="mb-4"><h2 className="text-lg font-bold">Recorded Payouts</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">Investment, withdrawal and portfolio columns are current client totals, not amounts attributable to each payout. Client plans are context only.</p><p className="mt-2 text-xs text-charcoal/65 dark:text-white/65">Ledger statuses and dates are shown as recorded; bank settlement is not independently verified.</p></div>
      {rows.some((row) => row.totalInvestment === null || row.totalWithdrawal === null) && <p role="status" className="mb-4 text-sm text-amber-800 dark:text-gold-100">Some client totals were not returned by the spreadsheet and are shown as Not available.</p>}
      <AdminTable key={JSON.stringify(filters)} rows={filtered} pageSize={20} searchable={false} printAllRows columns={[
        { key: "date", header: "Payout date", render: (row) => formatDate(row.date) },
        { key: "id", header: "Transaction ID", render: (row) => row.id },
        { key: "client", header: "Client", render: (row) => <Link to={`/admin/clients/${encodeURIComponent(row.clientId)}`} title="View client details" className="hover:underline"><p className="font-bold">{row.clientName}</p><p className="mt-1 text-xs text-charcoal/60 dark:text-white/60">{row.clientId}</p></Link> },
        { key: "payout", header: "Net payout", render: (row) => <span className="font-bold tabular-nums text-forest-800 dark:text-gold-100">{money(row.payout)}</span> },
        { key: "investment", header: "Client total invested", render: (row) => money(row.totalInvestment) },
        { key: "withdrawal", header: "Client total withdrawn", render: (row) => money(row.totalWithdrawal) },
        { key: "portfolio", header: "Client portfolio", render: (row) => money(row.totalPortfolio) },
        { key: "plans", header: "Client plans", render: (row) => row.plans.join(", ") || "Not linked" },
        { key: "schedule", header: "Scheduled payout", render: (row) => formatPayoutDate(row.scheduledPayoutDate) },
        { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
        { key: "reference", header: "Reference", render: (row) => row.reference || "Not available" }
      ]} />
      <p className="mt-4 text-xs text-charcoal/65 dark:text-white/65">{filtered.length} filtered payout entries. Net payout total: {money(total)}.</p>
    </AdminCard></div>
  </AdminPage></div>;
}
