import { ArrowUpRight } from "lucide-react";
import type { PortalAd } from "../types/domain";
import { cn } from "../utils/cn";

type PortalAdCardProps = {
  ad: PortalAd;
  compact?: boolean;
  className?: string;
};

type PortalAdPlaceholderProps = {
  compact?: boolean;
  className?: string;
  label?: string;
};

export function PortalAdCard({ ad, compact = false, className }: PortalAdCardProps) {
  const content = (
    <article className={cn(
      "group relative overflow-hidden rounded-[22px] border border-gold-300/35 bg-[radial-gradient(circle_at_88%_0%,rgba(215,171,61,0.28),transparent_16rem),linear-gradient(135deg,#040b1d,#0b2f25)] p-4 text-white shadow-premium",
      compact ? "min-w-[78vw] snap-center sm:min-w-[340px]" : "w-full",
      className
    )}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_45%)] opacity-70" />
      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          alt=""
          loading="lazy"
          className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-28 transition duration-300 group-hover:opacity-38"
        />
      )}
      <div className="relative max-w-[78%]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-gold-100">{ad.companyName}</p>
        <h3 className="mt-2 font-display text-lg font-extrabold leading-tight">{ad.title}</h3>
        {ad.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/72">{ad.description}</p>}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-extrabold text-white ring-1 ring-white/12">
          {ad.buttonText || "Know More"} <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </article>
  );

  if (!ad.targetUrl) return content;
  return (
    <a href={ad.targetUrl} target="_blank" rel="noreferrer" aria-label={`${ad.companyName}: ${ad.title}`}>
      {content}
    </a>
  );
}

function PortalAdPlaceholder({ compact = false, className, label = "Advertisement placement" }: PortalAdPlaceholderProps) {
  return (
    <article className={cn(
      "relative overflow-hidden rounded-[22px] border border-dashed border-gold-300/60 bg-[linear-gradient(135deg,rgba(4,11,29,0.94),rgba(11,47,37,0.9))] p-4 text-white shadow-premium",
      compact ? "min-w-[78vw] snap-center sm:min-w-[340px]" : "w-full",
      className
    )}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(215,171,61,0.2),transparent_13rem)]" />
      <div className="relative">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-gold-100">Kalpavruksha Group</p>
        <h3 className="mt-2 font-display text-lg font-extrabold leading-tight">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-white/72">Controlled from the PORTAL_ADS spreadsheet tab.</p>
      </div>
    </article>
  );
}

export function PortalAdBanner({ ads, className, showEmpty = false, label }: { ads?: PortalAd[]; className?: string; showEmpty?: boolean; label?: string }) {
  const ad = ads?.[0];
  if (!ad && showEmpty) return <PortalAdPlaceholder className={className} label={label} />;
  if (!ad) return null;
  return <PortalAdCard ad={ad} className={className} />;
}

export function PortalAdSwipe({ ads, className, showEmpty = false }: { ads?: PortalAd[]; className?: string; showEmpty?: boolean }) {
  if (!ads?.length && showEmpty) {
    return (
      <section className={cn("no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2", className)} aria-label="Kalpavruksha Group updates">
        <PortalAdPlaceholder compact label="Mobile ad card" />
        <PortalAdPlaceholder compact label="Swipe ad card" />
      </section>
    );
  }
  if (!ads?.length) return null;
  return (
    <section className={cn("no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2", className)} aria-label="Kalpavruksha Group updates">
      {ads.slice(0, 6).map((ad) => <PortalAdCard key={ad.id} ad={ad} compact />)}
    </section>
  );
}
