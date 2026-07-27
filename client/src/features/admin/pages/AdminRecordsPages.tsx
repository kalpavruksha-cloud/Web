import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, ExternalLink, Eye, FileText, Plus, Printer, RefreshCw, Save } from "lucide-react";
import { useAction, useDashboard, useResource } from "../../../api/queries";
import { ErrorState } from "../../../components/State";
import { useToast } from "../../../context/ToastContext";
import type { ClientDocument, ClientNotification, Investment, PortalSettings, Profile, Referral, SpreadsheetSchema, Transaction, Withdrawal } from "../../../types/domain";
import { formatCurrency, formatDate } from "../../../utils/format";
import { AdminCard, AdminLoading, AdminPage, AdminTable, CommandButton, Field, Input, Select, StatusBadge } from "../AdminComponents";
import { computeAdminMetrics, exportCsv, isStatus, recentActivity, title } from "../adminUtils";

export function AdminClients() {
  const { data, isLoading, error } = useResource<Profile[]>("admin-clients", "/clients");
  const mutation = useAction<Profile>(["admin-clients", "clients", "dashboard"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", fullName: "", mobile: "", email: "", pan: "", aadhaar: "", kycStatus: "pending", accountStatus: "active" });

  if (isLoading) return <AdminLoading label="Loading client records" />;
  if (error) return <ErrorState title="Client records unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "post", url: "/clients", body: form });
    toast({ title: "Client record submitted", type: "success" });
  }

  async function updateStatus(clientId: string, status: string) {
    await mutation.mutateAsync({ method: "put", url: `/clients/${clientId}`, body: { Status: status, accountStatus: status } });
    toast({ title: `Client ${status}`, type: "success" });
  }

  return (
    <AdminPage title="Client Management" actions={<CommandButton tone="secondary" onClick={() => exportCsv("clients.csv", rows as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" /> Export</CommandButton>}>
      <AdminCard className="mb-6">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Field label="Client ID"><Input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
          <Field label="Name"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Mobile"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="PAN"><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></Field>
          <Field label="Aadhaar"><Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></Field>
          <Field label="KYC"><Select value={form.kycStatus} onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}><option>pending</option><option>verified</option><option>rejected</option></Select></Field>
          <Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><Plus className="h-4 w-4" /> Create</CommandButton></Field>
        </form>
      </AdminCard>
      <AdminCard>
        <AdminTable rows={rows} searchPlaceholder="Search clients by ID, name, PAN, mobile" filters={[
          { label: "Active", value: "active", predicate: (row) => isStatus(row.accountStatus, "active") },
          { label: "Inactive", value: "inactive", predicate: (row) => isStatus(row.accountStatus, "inactive") },
          { label: "Pending KYC", value: "kyc", predicate: (row) => !isStatus(row.kycStatus, "verified") }
        ]} columns={[
          { key: "id", header: "Client ID", render: (row) => <Link className="font-extrabold text-forest-700 dark:text-gold-100" to={`/admin/clients/${row.clientId}`}>{row.clientId}</Link> },
          { key: "name", header: "Name", render: (row) => row.fullName },
          { key: "mobile", header: "Mobile", render: (row) => row.mobile },
          { key: "email", header: "Email", render: (row) => row.email },
          { key: "pan", header: "PAN", render: (row) => row.pan },
          { key: "aadhaar", header: "Aadhaar", render: (row) => row.aadhaar },
          { key: "kyc", header: "KYC", render: (row) => <StatusBadge value={row.kycStatus} /> },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.accountStatus} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><Link className="rounded-lg border border-forest-100 px-3 py-2 text-sm font-bold dark:border-white/10" to={`/admin/clients/${row.clientId}`}>View</Link><CommandButton tone="secondary" onClick={() => updateStatus(row.clientId, "active")}>Activate</CommandButton><CommandButton tone="danger" onClick={() => updateStatus(row.clientId, "inactive")}>Deactivate</CommandButton></div> }
        ]} />
      </AdminCard>
    </AdminPage>
  );
}

export function AdminClientDetails() {
  const { id } = useParams<{ id: string }>();
  const clients = useResource<Profile[]>("admin-clients", "/clients");
  const investments = useResource<Investment[]>("admin-investments", "/investments");
  const transactions = useResource<Transaction[]>("admin-transactions", "/transactions");
  const withdrawals = useResource<Withdrawal[]>("admin-withdrawals", "/withdrawals");
  const documents = useResource<ClientDocument[]>("admin-documents", "/documents");
  const referrals = useResource<Referral[]>("admin-referrals", "/referrals");
  const loading = [clients, investments, transactions, withdrawals, documents, referrals].some((query) => query.isLoading);
  const error = [clients, investments, transactions, withdrawals, documents, referrals].find((query) => query.error)?.error;
  if (loading) return <AdminLoading label="Loading client details" />;
  if (error) return <ErrorState title="Client details unavailable" message={error instanceof Error ? error.message : undefined} />;
  const client = (clients.data ?? []).find((row) => row.clientId.toLowerCase() === id.toLowerCase());
  if (!client) return <ErrorState title="Client not found" message="The spreadsheet did not return this client ID." />;
  const clientInvestments = (investments.data ?? []).filter((row) => row.clientId === client.clientId);
  const clientTransactions = (transactions.data ?? []).filter((row) => row.clientId === client.clientId);
  const clientWithdrawals = (withdrawals.data ?? []).filter((row) => row.clientId === client.clientId);
  const clientDocuments = (documents.data ?? []).filter((row) => row.clientId === client.clientId);
  const clientReferrals = (referrals.data ?? []).filter((row) => row.clientId === client.clientId);

  return (
    <AdminPage title={client.fullName} eyebrow={client.clientId}>
      <div className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Mobile" value={client.mobile} />
        <InfoCard label="Email" value={client.email} />
        <InfoCard label="KYC" value={<StatusBadge value={client.kycStatus} />} />
        <InfoCard label="Status" value={<StatusBadge value={client.accountStatus} />} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard><SectionTitle title="Profile" /><DetailGrid items={client as unknown as Record<string, unknown>} /></AdminCard>
        <AdminCard><SectionTitle title="Investments" /><MiniList rows={clientInvestments.map((row) => `${row.id} - ${row.plan} - ${formatCurrency(row.principalAmount)}`)} /></AdminCard>
        <AdminCard><SectionTitle title="Transactions" /><MiniList rows={clientTransactions.map((row) => `${row.id} - ${title(row.type)} - ${formatCurrency(row.credit - row.debit)}`)} /></AdminCard>
        <AdminCard><SectionTitle title="Withdrawals" /><MiniList rows={clientWithdrawals.map((row) => `${row.id} - ${formatCurrency(row.amount)} - ${title(row.status)}`)} /></AdminCard>
        <AdminCard><SectionTitle title="Documents" /><MiniList rows={clientDocuments.map((row) => `${row.id} - ${row.name} - ${title(row.status)}`)} /></AdminCard>
        <AdminCard><SectionTitle title="Referrals" /><MiniList rows={clientReferrals.map((row) => `${row.id} - ${row.referredClientName || row.referredClientId} - ${formatCurrency(row.rewardAmount)}`)} /></AdminCard>
      </div>
    </AdminPage>
  );
}

export function AdminInvestments() {
  const { data, isLoading, error } = useResource<Investment[]>("admin-investments", "/investments");
  const mutation = useAction<Investment>(["admin-investments", "investments", "dashboard"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", plan: "", category: "", principalAmount: "", returnRate: "", monthlyReturn: "", currentValue: "", maturityDate: "", status: "active" });
  if (isLoading) return <AdminLoading label="Loading investments" />;
  if (error) return <ErrorState title="Investments unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "post", url: "/investments", body: numericBody(form, ["principalAmount", "returnRate", "monthlyReturn", "currentValue"]) });
    toast({ title: "Investment submitted", type: "success" });
  }

  async function closeInvestment(id: string) {
    await mutation.mutateAsync({ method: "put", url: `/investments/${id}`, body: { Status: "closed", status: "closed" } });
    toast({ title: "Investment closed", type: "success" });
  }

  return (
    <AdminPage title="Investment Management" actions={<CommandButton tone="secondary" onClick={() => exportCsv("investments.csv", rows as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" /> Export</CommandButton>}>
      <AdminCard className="mb-6"><form onSubmit={submit} className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Field label="Client"><Input required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
        <Field label="Plan"><Input required value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></Field>
        <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        <Field label="Principal"><Input required type="number" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} /></Field>
        <Field label="ROI"><Input type="number" value={form.returnRate} onChange={(e) => setForm({ ...form, returnRate: e.target.value })} /></Field>
        <Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><Save className="h-4 w-4" /> Create</CommandButton></Field>
      </form></AdminCard>
      <AdminCard><AdminTable rows={rows} filters={[
        { label: "Active", value: "active", predicate: (row) => isStatus(row.status, "active") },
        { label: "Closed", value: "closed", predicate: (row) => isStatus(row.status, "closed") }
      ]} columns={[
        { key: "id", header: "Investment", render: (row) => row.id },
        { key: "client", header: "Client", render: (row) => row.clientId },
        { key: "plan", header: "Plan", render: (row) => row.plan },
        { key: "category", header: "Category", render: (row) => row.category },
        { key: "roi", header: "ROI", render: (row) => row.returnRate ? `${row.returnRate}%` : "Not available" },
        { key: "monthly", header: "Monthly Return", render: (row) => formatCurrency(row.monthlyReturn) },
        { key: "value", header: "Current Value", render: (row) => formatCurrency(row.currentValue || row.principalAmount) },
        { key: "maturity", header: "Maturity", render: (row) => formatDate(row.maturityDate) },
        { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
        { key: "actions", header: "Actions", render: (row) => <CommandButton tone="danger" onClick={() => closeInvestment(row.id)}>Close</CommandButton> }
      ]} /></AdminCard>
    </AdminPage>
  );
}

export function AdminTransactions() {
  const { data, isLoading, error } = useResource<Transaction[]>("admin-transactions", "/transactions");
  const mutation = useAction<Transaction>(["admin-transactions", "transactions", "dashboard"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", type: "interest", description: "", credit: "", debit: "", reference: "", status: "posted" });
  if (isLoading) return <AdminLoading label="Loading ledger" />;
  if (error) return <ErrorState title="Transactions unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = (data ?? []).slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "post", url: "/transactions", body: numericBody(form, ["credit", "debit"]) });
    toast({ title: "Transaction submitted", type: "success" });
  }
  return (
    <AdminPage title="Transaction Ledger" actions={<><CommandButton tone="secondary" onClick={() => exportCsv("transactions.csv", rows as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" /> Export</CommandButton><CommandButton tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</CommandButton></>}>
      <AdminCard className="mb-6"><form onSubmit={submit} className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Field label="Client"><Input required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
        <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>investment</option><option>withdrawal</option><option>referral</option><option>adjustment</option><option>interest</option></Select></Field>
        <Field label="Credit"><Input type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></Field>
        <Field label="Debit"><Input type="number" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></Field>
        <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><Plus className="h-4 w-4" /> Add</CommandButton></Field>
      </form></AdminCard>
      <AdminCard><AdminTable rows={rows} columns={[
        { key: "id", header: "Tx ID", render: (row) => row.id },
        { key: "date", header: "Date", render: (row) => formatDate(row.date) },
        { key: "client", header: "Client", render: (row) => row.clientId },
        { key: "type", header: "Type", render: (row) => title(row.type) },
        { key: "description", header: "Description", render: (row) => row.description },
        { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) },
        { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) },
        { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> }
      ]} /></AdminCard>
    </AdminPage>
  );
}

export function AdminWithdrawals() {
  const { data, isLoading, error } = useResource<Withdrawal[]>("admin-withdrawals", "/withdrawals");
  const mutation = useAction<Withdrawal>(["admin-withdrawals", "withdrawals", "dashboard"]);
  const { toast } = useToast();
  if (isLoading) return <AdminLoading label="Loading withdrawals" />;
  if (error) return <ErrorState title="Withdrawals unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  async function decide(id: string, action: "approve" | "reject" | "paid") {
    const adminRemarks = window.prompt("Admin remarks") ?? "";
    const paymentReference = action === "paid" ? window.prompt("Payment reference") ?? "" : "";
    await mutation.mutateAsync({ method: "put", url: `/withdrawals/${id}/${action}`, body: { adminRemarks, paymentReference } });
    toast({ title: `Withdrawal ${action}`, type: "success" });
  }
  return <AdminPage title="Withdrawal Management"><AdminCard><AdminTable rows={rows} filters={[
    { label: "Pending", value: "pending", predicate: (row) => isStatus(row.status, "pending") },
    { label: "Approved", value: "approved", predicate: (row) => isStatus(row.status, "approved") },
    { label: "Rejected", value: "rejected", predicate: (row) => isStatus(row.status, "rejected") },
    { label: "Paid", value: "paid", predicate: (row) => isStatus(row.status, "paid") }
  ]} columns={[
    { key: "id", header: "Request", render: (row) => row.id },
    { key: "client", header: "Client", render: (row) => row.clientId },
    { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
    { key: "request", header: "Request Date", render: (row) => formatDate(row.requestDate) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "reference", header: "Payment Ref", render: (row) => row.paymentReference },
    { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><CommandButton tone="secondary" onClick={() => decide(row.id, "approve")}>Approve</CommandButton><CommandButton tone="danger" onClick={() => decide(row.id, "reject")}>Reject</CommandButton><CommandButton onClick={() => decide(row.id, "paid")}>Paid</CommandButton></div> }
  ]} /></AdminCard></AdminPage>;
}

export function AdminDocuments() {
  const { data, isLoading, error } = useResource<ClientDocument[]>("admin-documents", "/documents");
  const mutation = useAction<ClientDocument>(["admin-documents", "documents", "dashboard"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", name: "", type: "Agreement", driveUrl: "", status: "available" });
  if (isLoading) return <AdminLoading label="Loading documents" />;
  if (error) return <ErrorState title="Documents unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "post", url: "/documents", body: form });
    toast({ title: "Document metadata submitted", type: "success" });
  }
  async function archive(id: string) {
    await mutation.mutateAsync({ method: "delete", url: `/documents/${id}` });
    toast({ title: "Document archived", type: "success" });
  }
  return <AdminPage title="Document Management"><AdminCard className="mb-6"><form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
    <Field label="Client"><Input required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
    <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Type"><Input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></Field>
    <Field label="Google Drive URL"><Input required value={form.driveUrl} onChange={(e) => setForm({ ...form, driveUrl: e.target.value })} /></Field>
    <Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><Plus className="h-4 w-4" /> Register</CommandButton></Field>
  </form></AdminCard><AdminCard><AdminTable rows={rows} columns={[
    { key: "id", header: "Document", render: (row) => row.id },
    { key: "client", header: "Client", render: (row) => row.clientId },
    { key: "name", header: "Name", render: (row) => <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />{row.name}</span> },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "date", header: "Upload", render: (row) => formatDate(row.uploadDate) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2">{row.driveUrl && <a href={row.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-forest-100 px-3 py-2 text-sm font-bold dark:border-white/10"><ExternalLink className="h-4 w-4" /> Open</a>}<CommandButton tone="danger" onClick={() => archive(row.id)}>Archive</CommandButton></div> }
  ]} /></AdminCard></AdminPage>;
}

export function AdminReferrals() {
  const { data, isLoading, error } = useResource<Referral[]>("admin-referrals", "/referrals");
  const mutation = useAction<Referral>(["admin-referrals", "referrals", "dashboard"]);
  const { toast } = useToast();
  const rows = data ?? [];
  if (isLoading) return <AdminLoading label="Loading referrals" />;
  if (error) return <ErrorState title="Referrals unavailable" message={error instanceof Error ? error.message : undefined} />;
  async function update(id: string, status: string, paidAmount?: number) {
    await mutation.mutateAsync({ method: "put", url: `/referrals/${id}`, body: { status, paidAmount } });
    toast({ title: `Referral ${status}`, type: "success" });
  }
  return <AdminPage title="Referral Management"><AdminCard><AdminTable rows={rows} columns={[
    { key: "id", header: "Referral", render: (row) => row.id },
    { key: "code", header: "Code", render: (row) => row.code },
    { key: "client", header: "Client", render: (row) => row.clientId },
    { key: "referred", header: "Referred Client", render: (row) => row.referredClientName || row.referredClientId },
    { key: "reward", header: "Reward", render: (row) => formatCurrency(row.rewardAmount) },
    { key: "paid", header: "Paid", render: (row) => formatCurrency(row.paidAmount) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><CommandButton tone="secondary" onClick={() => update(row.id, "approved")}>Approve</CommandButton><CommandButton tone="danger" onClick={() => update(row.id, "rejected")}>Reject</CommandButton><CommandButton onClick={() => update(row.id, "paid", row.rewardAmount)}>Mark Paid</CommandButton></div> }
  ]} /></AdminCard></AdminPage>;
}

export function AdminNotifications() {
  const { data, isLoading, error } = useResource<ClientNotification[]>("admin-notifications", "/notifications");
  const mutation = useAction<ClientNotification>(["admin-notifications", "notifications", "dashboard"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", title: "", message: "", type: "general", priority: "normal" as "low" | "normal" | "high" });
  if (isLoading) return <AdminLoading label="Loading notifications" />;
  if (error) return <ErrorState title="Notifications unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "post", url: "/notifications", body: form });
    toast({ title: form.clientId ? "Client notification sent" : "Broadcast notification sent", type: "success" });
  }
  return <AdminPage title="Notification Management"><AdminCard className="mb-6"><form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_1fr_auto]">
    <Field label="Client ID"><Input placeholder="Blank for broadcast" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
    <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
    <Field label="Message"><Input required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
    <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "low" | "normal" | "high" })}><option>low</option><option>normal</option><option>high</option></Select></Field>
    <Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><BellIcon /> Send</CommandButton></Field>
  </form></AdminCard><AdminCard><AdminTable rows={rows} columns={[
    { key: "title", header: "Title", render: (row) => row.title },
    { key: "client", header: "Recipient", render: (row) => row.clientId || "Broadcast" },
    { key: "message", header: "Message", render: (row) => row.message },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge value={row.priority} /> },
    { key: "read", header: "Read", render: (row) => <StatusBadge value={row.read} /> },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) }
  ]} /></AdminCard></AdminPage>;
}

