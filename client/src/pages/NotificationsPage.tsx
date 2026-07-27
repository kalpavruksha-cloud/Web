import { CheckCheck } from "lucide-react";
import { useAction, useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import type { ClientNotification } from "../types/domain";
import { formatDate, titleCase } from "../utils/format";

export function NotificationsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<ClientNotification[]>("notifications", "/notifications");
  const mutation = useAction(["notifications"]);
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  return (
    <>
      <PageHeader title={admin ? "Notification Management" : "Notifications"} eyebrow="Read and unread messages" actions={!admin && <button onClick={() => mutation.mutate({ method: "put", url: "/notifications/read-all" })} className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><CheckCheck className="h-4 w-4" /> Mark all read</button>} />
      <div className="grid gap-4">
        {rows.length === 0 ? <EmptyState title="No notifications" message="Important notices, payout alerts, and document updates will appear here." /> : rows.map((item) => (
          <Card key={item.id} className={item.read ? "opacity-75" : "border-gold-400/60"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-bold text-forest-900 dark:text-ivory">{item.title}</p>
                <p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">{item.message}</p>
                <p className="mt-2 text-xs text-charcoal/55 dark:text-white/55">{formatDate(item.date)} · {titleCase(item.type)} · {titleCase(item.priority)}</p>
              </div>
              {!item.read && !admin && <button onClick={() => mutation.mutate({ method: "put", url: `/notifications/${item.id}/read` })} className="rounded-lg border border-forest-100 px-3 py-2 text-sm font-semibold dark:border-white/10">Mark read</button>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
