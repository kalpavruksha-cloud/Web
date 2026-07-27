import { Link } from "react-router-dom";
import { Card } from "../components/Card";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="max-w-lg text-center">
        <h1 className="font-display text-3xl font-extrabold text-forest-900 dark:text-ivory">Page not found</h1>
        <p className="mt-3 text-charcoal/70 dark:text-white/70">This portal route is not available for your session.</p>
        <Link className="mt-5 inline-block rounded-lg bg-forest-700 px-4 py-2 font-semibold text-white" to="/login">Return to sign in</Link>
      </Card>
    </main>
  );
}