export function AdminReports() {
  const reports = useResource<Record<string, unknown>>("admin-reports", "/reports");
  if (reports.isLoading) return <AdminLoading label="Loading reports" />;
  if (reports.error) return <ErrorState title="Reports unavailable" message={reports.error instanceof Error ? reports.error.message : undefined} />;
  const entries = Object.entries(reports.data ?? {});
  return <AdminPage title="Reports and Analytics" actions={<CommandButton tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</CommandButton>}>
    <div className="grid gap-5 lg:grid-cols-2">
      {["investmentSummary", "transactionStatement", "withdrawalReport", "referralReport", "portfolioReport", "kycReport", "monthlyReturnReport"].map((key) => {
        const value = entries.find(([name]) => name === key)?.[1];
        const rows = Array.isArray(value) ? value : value ? [value] : [];
        return <AdminCard key={key}><SectionTitle title={title(key.replace(/([A-Z])/g, " $1"))} /><div className="mb-3"><CommandButton tone="secondary" onClick={() => exportCsv(`${key}.csv`, rows as Array<Record<string, unknown>>)}><Download className="h-4 w-4" /> Export CSV</CommandButton></div><pre className="max-h-72 overflow-auto rounded-lg bg-forest-50 p-3 text-xs dark:bg-black/20">{JSON.stringify(value ?? "Not available from spreadsheet", null, 2)}</pre></AdminCard>;
      })}
    </div>
  </AdminPage>;
}

