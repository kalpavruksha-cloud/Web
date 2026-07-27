import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";

export function HealthPage() {
  const { data, isLoading, error } = useResource<Record<string, unknown>>("health", "/system/health");
  if (isLoading) return <LoadingState label="Checking backend and Apps Script" />;
  if (error) return <ErrorState title="Health check failed" message={error instanceof Error ? error.message : undefined} />;
  return (
    <>
      <PageHeader title="System Health" eyebrow="Live integration diagnostics" />
      <Card><pre className="overflow-auto rounded-lg bg-forest-50 p-4 text-xs dark:bg-black/20">{JSON.stringify(data, null, 2)}</pre></Card>
    </>
  );
}
