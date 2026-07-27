import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading live spreadsheet data" }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-forest-100 bg-white/70 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
      <div>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-forest-700 dark:text-gold-100" />
        <p className="mt-3 text-sm font-medium text-charcoal/70 dark:text-white/70">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Unable to load data", message }: { title?: string; message?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-100" role="alert">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm">{message ?? "Please try again or contact Kalpavruksha support if the issue persists."}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-forest-100 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/5">
      <div>
        <Inbox className="mx-auto h-8 w-8 text-gold-600 dark:text-gold-100" />
        <p className="mt-3 font-semibold text-forest-900 dark:text-ivory">{title}</p>
        <p className="mt-1 max-w-md text-sm text-charcoal/65 dark:text-white/65">{message}</p>
      </div>
    </div>
  );
}

export function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg bg-white/70 shadow-sm dark:bg-white/10" />
      ))}
    </div>
  );
}
