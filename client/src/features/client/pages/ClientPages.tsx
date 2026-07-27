import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, Copy, Download, ExternalLink, FileText, IndianRupee, LifeBuoy, PlusCircle, Printer, UploadCloud, UserCircle, WalletCards } from "lucide-react";
import { useAction, useResource } from "../../../api/queries";
import { ErrorState } from "../../../components/State";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useToast } from "../../../context/ToastContext";
import type { ClientDocument, ClientNotification, Profile, Referral, Transaction, Withdrawal } from "../../../types/domain";
import { formatCurrency, formatDate } from "../../../utils/format";
import {
  ClientButton,
  ClientCard,
  ClientField,
  ClientInput,
  ClientLoading,
  ClientMetric,
  ClientPage,
  ClientStatus,
  ClientTable,
  FileUpload
} from "../ClientComponents";
import type { AccountOverview, Agreement, BankDetails, ClientDashboardData, ClientPreferences, InvestmentPlan, InvestmentRequest, SupportTicket } from "../clientTypes";
import { exportCsv, maskLastFour, profileCompletion, statusText } from "../clientUtils";
import { fallbackFaqs } from "../config/faqs";

const chartColors = ["#08152f", "#153bb7", "#d7ab3d", "#2563eb", "#1e7b54"];
const documentCategories = ["Aadhaar Card", "PAN Card", "Agreement", "Cancelled Cheque", "Address Proof", "Bank Proof", "Investment Receipt", "Tax Document", "Nominee Proof", "Other"];

export function ClientDashboardPage() {
  const { user } = useAuth();
  const dashboard = useResource<ClientDashboardData>("client-dashboard", "/client/dashboard");
  const requests = useResource<InvestmentRequest[]>("client-investment-requests", "/client/investment-requests");
  if (dashboard.isLoading || requests.isLoading) return <ClientLoading label="Loading your dashboard" />;
  if (dashboard.error) return <ErrorState title="Unable to load dashboard" message={dashboard.error instanceof Error ? dashboard.error.message : undefined} />;
  const data = dashboard.data;
  if (!data) return <ErrorState title="Dashboard unavailable" message="The spreadsheet did not return dashboard records." />;
  const pendingRequests = (requests.data ?? []).filter((row) => String(row.status).toLowerCase().includes("pending")).length;
  const allocation = (data.investments ?? []).map((row) => ({ name: row.category || row.plan, value: row.currentValue || row.principalAmount }));
  const growth = (data.recentTransactions ?? []).slice().reverse().map((row) => ({ date: formatDate(row.date), value: row.balance ?? row.credit - row.debit }));
  const client = data.client;

  return (
    <ClientPage title={`Welcome, ${client?.fullName || user?.name || "Investor"}`} eyebrow={client?.clientId || user?.clientId}>
      <ClientCard className="mb-6 overflow-hidden border-white/10 bg-[radial-gradient(circle_at_88%_0%,rgba(215,171,61,0.36),transparent_22rem),radial-gradient(circle_at_12%_12%,rgba(37,99,235,0.38),transparent_24rem),linear-gradient(135deg,#040b1d,#08152f_48%,#0b2f25)] text-white">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {client?.profilePhotoUrl ? <img src={client.profilePhotoUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-white/18 sm:h-20 sm:w-20" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/12 ring-4 ring-white/18 sm:h-20 sm:w-20"><UserCircle className="h-9 w-9 sm:h-10 sm:w-10" /></div>}
            <div className="min-w-0"><p className="text-sm font-bold text-gold-100">Client ID {client?.clientId || user?.clientId}</p><h2 className="mt-1 break-words font-display text-2xl font-extrabold leading-tight sm:text-3xl">{client?.fullName || user?.name}</h2><div className="mt-3 flex flex-wrap gap-2"><ClientStatus value={data.kycStatus || client?.kycStatus} /><ClientStatus value={client?.accountStatus || "active"} /></div></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <QuickAction to="/client/add-investment" label="Add Investment" icon={<PlusCircle className="h-4 w-4" />} />
            <QuickAction to="/client/withdrawals" label="Request Withdrawal" icon={<WalletCards className="h-4 w-4" />} />
            <QuickAction to="/client/documents" label="Upload KYC" icon={<UploadCloud className="h-4 w-4" />} />
            <QuickAction to="/client/documents" label="Documents" icon={<FileText className="h-4 w-4" />} />
            <QuickAction to="/client/transactions" label="Statement" icon={<Download className="h-4 w-4" />} />
            <QuickAction to="/client/support" label="Contact Support" icon={<LifeBuoy className="h-4 w-4" />} />
          </div>
        </div>
      </ClientCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ClientMetric label="Total Invested" value={formatCurrency(data.totalInvestedAmount)} icon={<IndianRupee className="h-5 w-5" />} />
        <ClientMetric label="Portfolio Value" value={formatCurrency(data.currentPortfolioValue)} hint={`${formatCurrency(data.totalReturns)} returns`} icon={<IndianRupee className="h-5 w-5" />} />
        <ClientMetric label="Available Balance" value={formatCurrency(data.availableBalance ?? data.walletBalance)} hint={`${data.pendingWithdrawals} pending withdrawals`} icon={<WalletCards className="h-5 w-5" />} />
        <ClientMetric label="Referral Earnings" value={formatCurrency(data.referralEarnings)} hint={`${pendingRequests} pending investment requests`} icon={<Copy className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ClientCard><SectionTitle title="Investment Growth" subtitle="Based on your transaction ledger" /><ChartBox><AreaChart data={growth}><CartesianGrid strokeDasharray="3 3" stroke="#d6ecde" /><XAxis dataKey="date" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area dataKey="value" type="monotone" stroke="#14583f" fill="#1e7b5433" strokeWidth={3} /></AreaChart></ChartBox></ClientCard>
        <ClientCard><SectionTitle title="Portfolio Allocation" subtitle="Plan/category allocation" /><ChartBox><PieChart><Pie data={allocation} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92}>{allocation.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /></PieChart></ChartBox></ClientCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ClientCard className="xl:col-span-2"><SectionTitle title="Recent Transactions" subtitle="Latest 3 entries from your ledger" /><ClientTable rows={(data.recentTransactions ?? []).slice(0, 3)} pageSize={3} columns={[{ key: "id", header: "ID", render: (row) => row.id }, { key: "date", header: "Date", render: (row) => formatDate(row.date) }, { key: "type", header: "Type", render: (row) => statusText(row.type) }, { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) }, { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) }]} /></ClientCard>
        <ClientCard><SectionTitle title="Notifications" /><div className="grid gap-3">{(data.notifications ?? []).slice(0, 5).map((row) => <div key={row.id} className="rounded-lg bg-forest-50 p-3 dark:bg-white/5"><p className="font-bold">{row.title}</p><p className="mt-1 text-sm text-charcoal/62 dark:text-white/62">{row.message}</p></div>)}</div></ClientCard>
      </div>
    </ClientPage>
  );
}

