import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useHistory } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ErrorState } from "../components/State";
import { useAuth } from "../context/AuthContext";
import { loginFormSchema, type LoginFormValues } from "../schemas/auth";

export function AdminLoginPage() {
  const { login, logout } = useAuth();
  const history = useHistory();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: "", password: "", remember: false }
  });

  async function onSubmit(values: LoginFormValues) {
    setError(undefined);
    try {
      const user = await login(values.identifier, values.password, values.remember, "admin");
      if (user.role !== "admin") {
        await logout();
        setError("This login is a client account. Use an account with Role = admin in CLIENT_CREDENTIALS.");
        return;
      }
      history.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8"><Logo /></div>
        <section className="rounded-lg border border-forest-100 bg-white/92 p-6 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/8">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-forest-50 p-3 text-forest-700 dark:bg-gold-100/10 dark:text-gold-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-forest-900 dark:text-ivory">Admin Login</h1>
              <p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">Operations access for the main Kalpavruksha Wealth administrator.</p>
            </div>
          </div>

          {error && <div className="mt-5"><ErrorState title="Admin login failed" message={error} /></div>}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-charcoal/80 dark:text-white/80">
              Admin login ID
              <span className="flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
                <UserCog className="h-4 w-4 text-charcoal/45" />
                <input {...register("identifier")} className="w-full bg-transparent" autoComplete="username" />
              </span>
              {errors.identifier && <span className="text-xs text-red-600">{errors.identifier.message}</span>}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-charcoal/80 dark:text-white/80">
              Password
              <span className="flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
                <LockKeyhole className="h-4 w-4 text-charcoal/45" />
                <input {...register("password")} type={showPassword ? "text" : "password"} className="w-full bg-transparent" autoComplete="current-password" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              {errors.password && <span className="text-xs text-red-600">{errors.password.message}</span>}
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("remember")} /> Remember admin session</label>
            <button disabled={isSubmitting} className="rounded-lg bg-forest-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-forest-900 disabled:opacity-70">
              {isSubmitting ? "Verifying admin..." : "Open admin portal"}
            </button>
            <Link className="text-center text-sm font-semibold text-forest-700 dark:text-gold-100" to="/login">Client login</Link>
          </form>
        </section>
      </div>
    </main>
  );
}
