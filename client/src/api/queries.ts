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

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await api.get("/auth/session");
      return response.data.data.user as User;
    },
    retry: false
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => getData<DashboardSummary>("/dashboard") });
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => getData<Profile>("/profile") });
}

export function useResource<T>(name: string, path: string, params?: Record<string, unknown>) {
  return useQuery({ queryKey: [name, params], queryFn: () => getData<T>(path, params) });
}

export function useAction<T>(invalidate: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method, url, body }: { method: "post" | "put" | "delete"; url: string; body?: Record<string, unknown> }) => sendData<T>(method, url, body),
    onSuccess: () => invalidate.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }))
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
