import { AlertTriangle, Inbox, Loader2, Sparkles } from "lucide-react";

export function LoadingState({ label = "Loading live spreadsheet data" }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-[18px] border border-white/60 bg-white/72 p-8 text-center shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/8">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,rgba(215,171,61,0.25),rgba(37,99,235,0.14))]">
          <Loader2 className="h-7 w-7 animate-spin text-navy-900 dark:text-gold-100" />
        </div>
        <p className="mt-4 text-sm font-bold text-charcoal/70 dark:text-white/70">{label}</p>
        <div className="mt-5 grid gap-2">
          <div className="h-2 w-52 animate-pulse rounded-full bg-navy-100 dark:bg-white/10" />
          <div className="mx-auto h-2 w-36 animate-pulse rounded-full bg-gold-100/80 dark:bg-gold-100/15" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Unable to load data", message }: { title?: string; message?: string }) {
  return (
    <div className="rounded-[18px] border border-red-200/80 bg-[linear-gradient(135deg,#fff1f2,#fff7ed)] p-5 text-red-900 shadow-glass dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-100" role="alert">
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
    <div className="grid min-h-44 place-items-center rounded-[18px] border border-dashed border-gold-400/45 bg-white/68 p-8 text-center shadow-glass backdrop-blur dark:border-gold-100/20 dark:bg-white/8">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-100/55 text-gold-600 dark:bg-gold-100/10 dark:text-gold-100">
          <Inbox className="h-7 w-7" />
        </div>
        <p className="mt-4 font-display text-lg font-extrabold text-navy-900 dark:text-ivory">{title}</p>
        <p className="mt-1 max-w-md text-sm text-charcoal/65 dark:text-white/65">{message}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/70 px-3 py-1 text-xs font-bold text-navy-900 dark:border-white/10 dark:bg-white/8 dark:text-gold-100"><Sparkles className="h-3.5 w-3.5" /> Live spreadsheet view</div>
      </div>
    </div>
  );
}

export function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-[18px] border border-white/60 bg-white/70 shadow-glass dark:border-white/10 dark:bg-white/10" />
      ))}
    </div>
  );
}
