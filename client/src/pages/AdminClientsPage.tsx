import { UserPlus } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import type { Profile } from "../types/domain";
import { titleCase } from "../utils/format";

export function AdminClientsPage() {
  const { data, isLoading, error } = useResource<Profile[]>("clients", "/clients");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Client Management" eyebrow="Profiles, KYC and account status" actions={<button className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white"><UserPlus className="h-4 w-4" /> New Client</button>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="No clients returned" message="Client rows will appear after the Apps Script exposes getClients from the existing spreadsheet." /> : (
          <DataTable rows={rows} columns={[
            { key: "clientId", header: "Client ID", render: (row) => row.clientId },
            { key: "name", header: "Name", render: (row) => row.fullName },
            { key: "email", header: "Email", render: (row) => row.email },
            { key: "mobile", header: "Mobile", render: (row) => row.mobile },
            { key: "kyc", header: "KYC", render: (row) => titleCase(row.kycStatus) },
            { key: "status", header: "Account", render: (row) => titleCase(row.accountStatus) },
            { key: "risk", header: "Risk Profile", render: (row) => titleCase(row.riskProfile) }
          ]} />
        )}
      </Card>
    </>
  );
}
