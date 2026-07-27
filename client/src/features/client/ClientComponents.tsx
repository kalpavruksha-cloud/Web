import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeIndianRupee,
  Banknote,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UploadCloud,
  UserCircle,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { api } from "../../api/client";
import { Logo } from "../../components/Logo";
import { ErrorState, LoadingState } from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { fileCategoryFolder, readFileAsBase64, statusText } from "./clientUtils";

export type ClientColumn<T> = { key: string; header: string; render: (row: T) => ReactNode };

const navItems = [
  { to: "/client", label: "Dashboard", icon: Home },
  { to: "/client/account-overview", label: "Account Overview", icon: ShieldCheck },
  { to: "/client/bank-details", label: "Bank Details", icon: Banknote },
  { to: "/client/transactions", label: "Transactions", icon: WalletCards },
  { to: "/client/add-investment", label: "Add Investment", icon: PlusCircle },
  { to: "/client/withdrawals", label: "Withdrawals", icon: BadgeIndianRupee },
  { to: "/client/documents", label: "Documents", icon: FileText },
  { to: "/client/referrals", label: "Referrals", icon: Users },
  { to: "/client/profile", label: "Profile", icon: UserCircle },
  { to: "/client/faq", label: "FAQ", icon: CircleHelp },
  { to: "/client/support", label: "Help & Support", icon: LifeBuoy },
  { to: "/client/settings", label: "Settings", icon: Settings }
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("kv-client-sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const history = useHistory();
  const location = useLocation();

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem("kv-client-sidebar", value ? "expanded" : "collapsed");
      return !value;
    });
  }

  async function handleLogout() {
    await logout();
    history.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fbfaf4_0%,#eef7f2_48%,#f8faf8_100%)] text-charcoal dark:bg-[linear-gradient(135deg,#071713_0%,#10251f_56%,#151b1a_100%)] dark:text-white">
      <aside className={cn("no-print fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-forest-100/80 bg-forest-900 px-3 pb-4 pt-2 text-white shadow-xl transition-[width,transform] duration-300 ease-out lg:flex", collapsed ? "w-24" : "w-72")}>
        <div className="flex items-center justify-between gap-3">
          <Logo compact={collapsed} variant="portal" />
          <button aria-label="Collapse client sidebar" onClick={toggleCollapsed} className="rounded-lg border border-white/10 bg-white/10 p-2 hover:bg-white/15">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <div className={cn("mt-2 rounded-xl border border-white/10 bg-white/10 p-3 shadow-sm", collapsed && "mt-3 px-2")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold-100 text-forest-900"><UserCircle className="h-6 w-6" /></div>
            {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-extrabold">{user?.name}</p><p className="text-xs text-white/62">{user?.clientId}</p></div>}
          </div>
        </div>
        <nav className="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(215,171,61,0.55)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold-300/55">
          {navItems.map((item) => <ClientNavItem key={item.to} item={item} collapsed={collapsed} />)}
        </nav>
      </aside>

      {mobileOpen && <button aria-label="Close client menu" className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("no-print fixed inset-y-0 left-0 z-50 flex w-80 max-w-[86vw] flex-col overflow-hidden bg-forest-900 px-3 pb-4 pt-2 text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between"><Logo variant="portal" /><button aria-label="Close menu" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button></div>
        <nav className="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(215,171,61,0.55)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold-300/55">
          {navItems.map((item) => <ClientNavItem key={item.to} item={item} onClick={() => setMobileOpen(false)} />)}
        </nav>
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "lg:pl-24" : "lg:pl-72")}>
        <header className="no-print sticky top-0 z-30 border-b border-forest-100/80 bg-ivory/88 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-charcoal/88 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button aria-label="Open client menu" onClick={() => setMobileOpen(true)} className="rounded-lg border border-forest-100 bg-white p-2 dark:border-white/10 dark:bg-white/5 lg:hidden"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">Kalpavruksha Client Portal</p>
                <p className="mt-1 truncate text-sm font-semibold text-charcoal/62 dark:text-white/62">{statusText(location.pathname.split("/").filter(Boolean).pop())}</p>
              </div>
            </div>
            <label className="hidden min-w-64 items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5 md:flex">
              <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" />
              <span className="sr-only">Search client portal</span>
              <input className="w-full bg-transparent" placeholder="Search transactions, documents, support" />
            </label>
            <div className="flex items-center gap-2">
              <button aria-label="Notifications" onClick={() => history.push("/client/notifications")} className="relative rounded-lg border border-forest-100 bg-white p-2 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5"><Bell className="h-5 w-5" /></button>
              <button aria-label="Toggle dark mode" onClick={toggleTheme} className="rounded-lg border border-forest-100 bg-white p-2 hover:bg-forest-50 dark:border-white/10 dark:bg-white/5">{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
              <button aria-label="Log out" onClick={handleLogout} className="rounded-lg bg-forest-700 p-2 text-white hover:bg-forest-900"><LogOut className="h-5 w-5" /></button>
            </div>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[1380px] px-4 py-6 pb-24 lg:px-8">
          {children}
        </motion.main>
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-forest-100 bg-white/95 px-2 py-2 backdrop-blur dark:border-white/10 dark:bg-charcoal/95 lg:hidden">
          {navItems.slice(0, 5).map((item) => <ClientNavItem key={item.to} item={item} mobile />)}
        </nav>
      </div>
    </div>
  );
}

export function ClientPage({ title, eyebrow, actions, children }: { title: string; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">{eyebrow ?? "Live client records"}</p><h1 className="mt-2 font-display text-3xl font-extrabold text-forest-950 dark:text-ivory">{title}</h1></div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </>
  );
}

export function ClientCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-forest-100/80 bg-white/92 p-5 shadow-[0_16px_45px_rgba(16,39,30,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/7", className)}>{children}</section>;
}

export function ClientMetric({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return <ClientCard><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-charcoal/58 dark:text-white/58">{label}</p><p className="mt-2 text-2xl font-extrabold text-forest-950 dark:text-ivory">{value}</p>{hint && <p className="mt-2 text-xs font-bold text-gold-600 dark:text-gold-100">{hint}</p>}</div>{icon && <div className="rounded-lg bg-forest-50 p-3 text-forest-800 dark:bg-gold-100/10 dark:text-gold-100">{icon}</div>}</div></ClientCard>;
}

export function ClientStatus({ value }: { value?: string | boolean }) {
  const text = statusText(value);
  const low = text.toLowerCase();
  const cls = low.includes("verified") || low.includes("active") || low.includes("paid") || low.includes("approved") || low === "enabled"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    : low.includes("pending") || low.includes("review")
      ? "border-gold-200 bg-gold-100/35 text-gold-800 dark:border-gold-100/20 dark:bg-gold-100/10 dark:text-gold-100"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100";
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", cls)}>{text}</span>;
}

export function ClientTable<T>({ rows, columns, searchPlaceholder = "Search records", pageSize = 10 }: { rows: T[]; columns: ClientColumn<T>[]; searchPlaceholder?: string; pageSize?: number }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => rows.filter((row) => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const visible = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  return (
    <div>
      <label className="mb-4 flex max-w-xl items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
        <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" /><span className="sr-only">Search</span>
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={searchPlaceholder} className="w-full bg-transparent" />
      </label>
      <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[linear-gradient(90deg,#0b2f25,#14583f_55%,#d7ab3d)] text-xs uppercase text-ivory shadow-sm"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 font-extrabold">{column.header}</th>)}</tr></thead>
          <tbody className="divide-y divide-forest-100 dark:divide-white/10">
            {visible.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-charcoal/60 dark:text-white/60">No spreadsheet records match this view.</td></tr> : visible.map((row, index) => <tr key={index} className="hover:bg-forest-50/70 dark:hover:bg-white/7">{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3">{column.render(row)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between gap-3 text-sm text-charcoal/60 dark:text-white/60"><span>{filtered.length} records</span><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-lg border border-forest-100 px-3 py-2 dark:border-white/10">Previous</button><span className="font-bold">Page {Math.min(page, pageCount)} of {pageCount}</span><button onClick={() => setPage((value) => Math.min(value + 1, pageCount))} className="rounded-lg border border-forest-100 px-3 py-2 dark:border-white/10">Next</button></div></div>
    </div>
  );
}

export function ClientButton({ children, onClick, type = "button", disabled, tone = "primary" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; tone?: "primary" | "secondary" | "danger" }) {
  const cls = tone === "primary" ? "bg-forest-700 text-white hover:bg-forest-900" : tone === "danger" ? "border border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100" : "border border-forest-100 bg-white text-forest-900 dark:border-white/10 dark:bg-white/5 dark:text-white";
  return <button type={type} disabled={disabled} onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60", cls)}>{children}</button>;
}

export function ClientField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-charcoal/76 dark:text-white/76">{label}{children}</label>;
}

export function ClientInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5", props.className)} />;
}

export function FileUpload({ label, category, recordId, endpoint, onUploaded }: { label: string; category: string; recordId?: string; endpoint: string; onUploaded?: (data: unknown) => void }) {
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const { toast } = useToast();

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(undefined);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function validate(next: File) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(next.type)) return "Only PDF, JPG, JPEG, and PNG files are allowed.";
    if (next.size > 10 * 1024 * 1024) return "Maximum file size is 10 MB.";
    return "";
  }

  function pick(next?: File) {
    if (!next) return;
    const message = validate(next);
    setError(message || undefined);
    setSuccess(undefined);
    if (!message) setFile(next);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      const base64Data = await readFileAsBase64(file);
      const response = await api.post(endpoint, { fileName: file.name, mimeType: file.type, fileSize: file.size, base64Data, category, folderType: fileCategoryFolder(category), recordId });
      toast({ title: "File uploaded", message: "Metadata has been saved for review.", type: "success" });
      setSuccess("Upload completed and saved for verification.");
      setFile(undefined);
      onUploaded?.(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function cancel() {
    setFile(undefined);
    setError(undefined);
    setSuccess(undefined);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    pick(event.dataTransfer.files[0]);
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    pick(event.target.files?.[0]);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-charcoal/76 dark:text-white/76">{label}</p>
      <div onDragOver={(event) => event.preventDefault()} onDrop={drop} className="rounded-lg border border-dashed border-forest-200 bg-forest-50/60 p-4 text-center dark:border-white/15 dark:bg-white/5">
        <UploadCloud className="mx-auto h-7 w-7 text-forest-700 dark:text-gold-100" />
        <p className="mt-2 text-sm font-semibold">{file ? file.name : "Drag file here or choose a file"}</p>
        <p className="mt-1 text-xs text-charcoal/58 dark:text-white/58">PDF, JPG, JPEG, PNG up to 10 MB</p>
        {previewUrl && <img src={previewUrl} alt="Selected upload preview" className="mx-auto mt-3 h-28 w-28 rounded-lg object-cover" />}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={change} className="mt-3 text-sm" />
        {error && <ErrorState title="Upload error" message={error} />}
        {success && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">{success}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <ClientButton onClick={upload} disabled={!file || uploading}>{uploading ? "Uploading..." : error ? "Retry Upload" : "Upload"}</ClientButton>
          {file && <ClientButton tone="secondary" onClick={cancel} disabled={uploading}>Cancel</ClientButton>}
        </div>
      </div>
    </div>
  );
}

export function ClientLoading({ label = "Loading live client records" }: { label?: string }) {
  return <main className="grid min-h-[60vh] place-items-center"><LoadingState label={label} /></main>;
}

function ClientNavItem({ item, collapsed, mobile, onClick }: { item: typeof navItems[number]; collapsed?: boolean; mobile?: boolean; onClick?: () => void }) {
  const location = useLocation();
  const Icon = item.icon;
  const active = item.to === "/client" ? location.pathname === "/client" : location.pathname.startsWith(item.to);
  return <Link to={item.to} onClick={onClick} title={collapsed ? item.label : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white", active && "bg-gold-100 text-forest-950 hover:bg-gold-100 hover:text-forest-950", collapsed && "justify-center", mobile && "justify-center px-2 py-2 text-charcoal/70 dark:text-white/70")}><Icon className="h-5 w-5 shrink-0" />{!collapsed && !mobile && <span>{item.label}</span>}{mobile && <span className="sr-only">{item.label}</span>}</Link>;
}