export function AccountOverviewPage() {
  const overview = useResource<AccountOverview>("client-account-overview", "/client/account-overview");
  if (overview.isLoading) return <ClientLoading label="Loading account overview" />;
  if (overview.error) return <ErrorState title="Account overview unavailable" message={overview.error instanceof Error ? overview.error.message : undefined} />;
  const profile = overview.data?.profile;
  const completion = profileCompletion(profile);
  return <ClientPage title="Account Overview" eyebrow={profile?.clientId}><div className="grid gap-4 md:grid-cols-4"><ClientMetric label="Profile Completion" value={`${completion}%`} hint="Based on available fields" /><ClientMetric label="KYC Status" value={statusText(profile?.kycStatus)} /><ClientMetric label="Risk Profile" value={statusText(profile?.riskProfile)} /><ClientMetric label="Agreement Status" value={statusText(overview.data?.agreementsStatus)} /></div><ClientCard className="mt-6"><div className="h-3 rounded-full bg-forest-100 dark:bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,#14583f,#d7ab3d)]" style={{ width: `${completion}%` }} /></div></ClientCard><div className="mt-6 grid gap-6 lg:grid-cols-2"><ClientCard><SectionTitle title="Basic Account Details" /><DetailGrid data={profile} masked /></ClientCard><ClientCard><SectionTitle title="Consolidated Summary" /><DetailGrid data={overview.data as unknown as Record<string, unknown>} /></ClientCard></div></ClientPage>;
}

