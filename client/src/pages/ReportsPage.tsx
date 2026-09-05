import { BarChart3, Printer } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";

const reportKeys = ["investmentSummary", "transactionStatement", "monthlyReturnReport", "portfolioReport", "referralReport", "withdrawalReport", "taxSummary"];

export function ReportsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Record<string, unknown>>("reports", "/reports");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;

  return (
    <>
      <PageHeader title={admin ? "Reports and Analytics" : "Reports"} eyebrow="Print-friendly summaries" actions={<button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><Printer className="h-4 w-4" /> Print</button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {reportKeys.map((key) => (
          <Card key={key}>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#040b1d,#14583f)] text-gold-100 shadow-glow"><BarChart3 className="h-5 w-5" /></span>
              <div>
                <h2 className="font-display text-xl font-extrabold text-navy-900 dark:text-ivory">{humanTitle(key)}</h2>
                <p className="mt-1 text-sm text-charcoal/60 dark:text-white/60">{reportSummary(data?.[key])}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {reportRows(data?.[key]).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-forest-100/70 bg-white/72 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/7"><span className="font-bold text-charcoal/65 dark:text-white/65">{humanTitle(label)}</span><span className="text-right font-extrabold text-forest-900 dark:text-gold-100">{String(value)}</span></div>)}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function humanTitle(value: string) {
  return value.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reportSummary(value: unknown) {
  if (Array.isArray(value)) return `${value.length} spreadsheet records available for this report.`;
  if (value && typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} report fields returned from spreadsheet.`;
  return "This report is not available from the spreadsheet yet.";
}

function reportRows(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) return [["Records", value.length], ...Object.entries((value[0] ?? {}) as Record<string, unknown>).slice(0, 4)];
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).slice(0, 6);
  return [["Status", "Not available"]];
}
