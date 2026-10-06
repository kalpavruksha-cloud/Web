import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getData } from "../../api/client";
import type { AdminDashboardRecords, DashboardSummary } from "../../types/domain";
import type { AdminCollections } from "./adminUtils";

const resources = [
  { key: "clients", path: "/clients" },
  { key: "investments", path: "/investments" },
  { key: "transactions", path: "/transactions" },
  { key: "withdrawals", path: "/withdrawals" },
  { key: "documents", path: "/documents" },
  { key: "referrals", path: "/referrals" },
  { key: "notifications", path: "/notifications" }
] as const;

type AdminOverview = AdminCollections & { dashboard: DashboardSummary };

export async function loadAdminOverview(signal?: AbortSignal): Promise<AdminOverview> {
  const dashboard = await getData<DashboardSummary>("/dashboard", undefined, signal);
  if (!dashboard.admin) throw new Error("Admin dashboard data is unavailable for this session.");
  if (dashboard.adminData) {
    for (const { key } of resources) {
      if (!Array.isArray(dashboard.adminData[key])) throw new Error(`The dashboard did not return ${key} records.`);
    }
    return { dashboard, ...dashboard.adminData };
  }

  // Older deployments return a summary; finish their reads with bounded concurrency.
  const records: Partial<AdminDashboardRecords> = {};
  if (Array.isArray(dashboard.investments)) records.investments = dashboard.investments;
  const missing = resources.filter(({ key }) => !records[key]);
  for (let index = 0; index < missing.length; index += 2) {
    await Promise.all(missing.slice(index, index + 2).map(async ({ key, path }) => {
      const rows = await getData<unknown[]>(path, undefined, signal);
      if (!Array.isArray(rows)) throw new Error(`The spreadsheet did not return ${key} records.`);
      Object.assign(records, { [key]: rows });
    }));
  }
  return { dashboard, ...records as AdminDashboardRecords };
}

export function useAdminOverview() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async ({ signal }) => {
      const overview = await loadAdminOverview(signal);
      queryClient.setQueryData(["dashboard"], overview.dashboard);
      resources.forEach(({ key }) => queryClient.setQueryData([`admin-${key}`, undefined], overview[key]));
      return overview;
    },
    staleTime: 5 * 60_000,
    retry: false
  });
}