export function AdminSettings() {
  const settings = useResource<PortalSettings>("admin-settings", "/settings");
  const mutation = useAction<PortalSettings>(["admin-settings", "settings"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ key: "", value: "" });
  if (settings.isLoading) return <AdminLoading label="Loading settings" />;
  if (settings.error) return <ErrorState title="Settings unavailable" message={settings.error instanceof Error ? settings.error.message : undefined} />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ method: "put", url: "/settings", body: { [form.key]: form.value } });
    toast({ title: "Setting updated", type: "success" });
  }
  return <AdminPage title="Settings"><AdminCard className="mb-6"><form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><Field label="Setting Key"><Input required value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></Field><Field label="Value"><Input required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field><Field label="Action"><CommandButton type="submit" disabled={mutation.isPending}><Save className="h-4 w-4" /> Update</CommandButton></Field></form></AdminCard><AdminCard><div className="grid gap-3">{Object.entries(settings.data ?? {}).length === 0 ? <p className="text-sm text-charcoal/60 dark:text-white/60">No portal settings were returned by the spreadsheet API.</p> : Object.entries(settings.data ?? {}).map(([key, value]) => <div key={key} className="grid gap-1 border-b border-forest-100 py-3 last:border-0 dark:border-white/10 sm:grid-cols-[240px_1fr]"><dt className="font-bold text-forest-950 dark:text-ivory">{title(key)}</dt><dd className="text-charcoal/70 dark:text-white/70">{String(value)}</dd></div>)}</div></AdminCard></AdminPage>;
}

