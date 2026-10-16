import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { formatCurrency, formatDate } from "../../utils/format";
import { AdminCard } from "./AdminComponents";
import { AdminChartEmpty, AdminChartFrame } from "./AdminChartFrame";
import { portfolioChartSeries } from "./adminChartSeries";

const adminRupeeAxis = (value: number) => `\u20b9${Number((value / 1000).toFixed(1))}K`;

export function AdminOverviewCharts({ analytics, currentValue }: { analytics?: AdminFinancialAnalytics; currentValue?: number }) {
  const points = analytics ? portfolioChartSeries(analytics) : [];
  const hasHistory = points.some((point) => point.amount !== null);
  const currentOnly = (analytics?.portfolioHistorySource ?? analytics?.portfolioGrowthSource) === "current_snapshot";
  const detail = currentOnly ? "Current recorded total; earlier monthly balances are unavailable" : analytics?.portfolioHistorySource === "recorded_balances" ? "Recorded client balances with dated cash-flow updates" : "Month-end balances reconstructed from dated investment, payout and withdrawal records";
  return <AdminCard>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><Heading title="Current Portfolio" detail="Month-end portfolio amount over the last 24 months" />{currentValue !== undefined && <p className="text-2xl font-bold text-forest-800 dark:text-gold-100">{formatCurrency(currentValue)}</p>}</div>
    {hasHistory ? <AdminChartFrame height={420}><AreaChart data={points} margin={{ top: 18, right: 12, bottom: 24, left: 6 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" minTickGap={18} label={{ value: "Month", position: "insideBottom", offset: -16 }} /><YAxis width={80} tickFormatter={adminRupeeAxis} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), "Portfolio amount"]} labelFormatter={(_label, payload) => payload?.[0]?.payload?.month ?? _label} /><Area dataKey="amount" name="Portfolio amount" type="linear" connectNulls={false} stroke="#14583f" fill="#1e7b5433" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} /></AreaChart></AdminChartFrame> : <AdminChartEmpty message="No dated financial history is available for the last 24 months." />}
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">{detail}. Missing history is left blank.</p>
    {analytics && !analytics.portfolioHistoryMonths && <p role="status" className="mt-2 text-sm text-amber-800 dark:text-gold-100">The 24-month history requires Apps Script V20. The previously available series is shown until it is deployed.</p>}
  </AdminCard>;
}

export function AdminChartSources({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  if (!analytics?.sources) return null;
  return <details className="mt-4 rounded-lg border border-forest-100 bg-white/70 p-4 text-sm dark:border-white/15 dark:bg-white/5">
    <summary className="cursor-pointer font-semibold text-forest-900 dark:text-gold-100">Chart data sources</summary>
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">Snapshot: {formatDate(analytics.asOf)} {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(analytics.asOf))} IST</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">{analytics.sources.map((source) => <div key={source.module} className="min-w-0 border-b border-forest-100 pb-3 dark:border-white/10"><p className="font-semibold">{source.module}: {source.sheet || "Missing tab"} ({source.recordCount} records)</p><p className="mt-1 break-words text-xs text-charcoal/65 dark:text-white/65">{source.headers.join(", ")}</p>{source.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-800 dark:text-gold-100">{warning}</p>)}</div>)}</div>
    {Object.entries(analytics.excludedTransactionStatuses ?? {}).map(([status, count]) => <p key={status} className="mt-2 text-xs">{count} {status} transactions excluded from completed-activity charts.</p>)}
    {analytics.portfolioReconciliation && <p className="mt-2 text-xs">History closing balance: {formatCurrency(analytics.portfolioReconciliation.calculated)}. Current spreadsheet total: {formatCurrency(analytics.portfolioReconciliation.recorded)}. Difference: {formatCurrency(analytics.portfolioReconciliation.difference)}.</p>}
  </details>;
}

function Heading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-4"><p className="text-xs font-bold uppercase text-gold-600 dark:text-gold-100">Executive intelligence</p><h2 className="mt-1 text-lg font-bold text-navy-900 dark:text-ivory">{title}</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{detail}</p></div>;
}
