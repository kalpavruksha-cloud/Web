import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Leaf, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useHistory } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ErrorState } from "../components/State";
import { useAuth } from "../context/AuthContext";
import { loginFormSchema, type LoginFormValues } from "../schemas/auth";

export function LoginPage() {
  const { login } = useAuth();
  const history = useHistory();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [forgot, setForgot] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: "", password: "", remember: false }
  });

  async function onSubmit(values: LoginFormValues) {
    setError(undefined);
    try {
      const user = await login(values.identifier, values.password, values.remember);
      history.replace(user.role === "admin" ? "/admin" : "/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-forest-900 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(215,171,61,0.28),transparent_28rem),linear-gradient(145deg,rgba(30,123,84,0.9),rgba(11,47,37,1))]" />
        <div className="relative -mt-14 -translate-y-14"><Logo /></div>
        <div className="relative -mt-28 max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-100/30 px-4 py-2 text-sm font-semibold text-gold-100"><Leaf className="h-4 w-4" /> Wealth with discipline and clarity</p>
          <h1 className="font-display text-5xl font-extrabold leading-tight">KALPAVRUKSHA PORTAL</h1>
          <p className="mt-5 text-lg leading-8 text-white/78">A secure client and administration workspace for investments, withdrawals, documents, referrals, and reports backed by the official Kalpavruksha Wealth spreadsheet.</p>
        </div>
        <p className="absolute bottom-10 left-10 right-10 text-sm text-white/60">HTTPS, role-based access, and verified spreadsheet records only.</p>
      </section>

      <section className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <div className="rounded-lg border border-forest-100 bg-white/90 p-6 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/8">
            <h2 className="font-display text-2xl font-extrabold text-forest-900 dark:text-ivory">Sign in securely</h2>
            <p className="mt-2 text-sm text-charcoal/65 dark:text-white/65">Use your registered login ID or email and portal password. Your spreadsheet role opens the correct portal.</p>
            {error && <div className="mt-4"><ErrorState title="Login failed" message={error} /></div>}
            {forgot && (
              <div className="mt-4 rounded-lg bg-forest-50 p-4 text-sm text-forest-900 dark:bg-white/10 dark:text-white">
                Please contact Kalpavruksha support from your registered mobile number to reset portal access.
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-charcoal/80 dark:text-white/80">
                Login ID or email
                <span className="flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
                  <Mail className="h-4 w-4 text-charcoal/45" />
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
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" {...register("remember")} /> Remember session</label>
                <button type="button" className="font-semibold text-forest-700 dark:text-gold-100" onClick={() => setForgot((value) => !value)}>Forgot password?</button>
              </div>
              <button disabled={isSubmitting} className="rounded-lg bg-forest-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-forest-900 disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? "Verifying..." : "Sign in"}
              </button>
              <p className="text-center text-sm text-charcoal/65 dark:text-white/65">
                New investor? <Link className="font-bold text-forest-700 dark:text-gold-100" to="/register">Register for portal access</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
