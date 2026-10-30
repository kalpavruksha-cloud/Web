import { useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { formatDate } from "../../utils/format";
import { AdminCard, AdminTable, CommandButton, Field, Input, Select } from "./AdminComponents";
import { exportCsv } from "./adminUtils";

const statusLabels = { overdue: "Overdue according to ledger", due_today: "Due today", upcoming: "Upcoming", date_unavailable: "Date unavailable", review_required: "Review funding cycle" };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AdminPendingPayouts({ analytics, mode = "current" }: { analytics?: AdminFinancialAnalytics; mode?: "current" | "upcoming" }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const rows = analytics?.payoutCalendarReady === true ? mode === "upcoming" ? analytics.upcomingPayouts : analytics.pendingPayouts : analytics?.payoutCalendarReady === false ? null : undefined;
  const filtered = (rows ?? []).filter((row) => `${row.clientName} ${row.clientId}`.toLowerCase().includes(search.trim().toLowerCase()) && (status === "all" || row.dueStatus === status));
  return <section id="pending-client-payouts" aria-labelledby="pending-client-payouts-title" className="mt-6">
    <AdminCard><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 id="pending-client-payouts-title" className="text-lg font-bold">{mode === "upcoming" ? "Upcoming Client Payouts" : "Pending Client Payouts"}</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{mode === "upcoming" ? "Next month's estimate from currently funded records. Future record changes can change the amount." : "Only payouts scheduled in the current calendar month, less posted payments for that period."} Confirm bank settlement before making a payment.</p></div><CommandButton tone="secondary" disabled={!filtered.length} onClick={() => exportCsv(`${mode}-client-payouts.csv`, filtered.map((row) => ({
      "Client ID": row.clientId, "Client name": row.clientName, "Payout period": row.period, "Scheduled INR": row.scheduledAmount, "Recorded INR": row.recordedAmount, "Remaining INR": row.remainingAmount, "Due date": row.dueDate ?? "Not available", Status: statusLabels[row.dueStatus], Note: row.note
    })))}><Download className="h-4 w-4" />{mode === "upcoming" ? "Export upcoming" : "Export pending"}</CommandButton></div>
      {[...new Set(analytics?.payoutCalendarWarnings ?? [])].map((warning) => <p role="status" key={warning} className="mb-3 text-sm text-amber-800 dark:text-gold-100">{warning}</p>)}
      {rows === undefined ? <p role="status" className="text-sm text-amber-800 dark:text-gold-100">Per-client payout balances require Apps Script V27. Deploy the updated Code.gs to the existing deployment, then refresh data.</p>
        : rows === null ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">The payout schedule or recorded payment data is incomplete. Pending client amounts cannot be verified.</p>
          : <>
            {[...new Set(analytics?.pendingPayoutWarnings ?? [])].map((warning) => <p role="status" key={warning} className="mb-3 text-sm text-amber-800 dark:text-gold-100">{warning}</p>)}
            <div className="no-print mb-4 grid gap-3 sm:grid-cols-2"><Field label="Search payout clients"><Input value={search} onChange={(event) => setSearch(event.target.value)} /></Field><Field label="Payout due status"><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All clients in this period</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field></div>
            {rows.length === 0 ? <p role="status" className="py-6 text-sm">{mode === "upcoming" ? "No upcoming client payout balance remains for next month according to the ledger." : "No client payout balance remains for this month according to the ledger."}</p> : <AdminTable key={`${search}|${status}`} rows={filtered} searchable={false} pageSize={20} printAllRows columns={[
              { key: "client", header: "Client", render: (row) => <Link className="font-bold text-forest-800 dark:text-gold-100 hover:underline" to={`/admin/clients/${encodeURIComponent(row.clientId)}`}><p>{row.clientName || "Name unavailable"}</p><p className="mt-1 text-xs">{row.clientId}</p></Link> },
              { key: "scheduled", header: "Monthly scheduled", render: (row) => currency.format(row.scheduledAmount) },
              { key: "recorded", header: "Recorded for month", render: (row) => currency.format(row.recordedAmount) },
              { key: "remaining", header: mode === "upcoming" ? "Upcoming balance" : "Pending payout", render: (row) => <strong>{currency.format(row.remainingAmount)}</strong> },
              { key: "date", header: "Cycle due date", render: (row) => row.dueDate ? formatDate(row.dueDate) : row.dueStatus === "review_required" ? "Cycle review required" : "Date unavailable" },
              { key: "status", header: "Due status", render: (row) => <span className={row.dueStatus === "overdue" ? "font-semibold text-red-700 dark:text-red-300" : "font-semibold text-gold-700 dark:text-gold-100"}>{statusLabels[row.dueStatus]}</span> },
              { key: "note", header: "Review notes", render: (row) => <span className="inline-block max-w-72 whitespace-normal">{row.note || "Bank settlement not independently verified"}</span> }
            ]} />}
            <p className="mt-4 text-sm font-semibold">{filtered.length} clients in this estimate. Balance total: {currency.format(filtered.reduce((total, row) => total + row.remainingAmount, 0))}.</p>
          </>}
    </AdminCard>
  </section>;
}
