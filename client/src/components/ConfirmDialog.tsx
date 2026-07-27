import { AlertCircle } from "lucide-react";

export function ConfirmDialog({ title, message, onConfirm }: { title: string; message: string; onConfirm: () => void }) {
  return (
    <div className="rounded-lg border border-gold-100 bg-gold-100/25 p-4 text-sm dark:border-gold-100/20 dark:bg-gold-100/10">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-gold-600" />
        <div>
          <p className="font-semibold text-forest-900 dark:text-ivory">{title}</p>
          <p className="mt-1 text-charcoal/70 dark:text-white/70">{message}</p>
          <button onClick={onConfirm} className="mt-3 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white hover:bg-forest-900 focus:ring-2 focus:ring-gold-400">Confirm</button>
        </div>
      </div>
    </div>
  );
}
