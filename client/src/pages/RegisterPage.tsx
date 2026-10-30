import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Logo } from "../components/Logo";
import { ErrorState } from "../components/State";
import { registrationGenderOptions, registerFormSchema, type RegisterFormValues } from "../schemas/auth";
import type { ApiResponse } from "../types/domain";

export function RegisterPage() {
  const [error, setError] = useState<string>();
  const [createdClientId, setCreatedClientId] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { riskProfile: "Medium" }
  });

  useEffect(() => {
    if (createdClientId) successHeading.current?.focus();
  }, [createdClientId]);

  async function onSubmit(values: RegisterFormValues) {
    setError(undefined);
    setCreatedClientId(undefined);
    try {
      const response = await api.post<ApiResponse<{ clientId: string }>>("/auth/register", values);
      if (!response.data.success || !response.data.data?.clientId) {
        throw new Error(response.data.error?.details || "Registration could not be confirmed. Please contact support before trying again.");
      }
      setCreatedClientId(response.data.data.clientId);
      reset();
      setShowPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_8%_0%,rgba(215,171,61,0.18),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.16),transparent_30rem),linear-gradient(135deg,#fbfaf4,#f5f8fb_46%,#eef5f1)] px-4 py-6 dark:bg-[linear-gradient(135deg,#040b1d,#071733_50%,#0b201a)] sm:px-5 sm:py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-4 grid gap-3 sm:mb-6 sm:flex sm:items-center sm:justify-between">
          <div className="flex justify-center sm:block"><Logo /></div>
          {!createdClientId && <Link to="/login" className="kv-button-secondary inline-flex items-center justify-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Sign in
          </Link>}
        </div>
        <section className="kv-card p-5 sm:p-7">
          {createdClientId ? (
            <div className="flex flex-col items-center gap-5 py-6 text-center sm:py-10">
              <div className="rounded-full border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
                <CircleCheck className="h-10 w-10" aria-hidden="true" />
              </div>
              <h1 ref={successHeading} tabIndex={-1} className="font-display text-2xl font-extrabold text-navy-900 focus:outline-none dark:text-ivory sm:text-3xl">Registration successful</h1>
              <div role="status" className="max-w-md space-y-3 text-sm leading-6 text-charcoal/75 dark:text-white/75">
                <p>Your Login ID is <strong className="break-all text-navy-900 dark:text-gold-100">{createdClientId}</strong>.</p>
                <p>Your registration has been submitted for review. You can sign in once your account is activated.</p>
              </div>
              <Link to="/login" className="kv-button-primary inline-flex min-h-11 items-center justify-center gap-2">Go to login <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          ) : <>
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
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field id="registration-name" label="Full name" error={errors.fullName?.message}><input id="registration-name" {...register("fullName")} autoComplete="name" className={inputClass} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "registration-name-error" : undefined} /></Field>
            <Field id="registration-email" label="Email" error={errors.email?.message}><input id="registration-email" {...register("email")} type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? "registration-email-error" : undefined} /></Field>
            <Field id="registration-mobile" label="Mobile" error={errors.mobile?.message}><input id="registration-mobile" {...register("mobile")} type="tel" autoComplete="tel" className={inputClass} aria-invalid={!!errors.mobile} aria-describedby={errors.mobile ? "registration-mobile-error" : undefined} /></Field>
            <Field id="registration-password" label="Password" error={errors.password?.message}>
              <div className="relative min-w-0">
                <input id="registration-password" {...register("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" className={`${inputClass} pr-14`} aria-invalid={!!errors.password} aria-describedby={errors.password ? "registration-password-error" : undefined} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="registration-password" title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-1 my-auto flex h-11 w-11 items-center justify-center rounded-lg text-navy-700 hover:bg-navy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 dark:text-gold-100 dark:hover:bg-white/10">
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </Field>
            <Field id="registration-birth-date" label="Date of birth" error={errors.dateOfBirth?.message}><input id="registration-birth-date" {...register("dateOfBirth")} type="date" autoComplete="bday" className={inputClass} aria-invalid={!!errors.dateOfBirth} aria-describedby={errors.dateOfBirth ? "registration-birth-date-error" : undefined} /></Field>
            <Field id="registration-gender" label="Gender" error={errors.gender?.message}>
              <select id="registration-gender" {...register("gender")} className={inputClass} aria-invalid={!!errors.gender} aria-describedby={errors.gender ? "registration-gender-error" : undefined}>
                <option value="">Select gender</option>
                {registrationGenderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </Field>
            <Field id="registration-occupation" label="Occupation" error={errors.occupation?.message}><input id="registration-occupation" {...register("occupation")} className={inputClass} aria-invalid={!!errors.occupation} aria-describedby={errors.occupation ? "registration-occupation-error" : undefined} /></Field>
            <Field id="registration-risk" label="Risk profile" error={errors.riskProfile?.message}>
              <select id="registration-risk" {...register("riskProfile")} className={inputClass} aria-invalid={!!errors.riskProfile} aria-describedby={errors.riskProfile ? "registration-risk-error" : undefined}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
            <button disabled={isSubmitting} className="kv-button-primary sm:col-span-2 py-3 disabled:opacity-70">
              {isSubmitting ? "Submitting..." : "Create portal registration"}
            </button>
          </form>
          </>}
        </section>
      </div>
    </main>
  );
}

const inputClass = "w-full min-w-0 rounded-2xl border border-navy-100/70 bg-white/85 px-4 py-3 text-charcoal shadow-sm dark:border-white/10 dark:bg-white/7 dark:text-white";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2 text-sm font-bold text-charcoal/80 dark:text-white/80">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span id={`${id}-error`} className="text-xs text-red-600 dark:text-red-300">{error}</span>}
    </div>
  );
}
