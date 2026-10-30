import { AlertCircle } from "lucide-react";

export function ConfirmDialog({ title, message, onConfirm, onCancel, disabled = false }: { title: string; message: string; onConfirm: () => void; onCancel?: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg border border-gold-100 bg-gold-100/25 p-4 text-sm dark:border-gold-100/20 dark:bg-gold-100/10">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-gold-600" />
        <div>
          <p className="font-semibold text-forest-900 dark:text-ivory">{title}</p>
          <p className="mt-1 text-charcoal/70 dark:text-white/70">{message}</p>
          <button type="button" disabled={disabled} onClick={onConfirm} className="mt-3 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white hover:bg-forest-900 focus:ring-2 focus:ring-gold-400 disabled:opacity-50">Confirm</button>
          {onCancel && <button type="button" disabled={disabled} onClick={onCancel} className="ml-3 mt-3 rounded-lg border border-forest-100 px-4 py-2 font-semibold disabled:opacity-50">Cancel</button>}
        </div>
      </div>
    </div>
  );
}
