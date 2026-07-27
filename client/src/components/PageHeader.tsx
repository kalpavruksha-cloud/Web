import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="sticky top-[73px] z-20 mb-6 flex flex-col justify-between gap-4 rounded-[18px] border border-white/60 bg-white/70 px-5 py-4 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/8 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-100">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-navy-900 dark:text-ivory">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
