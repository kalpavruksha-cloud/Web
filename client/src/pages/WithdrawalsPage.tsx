import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAction, useResource } from "../api/queries";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import { useToast } from "../context/ToastContext";
import { withdrawalFormSchema, type WithdrawalFormValues } from "../schemas/forms";
import type { Withdrawal } from "../types/domain";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function WithdrawalsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<Withdrawal[]>("withdrawals", "/withdrawals");
  const mutation = useAction<Withdrawal>(["withdrawals", "dashboard"]);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WithdrawalFormValues>({ resolver: zodResolver(withdrawalFormSchema) });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];

  async function submit(values: WithdrawalFormValues) {
    await mutation.mutateAsync({ method: "post", url: "/withdrawals", body: values });
    toast({ title: "Withdrawal requested", message: "Your request was sent to the Kalpavruksha operations team.", type: "success" });
    reset();
  }

  return (
    <>
      <PageHeader title={admin ? "Withdrawal Management" : "Withdrawals"} eyebrow="Request and approval workflow" />
      {!admin && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit(submit)} className="grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-semibold">Amount<input type="number" {...register("amount")} className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" />{errors.amount && <span className="text-xs text-red-600">{errors.amount.message}</span>}</label>
            <label className="grid gap-2 text-sm font-semibold">Bank account<input {...register("bankAccount")} className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" />{errors.bankAccount && <span className="text-xs text-red-600">{errors.bankAccount.message}</span>}</label>
            <label className="grid gap-2 text-sm font-semibold">Remarks<input {...register("remarks")} className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" /></label>
            <button disabled={mutation.isPending} className="rounded-lg bg-forest-700 px-4 py-2 font-bold text-white">{mutation.isPending ? "Sending..." : "Request"}</button>
          </form>
        </Card>
      )}
      <Card>
        {rows.length === 0 ? <EmptyState title="No withdrawal history" message="Withdrawal records will appear here once returned by the spreadsheet." /> : (
          <DataTable rows={rows} columns={[
            { key: "id", header: "Request ID", render: (row) => row.id },
            { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
            { key: "requestDate", header: "Request Date", render: (row) => formatDate(row.requestDate) },
            { key: "status", header: "Status", render: (row) => titleCase(row.status) },
            { key: "approvalDate", header: "Approval Date", render: (row) => formatDate(row.approvalDate) },
            { key: "paymentReference", header: "Payment Ref", render: (row) => row.paymentReference },
            { key: "adminRemarks", header: "Admin Remarks", render: (row) => row.adminRemarks }
          ]} />
        )}
      </Card>
    </>
  );
}