export function BankDetailsPage() {
  const bank = useResource<BankDetails | null>("client-bank", "/client/bank-details");
  const mutation = useAction<BankDetails>(["client-bank"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ accountHolderName: "", bankName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "", branch: "", accountType: "Savings", upiId: "", remarks: "" });
  if (bank.isLoading) return <ClientLoading label="Loading bank details" />;
  if (bank.error) return <ErrorState title="Bank details unavailable" message={bank.error instanceof Error ? bank.error.message : undefined} />;
  const verified = String(bank.data?.verificationStatus ?? "").toLowerCase().includes("verified");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Submit bank details for verification?")) return;
    await mutation.mutateAsync({ method: verified ? "post" : "put", url: verified ? "/client/bank-change-requests" : "/client/bank-details", body: form });
    toast({ title: verified ? "Bank change request submitted" : "Bank details submitted", type: "success" });
  }
  return <ClientPage title="Bank Details"><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><ClientCard><SectionTitle title="Verified Display" /><Info label="Account Holder" value={bank.data?.accountHolderName} /><Info label="Bank" value={bank.data?.bankName} /><Info label="Account" value={maskLastFour(bank.data?.accountNumber)} /><Info label="IFSC" value={bank.data?.ifsc} /><Info label="Branch" value={bank.data?.branch} /><Info label="Verification" value={<ClientStatus value={bank.data?.verificationStatus} />} /><Info label="Admin Remarks" value={bank.data?.adminRemarks} /></ClientCard><ClientCard><SectionTitle title={verified ? "Request Bank Change" : "Update Bank Details"} /><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><BankFields form={form} setForm={(value) => setForm(value as typeof form)} /><ClientField label="Action"><ClientButton type="submit" disabled={mutation.isPending}>{verified ? "Submit Change Request" : "Save Details"}</ClientButton></ClientField></form><div className="mt-5"><FileUpload label="Upload cancelled cheque or bank proof" category="Bank Proof" endpoint="/client/documents/upload" /></div></ClientCard></div></ClientPage>;
}

export function ClientTransactionsPage() {
  const transactions = useResource<Transaction[]>("client-transactions", "/client/transactions");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  if (transactions.isLoading) return <ClientLoading label="Loading passbook" />;
  if (transactions.error) return <ErrorState title="Transactions unavailable" message={transactions.error instanceof Error ? transactions.error.message : undefined} />;
  const allRows = (transactions.data ?? []).slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  const types = Array.from(new Set(allRows.map((row) => row.type).filter(Boolean))).sort();
  const statuses = Array.from(new Set(allRows.map((row) => row.status).filter(Boolean))).sort();
  const rows = allRows.filter((row) => {
    const date = String(row.date ?? "");
    if (typeFilter && row.type !== typeFilter) return false;
    if (statusFilter && row.status !== statusFilter) return false;
    if (fromDate && date && date < fromDate) return false;
    if (toDate && date && date > toDate) return false;
    return true;
  });
  const selectClass = "rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5";
  return <ClientPage title="Transactions" actions={<><ClientButton tone="secondary" onClick={() => exportCsv("client-transactions.csv", rows as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" /> CSV</ClientButton><ClientButton tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</ClientButton></>}><ClientCard className="mb-5"><SectionTitle title="Filters" subtitle="Filter by type, status, and transaction date" /><div className="grid gap-3 md:grid-cols-4"><ClientField label="Type"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}><option value="">All types</option>{types.map((type) => <option key={type} value={type}>{statusText(type)}</option>)}</select></ClientField><ClientField label="Status"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{statusText(status)}</option>)}</select></ClientField><ClientField label="From Date"><ClientInput type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></ClientField><ClientField label="To Date"><ClientInput type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></ClientField></div><div className="mt-4"><ClientButton tone="secondary" onClick={() => { setTypeFilter(""); setStatusFilter(""); setFromDate(""); setToDate(""); }}>Clear Filters</ClientButton></div></ClientCard><ClientCard><ClientTable rows={rows} columns={[{ key: "id", header: "Transaction ID", render: (row) => row.id }, { key: "date", header: "Date", render: (row) => formatDate(row.date) }, { key: "type", header: "Type", render: (row) => statusText(row.type) }, { key: "description", header: "Description", render: (row) => row.description }, { key: "credit", header: "Credit", render: (row) => formatCurrency(row.credit) }, { key: "debit", header: "Debit", render: (row) => formatCurrency(row.debit) }, { key: "balance", header: "Balance", render: (row) => formatCurrency(row.balance) }, { key: "reference", header: "Reference", render: (row) => row.reference }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }]} /></ClientCard></ClientPage>;
}

export function AddInvestmentPage() {
  const plans = useResource<InvestmentPlan[]>("client-investment-plans", "/client/investment-plans");
  const requests = useResource<InvestmentRequest[]>("client-investment-requests", "/client/investment-requests");
  const mutation = useAction<InvestmentRequest>(["client-investment-requests", "client-dashboard"]);
  const { toast } = useToast();
  const [selected, setSelected] = useState<InvestmentPlan>();
  const [form, setForm] = useState({ amount: "", paymentMode: "Bank Transfer", paymentReference: "", paymentDate: "", paymentProofUrl: "", termsAccepted: false });
  if (plans.isLoading || requests.isLoading) return <ClientLoading label="Loading investment plans" />;
  if (plans.error) return <ErrorState title="Investment plans unavailable" message={plans.error instanceof Error ? plans.error.message : undefined} />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await mutation.mutateAsync({ method: "post", url: "/client/investment-requests", body: { ...form, amount: Number(form.amount), planId: selected.id, planName: selected.planName } });
    toast({ title: "Investment request submitted", message: "Status is Pending until admin approval.", type: "success" });
  }
  return <ClientPage title="Add Investment" eyebrow="Create a pending investment request"><div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]"><div className="grid gap-4 md:grid-cols-2">{(plans.data ?? []).map((plan) => <ClientCard key={plan.id} className={selected?.id === plan.id ? "ring-2 ring-gold-400" : ""}><h2 className="font-display text-xl font-extrabold text-forest-950 dark:text-ivory">{plan.planName}</h2><p className="mt-2 text-sm text-charcoal/62 dark:text-white/62">{plan.description}</p><div className="mt-4 grid gap-2 text-sm"><Info label="Category" value={plan.category} /><Info label="ROI" value={plan.returnRate ? `${plan.returnRate}%` : undefined} /><Info label="Duration" value={plan.duration} /><Info label="Min" value={formatCurrency(plan.minimumAmount)} /></div>{plan.termsUrl && <a href={plan.termsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700 dark:text-gold-100">Terms <ExternalLink className="h-4 w-4" /></a>}<div className="mt-4"><ClientButton onClick={() => setSelected(plan)}>Select Plan</ClientButton></div></ClientCard>)}</div><ClientCard><SectionTitle title="Submit Request" /><form onSubmit={submit} className="grid gap-3"><Info label="Selected Plan" value={selected?.planName} /><ClientField label="Amount"><ClientInput required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></ClientField><ClientField label="Payment Mode"><ClientInput value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} /></ClientField><ClientField label="Payment Reference"><ClientInput required value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} /></ClientField><ClientField label="Payment Date"><ClientInput required type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></ClientField><FileUpload label="Upload payment proof" category="Payment Proof" endpoint="/client/documents/upload" onUploaded={(data) => setForm({ ...form, paymentProofUrl: String((data as { fileUrl?: string })?.fileUrl ?? "") })} /><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} /> I accept the plan terms</label><ClientButton type="submit" disabled={!selected || !form.termsAccepted || mutation.isPending}>Submit Pending Request</ClientButton></form><SectionTitle title="Request History" /><ClientTable rows={requests.data ?? []} pageSize={4} columns={[{ key: "id", header: "Request", render: (row) => row.requestId }, { key: "plan", header: "Plan", render: (row) => row.planName }, { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }]} /></ClientCard></div></ClientPage>;
}

