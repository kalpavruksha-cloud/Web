import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAction, useProfile } from "../api/queries";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/State";
import { useToast } from "../context/ToastContext";
import { profileFormSchema, type ProfileFormValues } from "../schemas/forms";
import { formatDate } from "../utils/format";

export function ProfilePage() {
  const { data, isLoading, error } = useProfile();
  const mutation = useAction(["profile"]);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Profile data could not be loaded."} />;

  async function submit(values: ProfileFormValues) {
    await mutation.mutateAsync({ method: "put", url: "/profile", body: values });
    toast({ title: "Profile update submitted", message: "Allowed profile fields were sent to the spreadsheet.", type: "success" });
  }

  return (
    <>
      <PageHeader title="Profile" eyebrow={data.clientId} />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-4">
            <img src={data.profilePhotoUrl || "/src/assets/kalpavruksha-logo.svg"} alt={data.fullName} className="h-20 w-20 rounded-lg object-cover" />
            <div>
              <h2 className="text-xl font-bold text-forest-900 dark:text-ivory">{data.fullName}</h2>
              <p className="text-sm text-charcoal/60 dark:text-white/60">{data.email}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 text-sm">
            <ReadOnly label="PAN" value={data.pan} />
            <ReadOnly label="Aadhaar" value={data.aadhaar} />
            <ReadOnly label="KYC status" value={data.kycStatus} />
            <ReadOnly label="Date of birth" value={formatDate(data.dateOfBirth)} />
            <ReadOnly label="Account status" value={data.accountStatus} />
          </dl>
        </Card>
        <Card>
          <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
            {[
              ["profilePhotoUrl", "Profile photo URL"],
              ["mobile", "Mobile"],
              ["email", "Email"],
              ["address", "Address"],
              ["bankAccount", "Bank account"],
              ["ifsc", "IFSC"],
              ["branch", "Branch"],
              ["nomineeName", "Nominee name"],
              ["nomineeRelationship", "Nominee relationship"],
              ["nomineeMobile", "Nominee mobile"],
              ["riskProfile", "Risk profile"]
            ].map(([name, label]) => (
              <label key={name} className="grid gap-2 text-sm font-semibold">
                {label}
                <input {...register(name as keyof ProfileFormValues)} className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" />
                {errors[name as keyof ProfileFormValues] && <span className="text-xs text-red-600">Please enter a valid value</span>}
              </label>
            ))}
            <button disabled={mutation.isPending} className="sm:col-span-2 rounded-lg bg-forest-700 px-4 py-3 font-bold text-white">{mutation.isPending ? "Saving..." : "Save allowed changes"}</button>
          </form>
        </Card>
      </div>
    </>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return <div className="flex justify-between gap-3 border-b border-forest-100 pb-2 dark:border-white/10"><dt className="text-charcoal/60 dark:text-white/60">{label}</dt><dd className="font-semibold">{value ?? "Not available"}</dd></div>;
}
