import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSession } from "../api/queries";
import type { User } from "../types/domain";

type AuthContextValue = {
  user?: User;
  loading: boolean;
  login: (identifier: string, password: string, remember: boolean, expectedRole?: "client" | "admin") => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: sessionUser, isError, isLoading } = useSession();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    if (isLoading) return;
    setUser(isError ? undefined : sessionUser);
  }, [isError, isLoading, sessionUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading: isLoading && !user,
    async login(identifier, password, remember, expectedRole) {
      clearBusinessQueries(queryClient);
      queryClient.removeQueries({ queryKey: ["session"] });
      setUser(undefined);
      const response = await api.post("/auth/login", { identifier, password, remember, expectedRole });
      const nextUser = response.data.data.user as User;
      if (expectedRole && nextUser.role !== expectedRole) {
        throw new Error(expectedRole === "admin" ? "Use an admin account with Role = admin." : "Use a client account from Client Login.");
      }
      setUser(nextUser);
      queryClient.setQueryData(["session"], nextUser);
      return nextUser;
    },
    async logout() {
      try {
        await api.post("/auth/logout");
      } finally {
        setUser(undefined);
        queryClient.removeQueries();
      }
    }
  }), [isLoading, queryClient, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function clearBusinessQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session"
  });
}