export function ClientWithdrawalsPage() {
  const dashboard = useResource<ClientDashboardData>("client-dashboard", "/client/dashboard");
  const withdrawals = useResource<Withdrawal[]>("client-withdrawals", "/client/withdrawals");
  const mutation = useAction<Withdrawal>(["client-withdrawals", "client-dashboard"]);
  const { toast } = useToast();
  const [tab, setTab] = useState<"history" | "new">("history");
  const [form, setForm] = useState({ amount: "", bankAccount: "", remarks: "", declaration: false });
  if (dashboard.isLoading || withdrawals.isLoading) return <ClientLoading label="Loading withdrawals" />;
  if (withdrawals.error) return <ErrorState title="Withdrawals unavailable" message={withdrawals.error instanceof Error ? withdrawals.error.message : undefined} />;
  const eligible = dashboard.data?.availableBalance ?? dashboard.data?.walletBalance ?? 0;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (Number(form.amount) > eligible) { toast({ title: "Amount exceeds eligible balance", type: "error" }); return; }
    if (!window.confirm("Submit withdrawal request?")) return;
    await mutation.mutateAsync({ method: "post", url: "/client/withdrawals", body: { amount: Number(form.amount), bankAccount: form.bankAccount, remarks: form.remarks } });
    toast({ title: "Withdrawal request submitted", type: "success" });
  }
  async function cancel(id: string) {
    await mutation.mutateAsync({ method: "put", url: `/client/withdrawals/${id}/cancel`, body: { remarks: "Cancelled by client" } });
    toast({ title: "Withdrawal cancelled", type: "success" });
  }
  return <ClientPage title="Withdrawals"><div className="mb-4 flex gap-2"><ClientButton tone={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>History</ClientButton><ClientButton tone={tab === "new" ? "primary" : "secondary"} onClick={() => setTab("new")}>New Request</ClientButton></div>{tab === "history" ? <ClientCard><ClientTable rows={withdrawals.data ?? []} columns={[{ key: "id", header: "Withdrawal ID", render: (row) => row.id }, { key: "date", header: "Request Date", render: (row) => formatDate(row.requestDate) }, { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) }, { key: "bank", header: "Bank", render: (row) => maskLastFour(row.bankAccount) }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }, { key: "approval", header: "Approval", render: (row) => formatDate(row.approvalDate) }, { key: "reference", header: "Payment Ref", render: (row) => row.paymentReference }, { key: "remarks", header: "Admin Remarks", render: (row) => row.adminRemarks }, { key: "action", header: "Action", render: (row) => row.status === "pending" ? <ClientButton tone="danger" onClick={() => cancel(row.id)}>Cancel</ClientButton> : "Locked" }]} /></ClientCard> : <ClientCard><ClientMetric label="Eligible Balance" value={formatCurrency(eligible)} /><form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2"><ClientField label="Requested Amount"><ClientInput required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></ClientField><ClientField label="Verified Bank Account"><ClientInput required value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></ClientField><ClientField label="Remarks"><ClientInput value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></ClientField><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.declaration} onChange={(e) => setForm({ ...form, declaration: e.target.checked })} /> I confirm this withdrawal request.</label><ClientButton type="submit" disabled={!form.declaration || mutation.isPending}>Submit Request</ClientButton></form></ClientCard>}</ClientPage>;
}

