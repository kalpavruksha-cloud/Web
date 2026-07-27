import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import type { PortalSettings } from "../types/domain";

export function SettingsPage() {
  const { data, isLoading, error } = useResource<PortalSettings>("settings", "/settings");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  return (
    <>
      <PageHeader title="Settings" eyebrow="Spreadsheet-controlled portal configuration" />
      <Card>
        <div className="grid gap-3">
          {Object.entries(data ?? {}).length === 0 ? <p className="text-sm text-charcoal/65 dark:text-white/65">No settings were returned by the spreadsheet API.</p> : Object.entries(data ?? {}).map(([key, value]) => (
            <div key={key} className="grid gap-1 border-b border-forest-100 py-3 last:border-0 dark:border-white/10 sm:grid-cols-[240px_1fr]">
              <dt className="font-semibold text-forest-900 dark:text-ivory">{key}</dt>
              <dd className="text-charcoal/70 dark:text-white/70">{String(value)}</dd>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
