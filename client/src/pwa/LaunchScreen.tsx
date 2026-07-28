import { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import logo from "../assets/kalpav-logo.png";
import { useAuth } from "../context/AuthContext";

const MIN_VISIBLE_MS = 1650;
const ENTRY_ROUTES = new Set(["/", "/login", "/admin-login"]);

export function LaunchScreen() {
  const { user, loading } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), reduceMotion ? 700 : MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (loading) return;
    if (user && ENTRY_ROUTES.has(location.pathname)) {
      history.replace(user.role === "admin" ? "/admin" : "/client");
    }
  }, [history, loading, location.pathname, user]);

  useEffect(() => {
    if (!minimumElapsed || loading) return;
    const timer = window.setTimeout(() => setVisible(false), reduceMotion ? 120 : 260);
    return () => window.clearTimeout(timer);
  }, [loading, minimumElapsed, reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(215,171,61,0.20),transparent_18rem),radial-gradient(circle_at_22%_0%,rgba(30,123,84,0.22),transparent_28rem),linear-gradient(135deg,#040b1d,#08152f_52%,#0b2f25)] px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] text-white"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.16 : 0.42, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          aria-label="Kalpavruksha Wealth is starting"
        >
          <motion.div
            className="absolute inset-x-[12%] top-[20%] h-40 rounded-full bg-gold-400/10 blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: reduceMotion ? 0.26 : [0.12, 0.36, 0.18] }}
            transition={{ duration: reduceMotion ? 0.4 : 2.1, ease: "easeInOut" }}
          />
          <div className="relative flex w-full max-w-md flex-col items-center text-center">
            <motion.div
              className="relative grid h-56 w-full place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_28px_90px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:h-64"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 12 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.28 : 1.15, ease: [0.22, 1, 0.36, 1] }}
            >
              {!reduceMotion && (
                <motion.div
                  className="absolute inset-y-0 -left-1/2 w-1/2 rotate-12 bg-[linear-gradient(90deg,transparent,rgba(248,237,200,0.20),transparent)]"
                  animate={{ x: ["0%", "320%"] }}
                  transition={{ delay: 0.42, duration: 1.25, ease: "easeInOut" }}
                />
              )}
              <img src={logo} alt="Kalpavruksha Wealth" className="relative h-48 w-auto max-w-[92%] object-contain sm:h-56" />
            </motion.div>

            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0.1 : 0.55, duration: reduceMotion ? 0.24 : 0.6, ease: "easeOut" }}
              className="mt-7"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.34em] text-gold-100">Kalpavruksha Wealth</p>
              <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ivory">Wealth. Growth. Life.</h1>
            </motion.div>

            {(loading || !minimumElapsed) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0.2 : 0.85 }}
                className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/72"
              >
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    className="block h-full rounded-full bg-gold-400"
                    initial={{ x: "-100%" }}
                    animate={reduceMotion ? { x: "0%" } : { x: ["-100%", "120%"] }}
                    transition={{ duration: 1.15, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
                  />
                </span>
                <span>{loading ? "Checking secure session" : "Preparing portal"}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
