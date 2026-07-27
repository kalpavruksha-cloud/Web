import { useMemo, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  HeartPulse,
  Home,
  Landmark,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserCircle,
  Users,
  WalletCards
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { LoadingState } from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../utils/cn";
import { title } from "./adminUtils";

type Column<T> = { key: string; header: string; render: (row: T) => ReactNode; filterValue?: (row: T) => string | number | undefined };

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Home },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/investments", label: "Investments", icon: Landmark },
  { to: "/admin/transactions", label: "Transactions", icon: WalletCards },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Activity },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/referrals", label: "Referrals", icon: Users },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/reports", label: "Reports", icon: Database },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/activity", label: "Activity Log", icon: ShieldCheck },
  { to: "/admin/system-health", label: "System Health", icon: HeartPulse }
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const history = useHistory();
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean).map(title);

  async function handleLogout() {
    await logout();
    history.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fbfaf4_0%,#eef7f0_45%,#f7f8f5_100%)] text-charcoal dark:bg-[linear-gradient(135deg,#071713_0%,#112820_55%,#161b1a_100%)] dark:text-white">
      <aside className={cn("no-print fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-forest-100/80 bg-white/92 px-3 pb-4 pt-2 shadow-xl backdrop-blur-xl transition-[width,transform] duration-300 ease-out dark:border-white/10 dark:bg-charcoal/94 lg:flex", collapsed ? "w-24" : "w-72")}>
        <div className="flex items-center justify-between gap-3">
          <Logo compact={collapsed} variant="portal" />
          <button aria-label="Collapse admin sidebar" onClick={() => setCollapsed((value) => !value)} className="rounded-lg border border-forest-100 bg-white p-2 text-forest-800 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5 dark:text-gold-100">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(215,171,61,0.55)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold-300/55">
          {navItems.map((item) => <AdminNavItem key={item.to} item={item} collapsed={collapsed} />)}
        </nav>
      </aside>

      {mobileOpen && <button aria-label="Close admin menu" className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-forest-100 bg-white px-3 pb-4 pt-2 shadow-2xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-charcoal lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between"><Logo variant="portal" /><button aria-label="Close menu" onClick={() => setMobileOpen(false)}><ChevronLeft className="h-5 w-5" /></button></div>
        <nav className="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(215,171,61,0.55)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold-300/55">
          {navItems.map((item) => <AdminNavItem key={item.to} item={item} onClick={() => setMobileOpen(false)} />)}
        </nav>
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "lg:pl-24" : "lg:pl-72")}>
        <header className="no-print sticky top-0 z-30 border-b border-forest-100/80 bg-ivory/86 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-charcoal/86 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button aria-label="Open admin menu" onClick={() => setMobileOpen(true)} className="rounded-lg border border-forest-100 bg-white p-2 dark:border-white/10 dark:bg-white/5 lg:hidden"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">Kalpavruksha Admin</p>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-charcoal/60 dark:text-white/60">
                  {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`}>{index > 0 && <span className="mx-1">/</span>}{crumb}</span>)}
                </div>
              </div>
            </div>
            <label className="hidden min-w-64 items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5 md:flex">
              <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" />
              <span className="sr-only">Admin search</span>
              <input className="w-full bg-transparent" placeholder="Search clients, IDs, records" />
            </label>
            <div className="flex items-center gap-2">
              <button aria-label="Notifications" className="relative rounded-lg border border-forest-100 bg-white p-2 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold-500" />
              </button>
              <button aria-label="Toggle dark mode" onClick={toggleTheme} className="rounded-lg border border-forest-100 bg-white p-2 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="hidden items-center gap-3 rounded-lg border border-forest-100 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex">
                <UserCircle className="h-5 w-5 text-forest-700 dark:text-gold-100" />
                <div className="max-w-36 truncate text-sm"><p className="truncate font-bold">{user?.name}</p><p className="text-xs text-charcoal/55 dark:text-white/55">Administrator</p></div>
              </div>
              <button aria-label="Log out" onClick={handleLogout} className="rounded-lg bg-forest-700 p-2 text-white hover:bg-forest-900"><LogOut className="h-5 w-5" /></button>
            </div>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-24 lg:px-8">
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function AdminPage({ title, eyebrow, actions, children }: { title: string; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">{eyebrow ?? "Live spreadsheet operations"}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-forest-950 dark:text-ivory">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-forest-100/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(16,39,30,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/7", className)}>{children}</section>;
}

export function MetricCard({ label, value, hint, icon, tone = "green" }: { label: string; value: string; hint?: string; icon?: ReactNode; tone?: "green" | "gold" | "slate" }) {
  const toneClass = tone === "gold" ? "bg-gold-100/35 text-gold-700 dark:bg-gold-100/15 dark:text-gold-100" : tone === "slate" ? "bg-charcoal/6 text-charcoal dark:bg-white/10 dark:text-white" : "bg-forest-50 text-forest-800 dark:bg-emerald-400/10 dark:text-emerald-200";
  return (
    <AdminCard>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-charcoal/58 dark:text-white/58">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-forest-950 dark:text-ivory">{value}</p>
          {hint && <p className="mt-2 text-xs font-bold text-gold-600 dark:text-gold-100">{hint}</p>}
        </div>
        {icon && <div className={cn("rounded-lg p-3", toneClass)}>{icon}</div>}
      </div>
    </AdminCard>
  );
}

export function StatusBadge({ value }: { value?: string | boolean }) {
  const text = typeof value === "boolean" ? (value ? "Yes" : "No") : title(String(value ?? "not available"));
  const normalized = text.toLowerCase();
  const tone = normalized.includes("active") || normalized.includes("verified") || normalized.includes("paid") || normalized.includes("approved") || normalized.includes("posted") || normalized === "yes"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    : normalized.includes("pending")
      ? "border-gold-200 bg-gold-100/30 text-gold-800 dark:border-gold-100/20 dark:bg-gold-100/10 dark:text-gold-100"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100";
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", tone)}>{text}</span>;
}

export function AdminTable<T>({ rows, columns, searchPlaceholder = "Search records", filters, pageSize = 10 }: { rows: T[]; columns: Column<T>[]; searchPlaceholder?: string; filters?: Array<{ label: string; value: string; predicate: (row: T) => boolean }>; pageSize?: number }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const activeFilter = filters?.find((item) => item.value === filter);
    return rows.filter((row) => {
      const matchesSearch = !needle || JSON.stringify(row).toLowerCase().includes(needle);
      const matchesFilter = !activeFilter || activeFilter.predicate(row);
      return matchesSearch && matchesFilter;
    });
  }, [filter, filters, rows, search]);
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const visible = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" />
          <span className="sr-only">Search</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={searchPlaceholder} className="w-full bg-transparent" />
        </label>
        {filters && (
          <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-charcoal">
            <option value="all">All records</option>
            {filters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-forest-800 text-xs uppercase text-ivory dark:bg-white/10">
            <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 font-extrabold">{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-white/10">
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-charcoal/60 dark:text-white/60">No spreadsheet records match this view.</td></tr>
            ) : visible.map((row, index) => (
              <tr key={index} className="transition hover:bg-forest-50/70 dark:hover:bg-white/7">
                {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 align-middle text-charcoal/80 dark:text-white/80">{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 text-sm text-charcoal/60 dark:text-white/60 sm:flex-row sm:items-center">
        <span>{filtered.length} records from spreadsheet</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-lg border border-forest-100 px-3 py-2 font-semibold dark:border-white/10">Previous</button>
          <span className="font-bold text-forest-900 dark:text-ivory">Page {Math.min(page, pageCount)} of {pageCount}</span>
          <button onClick={() => setPage((value) => Math.min(value + 1, pageCount))} className="rounded-lg border border-forest-100 px-3 py-2 font-semibold dark:border-white/10">Next</button>
        </div>
      </div>
    </div>
  );
}

export function CommandButton({ children, onClick, tone = "primary", type = "button", disabled }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "secondary" | "danger"; type?: "button" | "submit"; disabled?: boolean }) {
  const className = tone === "primary"
    ? "bg-forest-700 text-white hover:bg-forest-900"
    : tone === "danger"
      ? "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100"
      : "border border-forest-100 bg-white text-forest-900 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5 dark:text-white";
  return <button type={type} disabled={disabled} onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60", className)}>{children}</button>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-charcoal/76 dark:text-white/76">{label}{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm placeholder:text-charcoal/40 dark:border-white/10 dark:bg-white/5 dark:text-white", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm dark:border-white/10 dark:bg-charcoal dark:text-white", props.className)} />;
}

function AdminNavItem({ item, collapsed, onClick }: { item: typeof navItems[number]; collapsed?: boolean; onClick?: () => void }) {
  const location = useLocation();
  const Icon = item.icon;
  const active = item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-charcoal/68 transition hover:bg-forest-50 hover:text-forest-950 dark:text-white/68 dark:hover:bg-white/10 dark:hover:text-white",
        active && "bg-forest-700 text-white shadow-sm hover:bg-forest-700 hover:text-white dark:bg-gold-100 dark:text-forest-950",
        collapsed && "justify-center"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function AdminLoading({ label = "Loading live admin records" }: { label?: string }) {
  return <main className="grid min-h-[60vh] place-items-center"><LoadingState label={label} /></main>;
}
