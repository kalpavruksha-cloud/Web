import { Activity, Bell, IndianRupee, Landmark, ShieldCheck, TrendingUp, Users, WalletCards } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { MetricCard } from "./AdminComponents";
import { computeAdminMetrics, type AdminCollections } from "./adminUtils";

export function AdminOverviewCards({ data }: { data: AdminCollections }) {
  const metrics = computeAdminMetrics(data);
  const analytics = data.dashboard?.adminAnalytics;
  const month = analytics ? new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(analytics.asOf)) : "Current month";
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard label="Total Clients" value={String(metrics.totalClients)} hint={`${metrics.activeClients} active, ${metrics.inactiveClients} inactive`} icon={<Users className="h-5 w-5" />} />
    <MetricCard label="Verified KYC" value={String(metrics.verifiedKyc)} hint={`${metrics.pendingKyc} ${metrics.pendingKyc === 1 ? "client needs" : "clients need"} KYC review`} icon={<ShieldCheck className="h-5 w-5" />} tone="gold" />
    <MetricCard label="Total Investment" value={formatCurrency(metrics.totalInvestment)} hint={`Net investment: ${metrics.netInvestment === null ? "Not available" : formatCurrency(metrics.netInvestment)}`} icon={<IndianRupee className="h-5 w-5" />} />
    <MetricCard label="Total Portfolio Value" value={formatCurrency(metrics.portfolioValue)} hint="Current portfolio recorded in spreadsheet" icon={<TrendingUp className="h-5 w-5" />} />
    <MetricCard label="Estimated Monthly Payout" value={metrics.remainingMonthlyPayout === null ? "Not available" : formatCurrency(metrics.remainingMonthlyPayout)} hint={<><span className="block">Remaining for {month}</span><span className="mt-1 block">Scheduled: {metrics.scheduledMonthlyPayout === null ? "Not available" : formatCurrency(metrics.scheduledMonthlyPayout)}</span><span className="mt-1 block">Recorded payouts for month: {metrics.paidMonthlyPayout === null ? "Not available" : formatCurrency(metrics.paidMonthlyPayout)}</span><span className="mt-1 block">Total payouts: {metrics.totalPayouts === null ? "Not available" : formatCurrency(metrics.totalPayouts)}</span></>} icon={<Landmark className="h-5 w-5" />} tone="gold" />
    <MetricCard label="Pending Withdrawals" value={String(metrics.pendingWithdrawals)} hint={<><span className="block">Awaiting approval: {formatCurrency(metrics.pendingWithdrawalAmount)}</span><span className="mt-1 block">{metrics.approvedWithdrawals} approved, {metrics.paidWithdrawals} paid</span></>} icon={<WalletCards className="h-5 w-5" />} />
    <MetricCard label="Referral Commission" value={formatCurrency(metrics.totalReferralCommission)} hint={`${formatCurrency(metrics.pendingReferralCommission)} pending`} icon={<Activity className="h-5 w-5" />} />
    <MetricCard label="Documents Uploaded" value={String(metrics.documentsUploaded)} hint={`${metrics.unreadNotifications} unread notifications`} icon={<Bell className="h-5 w-5" />} tone="slate" />
    {data.dashboard?.presentInvestment !== undefined && <div className="sm:col-span-2"><MetricCard label="Present Investment" value={data.dashboard.presentInvestment === null ? "Not available" : formatCurrency(data.dashboard.presentInvestment)} icon={<IndianRupee className="h-5 w-5" />} /></div>}
    {data.dashboard?.monthlyPayout !== undefined && <div className="sm:col-span-2"><MetricCard label="Monthly Payout" value={data.dashboard.monthlyPayout === null ? "Not available" : formatCurrency(data.dashboard.monthlyPayout)} icon={<Landmark className="h-5 w-5" />} tone="gold" /></div>}
  </div>{data.dashboard?.admin && data.dashboard.admin.remainingMonthlyPayout === undefined && <p role="status" className="mt-3 text-sm text-amber-800 dark:text-gold-100">Payout remainder requires Apps Script V21. The current deployment does not provide the unpaid monthly balance.</p>}</>;
}
