import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type Toast = { id: number; title: string; message?: string; type?: "success" | "error" | "info" };
type ToastContextValue = { toast: (toast: Omit<Toast, "id">) => void };
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((next: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((items) => [...items, { ...next, id }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid gap-3">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="w-80 rounded-lg border border-forest-100 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-charcoal"
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-forest-900 dark:text-ivory">{item.title}</p>
                  {item.message && <p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">{item.message}</p>}
                </div>
                <button aria-label="Dismiss notification" onClick={() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