export function AdminActivityLog() {
  const clients = useResource<Profile[]>("admin-clients", "/clients");
  const transactions = useResource<Transaction[]>("admin-transactions", "/transactions");
  const withdrawals = useResource<Withdrawal[]>("admin-withdrawals", "/withdrawals");
  const documents = useResource<ClientDocument[]>("admin-documents", "/documents");
  const loading = [clients, transactions, withdrawals, documents].some((query) => query.isLoading);
  const error = [clients, transactions, withdrawals, documents].find((query) => query.error)?.error;
  if (loading) return <AdminLoading label="Loading activity log" />;
  if (error) return <ErrorState title="Activity unavailable" message={error instanceof Error ? error.message : undefined} />;
  const rows = recentActivity({ clients: clients.data ?? [], transactions: transactions.data ?? [], withdrawals: withdrawals.data ?? [], documents: documents.data ?? [], investments: [], referrals: [], notifications: [] });
  return <AdminPage title="Activity Log" eyebrow="Compiled from live spreadsheet modules"><AdminCard><AdminTable rows={rows} columns={[
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "title", header: "Activity", render: (row) => row.title },
    { key: "detail", header: "Details", render: (row) => row.detail },
    { key: "id", header: "Record", render: (row) => row.id }
  ]} /></AdminCard></AdminPage>;
}

