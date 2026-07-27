import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className={cn("kv-card p-4 sm:p-5", className)}>{children}</motion.section>;
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="group">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal/54 dark:text-white/54">{label}</p>
          <p className="mt-3 break-words font-display text-[1.6rem] font-extrabold leading-tight tracking-tight text-navy-900 dark:text-ivory sm:text-3xl">{value}</p>
          {hint && <p className="mt-2 text-xs font-medium text-gold-600 dark:text-gold-100">{hint}</p>}
        </div>
        {icon && <div className="shrink-0 rounded-2xl border border-gold-100/60 bg-[linear-gradient(135deg,rgba(215,171,61,0.22),rgba(37,99,235,0.08))] p-2.5 text-navy-900 shadow-sm transition group-hover:scale-105 dark:border-gold-100/15 dark:text-gold-100 sm:p-3">{icon}</div>}
      </div>
    </Card>
  );
}
