import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Logo } from "../components/Logo";
import { ErrorState } from "../components/State";
import { registerFormSchema, type RegisterFormValues } from "../schemas/auth";

export function RegisterPage() {
  const [error, setError] = useState<string>();
  const [createdClientId, setCreatedClientId] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { riskProfile: "Medium" }
  });

  async function onSubmit(values: RegisterFormValues) {
    setError(undefined);
    setCreatedClientId(undefined);
    try {
      const response = await api.post("/auth/register", values);
      setCreatedClientId(response.data.data.clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_8%_0%,rgba(215,171,61,0.18),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.16),transparent_30rem),linear-gradient(135deg,#fbfaf4,#f5f8fb_46%,#eef5f1)] px-4 py-6 dark:bg-[linear-gradient(135deg,#040b1d,#071733_50%,#0b201a)] sm:px-5 sm:py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-4 grid gap-3 sm:mb-6 sm:flex sm:items-center sm:justify-between">
          <div className="flex justify-center sm:block"><Logo /></div>
          <Link to="/login" className="kv-button-secondary inline-flex items-center justify-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Sign in
          </Link>
        </div>
        <section className="kv-card p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 rounded-2xl border border-gold-100/70 bg-[linear-gradient(135deg,rgba(215,171,61,0.22),rgba(37,99,235,0.08))] p-3 text-navy-900 shadow-sm dark:border-gold-100/15 dark:text-gold-100">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-100 sm:text-xs sm:tracking-[0.22em]">Investor onboarding</p>
              <h1 className="mt-2 break-words font-display text-2xl font-extrabold tracking-tight text-navy-900 dark:text-ivory sm:text-3xl">Register for Kalpavruksha Portal</h1>
              <p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">Your details will be added to the official spreadsheet for activation and review.</p>
            </div>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/70 px-3 py-2 font-bold text-navy-900 dark:border-white/10 dark:bg-white/8 dark:text-white"><ShieldCheck className="h-4 w-4 text-gold-600" /> Secure review</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/70 px-3 py-2 font-bold text-navy-900 dark:border-white/10 dark:bg-white/8 dark:text-white"><Sparkles className="h-4 w-4 text-gold-600" /> Live sheet entry</span>
            </div>
          </div>

          {error && <div className="mt-5"><ErrorState title="Registration failed" message={error} /></div>}
          {createdClientId && (
            <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
              Registration submitted. Your Login ID is <strong>{createdClientId}</strong>. You can sign in after the account is active.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName?.message}><input {...register("fullName")} className={inputClass} /></Field>
            <Field label="Email" error={errors.email?.message}><input {...register("email")} type="email" className={inputClass} /></Field>
            <Field label="Mobile" error={errors.mobile?.message}><input {...register("mobile")} className={inputClass} /></Field>
            <Field label="Password" error={errors.password?.message}><input {...register("password")} type="password" className={inputClass} /></Field>
            <Field label="Date of birth" error={errors.dateOfBirth?.message}><input {...register("dateOfBirth")} type="date" className={inputClass} /></Field>
            <Field label="Gender" error={errors.gender?.message}><input {...register("gender")} className={inputClass} /></Field>
            <Field label="Occupation" error={errors.occupation?.message}><input {...register("occupation")} className={inputClass} /></Field>
            <Field label="Risk profile" error={errors.riskProfile?.message}>
              <select {...register("riskProfile")} className={inputClass}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
            <button disabled={isSubmitting} className="kv-button-primary sm:col-span-2 py-3 disabled:opacity-70">
              {isSubmitting ? "Submitting..." : "Create portal registration"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

const inputClass = "rounded-2xl border border-navy-100/70 bg-white/85 px-4 py-3 text-charcoal shadow-sm dark:border-white/10 dark:bg-white/7 dark:text-white";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-charcoal/80 dark:text-white/80">
      {label}
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
