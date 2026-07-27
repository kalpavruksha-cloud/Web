import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import type { SpreadsheetSchema } from "../types/domain";

export function SchemaPage() {
  const { data, isLoading, error } = useResource<SpreadsheetSchema>("schema", "/admin/spreadsheet-schema");
  if (isLoading) return <LoadingState label="Inspecting spreadsheet schema" />;
  if (error) return <ErrorState title="Schema unavailable" message={error instanceof Error ? error.message : undefined} />;
  return (
    <>
      <PageHeader title="Spreadsheet Schema" eyebrow={data?.spreadsheetId} />
      <div className="grid gap-5">
        {data?.sheets.map((sheet) => (
          <Card key={sheet.name}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <h2 className="text-lg font-bold text-forest-900 dark:text-ivory">{sheet.name}</h2>
              <p className="text-sm font-semibold text-gold-600 dark:text-gold-100">{sheet.recordCount} records</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sheet.headers.map((header) => <span key={header} className="rounded-md bg-forest-50 px-2 py-1 text-xs font-semibold text-forest-900 dark:bg-white/10 dark:text-white">{header}</span>)}
            </div>
          </Card>
        ))}
        <Card>
          <h2 className="font-bold text-forest-900 dark:text-ivory">Mapping Warnings</h2>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-forest-50 p-3 text-xs dark:bg-black/20">{JSON.stringify(data?.warnings ?? [], null, 2)}</pre>
        </Card>
      </div>
    </>
  );
}
