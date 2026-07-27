import { Activity, Bell, IndianRupee, Landmark, ShieldCheck, TrendingUp, Users, WalletCards } from "lucide-react";
import type { ReactElement } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useResource } from "../../../api/queries";
import { ErrorState } from "../../../components/State";
import type { ClientDocument, ClientNotification, Investment, Profile, Referral, Transaction, Withdrawal } from "../../../types/domain";
import { formatCurrency, formatDate } from "../../../utils/format";
import { AdminCard, AdminLoading, AdminPage, AdminTable, MetricCard, StatusBadge } from "../AdminComponents";
import { computeAdminMetrics, distribution, monthlySeries, recentActivity, title } from "../adminUtils";

const chartColors = ["#08152f", "#153bb7", "#d7ab3d", "#2563eb", "#1e7b54", "#a97a16"];

export function AdminDashboard() {
  const dashboard = useDashboard();
  const clients = useResource<Profile[]>("admin-clients", "/clients");
  const investments = useResource<Investment[]>("admin-investments", "/investments");
  const transactions = useResource<Transaction[]>("admin-transactions", "/transactions");
  const withdrawals = useResource<Withdrawal[]>("admin-withdrawals", "/withdrawals");
  const documents = useResource<ClientDocument[]>("admin-documents", "/documents");
  const referrals = useResource<Referral[]>("admin-referrals", "/referrals");
  const notifications = useResource<ClientNotification[]>("admin-notifications", "/notifications");

  const loading = [dashboard, clients, investments, transactions, withdrawals, documents, referrals, notifications].some((query) => query.isLoading);
  const error = [dashboard, clients, investments, transactions, withdrawals, documents, referrals, notifications].find((query) => query.error)?.error;

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState title="Unable to load admin dashboard" message={error instanceof Error ? error.message : "The spreadsheet API did not return admin records."} />;

  const data = {
    dashboard: dashboard.data,
    clients: clients.data ?? [],
    investments: investments.data ?? [],
    transactions: transactions.data ?? [],
    withdrawals: withdrawals.data ?? [],
    documents: documents.data ?? [],
    referrals: referrals.data ?? [],
    notifications: notifications.data ?? []
  };
  const metrics = computeAdminMetrics(data);
  const investmentGrowth = monthlySeries(data.transactions, (row) => row.date, (row) => row.credit - row.debit);
  const monthlyInvestments = monthlySeries(data.investments, (row) => row.startDate, (row) => row.principalAmount);
  const monthlyWithdrawals = monthlySeries(data.withdrawals, (row) => row.requestDate, (row) => row.amount);
  const registrations = monthlySeries(data.clients, (row) => row.dateOfBirth, () => 1);
  const portfolio = distribution(data.investments, (row) => row.category || row.plan, (row) => row.currentValue || row.principalAmount);
  const activityRows = recentActivity(data).slice(0, 8);

  return (
    <AdminPage title="Admin Dashboard" eyebrow="Cumulative live view from Google Spreadsheet">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Clients" value={String(metrics.totalClients)} hint={`${metrics.activeClients} active, ${metrics.inactiveClients} inactive`} icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Verified KYC" value={String(metrics.verifiedKyc)} hint={`${metrics.pendingKyc} pending`} icon={<ShieldCheck className="h-5 w-5" />} tone="gold" />
        <MetricCard label="Total Investment" value={formatCurrency(metrics.totalInvestment)} icon={<IndianRupee className="h-5 w-5" />} />
        <MetricCard label="Portfolio Value" value={formatCurrency(metrics.portfolioValue)} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard label="Monthly Payout" value={formatCurrency(metrics.monthlyPayout)} icon={<Landmark className="h-5 w-5" />} tone="gold" />
        <MetricCard label="Pending Withdrawals" value={String(metrics.pendingWithdrawals)} hint={`${metrics.approvedWithdrawals} approved, ${metrics.paidWithdrawals} paid`} icon={<WalletCards className="h-5 w-5" />} />
        <MetricCard label="Referral Commission" value={formatCurrency(metrics.totalReferralCommission)} hint={`${formatCurrency(metrics.pendingReferralCommission)} pending`} icon={<Activity className="h-5 w-5" />} />
        <MetricCard label="Documents / Alerts" value={`${metrics.documentsUploaded} / ${metrics.unreadNotifications}`} hint="Uploaded documents / unread notifications" icon={<Bell className="h-5 w-5" />} tone="slate" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard>
          <SectionTitle title="Investment Growth" subtitle="Net credit minus debit by transaction month" />
          <ChartBox><AreaChart data={investmentGrowth}><CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="value" stroke="#14583f" fill="#1e7b5433" strokeWidth={3} /></AreaChart></ChartBox>
        </AdminCard>
        <AdminCard>
          <SectionTitle title="Portfolio Distribution" subtitle="Current value grouped by plan/category" />
          <ChartBox>
            <PieChart>
              <Pie data={portfolio} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                {portfolio.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ChartBox>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminCard><SectionTitle title="Monthly Investment" subtitle="Principal grouped by investment start date" /><ChartBox small><BarChart data={monthlyInvestments}><XAxis dataKey="month" /><YAxis hide /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill="#1e7b54" radius={[6, 6, 0, 0]} /></BarChart></ChartBox></AdminCard>
        <AdminCard><SectionTitle title="Monthly Withdrawals" subtitle="Withdrawal requests grouped by month" /><ChartBox small><BarChart data={monthlyWithdrawals}><XAxis dataKey="month" /><YAxis hide /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill="#d7ab3d" radius={[6, 6, 0, 0]} /></BarChart></ChartBox></AdminCard>
        <AdminCard><SectionTitle title="Client Registration Trend" subtitle="Client records grouped by available date" /><ChartBox small><BarChart data={registrations}><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#14583f" radius={[6, 6, 0, 0]} /></BarChart></ChartBox></AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminCard>
          <SectionTitle title="Recent Transactions" subtitle="Newest ledger records from spreadsheet" />
          <AdminTable rows={data.transactions.slice(0, 8)} pageSize={4} columns={[
            { key: "id", header: "Tx ID", render: (row) => row.id },
            { key: "client", header: "Client", render: (row) => row.clientId },
            { key: "type", header: "Type", render: (row) => title(row.type) },
            { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) },
            { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) }
          ]} />
        </AdminCard>
        <AdminCard>
          <SectionTitle title="Recent Withdrawals" subtitle="Approval and payment workflow" />
          <AdminTable rows={data.withdrawals.slice(0, 8)} pageSize={4} columns={[
            { key: "id", header: "Request", render: (row) => row.id },
            { key: "client", header: "Client", render: (row) => row.clientId },
            { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
            { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> }
          ]} />
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminCard>
          <SectionTitle title="Recent Clients" subtitle="Client records from CLIENTS sheet" />
          <AdminTable rows={data.clients.slice(0, 8)} pageSize={4} columns={[
            { key: "id", header: "Client ID", render: (row) => row.clientId },
            { key: "name", header: "Name", render: (row) => row.fullName },
            { key: "kyc", header: "KYC", render: (row) => <StatusBadge value={row.kycStatus} /> },
            { key: "status", header: "Status", render: (row) => <StatusBadge value={row.accountStatus} /> }
          ]} />
        </AdminCard>
        <AdminCard>
          <SectionTitle title="Recent Activity" subtitle="Compiled from live client, transaction, withdrawal, and document records" />
          <div className="grid gap-3">
            {activityRows.length === 0 ? <p className="text-sm text-charcoal/60 dark:text-white/60">No activity records were returned by the spreadsheet APIs.</p> : activityRows.map((item) => (
              <div key={`${item.title}-${item.id}`} className="rounded-[18px] border border-navy-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(238,244,255,0.74))] p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-glow dark:border-white/10 dark:bg-white/7">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-forest-950 dark:text-ivory">{item.title}</p><p className="mt-1 text-sm text-charcoal/62 dark:text-white/62">{item.detail}</p></div>
                  <span className="text-xs font-bold text-gold-700 dark:text-gold-100">{formatDate(item.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">Executive intelligence</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-navy-900 dark:text-ivory">{title}</h2><p className="mt-1 text-sm text-charcoal/58 dark:text-white/58">{subtitle}</p></div>;
}

function ChartBox({ children, small = false }: { children: ReactElement; small?: boolean }) {
  return <div className={small ? "h-52 sm:h-56" : "h-64 sm:h-80"}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}
