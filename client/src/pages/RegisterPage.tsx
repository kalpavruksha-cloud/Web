import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserPlus } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Logo />
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5">
            <ArrowLeft className="h-4 w-4" /> Sign in
          </Link>
        </div>
        <section className="rounded-lg border border-forest-100 bg-white/90 p-6 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/8">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-forest-50 p-3 text-forest-700 dark:bg-gold-100/10 dark:text-gold-100">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-forest-900 dark:text-ivory">Register for Kalpavruksha Portal</h1>
              <p className="mt-1 text-sm text-charcoal/65 dark:text-white/65">Your details will be added to the official spreadsheet for activation and review.</p>
            </div>
          </div>

          {error && <div className="mt-5"><ErrorState title="Registration failed" message={error} /></div>}
          {createdClientId && (
            <div className="mt-5 rounded-lg border border-forest-100 bg-forest-50 p-4 text-forest-900 dark:border-white/10 dark:bg-white/10 dark:text-white">
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
            <button disabled={isSubmitting} className="sm:col-span-2 rounded-lg bg-forest-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-forest-900 disabled:opacity-70">
              {isSubmitting ? "Submitting..." : "Create portal registration"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

const inputClass = "rounded-lg border border-forest-100 bg-white px-3 py-3 text-charcoal dark:border-white/10 dark:bg-white/5 dark:text-white";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-charcoal/80 dark:text-white/80">
      {label}
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
