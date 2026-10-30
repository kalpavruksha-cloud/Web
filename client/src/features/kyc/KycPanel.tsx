import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff, RefreshCw, RotateCcw, Save, ShieldCheck, XCircle } from "lucide-react";
import { getData, sendData } from "../../api/client";
import { Card } from "../../components/Card";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, LoadingState } from "../../components/State";
import { kycDetailsSchema } from "../../schemas/kyc";
import type { KycRecord } from "../../types/kyc";
import { formatDate } from "../../utils/format";

const inputClass = "w-full min-w-0 rounded-lg border border-forest-100 bg-white px-3 py-3 text-sm text-charcoal disabled:bg-forest-50 disabled:text-charcoal/70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/5";
const relatedViews = ["admin-overview", "admin-clients", "clients", "profile", "client-profile", "client-dashboard", "dashboard", "client-documents", "admin-documents", "documents"];

function safeDriveUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && ["drive.google.com", "docs.google.com"].includes(url.hostname) ? url.href : undefined; } catch { return undefined; }
}

export function KycPanel({ clientId, admin = false }: { clientId: string; admin?: boolean }) {
  const queryClient = useQueryClient();
  const path = admin ? `/clients/${encodeURIComponent(clientId)}/kyc` : "/client/kyc";
  const key = ["kyc", admin ? "admin" : "client", clientId];
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => getData<KycRecord>(path, undefined, signal), staleTime: 15_000, gcTime: 0, refetchInterval: 60_000, refetchIntervalInBackground: false, refetchOnWindowFocus: true, retry: false });
  const [form, setForm] = useState<{ pan?: string; aadhaar?: string }>({});
  const [editRevision, setEditRevision] = useState<string>();
  const [reviewRevision, setReviewRevision] = useState<string>();
  const lastRevision = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [panDocumentId, setPanDocumentId] = useState("");
  const [aadhaarDocumentId, setAadhaarDocumentId] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState<"verified" | "rejected" | "pending">();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const mutation = useMutation({
    mutationFn: ({ review, body }: { review?: boolean; body: Record<string, unknown> }) => sendData<KycRecord>("put", review ? `${path}/review` : path, body),
    onSuccess(data) {
      if (!mounted.current) return;
      lastRevision.current = data.revision;
      queryClient.setQueryData(key, data);
      relatedViews.forEach((name) => void queryClient.invalidateQueries({ queryKey: [name] }));
      setForm({}); setEditRevision(undefined); setReviewRevision(undefined); setShowAadhaar(false); setDecision(undefined); setReviewed(false);
    },
    onError() { if (mounted.current) void queryClient.invalidateQueries({ queryKey: key }); }
  });
  useEffect(() => {
    const revision = query.data?.revision;
    if (revision && lastRevision.current && revision !== lastRevision.current) relatedViews.forEach((name) => void queryClient.invalidateQueries({ queryKey: [name] }));
    lastRevision.current = revision;
  }, [query.data?.revision, queryClient]);

  if (query.isPending) return <LoadingState label="Loading KYC details" />;
  if (!query.data) return <div><ErrorState title="KYC details unavailable" message={query.error instanceof Error ? query.error.message : "The KYC record could not be loaded."} /><button type="button" onClick={() => void query.refetch()} className="kv-button-secondary mt-3 inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Retry KYC</button></div>;
  const data = query.data;
  if (data.clientId.trim().toLowerCase() !== clientId.trim().toLowerCase()) return <ErrorState title="KYC record mismatch" message="The returned KYC record does not belong to this client." />;
  const locked = data.status === "verified";
  const staleEdit = (!!editRevision && editRevision !== data.revision) || (!!reviewRevision && reviewRevision !== data.revision);
  const disabled = mutation.isPending || query.isFetching || !!query.error || staleEdit;
  const pan = form.pan ?? data.pan;
  const aadhaar = form.aadhaar ?? (admin ? data.aadhaar ?? "" : "");
  const prefix = admin ? "admin-kyc" : "client-kyc";
  const change = (field: "pan" | "aadhaar", value: string) => { setEditRevision((previous) => previous ?? data.revision); setForm((previous) => ({ ...previous, [field]: value })); setMessage(undefined); setError(undefined); };
  const touchReview = () => setReviewRevision((previous) => previous ?? data.revision);

  async function save(event: FormEvent) {
    event.preventDefault(); setError(undefined); setMessage(undefined);
    const parsed = kycDetailsSchema.safeParse({ pan, ...(aadhaar.trim() ? { aadhaar } : {}) });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(". ")); return; }
    if (!data.aadhaarConfigured && !parsed.data.aadhaar) { setError("Enter your 12-digit Aadhaar number"); return; }
    try { await mutation.mutateAsync({ body: { ...parsed.data, expectedRevision: editRevision ?? data.revision } }); if (mounted.current) setMessage("KYC details submitted for admin review."); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "KYC details could not be saved"); }
  }

  function askReview(next: "verified" | "rejected" | "pending") {
    setError(undefined); setMessage(undefined);
    if (Object.keys(form).length) { setError("Save or discard your identity-number edits before reviewing KYC."); return; }
    if (next === "verified" && (!panDocumentId || !aadhaarDocumentId || !reviewed)) { setError("Select PAN and Aadhaar documents and confirm they have been reviewed."); return; }
    if (next !== "verified" && !remarks.trim()) { setError("Enter a review reason."); return; }
    setReviewRevision((previous) => previous ?? data.revision); setDecision(next);
  }

  async function confirmReview() {
    if (!decision) return;
    try {
      await mutation.mutateAsync({ review: true, body: { decision, expectedRevision: reviewRevision ?? data.revision, remarks, panDocumentId, aadhaarDocumentId, confirmDocumentsReviewed: reviewed } });
      if (mounted.current) setMessage(decision === "verified" ? "KYC verified and saved." : decision === "rejected" ? "KYC rejected with review remarks." : "KYC reopened for correction.");
    } catch (failure) { if (mounted.current) { setError(failure instanceof Error ? failure.message : "KYC review failed"); setDecision(undefined); } }
  }

  return <Card className="mt-6" ><div id={admin ? "kyc-review" : "kyc-details"} className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-bold text-navy-900 dark:text-ivory">{admin ? "KYC Verification" : "PAN & Aadhaar Details"}</h2><p className="mt-2 text-sm text-charcoal/70 dark:text-white/70">{data.status.replace(/_/g, " ")}{data.verificationDate ? ` - ${formatDate(data.verificationDate)}` : ""}{data.verifiedBy ? ` - ${data.verifiedBy}` : ""}</p></div>
    <button type="button" disabled={mutation.isPending || query.isFetching} onClick={() => { setForm({}); setEditRevision(undefined); setReviewRevision(undefined); setDecision(undefined); setReviewed(false); void query.refetch(); }} title="Reload KYC record" aria-label="Reload KYC record" className="kv-button-secondary inline-flex h-11 w-11 items-center justify-center p-0 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>
  </div>
    {query.error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">The latest KYC record could not be loaded. Review is disabled until it reloads.</p>}
    {staleEdit && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">This record changed while you were editing. Reload KYC before submitting again.</p>}
    {data.remarks && <p className="mt-4 break-words border-l-2 border-gold-400 pl-3 text-sm text-charcoal/80 dark:text-white/80"><strong>Review remarks: </strong>{data.remarks}</p>}
    {error && <p role="alert" className="mt-4 break-words text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="mt-4 text-sm font-semibold text-forest-800 dark:text-emerald-200">{message}</p>}
    <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label htmlFor={`${prefix}-pan`} className="mb-2 block text-sm font-bold">PAN number</label><input id={`${prefix}-pan`} value={pan} onChange={(event) => change("pan", event.target.value.toUpperCase())} maxLength={10} autoComplete="off" spellCheck={false} disabled={locked || mutation.isPending || !!decision} className={inputClass} /></div>
      <div><label htmlFor={`${prefix}-aadhaar`} className="mb-2 block text-sm font-bold">{data.aadhaarConfigured && !admin ? "Replace Aadhaar number" : "Aadhaar number"}</label><div className="relative"><input id={`${prefix}-aadhaar`} value={locked && !admin ? `XXXX XXXX ${data.aadhaarLast4}` : aadhaar} onChange={(event) => change("aadhaar", event.target.value)} type={locked && !admin || showAadhaar ? "text" : "password"} inputMode="numeric" maxLength={14} autoComplete="off" disabled={locked || mutation.isPending || !!decision} className={`${inputClass} pr-14`} />{(!locked || admin) && <button type="button" aria-label={showAadhaar ? "Hide Aadhaar number" : "Show Aadhaar number"} title={showAadhaar ? "Hide Aadhaar number" : "Show Aadhaar number"} aria-pressed={showAadhaar} onClick={() => setShowAadhaar((previous) => !previous)} className="absolute inset-y-0 right-1 my-auto flex h-11 w-11 items-center justify-center rounded-lg">{showAadhaar ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}</button>}</div>{data.aadhaarLast4 && <p className="mt-2 text-xs text-charcoal/70 dark:text-white/70">Saved Aadhaar: XXXX XXXX {data.aadhaarLast4}</p>}</div>
      {!locked && <div className="sm:col-span-2"><button type="submit" disabled={disabled || !!decision} className="kv-button-primary inline-flex min-h-11 items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{mutation.isPending ? "Saving..." : "Submit KYC Details"}</button></div>}
      {locked && <p className="text-sm text-forest-800 dark:text-emerald-200 sm:col-span-2">Verified identity details are read-only. An administrator must reopen KYC before corrections.</p>}
    </form>
    {admin && <div className="mt-6 border-t border-forest-100 pt-5 dark:border-white/10"><h3 className="font-bold">Admin Review</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {([ ["pan", "PAN document", panDocumentId || data.panDocumentId, setPanDocumentId], ["aadhaar", "Aadhaar document", aadhaarDocumentId || data.aadhaarDocumentId, setAadhaarDocumentId] ] as const).map(([kind, label, selected, setSelected]) => <div key={kind}>
          <label htmlFor={`${prefix}-${kind}-document`} className="mb-2 block text-sm font-bold">{label}</label>
          <select id={`${prefix}-${kind}-document`} value={selected} disabled={mutation.isPending || locked || !!decision} onChange={(event) => { touchReview(); setSelected(event.target.value); setReviewed(false); setDecision(undefined); }} className={inputClass}>
            <option value="">Select document</option>
            {data.documents.filter((doc) => doc.kind === kind && doc.status !== "rejected" && !!safeDriveUrl(doc.driveUrl)).map((doc) => <option key={doc.id} value={doc.id}>{doc.name} - {formatDate(doc.uploadDate)}</option>)}
          </select>
          {data.documents.filter((doc) => doc.id === selected && !!safeDriveUrl(doc.driveUrl)).map((doc) => <a key={doc.id} href={safeDriveUrl(doc.driveUrl)} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest-800 underline dark:text-gold-100"><ExternalLink className="h-4 w-4" />Open {label}</a>)}
        </div>)}
      </div>
      <label htmlFor={`${prefix}-remarks`} className="mb-2 mt-4 block text-sm font-bold">Admin remarks / reason</label><textarea id={`${prefix}-remarks`} value={remarks} onChange={(event) => { touchReview(); setRemarks(event.target.value); }} maxLength={1000} rows={3} disabled={mutation.isPending || !!decision} className={inputClass} />
      {!locked && <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => { touchReview(); setReviewed(event.target.checked); }} disabled={mutation.isPending || !!decision} className="mt-1 h-5 w-5 shrink-0" />I have reviewed the selected PAN and Aadhaar documents.</label>}
      <div className="mt-4 flex flex-wrap gap-3">{!locked ? <><button type="button" disabled={disabled} onClick={() => askReview("verified")} className="kv-button-primary inline-flex min-h-11 items-center gap-2 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />Verify KYC</button><button type="button" disabled={disabled} onClick={() => askReview("rejected")} className="kv-button-secondary inline-flex min-h-11 items-center gap-2 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject KYC</button></> : <button type="button" disabled={disabled} onClick={() => askReview("pending")} className="kv-button-secondary inline-flex min-h-11 items-center gap-2 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Reopen KYC</button>}</div>
      {decision && <div className="mt-4"><ConfirmDialog title={decision === "verified" ? "Confirm KYC Verification" : decision === "rejected" ? "Confirm KYC Rejection" : "Reopen KYC Review"} message={decision === "verified" ? "Record your manual approval of this client's identity details and selected supporting documents?" : "Save this decision and review reason to the client KYC record?"} disabled={mutation.isPending || disabled} onCancel={() => setDecision(undefined)} onConfirm={() => void confirmReview()} /></div>}
    </div>}
    {!admin && <div className="mt-5 border-t border-forest-100 pt-4 text-sm dark:border-white/10"><p>Supporting documents</p>{data.documents.length ? <ul className="mt-2 space-y-2">{data.documents.map((doc) => <li key={doc.id} className="flex flex-wrap justify-between gap-2"><span className="break-words">{doc.name}</span><span>{doc.status.replace(/_/g, " ")}</span></li>)}</ul> : <p className="mt-2 text-charcoal/65 dark:text-white/65">No PAN or Aadhaar documents uploaded.</p>}</div>}
  </Card>;
}