export function AgreementsPage() {
  const agreements = useResource<Agreement[]>("client-agreements", "/client/agreements");
  if (agreements.isLoading) return <ClientLoading label="Loading agreements" />;
  if (agreements.error) return <ErrorState title="Agreements unavailable" message={agreements.error instanceof Error ? agreements.error.message : undefined} />;
  return <ClientPage title="Agreements"><ClientCard><ClientTable rows={agreements.data ?? []} columns={[{ key: "id", header: "Agreement", render: (row) => row.agreementId }, { key: "investment", header: "Investment", render: (row) => row.investmentId }, { key: "name", header: "Name", render: (row) => row.agreementName }, { key: "type", header: "Type", render: (row) => row.agreementType }, { key: "issue", header: "Issue", render: (row) => formatDate(row.issueDate) }, { key: "signing", header: "Signing", render: (row) => <ClientStatus value={row.signingStatus} /> }, { key: "document", header: "Document", render: (row) => <ClientStatus value={row.documentStatus} /> }, { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2">{row.driveUrl && <a href={row.driveUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-forest-100 px-3 py-2 text-sm font-bold dark:border-white/10">Open</a>}<FileUpload label="Signed file" category="Signed Agreement" recordId={row.agreementId} endpoint={`/client/agreements/${row.agreementId}/upload-signed`} /></div> }]} /></ClientCard></ClientPage>;
}

export function ClientDocumentsPage() {
  const documents = useResource<ClientDocument[]>("client-documents", "/client/documents");
  const mutation = useAction<ClientDocument>(["client-documents"]);
  const { toast } = useToast();
  const [category, setCategory] = useState("Aadhaar Card");
  const [categoryFilter, setCategoryFilter] = useState("");
  if (documents.isLoading) return <ClientLoading label="Loading documents" />;
  if (documents.error) return <ErrorState title="Documents unavailable" message={documents.error instanceof Error ? documents.error.message : undefined} />;
  async function archive(id: string) { await mutation.mutateAsync({ method: "delete", url: `/client/documents/${id}` }); toast({ title: "Document archived", type: "success" }); }
  const rows = (documents.data ?? []).filter((row) => !categoryFilter || row.type === categoryFilter || row.name === categoryFilter);
  const selectClass = "rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5";
  return <ClientPage title="Documents" eyebrow="Upload and download client documents"><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><ClientCard><SectionTitle title="Upload Document" subtitle="Choose the document type before uploading" /><ClientField label="Document Type"><select value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>{documentCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></ClientField><div className="mt-4"><FileUpload label={`Upload ${category}`} category={category} endpoint="/client/documents/upload" onUploaded={() => void documents.refetch()} /></div></ClientCard><ClientCard><SectionTitle title="Required Documents" subtitle="Common client records stored in Google Drive" /><div className="grid gap-3 sm:grid-cols-2">{["Aadhaar Card", "PAN Card", "Agreement", "Cancelled Cheque"].map((item) => <button key={item} onClick={() => setCategory(item)} className="rounded-lg border border-forest-100 bg-forest-50 p-4 text-left text-sm font-bold text-forest-950 hover:border-gold-300 dark:border-white/10 dark:bg-white/5 dark:text-ivory">{item}<span className="mt-1 block text-xs font-semibold text-charcoal/58 dark:text-white/58">Select for upload</span></button>)}</div></ClientCard></div><ClientCard className="mt-6"><div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end"><SectionTitle title="Uploaded Documents" subtitle="Open or download available Google Drive files" /><ClientField label="Filter Category"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass}><option value="">All documents</option>{documentCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></ClientField></div><ClientTable rows={rows} columns={[{ key: "id", header: "Document ID", render: (row) => row.id }, { key: "name", header: "Name", render: (row) => row.name }, { key: "type", header: "Category", render: (row) => row.type }, { key: "date", header: "Upload", render: (row) => formatDate(row.uploadDate) }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }, { key: "actions", header: "Open / Download", render: (row) => <div className="flex flex-wrap gap-2">{row.driveUrl ? <><a href={row.driveUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-forest-100 px-3 py-2 text-sm font-bold dark:border-white/10">Open</a><a href={row.driveUrl} target="_blank" rel="noreferrer" download className="rounded-lg bg-forest-700 px-3 py-2 text-sm font-bold text-white">Download</a></> : "Not available"}{String(row.status).toLowerCase() !== "verified" ? <ClientButton tone="danger" onClick={() => archive(row.id)}>Archive</ClientButton> : <ClientStatus value="Verified" />}</div> }]} /></ClientCard></ClientPage>;
}

