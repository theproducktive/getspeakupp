import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMySubscription } from "@/server/account.functions";
import { Crown, Settings2, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — SpeakUpp" },
      {
        name: "description",
        content:
          "View your SpeakUpp subscription status, payment receipt, and manage your speaking practice preferences.",
      },
      { property: "og:title", content: "Account — SpeakUpp" },
      {
        property: "og:description",
        content: "Manage your subscription, receipt, and speaking practice preferences.",
      },
    ],
  }),
  component: Account,
});

type Sub = Awaited<ReturnType<typeof getMySubscription>>["subscription"];

function Account() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [sub, setSub] = useState<Sub | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    getMySubscription()
      .then((r) => setSub(r.subscription))
      .catch(() => setSub(null))
      .finally(() => setLoaded(true));
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;
  }

  const isActive = sub?.status === "active";
  const formattedDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader hasActive={isActive} />

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Account</p>
          <h1 className="mt-2 font-display text-4xl">Your subscription</h1>
        </header>

        {!loaded ? (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : !sub ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-elevated sm:p-8">
            <p className="text-muted-foreground">You're on the free plan.</p>
            <Link
              to="/upgrade"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
              <div className="flex items-center gap-3">
                {isActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta">
                    <Crown className="size-3.5" /> Pro
                  </span>
                )}
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{sub.status}</span>
              </div>
              <h2 className="mt-3 font-display text-2xl capitalize">{sub.plan} access</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isActive
                  ? "You have unlimited access to all speaking practice features."
                  : sub.status === "refunded"
                  ? "This payment was refunded."
                  : `Subscription status: ${sub.status}`}
              </p>
            </div>

            {/* Receipt card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
              <h3 className="font-display text-xl">Payment receipt</h3>
              <dl className="mt-6 space-y-4 text-sm">
                <Row label="Amount paid" value={sub.amountDisplay ?? "—"} />
                <Row label="Currency" value={sub.currency ?? "—"} />
                <Row label="Payment date" value={formattedDate(sub.paidAt)} />
                <Row label="Payment method" value={sub.provider ?? "—"} mono />
                <Row label="Order ID" value={sub.orderId ?? "—"} mono />
                <Row label="Transaction ID" value={sub.captureId ?? "—"} mono />
              </dl>
            </div>
          </div>
        )}

        {/* Practice preferences */}
        <Link
          to="/onboarding"
          className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-terracotta/40"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-terracotta/10 text-terracotta">
              <Settings2 className="size-5" />
            </div>
            <div>
              <p className="font-medium">Practice preferences</p>
              <p className="text-xs text-muted-foreground">Edit your language, level, weekly goal, and interests</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-foreground/80 break-all text-right" : "text-foreground text-right"}>
        {value}
      </dd>
    </div>
  );
}
