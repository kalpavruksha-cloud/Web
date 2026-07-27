import { Printer } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";

export function ReportsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Record<string, unknown>>("reports", "/reports");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const reports = data ? Object.entries(data) : [];
  return (
    <>
      <PageHeader title={admin ? "Reports and Analytics" : "Reports"} eyebrow="Print-friendly summaries" actions={<button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><Printer className="h-4 w-4" /> Print</button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {["investmentSummary", "transactionStatement", "monthlyReturnReport", "portfolioReport", "referralReport", "withdrawalReport", "taxSummary"].map((key) => (
          <Card key={key}>
            <h2 className="font-bold text-forest-900 dark:text-ivory">{key.replace(/([A-Z])/g, " $1").trim()}</h2>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-forest-50 p-3 text-xs dark:bg-black/20">{JSON.stringify(reports.find(([name]) => name === key)?.[1] ?? "Not available from spreadsheet", null, 2)}</pre>
          </Card>
        ))}
      </div>
    </>
  );
}
