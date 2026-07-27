import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

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
              className="relative w-80 overflow-hidden rounded-[18px] border border-white/60 bg-white/86 p-4 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/88"
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className={item.type === "success" ? "text-emerald-600" : item.type === "error" ? "text-red-600" : "text-royal-500"}>
                    {item.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : item.type === "error" ? <AlertCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                  </div>
                  <div>
                  <p className="font-semibold text-navy-900 dark:text-ivory">{item.title}</p>
                  {item.message && <p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">{item.message}</p>}
                  </div>
                </div>
                <button aria-label="Dismiss notification" onClick={() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <motion.div initial={{ width: "100%" }} animate={{ width: 0 }} transition={{ duration: 4, ease: "linear" }} className="absolute bottom-0 left-0 h-1 bg-[linear-gradient(90deg,#153bb7,#d7ab3d)]" />
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
