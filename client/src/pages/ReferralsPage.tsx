import { Copy } from "lucide-react";
import { useResource } from "../api/queries";
import { Card, StatCard } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import { useToast } from "../context/ToastContext";
import type { Referral } from "../types/domain";
import { formatCurrency, titleCase } from "../utils/format";

export function ReferralsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Referral[]>("referrals", "/referrals");
  const { toast } = useToast();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  const total = rows.reduce((sum, item) => sum + (item.rewardAmount || 0), 0);
  const paid = rows.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  const code = rows.find((row) => row.code)?.code ?? "Not available";
  return (
    <>
      <PageHeader title={admin ? "Referral Management" : "Referrals"} eyebrow="Reward records from spreadsheet" />
      {!admin && <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Referral Code" value={code} icon={<Copy className="h-5 w-5" />} /><StatCard label="Pending Rewards" value={formatCurrency(total - paid)} /><StatCard label="Paid Rewards" value={formatCurrency(paid)} /></div>}
      <Card>
        {!admin && <button onClick={() => { void navigator.clipboard?.writeText(code); toast({ title: "Referral code copied" }); }} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><Copy className="h-4 w-4" /> Copy code</button>}
        {rows.length === 0 ? <EmptyState title="No referral records" message="Referral counts and earnings are shown only from verified spreadsheet reward rows." /> : (
          <DataTable rows={rows} columns={[
            { key: "id", header: "Referral ID", render: (row) => row.id },
            { key: "clientId", header: "Client ID", render: (row) => row.clientId },
            { key: "referred", header: "Referred Client", render: (row) => row.referredClientName || row.referredClientId },
            { key: "status", header: "Status", render: (row) => titleCase(row.status) },
            { key: "reward", header: "Reward", render: (row) => formatCurrency(row.rewardAmount) },
            { key: "paid", header: "Paid", render: (row) => formatCurrency(row.paidAmount) }
          ]} />
        )}
      </Card>
    </>
  );
}
