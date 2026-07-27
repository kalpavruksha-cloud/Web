import { Activity, IndianRupee, ShieldAlert, Users, WalletCards } from "lucide-react";
import { useDashboard, useResource } from "../api/queries";
import { Card, StatCard } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import type { Profile, Transaction } from "../types/domain";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function AdminDashboardPage() {
  const dashboard = useDashboard();
  const clients = useResource<Profile[]>("clients", "/clients");
  const transactions = useResource<Transaction[]>("transactions", "/transactions");

  if (dashboard.isLoading || clients.isLoading || transactions.isLoading) return <LoadingState label="Loading admin records from spreadsheet" />;
  if (dashboard.error) return <ErrorState message={dashboard.error instanceof Error ? dashboard.error.message : "Admin dashboard could not be loaded."} />;
  if (clients.error) return <ErrorState message={clients.error instanceof Error ? clients.error.message : "Client records could not be loaded."} />;
  if (transactions.error) return <ErrorState message={transactions.error instanceof Error ? transactions.error.message : "Transaction records could not be loaded."} />;

  const data = dashboard.data;
  const admin = data?.admin;
  const clientRows = clients.data ?? [];
  const transactionRows = transactions.data ?? [];
  const totalCredits = transactionRows.reduce((sum, row) => sum + row.credit, 0);
  const totalDebits = transactionRows.reduce((sum, row) => sum + row.debit, 0);

  return (
    <>
      <PageHeader title="Admin Dashboard" eyebrow="Cumulative spreadsheet control centre" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Clients" value={String(admin?.totalClients ?? clientRows.length)} hint={`${admin?.activeClients ?? clientRows.filter((row) => row.accountStatus === "active").length} active`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Investment" value={formatCurrency(admin?.totalInvestment ?? data?.totalInvestedAmount)} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="Portfolio Value" value={formatCurrency(admin?.portfolioValue ?? data?.currentPortfolioValue)} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Credits" value={formatCurrency(totalCredits)} hint={`${transactionRows.length} transactions`} icon={<WalletCards className="h-5 w-5" />} />
        <StatCard label="Pending KYC" value={String(admin?.pendingKyc ?? clientRows.filter((row) => row.kycStatus !== "verified").length)} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-forest-900 dark:text-ivory">Client List</h2>
          <DataTable rows={clientRows} columns={[
            { key: "clientId", header: "Client ID", render: (row) => row.clientId },
            { key: "name", header: "Name", render: (row) => row.fullName },
            { key: "mobile", header: "Mobile", render: (row) => row.mobile },
            { key: "risk", header: "Risk", render: (row) => titleCase(row.riskProfile) },
            { key: "status", header: "Status", render: (row) => titleCase(row.accountStatus) }
          ]} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-forest-900 dark:text-ivory">Recent Transactions</h2>
          <DataTable rows={transactionRows.slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, 10)} columns={[
            { key: "id", header: "Tx ID", render: (row) => row.id },
            { key: "date", header: "Date", render: (row) => formatDate(row.date) },
            { key: "client", header: "Client", render: (row) => row.clientId },
            { key: "type", header: "Type", render: (row) => titleCase(row.type) },
            { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) },
            { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) }
          ]} />
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-forest-900 dark:text-ivory">Operations Snapshot</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Total debits" value={formatCurrency(totalDebits)} />
          <Info label="Pending withdrawals" value={admin?.pendingWithdrawals ?? 0} />
          <Info label="Referral liabilities" value={formatCurrency(admin?.referralLiabilities ?? 0)} />
          <Info label="Active investments" value={admin?.activeInvestments ?? 0} />
        </dl>
      </Card>
    </>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-forest-50 p-3 dark:bg-white/5"><dt className="text-charcoal/60 dark:text-white/60">{label}</dt><dd className="mt-1 font-bold text-forest-900 dark:text-ivory">{value}</dd></div>;
}