export function ClientProfilePage() {
  const profile = useResource<Profile>("client-profile", "/client/profile");
  const mutation = useAction<Profile>(["profile", "client-profile"]);
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  if (profile.isLoading) return <ClientLoading label="Loading profile" />;
  if (profile.error) return <ErrorState title="Profile unavailable" message={profile.error instanceof Error ? profile.error.message : undefined} />;
  const data = profile.data;
  async function submit(event: FormEvent) { event.preventDefault(); await mutation.mutateAsync({ method: "put", url: "/client/profile", body: form }); toast({ title: "Profile update submitted", type: "success" }); }
  return <ClientPage title="Profile" eyebrow={data?.clientId}><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><ClientCard><div className="flex items-center gap-4">{data?.profilePhotoUrl ? <img src={data.profilePhotoUrl} alt="" className="h-24 w-24 rounded-full object-cover" /> : <UserCircle className="h-24 w-24 text-forest-700" />}<div><h2 className="font-display text-2xl font-extrabold">{data?.fullName}</h2><p className="text-sm text-charcoal/62 dark:text-white/62">{data?.clientId}</p><ClientStatus value={data?.kycStatus} /></div></div><div className="mt-5"><FileUpload label="Upload profile photo" category="Profile" endpoint="/client/profile/photo" /></div></ClientCard><ClientCard><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><EditableProfileFields data={data} form={form} setForm={setForm} /><ClientField label="Action"><ClientButton type="submit" disabled={mutation.isPending}>Save Editable Fields</ClientButton></ClientField></form></ClientCard></div></ClientPage>;
}

export function ClientNotificationsPage() {
  const notifications = useResource<ClientNotification[]>("client-notifications", "/notifications");
  const mutation = useAction<ClientNotification>(["client-notifications"]);
  const { toast } = useToast();
  if (notifications.isLoading) return <ClientLoading label="Loading notifications" />;
  if (notifications.error) return <ErrorState title="Notifications unavailable" message={notifications.error instanceof Error ? notifications.error.message : undefined} />;
  async function markRead(id: string) {
    await mutation.mutateAsync({ method: "put", url: `/notifications/${id}/read` });
    toast({ title: "Notification marked as read", type: "success" });
  }
  async function markAllRead() {
    await mutation.mutateAsync({ method: "put", url: "/notifications/read-all" });
    toast({ title: "All notifications marked as read", type: "success" });
  }
  const rows = notifications.data ?? [];
  return (
    <ClientPage title="Notifications" actions={<ClientButton tone="secondary" onClick={markAllRead}><Bell className="h-4 w-4" /> Mark all read</ClientButton>}>
      <ClientCard>
        <ClientTable rows={rows} columns={[
          { key: "title", header: "Title", render: (row) => row.title },
          { key: "message", header: "Message", render: (row) => row.message },
          { key: "date", header: "Date", render: (row) => formatDate(row.date) },
          { key: "type", header: "Type", render: (row) => statusText(row.type) },
          { key: "priority", header: "Priority", render: (row) => <ClientStatus value={row.priority} /> },
          { key: "read", header: "Read", render: (row) => <ClientStatus value={row.read ? "read" : "unread"} /> },
          { key: "action", header: "Action", render: (row) => row.read ? "Done" : <ClientButton onClick={() => markRead(row.id)}>Mark Read</ClientButton> }
        ]} />
      </ClientCard>
    </ClientPage>
  );
}

