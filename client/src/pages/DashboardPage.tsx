import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, BriefcaseBusiness, CalendarClock, IndianRupee, Landmark, TrendingUp, WalletCards } from "lucide-react";
import { Card, StatCard } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import { useDashboard } from "../api/queries";
import { formatCurrency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export function DashboardPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Dashboard data could not be loaded from the spreadsheet."} />;

  const adminStats = data.admin;
  const allocation = (data.investments ?? []).map((item) => ({ name: item.category || item.plan, value: item.currentValue || item.principalAmount }));
  const growth = (data.recentTransactions ?? []).slice().reverse().map((item) => ({ date: formatDate(item.date), value: item.balance ?? item.credit - item.debit }));

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
          <StatCard label="Wallet Balance" value={formatCurrency(data.walletBalance)} hint={`${data.pendingWithdrawals} pending withdrawals`} icon={<WalletCards className="h-5 w-5" />} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-forest-900 dark:text-ivory">Investment Growth</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <defs><linearGradient id="growth" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#1e7b54" stopOpacity={0.38} /><stop offset="100%" stopColor="#1e7b54" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="value" stroke="#1e7b54" fill="url(#growth)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-forest-900 dark:text-ivory">Portfolio Allocation</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {allocation.map((_, index) => <Cell key={index} fill={["#14583f", "#1e7b54", "#d7ab3d", "#a97a16", "#6b8f71"][index % 5]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
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
