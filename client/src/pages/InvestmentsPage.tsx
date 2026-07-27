import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import type { Investment } from "../types/domain";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function InvestmentsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Investment[]>("investments", "/investments");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  return (
    <>
      <PageHeader title={admin ? "Investment Management" : "My Investments"} eyebrow="Portfolio records" actions={admin && <button className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><Plus className="h-4 w-4" /> New Investment</button>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="No investments available" message="The spreadsheet did not return investment records for this account." /> : (
          <DataTable rows={rows} columns={[
            { key: "id", header: "Investment ID", render: (row) => <Link className="font-semibold text-forest-700 dark:text-gold-100" to={`${row.id}`}>{row.id}</Link> },
            { key: "clientId", header: "Client ID", render: (row) => row.clientId },
            { key: "plan", header: "Plan", render: (row) => row.plan },
            { key: "principal", header: "Principal", render: (row) => formatCurrency(row.principalAmount) },
            { key: "monthly", header: "Monthly Return", render: (row) => formatCurrency(row.monthlyReturn) },
            { key: "value", header: "Current Value", render: (row) => formatCurrency(row.currentValue) },
            { key: "maturity", header: "Maturity", render: (row) => formatDate(row.maturityDate) },
            { key: "status", header: "Status", render: (row) => titleCase(row.status) }
          ]} />
        )}
      </Card>
    </>
  );
}
