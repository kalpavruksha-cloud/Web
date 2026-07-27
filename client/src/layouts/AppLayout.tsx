import type { ReactNode } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Bell, BriefcaseBusiness, FileText, Home, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, Users, WalletCards } from "lucide-react";
import { useState } from "react";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { cn } from "../utils/cn";

const clientNav = [
  { to: "/client", label: "Dashboard", icon: Home },
  { to: "/client/investments", label: "Investments", icon: BriefcaseBusiness },
  { to: "/client/transactions", label: "Transactions", icon: WalletCards },
  { to: "/client/withdrawals", label: "Withdrawals", icon: BarChart3 },
  { to: "/client/documents", label: "Documents", icon: FileText },
  { to: "/client/notifications", label: "Alerts", icon: Bell }
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: Home },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/investments", label: "Investments", icon: BriefcaseBusiness },
  { to: "/admin/transactions", label: "Transactions", icon: WalletCards },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: BarChart3 },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/referrals", label: "Referrals", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/schema", label: "Schema", icon: ShieldCheck }
];

export function AppLayout({ children, mode }: { children: ReactNode; mode: "client" | "admin" }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const history = useHistory();
  const nav = mode === "admin" ? adminNav : clientNav;

  async function handleLogout() {
    await logout();
    history.push(mode === "admin" ? "/admin-login" : "/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_1fr]">
      <aside className={cn("no-print hidden flex-col overflow-hidden border-r border-forest-100 bg-white/88 px-3 pb-4 pt-2 shadow-sm backdrop-blur transition-[width,transform] duration-300 ease-out dark:border-white/10 dark:bg-charcoal/90 lg:flex", collapsed ? "w-20" : "w-72")}>
        <div className="flex items-center justify-between">
          <Logo compact={collapsed} variant="portal" />
          <button aria-label="Toggle sidebar" onClick={() => setCollapsed((value) => !value)} className="rounded-lg p-2 hover:bg-forest-50 dark:hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(215,171,61,0.55)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold-300/55">
          {nav.map((item) => <NavItem key={item.to} item={item} collapsed={collapsed} />)}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b border-forest-100 bg-ivory/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-charcoal/80">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden"><Logo compact variant="portal" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-forest-900 dark:text-ivory">{user?.name}</p>
              <p className="text-xs text-charcoal/60 dark:text-white/60">{mode === "admin" ? "Admin Portal" : `Client ${user?.clientId ?? ""}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Toggle theme" onClick={toggleTheme} className="rounded-lg border border-forest-100 bg-white p-2 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button aria-label="Log out" onClick={handleLogout} className="rounded-lg bg-forest-700 p-2 text-white hover:bg-forest-900">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 lg:px-8">
          {children}
        </motion.main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-forest-100 bg-white/95 px-2 py-2 backdrop-blur dark:border-white/10 dark:bg-charcoal/95 lg:hidden">
          {nav.slice(0, 6).map((item) => <NavItem key={item.to} item={item} mobile />)}
        </nav>
      </div>
    </div>
  );
}

function NavItem({ item, collapsed, mobile }: { item: { to: string; label: string; icon: typeof Home }; collapsed?: boolean; mobile?: boolean }) {
  const Icon = item.icon;
  const location = useLocation();
  const active = item.to === "/client" || item.to === "/admin" ? location.pathname === item.to : location.pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-charcoal/70 transition hover:bg-forest-50 hover:text-forest-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
        active && "bg-forest-700 text-white hover:bg-forest-700 hover:text-white dark:bg-gold-100 dark:text-forest-900",
        mobile && "justify-center px-2 py-2",
        collapsed && "justify-center"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && !mobile && <span>{item.label}</span>}
      {mobile && <span className="sr-only">{item.label}</span>}
    </Link>
  );
}