export function AdminSystemHealth() {
  const health = useResource<Record<string, unknown>>("admin-health", "/system/health");
  const schema = useResource<SpreadsheetSchema>("admin-schema", "/admin/spreadsheet-schema");
  if (health.isLoading || schema.isLoading) return <AdminLoading label="Checking system health" />;
  if (health.error) return <ErrorState title="System health unavailable" message={health.error instanceof Error ? health.error.message : undefined} />;
  if (schema.error) return <ErrorState title="Spreadsheet schema unavailable" message={schema.error instanceof Error ? schema.error.message : undefined} />;
  const healthData = health.data as { backend?: string; appsScriptConnectivity?: string; spreadsheetConnectivity?: string; appsScriptCapability?: string; responseTimeMs?: number } | undefined;
  return <AdminPage title="System Health" eyebrow="Backend, Apps Script, spreadsheet, and API diagnostics" actions={<CommandButton tone="secondary" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /> Refresh</CommandButton>}>
    <div className="grid gap-4 md:grid-cols-4">
      <InfoCard label="Backend" value={<StatusBadge value={healthData?.backend ?? "unknown"} />} />
      <InfoCard label="Apps Script" value={<StatusBadge value={healthData?.appsScriptConnectivity ?? "unknown"} />} />
      <InfoCard label="Spreadsheet" value={<StatusBadge value={healthData?.spreadsheetConnectivity ?? "unknown"} />} />
      <InfoCard label="API Status" value={<StatusBadge value={healthData?.appsScriptCapability ?? "unknown"} />} />
    </div>
    <AdminCard className="mt-6"><SectionTitle title="Detected Sheets" /><AdminTable rows={schema.data?.sheets ?? []} columns={[
      { key: "name", header: "Sheet", render: (row) => row.name },
      { key: "records", header: "Record Count", render: (row) => row.recordCount },
      { key: "headers", header: "Headers", render: (row) => row.headers.length },
      { key: "preview", header: "Preview", render: (row) => row.headers.slice(0, 6).join(", ") }
    ]} /></AdminCard>
    <AdminCard className="mt-6"><SectionTitle title="Missing Columns and Mapping Warnings" /><pre className="max-h-72 overflow-auto rounded-lg bg-forest-50 p-3 text-xs dark:bg-black/20">{JSON.stringify(schema.data?.warnings ?? [], null, 2)}</pre></AdminCard>
    <AdminCard className="mt-6"><SectionTitle title="Raw Health Payload" /><pre className="max-h-72 overflow-auto rounded-lg bg-forest-50 p-3 text-xs dark:bg-black/20">{JSON.stringify(health.data, null, 2)}</pre></AdminCard>
  </AdminPage>;
}

