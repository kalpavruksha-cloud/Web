import { Mail, MessageCircle, Phone } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";

export function SupportPage() {
  return (
    <>
      <PageHeader title="Support" eyebrow="Kalpavruksha Wealth assistance" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><Mail className="h-6 w-6 text-forest-700" /><h2 className="mt-3 font-bold">Email</h2><p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">support@kalpavrukshawealth.com</p></Card>
        <Card><Phone className="h-6 w-6 text-forest-700" /><h2 className="mt-3 font-bold">Phone</h2><p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">Use your registered mobile number for account-specific requests.</p></Card>
        <Card><MessageCircle className="h-6 w-6 text-forest-700" /><h2 className="mt-3 font-bold">WhatsApp</h2><p className="mt-1 text-sm text-charcoal/70 dark:text-white/70">Configured by deployment environment when approved for production.</p></Card>
      </div>
      <Card className="mt-6">
        <form className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Subject<input className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" /></label>
          <label className="grid gap-2 text-sm font-semibold">Message<textarea rows={5} className="rounded-lg border border-forest-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5" /></label>
          <button type="button" className="w-fit rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white">Prepare support request</button>
        </form>
      </Card>
    </>
  );
}
