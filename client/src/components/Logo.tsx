import logo from "../assets/kalpav-logo.png";
import { cn } from "../utils/cn";

export function Logo({ compact = false, variant = "login", mobile = false }: { compact?: boolean; variant?: "login" | "portal"; mobile?: boolean }) {
  if (variant === "portal") {
    return compact ? (
      <div className="grid h-14 w-16 place-items-center overflow-hidden rounded-xl border border-gold-400/45 bg-[radial-gradient(circle_at_50%_38%,rgba(215,171,61,0.28),transparent_3rem),linear-gradient(135deg,#040b1d,#0b2f25)] shadow-[0_10px_28px_rgba(4,11,29,0.30),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-gold-100/20">
        <img src={logo} alt="Kalpavruksha Wealth" className="h-[4.75rem] w-auto -translate-y-1 object-contain" />
      </div>
    ) : (
      <div className={cn("relative grid w-full place-items-center overflow-hidden rounded-2xl border border-gold-400/45 bg-[radial-gradient(circle_at_50%_38%,rgba(215,171,61,0.24),transparent_7rem),linear-gradient(135deg,#040b1d,#08152f_52%,#0b2f25)] shadow-[0_18px_46px_rgba(4,11,29,0.34),inset_0_1px_0_rgba(255,255,255,0.13)] ring-1 ring-gold-100/20", mobile ? "h-24" : "h-28")}>
        <img src={logo} alt="Kalpavruksha Wealth" className={cn("w-auto object-contain", mobile ? "h-[10.5rem] -translate-y-7" : "h-[12.5rem] -translate-y-8")} />
      </div>
    );
  }

  const className = compact
    ? "h-24 w-24 rounded-lg object-contain"
    : "h-44 w-auto max-w-full object-contain sm:h-56 md:h-[21rem] md:max-w-[1140px]";

  return (
    <div className={cn("flex items-center gap-3", !compact && "rounded-[28px] bg-[radial-gradient(circle_at_50%_40%,rgba(215,171,61,0.12),transparent_14rem)] p-2")}>
      <img
        src={logo}
        alt="Kalpavruksha Wealth"
        className={cn(className, "drop-shadow-[0_18px_38px_rgba(4,11,29,0.32)]")}
      />
      {!compact && <span className="sr-only">Kalpavruksha Wealth Portal</span>}
    </div>
  );
}
