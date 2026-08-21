import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getData, sendData } from "./client";
import type {
  ClientDocument,
  ClientNotification,
  DashboardSummary,
  Investment,
  PortalSettings,
  Profile,
  Referral,
  SpreadsheetSchema,
  Transaction,
  User,
  Withdrawal
} from "../types/domain";

const LIVE_READ_REFETCH_MS = 45_000;
const DASHBOARD_REFETCH_MS = 30_000;
const SESSION_REFETCH_MS = 5 * 60_000;

const RELATED_QUERY_KEYS: Record<string, string[]> = {
  clients: ["admin-clients", "profile", "client-profile", "client-dashboard"],
  "admin-clients": ["clients", "profile", "client-profile", "client-dashboard"],
  profile: ["client-profile", "admin-clients", "clients", "client-dashboard"],
  "client-profile": ["profile", "admin-clients", "clients", "client-dashboard"],
  investments: ["admin-investments", "client-investment-requests", "client-dashboard"],
  "admin-investments": ["investments", "client-investment-requests", "client-dashboard"],
  "client-investment-requests": ["admin-investments", "investments", "client-dashboard"],
  transactions: ["admin-transactions", "client-transactions", "client-dashboard"],
  "admin-transactions": ["transactions", "client-transactions", "client-dashboard"],
  "client-transactions": ["transactions", "admin-transactions", "client-dashboard"],
  withdrawals: ["admin-withdrawals", "client-withdrawals", "client-dashboard"],
  "admin-withdrawals": ["withdrawals", "client-withdrawals", "client-dashboard"],
  "client-withdrawals": ["withdrawals", "admin-withdrawals", "client-dashboard"],
  referrals: ["admin-referrals", "client-referrals", "client-dashboard"],
  "admin-referrals": ["referrals", "client-referrals", "client-dashboard"],
  "client-referrals": ["referrals", "admin-referrals", "client-dashboard"],
  documents: ["admin-documents", "client-documents", "client-dashboard"],
  "admin-documents": ["documents", "client-documents", "client-dashboard"],
  "client-documents": ["documents", "admin-documents", "client-dashboard"],
  notifications: ["admin-notifications", "client-notifications", "client-dashboard"],
  "admin-notifications": ["notifications", "client-notifications", "client-dashboard"],
  "client-notifications": ["notifications", "admin-notifications", "client-dashboard"],
  settings: ["admin-settings", "client-preferences"],
  "admin-settings": ["settings", "client-preferences"],
  "client-preferences": ["settings", "admin-settings"]
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await api.get("/auth/session");
      return response.data.data.user as User;
    },
    retry: false,
    refetchInterval: SESSION_REFETCH_MS
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => getData<DashboardSummary>("/dashboard"), refetchInterval: DASHBOARD_REFETCH_MS });
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => getData<Profile>("/profile"), refetchInterval: LIVE_READ_REFETCH_MS });
}

export function useResource<T>(name: string, path: string, params?: Record<string, unknown>) {
  return useQuery({ queryKey: [name, params], queryFn: () => getData<T>(path, params), refetchInterval: LIVE_READ_REFETCH_MS });
}

export function useAction<T>(invalidate: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method, url, body }: { method: "post" | "put" | "delete"; url: string; body?: Record<string, unknown> }) => sendData<T>(method, url, body),
    onMutate: async () => {
      await Promise.all(invalidate.map((key) => queryClient.cancelQueries({ queryKey: [key] })));
    },
    onSuccess: () => {
      const keys = Array.from(new Set([...invalidate, "dashboard", ...invalidate.flatMap((key) => RELATED_QUERY_KEYS[key] ?? [])]));
      keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
    }
  });
}

export type Resources = {
  investments: Investment[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  referrals: Referral[];
  documents: ClientDocument[];
  notifications: ClientNotification[];
  settings: PortalSettings;
  schema: SpreadsheetSchema;
};
