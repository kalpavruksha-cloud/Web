import logo from "../assets/kalpav-logo.png";

export function Logo({ compact = false, variant = "login" }: { compact?: boolean; variant?: "login" | "portal" }) {
  if (variant === "portal") {
    return compact ? (
      <div className="grid h-14 w-16 place-items-center overflow-hidden rounded-xl border border-gold-100/25 bg-white/10 shadow-sm ring-1 ring-white/10 dark:bg-white/7">
        <img src={logo} alt="Kalpavruksha Wealth" className="h-[4.75rem] w-auto -translate-y-1 object-contain" />
      </div>
    ) : (
      <div className="relative grid h-28 w-full place-items-center overflow-hidden rounded-2xl border border-gold-100/25 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.16)] ring-1 ring-white/10 dark:bg-white/7">
        <img src={logo} alt="Kalpavruksha Wealth" className="h-[12.5rem] w-auto -translate-y-8 object-contain" />
      </div>
    );
  }

  const className = compact
    ? "h-24 w-24 rounded-lg object-contain"
    : "h-[21rem] w-auto max-w-[1140px] object-contain";

  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Kalpavruksha Wealth"
        className={className}
      />
      {!compact && <span className="sr-only">Kalpavruksha Wealth Portal</span>}
    </div>
  );
}
