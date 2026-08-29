import logo from "../assets/kalpav-logo.png";
import { cn } from "../utils/cn";

export function Logo({ compact = false, variant = "login", mobile = false }: { compact?: boolean; variant?: "login" | "portal"; mobile?: boolean }) {
  if (variant === "portal") {
    return compact ? (
      <div className="grid h-14 w-16 place-items-center overflow-hidden rounded-xl border border-gold-300/75 bg-[radial-gradient(circle_at_50%_42%,rgba(255,232,160,0.34),transparent_3.2rem),linear-gradient(135deg,#020817,#08152f_52%,#0b2f25)] shadow-[0_12px_34px_rgba(4,11,29,0.42),0_0_0_1px_rgba(215,171,61,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] ring-2 ring-gold-300/18">
        <img src={logo} alt="Kalpavruksha Wealth" className="h-[4.75rem] w-auto -translate-y-1 object-contain drop-shadow-[0_8px_18px_rgba(255,214,118,0.22)]" />
      </div>
    ) : (
      <div className={cn("relative grid w-full place-items-center overflow-hidden rounded-2xl border border-gold-300/75 bg-[radial-gradient(circle_at_50%_42%,rgba(255,232,160,0.30),transparent_7.6rem),linear-gradient(135deg,#020817,#08152f_50%,#0b2f25)] shadow-[0_20px_54px_rgba(4,11,29,0.42),0_0_0_1px_rgba(215,171,61,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] ring-2 ring-gold-300/18", mobile ? "h-24" : "h-28")}>
        <img src={logo} alt="Kalpavruksha Wealth" className={cn("w-auto object-contain", mobile ? "h-[10.5rem] -translate-y-7 drop-shadow-[0_12px_26px_rgba(255,214,118,0.20)]" : "h-[12.5rem] -translate-y-8 drop-shadow-[0_14px_30px_rgba(255,214,118,0.22)]")} />
      </div>
    );
  }

  const className = compact
    ? "h-24 w-24 rounded-lg object-contain"
    : "h-44 w-auto max-w-full object-contain sm:h-56 md:h-[21rem] md:max-w-[1140px]";

  return (
    <div className={cn("flex items-center gap-3", !compact && "rounded-[28px] bg-[radial-gradient(circle_at_50%_42%,rgba(255,232,160,0.20),transparent_14rem)] p-2")}>
      <img
        src={logo}
        alt="Kalpavruksha Wealth"
        className={cn(className, "drop-shadow-[0_18px_38px_rgba(4,11,29,0.36)] [filter:drop-shadow(0_0_18px_rgba(215,171,61,0.18))]")}
      />
      {!compact && <span className="sr-only">Kalpavruksha Wealth Portal</span>}
    </div>
  );
}
