import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { formatCurrency, formatDate } from "../../utils/format";
import { AdminCard } from "./AdminComponents";
import { AdminChartEmpty, AdminChartFrame } from "./AdminChartFrame";

const colors = ["#14583f", "#153bb7", "#d7ab3d", "#2563eb", "#6f4b91", "#b85a36"];
const adminRupeeAxis = (value: number) => `\u20b9${Number((value / 1000).toFixed(1))}K`;

export function AdminOverviewCharts({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  const growth = analytics?.portfolioMonths ?? [];
  const portfolio = analytics?.portfolioDistribution ?? [];
  const registrations = analytics?.registrationMonths ?? [];
  const currentOnly = analytics?.portfolioGrowthSource === "current_snapshot";
  const growthTitle = currentOnly ? "Current Portfolio" : "Portfolio Movement";
  const growthDetail = currentOnly ? "Latest spreadsheet value; no historical dates available" : analytics?.portfolioGrowthSource === "investment_records" ? "Cumulative recorded investment principal" : "Cumulative posted credits minus debits";
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
    <AdminCard><Heading title={growthTitle} detail={growthDetail} />
      {growth.length ? <AdminChartFrame><AreaChart data={growth} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={66} tickFormatter={adminRupeeAxis} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area dataKey="amount" type="monotone" stroke="#14583f" fill="#1e7b5433" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} /></AreaChart></AdminChartFrame> : <AdminChartEmpty />}
    </AdminCard>
    <AdminCard><Heading title="Portfolio Distribution" detail={analytics?.portfolioDistributionSource === "dashboard_clients" ? "Current spreadsheet portfolio by client" : "Investment value by category or plan"} />
      {portfolio.length ? <AdminChartFrame><PieChart accessibilityLayer><Pie data={portfolio} dataKey="amount" nameKey="name" innerRadius="35%" outerRadius="65%" isAnimationActive={false}>{portfolio.map((row, index) => <Cell key={row.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /></PieChart></AdminChartFrame> : <AdminChartEmpty message="No positive portfolio values were returned by the spreadsheet." />}
    </AdminCard>
    <AdminCard><Heading title="Client Registration Trend" detail="Client registrations by recorded registration month" />
      {registrations.length ? <AdminChartFrame><BarChart data={registrations} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} width={40} /><Tooltip /><Bar dataKey="count" name="Clients" fill="#14583f" radius={[5, 5, 0, 0]} isAnimationActive={false} /></BarChart></AdminChartFrame> : <AdminChartEmpty message="Registration dates are missing. Date of birth is not registration history." />}
    </AdminCard>
  </div>;
}

export function AdminChartSources({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  if (!analytics?.sources) return null;
  return <details className="mt-4 rounded-lg border border-forest-100 bg-white/70 p-4 text-sm dark:border-white/15 dark:bg-white/5">
    <summary className="cursor-pointer font-semibold text-forest-900 dark:text-gold-100">Chart data sources</summary>
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">Snapshot: {formatDate(analytics.asOf)} {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(analytics.asOf))} IST</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">{analytics.sources.map((source) => <div key={source.module} className="min-w-0 border-b border-forest-100 pb-3 dark:border-white/10"><p className="font-semibold">{source.module}: {source.sheet || "Missing tab"} ({source.recordCount} records)</p><p className="mt-1 break-words text-xs text-charcoal/65 dark:text-white/65">{source.headers.join(", ")}</p>{source.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-800 dark:text-gold-100">{warning}</p>)}</div>)}</div>
    {Object.entries(analytics.excludedTransactionStatuses ?? {}).map(([status, count]) => <p key={status} className="mt-2 text-xs">{count} {status} transactions excluded from completed-activity charts.</p>)}
  </details>;
}

function Heading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-4"><p className="text-xs font-bold uppercase text-gold-600 dark:text-gold-100">Executive intelligence</p><h2 className="mt-1 text-lg font-bold text-navy-900 dark:text-ivory">{title}</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{detail}</p></div>;
}
