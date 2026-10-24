import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSummary } from "../../types/domain";
import { formatCurrency } from "../../utils/format";

export function ClientPortfolioChart({ history }: { history?: DashboardSummary["portfolioHistory"] }) {
  if (!history) return <p role="status" className="py-10 text-center text-sm text-charcoal/65 dark:text-white/65">One-year portfolio history requires the updated Apps Script V23.</p>;
  const points = history.months.slice(-12).map((row) => ({ ...row, label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${row.month}-01T00:00:00Z`)) }));
  if (!points.some((row) => row.amount !== null)) return <p role="status" className="py-10 text-center text-sm text-charcoal/65 dark:text-white/65">No dated portfolio history is available for this period.</p>;
  return <>
    <div className="min-w-0 w-full" role="img" aria-label="Portfolio growth over the last 12 months">
      <ResponsiveContainer width="100%" height={288} minWidth={0}>
        <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" vertical={false} />
          <XAxis dataKey="label" minTickGap={12} />
          <YAxis width={72} tickFormatter={(value: number) => `\u20b9${Number((value / 1000).toFixed(1))}K`} />
          <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Portfolio amount"]} labelFormatter={(_label, payload) => payload?.[0]?.payload?.month ?? _label} />
          <Area dataKey="amount" name="Portfolio amount" type="linear" connectNulls={false} stroke="#14583f" fill="#1e7b5433" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    {history.source === "current_snapshot" && <p className="mt-3 text-xs text-charcoal/65 dark:text-white/65">Only the current portfolio snapshot is recorded; earlier monthly balances are unavailable.</p>}
    {!history.matchesCurrentPortfolio && <p role="status" className="mt-3 text-xs text-amber-800 dark:text-gold-100">Recorded history does not reconcile with your current portfolio total.</p>}
  </>;
}
