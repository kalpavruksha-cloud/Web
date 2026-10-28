import { useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { formatCurrency } from "../../utils/format";
import { AdminCard, CommandButton, Field, Select } from "./AdminComponents";
import { chartYears, dailyChartSeries, latestActivityYear, monthlyChartSeries, monthOptions, transactionFlowSeries } from "./adminChartSeries";
import { exportCsv } from "./adminUtils";
import { AdminChartFrame } from "./AdminChartFrame";
import { AdminChartSources } from "./AdminOverviewCharts";

export function AdminMoneyCharts({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  if (!analytics) return <AdminCard><p role="status" className="text-sm text-amber-800 dark:text-gold-100">Monthly analytics are unavailable. Deploy the updated Apps Script V20 and refresh this page.</p></AdminCard>;
  const warnings = [...new Set([...analytics.warnings, ...(analytics.sources ?? [])
    .filter((source) => source.recordCount > 0 && ["transactions", "withdrawal_history"].includes(source.module))
    .flatMap((source) => source.warnings.map((warning) => `${source.sheet || source.module}: ${warning}`))])];
  return <>
    <div className="grid gap-6 xl:grid-cols-2">
      <InvestmentChart analytics={analytics} />
      <WithdrawalChart analytics={analytics} />
    </div>
    {warnings.length > 0 && <div role="status" className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"><ul className="grid gap-2">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <AdminChartSources analytics={analytics} />
  </>;
}

function InvestmentChart({ analytics }: { analytics: AdminFinancialAnalytics }) {
  const [selectedYear, setSelectedYear] = useState<number>();
  const years = chartYears(analytics.investmentMonths, analytics.currentYear);
  const year = selectedYear !== undefined && years.includes(selectedYear) ? selectedYear : latestActivityYear(analytics.investmentMonths, analytics.currentYear);
  const points = monthlyChartSeries(analytics.investmentMonths, year, analytics.currentYear, analytics.currentMonth);
  const total = points.reduce((sum, row) => sum + row.amount, 0);
  return <AdminCard>
    <ChartHeading title="Monthly Investment" detail={`January to ${monthOptions[year === analytics.currentYear ? analytics.currentMonth - 1 : 11]} ${year}`} total={total} points={points} filename={`monthly-investment-${year}.csv`} />
    <div className="mb-4 max-w-xs"><Field label="Investment Year"><Select value={year} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field></div>
    <MoneyBarChart points={points} color="#1e7b54" />
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">{analytics.investmentSource === "investment_master" ? "Dated investment amounts from Investment_Master" : analytics.investmentSource === "transaction_ledger" ? "Completed investment transactions" : "Investment principal by start date"}</p>
  </AdminCard>;
}

function WithdrawalChart({ analytics }: { analytics: AdminFinancialAnalytics }) {
  const [selectedYear, setSelectedYear] = useState<number>();
  const [month, setMonth] = useState("all");
  const years = chartYears(analytics.withdrawalMonths, analytics.currentYear);
  const year = selectedYear !== undefined && years.includes(selectedYear) ? selectedYear : latestActivityYear(analytics.withdrawalMonths, analytics.currentYear);
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
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">{analytics.withdrawalSource === "combined_records" ? "Master history, completed ledger or paid requests; one source per client and month" : analytics.withdrawalSource === "withdrawal_master" ? "Dated withdrawal amounts from Withdrawal_Master; pending requests excluded" : analytics.withdrawalSource === "transaction_ledger" ? "Completed withdrawal transactions; pending requests excluded" : "Paid withdrawal records by payment date; pending requests excluded"}</p>
  </AdminCard>;
}

export function AdminPayoutChart({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  const [selectedYear, setSelectedYear] = useState<number>();
  if (!analytics) return <AdminCard><h2 className="text-lg font-bold">Monthly Payout Report</h2><p role="status">Monthly analytics were not returned by the spreadsheet service.</p></AdminCard>;
  const years = chartYears(analytics.payoutMonths, analytics.currentYear);
  const year = selectedYear !== undefined && years.includes(selectedYear) ? selectedYear : latestActivityYear(analytics.payoutMonths, analytics.currentYear);
  const points = monthlyChartSeries(analytics.payoutMonths, year, analytics.currentYear, analytics.currentMonth);
  return <AdminCard>
    <ChartHeading title="Monthly Payout Report" detail={`Completed payout and interest transactions in ${year}; reversals deducted`} total={points.reduce((sum, row) => sum + row.amount, 0)} points={points} filename={`monthly-payout-${year}.csv`} />
    <div className="mb-4 max-w-xs"><Field label="Payout Year"><Select value={year} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field></div>
    <MoneyBarChart points={points} color="#b68b22" />
    <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">Actual recorded payments by payment month, not the current monthly schedule or lifetime payout total.</p>
  </AdminCard>;
}

export function AdminTransactionFlowChart({ analytics }: { analytics?: AdminFinancialAnalytics }) {
  const [selectedYear, setSelectedYear] = useState<number>();
  if (!analytics) return <AdminCard><h2 className="text-lg font-bold">Transaction Flow</h2><p role="status">Monthly analytics were not returned by the spreadsheet service.</p></AdminCard>;
  const totals = analytics.transactionFlowMonths?.map((row) => ({ month: row.month, amount: Math.abs(row.credit) + Math.abs(row.debit) })) ?? analytics.transactionMonths ?? [];
  const years = chartYears(totals, analytics.currentYear);
  const year = selectedYear !== undefined && years.includes(selectedYear) ? selectedYear : latestActivityYear(totals, analytics.currentYear);
  const points = transactionFlowSeries(analytics.transactionFlowMonths ?? [], year, analytics.currentYear, analytics.currentMonth);
  const legacyPoints = monthlyChartSeries(analytics.transactionMonths ?? [], year, analytics.currentYear, analytics.currentMonth);
  const hasBreakdown = analytics.transactionFlowMonths !== undefined;
  const net = (hasBreakdown ? points.map((row) => row.net) : legacyPoints.map((row) => row.amount)).reduce((sum, amount) => sum + amount, 0);
  return <AdminCard>
    <ChartHeading title="Transaction Flow" detail={`Completed credit and debit in ${year} - net movement`} total={net} points={hasBreakdown ? points : legacyPoints} filename={`transaction-flow-${year}.csv`} />
    <div className="mb-4 max-w-xs"><Field label="Transaction Year"><Select value={year} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field></div>
    {hasBreakdown ? <>
      <AdminChartFrame><BarChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" vertical={false} /><XAxis dataKey="label" minTickGap={12} /><YAxis width={66} tickFormatter={moneyAxis} /><Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} /><Legend /><Bar dataKey="credit" name="Credit" fill="#1e7b54" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} /><Bar dataKey="debit" name="Debit" fill="#b68b22" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} /></BarChart></AdminChartFrame>
      {!points.some((point) => point.count > 0 || point.credit !== 0 || point.debit !== 0) && <p role="status" className="mt-2 text-sm text-charcoal/65 dark:text-white/65">No completed transactions are recorded for this period.</p>}
    </> : <><MoneyBarChart points={legacyPoints} color="#153bb7" /><p role="status" className="mt-3 text-sm text-amber-800 dark:text-gold-100">Only net flow is available from this deployment. Deploy Apps Script V24 for separate credit and debit bars.</p></>}
  </AdminCard>;
}

function ChartHeading({ title, detail, total, points, filename }: { title: string; detail: string; total: number; points: Array<Record<string, string | number>>; filename: string }) {
  return <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0"><p className="text-xs font-bold uppercase text-gold-600 dark:text-gold-100">Executive intelligence</p><h2 className="mt-1 text-lg font-bold text-navy-900 dark:text-ivory">{title}</h2><p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{detail}</p><p className="mt-2 text-xl font-bold text-forest-800 dark:text-gold-100">{formatCurrency(total)}</p></div>
    <CommandButton tone="secondary" onClick={() => exportCsv(filename, points)}><Download className="h-4 w-4" />Export</CommandButton>
  </div>;
}

const moneyAxis = (value: number) => `\u20b9${Number((value / 1000).toFixed(1))}K`;

function MoneyBarChart({ points, color }: { points: Array<{ label: string; amount: number }>; color: string }) {
  return <><AdminChartFrame><BarChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" vertical={false} /><XAxis dataKey="label" minTickGap={12} /><YAxis width={66} tickFormatter={moneyAxis} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} /><Bar dataKey="amount" fill={color} radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={false} /></BarChart></AdminChartFrame>
    {!points.some((point) => point.amount !== 0) && <p role="status" className="mt-2 text-sm text-charcoal/65 dark:text-white/65">No completed activity is recorded for this period.</p>}
  </>;
}
