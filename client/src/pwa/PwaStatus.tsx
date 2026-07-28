import { useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, RotateCw, Wifi, WifiOff, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../utils/cn";
import { installServiceWorkerUpdate } from "./registerServiceWorker";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const LAST_SYNC_KEY = "kv-last-synced-at";
const INSTALL_DISMISSED_KEY = "kv-install-dismissed";

export function PwaStatus() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem(LAST_SYNC_KEY));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration>();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      void queryClient.invalidateQueries();
    }

    function onOffline() {
      setOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!online || isFetching > 0) return;
    const timestamp = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
    setLastSynced(timestamp);
  }, [isFetching, online]);

  useEffect(() => {
    function beforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (localStorage.getItem(INSTALL_DISMISSED_KEY) === "true") return;
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function appInstalled() {
      setInstallPrompt(undefined);
      localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    }

    function updateReady(event: Event) {
      const registration = (event as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail.registration;
      setUpdateRegistration(registration);
    }

    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
    window.addEventListener("appinstalled", appInstalled);
    window.addEventListener("kv-sw-update", updateReady);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
      window.removeEventListener("appinstalled", appInstalled);
      window.removeEventListener("kv-sw-update", updateReady);
    };
  }, []);

  useEffect(() => {
    let startY = 0;
    let active = false;

    function touchStart(event: TouchEvent) {
      if (window.scrollY > 0 || event.touches.length !== 1) return;
      startY = event.touches[0].clientY;
      active = true;
    }

    function touchMove(event: TouchEvent) {
      if (!active) return;
      const distance = Math.max(event.touches[0].clientY - startY, 0);
      const nextDistance = Math.min(distance, 96);
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    }

    function touchEnd() {
      if (!active) return;
      active = false;
      if (pullDistanceRef.current > 68) {
        setRefreshing(true);
        void queryClient.invalidateQueries().finally(() => {
          window.setTimeout(() => setRefreshing(false), 450);
        });
      }
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }

    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd);
    return () => {
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
    };
  }, [queryClient]);

  const lastSyncText = useMemo(() => {
    if (!lastSynced) return "Not synced yet";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSynced));
  }, [lastSynced]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== "dismissed") {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    }
    setInstallPrompt(undefined);
  }

  return (
    <>
      <AnimatePresence>
        {(pullDistance > 8 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: Math.min(pullDistance / 2, 34) }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs font-extrabold text-forest-900 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/90 dark:text-ivory lg:hidden"
          >
            <span className="inline-flex items-center gap-2"><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> {refreshing ? "Refreshing live records" : "Pull to refresh"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-x-3 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[60] grid gap-2 pointer-events-none lg:bottom-4 lg:left-auto lg:right-4 lg:w-96">
        <AnimatePresence>
          {(!online || isMutating > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="pointer-events-auto rounded-2xl border border-white/60 bg-white/90 p-3 text-sm shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/90"
            >
              <div className="flex items-start gap-3">
                {online ? <RotateCw className="mt-0.5 h-5 w-5 animate-spin text-gold-600" /> : <WifiOff className="mt-0.5 h-5 w-5 text-red-600" />}
                <div>
                  <p className="font-extrabold text-navy-900 dark:text-ivory">{online ? "Sync pending" : "Offline"}</p>
                  <p className="mt-1 text-xs text-charcoal/62 dark:text-white/62">{online ? "Saving to the live spreadsheet through the backend." : `Live records will refresh when internet returns. Last synced: ${lastSyncText}`}</p>
                </div>
              </div>
            </motion.div>
          )}

          {installPrompt && online && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="pointer-events-auto rounded-2xl border border-gold-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,237,200,0.92))] p-3 text-sm shadow-premium backdrop-blur-xl dark:border-gold-100/20 dark:bg-navy-950/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <Download className="mt-0.5 h-5 w-5 text-forest-700 dark:text-gold-100" />
                  <div>
                    <p className="font-extrabold text-navy-900 dark:text-ivory">Install Kalpavruksha App</p>
                    <p className="mt-1 text-xs text-charcoal/62 dark:text-white/62">Add the same live portal to your phone home screen.</p>
                    <button onClick={installApp} className="mt-3 rounded-xl bg-forest-700 px-4 py-2 text-xs font-extrabold text-white">Install App</button>
                  </div>
                </div>
                <button aria-label="Dismiss install app banner" onClick={() => { localStorage.setItem(INSTALL_DISMISSED_KEY, "true"); setInstallPrompt(undefined); }} className="rounded-lg p-1 text-charcoal/60 dark:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {updateRegistration && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="pointer-events-auto rounded-2xl border border-white/60 bg-white/92 p-3 text-sm shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/90"
            >
              <div className="flex items-start gap-3">
                <Wifi className="mt-0.5 h-5 w-5 text-forest-700 dark:text-gold-100" />
                <div>
                  <p className="font-extrabold text-navy-900 dark:text-ivory">Update available</p>
                  <p className="mt-1 text-xs text-charcoal/62 dark:text-white/62">A newer portal version is ready.</p>
                  <button onClick={() => installServiceWorkerUpdate(updateRegistration)} className="mt-3 rounded-xl bg-forest-700 px-4 py-2 text-xs font-extrabold text-white">Update now</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
