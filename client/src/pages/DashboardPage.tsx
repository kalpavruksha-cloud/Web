import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, BriefcaseBusiness, CalendarClock, IndianRupee, Landmark, TrendingUp, WalletCards } from "lucide-react";
import { Card, StatCard } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import { useDashboard } from "../api/queries";
import { formatCurrency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

type PortfolioGrowthPoint = { date?: string; value: number; credit?: number; debit?: number; transactionId?: string; investmentId?: string };

function portfolioMonthLabel(value?: string) {
  if (!value) return "Current";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString("en-IN", { month: "short", year: "2-digit" });
  return formatDate(value);
}

function portfolioMonthOrder(value?: string, fallback = 0) {
  if (!value) return fallback;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function monthlyPortfolioGrowth(points: PortfolioGrowthPoint[]) {
  const byMonth = new Map<string, { month: string; value: number; order: number }>();
  points.forEach((point, index) => {
    const month = portfolioMonthLabel(point.date);
    const order = portfolioMonthOrder(point.date, index);
    const value = Number(point.value || 0);
    const existing = byMonth.get(month);
    if (!existing || order >= existing.order) byMonth.set(month, { month, value, order });
  });
  return Array.from(byMonth.values()).sort((a, b) => a.order - b.order).map(({ month, value }) => ({ month, value }));
}

function formatThousandsAxis(value: unknown) {
  const thousands = Number(value || 0) / 1000;
  const display = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
  return `\u20b9${display}K`;
}

export function DashboardPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Dashboard data could not be loaded from the spreadsheet."} />;

  const adminStats = data.admin;
  const availableBalance = data.totalWithdrawal !== undefined ? data.totalInvestedAmount - data.totalWithdrawal : data.availableBalance ?? data.walletBalance;
  const rawGrowth = (data.portfolioGrowth?.length ? data.portfolioGrowth : data.investmentGrowth?.length ? data.investmentGrowth : (data.recentTransactions ?? []).slice().reverse().map((item) => ({ date: item.date, value: item.balance ?? item.credit - item.debit }))).filter((item) => item.date || Number(item.value || 0) !== 0);
  const growth = monthlyPortfolioGrowth(rawGrowth);

  return (
    <>
      <PageHeader title={admin ? "Admin Dashboard" : `Welcome, ${data.client?.fullName || user?.name || "Investor"}`} eyebrow={admin ? "Kalpavruksha operations" : data.client?.clientId || user?.clientId} />
      {admin && adminStats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Clients" value={String(adminStats.totalClients)} hint={`${adminStats.activeClients} active`} icon={<Landmark className="h-5 w-5" />} />
          <StatCard label="Total Investment" value={formatCurrency(adminStats.totalInvestment)} icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard label="Monthly Payout" value={formatCurrency(adminStats.monthlyPayoutAmount)} icon={<CalendarClock className="h-5 w-5" />} />
          <StatCard label="Pending Withdrawals" value={String(adminStats.pendingWithdrawals)} hint={`${adminStats.pendingKyc} KYC pending`} icon={<WalletCards className="h-5 w-5" />} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Invested" value={formatCurrency(data.totalInvestedAmount)} icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard label="Portfolio Value" value={formatCurrency(data.currentPortfolioValue)} hint={`${formatCurrency(data.totalReturns)} total returns`} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="Monthly Return" value={formatCurrency(data.monthlyReturn)} hint={`Next payout ${formatDate(data.nextPayoutDate)}`} icon={<CalendarClock className="h-5 w-5" />} />
          <StatCard label="Available Balance" value={formatCurrency(availableBalance)} hint={`${data.pendingWithdrawals} pending withdrawals`} icon={<WalletCards className="h-5 w-5" />} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-1">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-forest-900 dark:text-ivory">Portfolio Growth</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <defs><linearGradient id="growth" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#1e7b54" stopOpacity={0.38} /><stop offset="100%" stopColor="#1e7b54" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatThousandsAxis} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(label) => `Month: ${label}`} />
                <Area type="monotone" dataKey="value" stroke="#1e7b54" fill="url(#growth)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-bold text-forest-900 dark:text-ivory"><BriefcaseBusiness className="h-5 w-5" /> Status</h2>
          <dl className="grid gap-3 text-sm">
            <Info label="Active investments" value={data.activeInvestments} />
            <Info label="KYC status" value={data.kycStatus} />
            <Info label="Agreement status" value={data.agreementStatus} />
            <Info label="Referral earnings" value={formatCurrency(data.referralEarnings)} />
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-forest-900 dark:text-ivory"><Bell className="h-5 w-5" /> Recent Notifications</h2>
          <div className="grid gap-3">
            {(data.notifications ?? []).slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-lg bg-forest-50 p-3 dark:bg-white/5">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">{item.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return <div className="flex justify-between gap-3 border-b border-forest-100 pb-2 last:border-0 dark:border-white/10"><dt className="text-charcoal/60 dark:text-white/60">{label}</dt><dd className="font-semibold">{String(value ?? "Not available")}</dd></div>;
}