export function AdminDashboardAlias() {
  const dashboard = useDashboard();
  const clients = useResource<Profile[]>("admin-clients", "/clients");
  const investments = useResource<Investment[]>("admin-investments", "/investments");
  const transactions = useResource<Transaction[]>("admin-transactions", "/transactions");
  const withdrawals = useResource<Withdrawal[]>("admin-withdrawals", "/withdrawals");
  const documents = useResource<ClientDocument[]>("admin-documents", "/documents");
  const referrals = useResource<Referral[]>("admin-referrals", "/referrals");
  const notifications = useResource<ClientNotification[]>("admin-notifications", "/notifications");
  const metrics = computeAdminMetrics({ dashboard: dashboard.data, clients: clients.data ?? [], investments: investments.data ?? [], transactions: transactions.data ?? [], withdrawals: withdrawals.data ?? [], documents: documents.data ?? [], referrals: referrals.data ?? [], notifications: notifications.data ?? [] });
  return <AdminPage title="Admin Summary"><AdminCard><pre>{JSON.stringify(metrics, null, 2)}</pre></AdminCard></AdminPage>;
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-4 font-display text-lg font-extrabold text-forest-950 dark:text-ivory">{title}</h2>;
}

function InfoCard({ label, value }: { label: string; value?: ReactNode }) {
  return <AdminCard><p className="text-sm font-semibold text-charcoal/58 dark:text-white/58">{label}</p><div className="mt-2 text-lg font-extrabold text-forest-950 dark:text-ivory">{value ?? "Not available"}</div></AdminCard>;
}

function DetailGrid({ items }: { items: Record<string, unknown> }) {
  return <div className="grid gap-2 text-sm">{Object.entries(items).map(([key, value]) => <div key={key} className="grid gap-1 border-b border-forest-100 py-2 last:border-0 dark:border-white/10 sm:grid-cols-[180px_1fr]"><dt className="font-bold">{title(key)}</dt><dd className="text-charcoal/68 dark:text-white/68">{String(value ?? "Not available")}</dd></div>)}</div>;
}

function MiniList({ rows }: { rows: string[] }) {
  return rows.length ? <div className="grid gap-2">{rows.slice(0, 8).map((row) => <p key={row} className="rounded-lg bg-forest-50 px-3 py-2 text-sm dark:bg-white/5">{row}</p>)}</div> : <p className="text-sm text-charcoal/60 dark:text-white/60">No linked records returned by spreadsheet.</p>;
}

function numericBody<T extends Record<string, string>>(form: T, numericKeys: Array<keyof T>) {
  const body: Record<string, unknown> = { ...form };
  numericKeys.forEach((key) => {
    body[String(key)] = Number(form[key] || 0);
  });
  return body;
}

function BellIcon() {
  return <Eye className="h-4 w-4" />;
}
