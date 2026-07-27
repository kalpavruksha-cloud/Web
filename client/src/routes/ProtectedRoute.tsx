import type { ReactNode } from "react";
import { Redirect, Route } from "react-router-dom";
import { LoadingState } from "../components/State";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/domain";

export function ProtectedRoute({ role, path, exact, children }: { role?: Role; path: string; exact?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  return (
    <Route
      path={path}
      exact={exact}
      render={() => {
        if (loading) return <main className="grid min-h-screen place-items-center p-6"><LoadingState label="Checking secure session" /></main>;
        if (!user) return <Redirect to={role === "admin" ? "/admin-login" : "/login"} />;
        if (role && user.role !== role) return <Redirect to={user.role === "admin" ? "/admin" : "/client"} />;
        return <>{children}</>;
      }}
    />
  );
}