export function ClientReferralsPage() {
  const referrals = useResource<Referral[]>("client-referrals", "/client/referrals");
  const { toast } = useToast();
  if (referrals.isLoading) return <ClientLoading label="Loading referrals" />;
  if (referrals.error) return <ErrorState title="Referrals unavailable" message={referrals.error instanceof Error ? referrals.error.message : undefined} />;
  const rows = referrals.data ?? [];
  const code = rows.find((row) => row.code)?.code ?? "Not available";
  const reward = rows.reduce((sum, row) => sum + row.rewardAmount, 0);
  const paid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  return <ClientPage title="Referrals"><div className="grid gap-4 md:grid-cols-4"><ClientMetric label="Referral Code" value={code} /><ClientMetric label="Total Referrals" value={String(rows.length)} /><ClientMetric label="Pending Rewards" value={formatCurrency(reward - paid)} /><ClientMetric label="Paid Rewards" value={formatCurrency(paid)} /></div><ClientCard className="mt-6"><ClientButton onClick={() => { void navigator.clipboard?.writeText(code); toast({ title: "Referral code copied" }); }}><Copy className="h-4 w-4" /> Copy Code</ClientButton><ClientTable rows={rows} columns={[{ key: "id", header: "Referral ID", render: (row) => row.id }, { key: "person", header: "Referred Person", render: (row) => row.referredClientName || row.referredClientId }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }, { key: "reward", header: "Reward", render: (row) => formatCurrency(row.rewardAmount) }, { key: "paid", header: "Paid", render: (row) => formatCurrency(row.paidAmount) }]} /></ClientCard></ClientPage>;
}

export function FaqPage() {
  const faqs = useResource<typeof fallbackFaqs>("client-faqs", "/client/faqs");
  const [search, setSearch] = useState("");
  const rows = (faqs.data?.length ? faqs.data : fallbackFaqs).filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  return <ClientPage title="FAQ"><ClientCard><ClientInput placeholder="Search FAQ" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="mt-4 grid gap-3">{rows.map((row) => <details key={row.id} className="rounded-lg border border-forest-100 bg-forest-50 p-4 dark:border-white/10 dark:bg-white/5"><summary className="cursor-pointer font-bold text-forest-950 dark:text-ivory">{row.question}</summary><p className="mt-3 text-sm text-charcoal/68 dark:text-white/68">{row.answer}</p><p className="mt-2 text-xs font-bold text-gold-700 dark:text-gold-100">{row.category}</p></details>)}</div></ClientCard></ClientPage>;
}

export function HelpSupportPage() {
  const support = useResource<SupportTicket[]>("client-support", "/client/support");
  const settings = useResource<Record<string, string>>("client-public-settings", "/settings");
  const mutation = useAction<SupportTicket>(["client-support"]);
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: "", category: "Account", priority: "normal" as "low" | "normal" | "high", message: "", attachmentUrl: "" });
  if (support.isLoading) return <ClientLoading label="Loading support" />;
  if (support.error) return <ErrorState title="Support unavailable" message={support.error instanceof Error ? support.error.message : undefined} />;
  async function submit(event: FormEvent) { event.preventDefault(); await mutation.mutateAsync({ method: "post", url: "/client/support", body: form }); toast({ title: "Support ticket created", type: "success" }); }
  return <ClientPage title="Help & Support"><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><ClientCard><SectionTitle title="Contact" /><Info label="Phone" value={settings.data?.supportPhone || settings.data?.SUPPORT_PHONE} /><Info label="Email" value={settings.data?.supportEmail || settings.data?.SUPPORT_EMAIL} /><Info label="WhatsApp" value={settings.data?.supportWhatsapp || settings.data?.SUPPORT_WHATSAPP_URL} /><Info label="Business Hours" value={settings.data?.businessHours || "As configured by Kalpavruksha Wealth"} /></ClientCard><ClientCard><SectionTitle title="Create Ticket" /><form onSubmit={submit} className="grid gap-3"><ClientField label="Subject"><ClientInput required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></ClientField><ClientField label="Category"><ClientInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></ClientField><ClientField label="Message"><ClientInput required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></ClientField><FileUpload label="Optional support attachment" category="Support" endpoint="/client/documents/upload" onUploaded={(data) => setForm({ ...form, attachmentUrl: String((data as { fileUrl?: string })?.fileUrl ?? "") })} /><ClientButton type="submit" disabled={mutation.isPending}>Submit Ticket</ClientButton></form></ClientCard></div><ClientCard className="mt-6"><SectionTitle title="Ticket History" /><ClientTable rows={support.data ?? []} columns={[{ key: "id", header: "Ticket", render: (row) => row.ticketId }, { key: "subject", header: "Subject", render: (row) => row.subject }, { key: "priority", header: "Priority", render: (row) => <ClientStatus value={row.priority} /> }, { key: "status", header: "Status", render: (row) => <ClientStatus value={row.status} /> }, { key: "response", header: "Admin Response", render: (row) => row.adminResponse }]} /></ClientCard></ClientPage>;
}

