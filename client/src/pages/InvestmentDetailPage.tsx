import { useParams } from "react-router-dom";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import type { Investment } from "../types/domain";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useResource<Investment>("investment", `/investments/${id}`);
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Investment details could not be loaded."} />;
  return (
    <>
      <PageHeader title={data.plan} eyebrow={data.id} />
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Client ID" value={data.clientId} />
          <Info label="Category" value={data.category} />
          <Info label="Principal Amount" value={formatCurrency(data.principalAmount)} />
          <Info label="Return Rate" value={`${data.returnRate ?? 0}%`} />
          <Info label="Monthly Return" value={formatCurrency(data.monthlyReturn)} />
          <Info label="Current Value" value={formatCurrency(data.currentValue)} />
          <Info label="Start Date" value={formatDate(data.startDate)} />
          <Info label="Maturity Date" value={formatDate(data.maturityDate)} />
          <Info label="Status" value={titleCase(data.status)} />
          <Info label="Agreement" value={data.agreementDetails} />
          <Info label="Payment Mode" value={data.paymentMode} />
          <Info label="Notes" value={data.notes} />
        </dl>
      </Card>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | number }) {
  return <div><dt className="text-sm text-charcoal/60 dark:text-white/60">{label}</dt><dd className="mt-1 font-semibold text-forest-900 dark:text-ivory">{value ?? "Not available"}</dd></div>;
}
