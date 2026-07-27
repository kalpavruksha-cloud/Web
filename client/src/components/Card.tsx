import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-forest-100/80 bg-white/88 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/7", className)}>{children}</section>;
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-charcoal/60 dark:text-white/60">{label}</p>
          <p className="mt-2 text-2xl font-bold text-forest-900 dark:text-ivory">{value}</p>
          {hint && <p className="mt-2 text-xs font-medium text-gold-600 dark:text-gold-100">{hint}</p>}
        </div>
        {icon && <div className="rounded-lg bg-forest-50 p-3 text-forest-700 dark:bg-gold-100/10 dark:text-gold-100">{icon}</div>}
      </div>
    </Card>
  );
}