export function ClientSettingsPage() {
  const prefs = useResource<ClientPreferences>("client-preferences", "/client/settings");
  const mutation = useAction<ClientPreferences>(["client-preferences"]);
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [form, setForm] = useState<ClientPreferences>({});
  if (prefs.isLoading) return <ClientLoading label="Loading preferences" />;
  if (prefs.error) return <ErrorState title="Settings unavailable" message={prefs.error instanceof Error ? prefs.error.message : undefined} />;
  const current = { ...prefs.data, ...form };
  async function save() { await mutation.mutateAsync({ method: "put", url: "/client/settings", body: current as Record<string, unknown> }); toast({ title: "Preferences saved", type: "success" }); }
  return <ClientPage title="Settings"><div className="grid gap-6 xl:grid-cols-2"><ClientCard><SectionTitle title="Visual Preferences" /><Info label="Theme" value={theme} /><ClientButton onClick={toggleTheme}>Toggle Theme</ClientButton></ClientCard><ClientCard><SectionTitle title="Notification Preferences" /><Toggle label="Email Notifications" checked={!!current.emailNotifications} onChange={(value) => setForm({ ...form, emailNotifications: value })} /><Toggle label="SMS Notifications" checked={!!current.smsNotifications} onChange={(value) => setForm({ ...form, smsNotifications: value })} /><Toggle label="WhatsApp Notifications" checked={!!current.whatsappNotifications} onChange={(value) => setForm({ ...form, whatsappNotifications: value })} /><ClientField label="Preferred Language"><ClientInput value={current.preferredLanguage ?? "English"} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })} /></ClientField><div className="mt-4 flex gap-2"><ClientButton onClick={save}>Save Preferences</ClientButton><ClientButton tone="danger" onClick={() => void logout()}>Logout Current Session</ClientButton></div></ClientCard></div></ClientPage>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-100">Portfolio intelligence</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-navy-900 dark:text-ivory">{title}</h2>{subtitle && <p className="mt-1 text-sm text-charcoal/58 dark:text-white/58">{subtitle}</p>}</div>;
}

function ChartBox({ children }: { children: ReactElement }) {
  return <div className="h-60 sm:h-72"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function QuickAction({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return <Link to={to} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18 hover:shadow-[0_16px_38px_rgba(0,0,0,0.18)]">{icon}{label}</Link>;
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="flex flex-col gap-1 border-b border-forest-100 py-2 text-sm last:border-0 dark:border-white/10 sm:flex-row sm:justify-between sm:gap-3"><dt className="text-charcoal/58 dark:text-white/58">{label}</dt><dd className="min-w-0 break-words font-bold text-forest-950 dark:text-ivory sm:text-right">{value ?? "Not available"}</dd></div>;
}

function DetailGrid({ data, masked = false }: { data?: Record<string, unknown>; masked?: boolean }) {
  if (!data) return <p className="text-sm text-charcoal/60 dark:text-white/60">No details returned by spreadsheet.</p>;
  return <div className="grid gap-2">{Object.entries(data).map(([key, value]) => <Info key={key} label={statusText(key)} value={masked && /aadhaar|account/i.test(key) ? maskLastFour(String(value ?? "")) : String(value ?? "Not available")} />)}</div>;
}

function BankFields({ form, setForm }: { form: Record<string, string>; setForm: (value: Record<string, string>) => void }) {
  return <><ClientField label="Account Holder"><ClientInput required value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></ClientField><ClientField label="Bank Name"><ClientInput required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></ClientField><ClientField label="Account Number"><ClientInput required value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></ClientField><ClientField label="Confirm Account Number"><ClientInput required value={form.confirmAccountNumber} onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })} /></ClientField><ClientField label="IFSC"><ClientInput required value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} /></ClientField><ClientField label="Branch"><ClientInput required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></ClientField><ClientField label="Account Type"><ClientInput value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} /></ClientField><ClientField label="UPI ID"><ClientInput value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></ClientField></>;
}

function EditableProfileFields({ data, form, setForm }: { data?: Profile; form: Record<string, string>; setForm: (value: Record<string, string>) => void }) {
  const fields = ["mobile", "email", "address", "bankAccount", "ifsc", "branch", "nomineeName", "nomineeRelationship", "nomineeMobile", "riskProfile"];
  return <>{fields.map((field) => <ClientField key={field} label={statusText(field)}><ClientInput value={form[field] ?? String((data as unknown as Record<string, unknown>)?.[field] ?? "")} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></ClientField>)}</>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="mb-3 flex items-center justify-between gap-4 rounded-lg border border-forest-100 p-3 text-sm font-bold dark:border-white/10"><span className="min-w-0">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
