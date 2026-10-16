import { useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { formatCurrency } from "../../utils/format";
import { AdminCard, CommandButton, Field, Select } from "./AdminComponents";
import { dailyChartSeries, monthlyChartSeries, monthOptions } from "./adminChartSeries";
import { exportCsv } from "./adminUtils";
import { AdminChartFrame } from "./AdminChartFrame";
import { AdminChartSources } from "./AdminOverviewCharts";

export function AdminMoneyCharts({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  if (!analytics) return <AdminCard><p role="status" className="text-sm text-amber-800 dark:text-gold-100">Monthly analytics are unavailable. Deploy the updated Apps Script V20 and refresh this page.</p></AdminCard>;
  return <>
    <div className="grid gap-6 xl:grid-cols-2">
      <InvestmentChart analytics={analytics} />
      <WithdrawalChart analytics={analytics} />
    </div>
    {analytics.warnings.length > 0 && <div role="status" className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"><ul className="grid gap-2">{analytics.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <AdminChartSources analytics={analytics} />
  </>;
}

function InvestmentChart({ analytics }: { analytics: AdminFinancialAnalytics }) {
  const points = monthlyChartSeries(analytics.investmentMonths, analytics.currentYear, analytics.currentYear, analytics.currentMonth);
  const total = points.reduce((sum, row) => sum + row.amount, 0);
  return <AdminCard>
    <ChartHeading title="Monthly Investment" detail={`January to ${monthOptions[analytics.currentMonth - 1]} ${analytics.currentYear}`} total={total} points={points} filename={`monthly-investment-${analytics.currentYear}.csv`} />
    <MoneyBarChart points={points} color="#1e7b54" />
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">{analytics.investmentSource === "investment_master" ? "Dated investment amounts from Investment_Master" : analytics.investmentSource === "transaction_ledger" ? "Completed investment transactions" : "Investment principal by start date"}</p>
  </AdminCard>;
}

function WithdrawalChart({ analytics }: { analytics: AdminFinancialAnalytics }) {
  const [selectedYear, setSelectedYear] = useState(analytics.currentYear);
  const [month, setMonth] = useState("all");
  const years = [...new Set([analytics.currentYear, ...analytics.withdrawalMonths.map((row) => Number(row.month.slice(0, 4)))])].sort((a, b) => b - a);
  const year = years.includes(selectedYear) ? selectedYear : analytics.currentYear;
  const availableMonths = year === analytics.currentYear ? monthOptions.slice(0, analytics.currentMonth) : monthOptions;
  const effectiveMonth = month !== "all" && Number(month) > availableMonths.length ? "all" : month;
  const points = effectiveMonth === "all" ? monthlyChartSeries(analytics.withdrawalMonths, year, analytics.currentYear, analytics.currentMonth)
    : dailyChartSeries(analytics.withdrawalDays, year, Number(effectiveMonth), analytics.asOf);
  const total = points.reduce((sum, row) => sum + row.amount, 0);
  return <AdminCard>
    <ChartHeading title="Monthly Withdrawals" detail={effectiveMonth === "all" ? `Completed withdrawals in ${year}` : `${monthOptions[Number(effectiveMonth) - 1]} ${year} - daily totals`} total={total} points={points} filename={`withdrawals-${year}-${effectiveMonth}.csv`} />
    <div className="mb-4 grid grid-cols-2 gap-3">
      <Field label="Withdrawal Year"><Select value={year} onChange={(event) => { setSelectedYear(Number(event.target.value)); setMonth("all"); }}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field>
      <Field label="Withdrawal Month"><Select value={effectiveMonth} onChange={(event) => setMonth(event.target.value)}><option value="all">All months</option>{availableMonths.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</Select></Field>
    </div>
    <MoneyBarChart points={points} color="#d7ab3d" />
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">{analytics.withdrawalSource === "withdrawal_master" ? "Dated withdrawal amounts from Withdrawal_Master; pending requests excluded" : analytics.withdrawalSource === "transaction_ledger" ? "Completed withdrawal transactions; pending requests excluded" : "Paid withdrawal records by payment date; pending requests excluded"}</p>
  </AdminCard>;
}

function ChartHeading({ title, detail, total, points, filename }: { title: string; detail: string; total: number; points: Array<{ label: string; amount: number }>; filename: string }) {
  return <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0"><p className="text-xs font-bold uppercase text-gold-600 dark:text-gold-100">Executive intelligence</p><h2 className="mt-1 text-lg font-bold text-navy-900 dark:text-ivory">{title}</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{detail}</p><p className="mt-2 text-xl font-bold text-forest-800 dark:text-gold-100">{formatCurrency(total)}</p></div>
    <CommandButton tone="secondary" onClick={() => exportCsv(filename, points)}><Download className="h-4 w-4" />Export</CommandButton>
  </div>;
}

function MoneyBarChart({ points, color }: { points: Array<{ label: string; amount: number }>; color: string }) {
  return <><AdminChartFrame><BarChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" vertical={false} /><XAxis dataKey="label" minTickGap={12} /><YAxis width={66} tickFormatter={(value: number) => `\u20b9${Number((value / 1000).toFixed(1))}K`} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} /><Bar dataKey="amount" fill={color} radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={false} /></BarChart></AdminChartFrame>
    {!points.some((point) => point.amount !== 0) && <p role="status" className="mt-2 text-sm text-charcoal/65 dark:text-white/65">No completed activity is recorded for this period.</p>}
  </>;
}
