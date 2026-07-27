import { ExternalLink, FileText } from "lucide-react";
import { useResource } from "../api/queries";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import type { ClientDocument } from "../types/domain";
import { formatDate, titleCase } from "../utils/format";

export function DocumentsPage({ admin = false }: { admin?: boolean }) {
  const { data, isLoading, error } = useResource<ClientDocument[]>("documents", "/documents");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} />;
  const rows = data ?? [];
  return (
    <>
      <PageHeader title={admin ? "Document Management" : "Documents"} eyebrow="Agreements, KYC and certificates" />
      <Card>
        {rows.length === 0 ? <EmptyState title="No documents available" message="Documents registered in the spreadsheet will appear here with their Google Drive links." /> : (
          <DataTable rows={rows} columns={[
            { key: "id", header: "Document ID", render: (row) => row.id },
            { key: "name", header: "Name", render: (row) => <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />{row.name}</span> },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "uploadDate", header: "Upload Date", render: (row) => formatDate(row.uploadDate) },
            { key: "status", header: "Status", render: (row) => titleCase(row.status) },
            { key: "driveUrl", header: "Open", render: (row) => row.driveUrl ? <a href={row.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-forest-700 dark:text-gold-100">Open <ExternalLink className="h-4 w-4" /></a> : "Not available" }
          ]} />
        )}
      </Card>
    </>
  );
}
