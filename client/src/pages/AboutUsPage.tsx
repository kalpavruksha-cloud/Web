import { motion } from "framer-motion";
import { Building2, Gem, Handshake, Landmark, Leaf, LineChart, MapPin, ShieldCheck, Sparkles, UtensilsCrossed } from "lucide-react";
import kalpavrukshaWealthLogo from "../assets/kalpavruksha-wealth-logo.png";
import kvConstructionsLogo from "../assets/kv-constructions-logo.png";

const companies = [
  {
    name: "Kalpavruksha Wealth",
    category: "Wealth Management",
    description: "Disciplined investment guidance, client servicing, portfolio visibility, and long-term wealth stewardship.",
    icon: LineChart,
    logo: kalpavrukshaWealthLogo
  },
  {
    name: "Kalpavruksha Real Estate",
    category: "Property Advisory",
    description: "Real estate opportunities, land advisory, and property-led growth across carefully selected markets.",
    icon: MapPin
  },
  {
    name: "KV Constructions",
    category: "Construction",
    description: "Construction execution with a focus on durability, practical design, and accountable project delivery.",
    icon: Building2,
    logo: kvConstructionsLogo
  },
  {
    name: "Kalpavruksha Developers",
    category: "Development",
    description: "Development initiatives built around location intelligence, transparent planning, and lasting asset value.",
    icon: Landmark
  },
  {
    name: "Rudraksh Enterprises",
    category: "Enterprise",
    description: "Business operations and enterprise initiatives that support the wider Kalpavruksha growth ecosystem.",
    icon: Gem
  },
  {
    name: "Brindavan Resto",
    category: "Hospitality",
    description: "Hospitality experiences shaped around warmth, consistency, local taste, and dependable service.",
    icon: UtensilsCrossed
  }
];

const values = [
  { title: "Trust First", text: "Every company in the group is positioned around clarity, accountability, and long-term relationships.", icon: ShieldCheck },
  { title: "Growth With Discipline", text: "We prefer steady, transparent progress over noisy promises, across finance, property, construction, and hospitality.", icon: Leaf },
  { title: "One Group Standard", text: "Different businesses, one expectation: professional service, clean communication, and responsible execution.", icon: Handshake }
];

export function AboutUsPage() {
  return (
    <main className="grid gap-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[28px] border border-white/60 bg-[radial-gradient(circle_at_82%_0%,rgba(215,171,61,0.28),transparent_22rem),linear-gradient(135deg,#040b1d,#08152f_48%,#0b2f25)] px-5 py-8 text-white shadow-premium sm:px-8 lg:px-10 lg:py-12"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),transparent_45%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-100/30 bg-white/8 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-gold-100">
              <Sparkles className="h-4 w-4" /> Kalpavruksha Group
            </p>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Built around wealth, land, construction, enterprise, and hospitality.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/76 sm:text-lg">
              Kalpavruksha is a growing group of businesses connected by one promise: disciplined growth, trustworthy service, and practical value creation for families, clients, partners, and communities.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 shadow-glass backdrop-blur-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-100">Brand Direction</p>
            <div className="mt-5 grid gap-3">
              {["Wealth with clarity", "Property with confidence", "Construction with accountability", "Hospitality with warmth"].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-bold text-white/86"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        {values.map((value, index) => {
          const Icon = value.icon;
          return (
            <motion.article
              key={value.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="kv-card p-5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#08152f,#1e7b54)] text-gold-100 shadow-glow">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-xl font-extrabold text-navy-900 dark:text-ivory">{value.title}</h2>
              <p className="mt-2 text-sm leading-7 text-charcoal/66 dark:text-white/66">{value.text}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="rounded-[24px] border border-white/60 bg-white/74 p-5 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-white/8 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-100">Group Companies</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-navy-900 dark:text-ivory sm:text-3xl">A professional ecosystem under one brand standard</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-charcoal/62 dark:text-white/62">
            Official logo placements are now active for Kalpavruksha Wealth and KV Constructions. The remaining company cards are ready for their logos when you provide them.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company, index) => {
            const Icon = company.icon;
            return (
              <motion.article
                key={company.name}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06, duration: 0.32 }}
                className="group relative overflow-hidden rounded-[22px] border border-forest-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(246,249,245,0.78))] p-5 shadow-glass transition hover:-translate-y-1 hover:border-gold-300/70 hover:shadow-premium dark:border-white/10 dark:bg-white/8"
              >
                <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[44px] bg-gold-100/28 transition group-hover:bg-gold-100/40" />
                {company.logo ? (
                  <div className="relative grid h-28 place-items-center rounded-[24px] border border-gold-300/35 bg-[radial-gradient(circle_at_80%_0%,rgba(215,171,61,0.18),transparent_11rem),linear-gradient(135deg,#020717,#08152f_55%,#0b2f25)] px-5 py-4 shadow-glow">
                    <img src={company.logo} alt={`${company.name} logo`} className="max-h-20 w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]" />
                  </div>
                ) : (
                  <div className="relative flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] border border-gold-300/50 bg-[linear-gradient(135deg,#040b1d,#0b2f25)] text-gold-100 shadow-glow">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-700 dark:text-gold-100">{company.category}</p>
                      <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-navy-900 dark:text-ivory">{company.name}</h3>
                    </div>
                  </div>
                )}
                {company.logo && (
                  <div className="relative mt-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-700 dark:text-gold-100">{company.category}</p>
                    <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-navy-900 dark:text-ivory">{company.name}</h3>
                  </div>
                )}
                <p className="relative mt-4 text-sm leading-7 text-charcoal/66 dark:text-white/66">{company.description}</p>
                <div className="relative mt-5 rounded-2xl border border-dashed border-gold-300/70 bg-gold-100/20 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-forest-900 dark:bg-white/6 dark:text-gold-100">
                  {company.logo ? "Official logo attached" : "Logo space reserved"}
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="kv-card p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-100">Our Position</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-navy-900 dark:text-ivory">One group, multiple client touchpoints.</h2>
          <p className="mt-3 text-sm leading-7 text-charcoal/66 dark:text-white/66">
            This page is designed to become the official group introduction inside the portal, helping clients understand the wider Kalpavruksha ecosystem without interrupting their wealth-management workflows.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Wealth", "Real Estate", "Construction", "Development", "Enterprise", "Hospitality"].map((item) => (
            <div key={item} className="rounded-[20px] border border-white/60 bg-white/76 p-4 text-center shadow-glass dark:border-white/10 dark:bg-white/8">
              <p className="font-display text-lg font-extrabold text-navy-900 dark:text-ivory">{item}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-100">Kalpavruksha</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
