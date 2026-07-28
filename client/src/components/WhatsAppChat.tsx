import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, MessageCircle, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, PortalSettings } from "../types/domain";

const DEFAULT_MESSAGE = "Hello Kalpavruksha Wealth, I need support with my portal account.";

export function WhatsAppChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const settings = useQuery({
    queryKey: ["public-whatsapp-settings"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PortalSettings>>("/settings");
      return response.data.data ?? {};
    },
    retry: false,
    staleTime: 5 * 60_000
  });

  const whatsapp = useMemo(() => resolveWhatsApp(settings.data, user?.clientId), [settings.data, user?.clientId]);

  function openChat() {
    if (!whatsapp.url) {
      setOpen(true);
      return;
    }
    window.open(whatsapp.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="no-print fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-3 z-[58] lg:bottom-5 lg:right-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[22px] border border-white/60 bg-white/94 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/94"
          >
            <div className="bg-[linear-gradient(135deg,#040b1d,#0b2f25)] p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-400/18 text-gold-100">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-extrabold">Kalpavruksha WhatsApp</p>
                    <p className="text-xs text-white/68">Client support assistant</p>
                  </div>
                </div>
                <button aria-label="Close WhatsApp support" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 text-sm">
              <p className="font-bold text-navy-900 dark:text-ivory">{whatsapp.ready ? "Start a WhatsApp chat" : "WhatsApp number pending"}</p>
              <p className="mt-2 leading-6 text-charcoal/68 dark:text-white/68">
                {whatsapp.ready
                  ? "Tap below to open WhatsApp with a prepared support message."
                  : "The chat button is integrated. Add the approved WhatsApp number in Vercel or portal settings to activate it."}
              </p>
              <button
                type="button"
                onClick={openChat}
                disabled={!whatsapp.ready}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#128c7e] px-4 py-3 font-extrabold text-white shadow-[0_14px_34px_rgba(18,140,126,0.28)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Send className="h-4 w-4" />
                {whatsapp.ready ? "Open WhatsApp" : "Waiting for number"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label="Open WhatsApp support"
        onClick={() => (whatsapp.ready ? openChat() : setOpen(true))}
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-[#128c7e] text-white shadow-[0_18px_48px_rgba(18,140,126,0.38)] ring-4 ring-[#128c7e]/14 transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(18,140,126,0.46)]"
      >
        <MessageCircle className="h-7 w-7 transition group-hover:scale-110" />
      </button>
    </div>
  );
}

function resolveWhatsApp(settings?: PortalSettings, clientId?: string) {
  const configuredUrl = firstString(settings, ["supportWhatsappUrl", "supportWhatsAppUrl", "SUPPORT_WHATSAPP_URL", "whatsappUrl", "WHATSAPP_URL"]) || import.meta.env.VITE_WHATSAPP_URL;
  const configuredNumber = firstString(settings, ["supportWhatsappNumber", "supportWhatsAppNumber", "SUPPORT_WHATSAPP_NUMBER", "whatsappNumber", "WHATSAPP_NUMBER"]) || import.meta.env.VITE_WHATSAPP_NUMBER;
  const baseMessage = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || DEFAULT_MESSAGE;
  const message = clientId ? `${baseMessage}\nClient ID: ${clientId}` : baseMessage;
  const encodedMessage = encodeURIComponent(message);

  if (configuredUrl) {
    const separator = configuredUrl.includes("?") ? "&" : "?";
    return { ready: true, url: `${configuredUrl}${separator}text=${encodedMessage}` };
  }

  const digits = String(configuredNumber ?? "").replace(/\D/g, "");
  if (!digits) return { ready: false, url: "" };
  return { ready: true, url: `https://wa.me/${digits}?text=${encodedMessage}` };
}

function firstString(settings: PortalSettings | undefined, keys: string[]) {
  if (!settings) return "";
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
