import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-extrabold text-forest-900 dark:text-ivory">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
