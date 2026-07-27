import { Download } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import type { Transaction } from "../types/domain";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function TransactionsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Transaction[]>("transactions", "/transactions");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = (data ?? []).slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  return (
    <>
      <PageHeader title={admin ? "Transaction Management" : "Transactions"} eyebrow="Newest first" actions={<button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-4 py-2 font-semibold dark:border-white/10 dark:bg-white/5"><Download className="h-4 w-4" /> Statement</button>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="No transactions available" message="The ledger did not return transaction records for this view." /> : (
          <DataTable rows={rows} columns={[
            { key: "id", header: "Transaction ID", render: (row) => row.id },
            { key: "date", header: "Date", render: (row) => formatDate(row.date) },
            { key: "type", header: "Type", render: (row) => titleCase(row.type) },
            { key: "description", header: "Description", render: (row) => row.description },
            { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) },
            { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) },
            { key: "balance", header: "Balance", render: (row) => formatCurrency(row.balance) },
            { key: "status", header: "Status", render: (row) => titleCase(row.status) }
          ]} />
        )}
      </Card>
    </>
  );
}
