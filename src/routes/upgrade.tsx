import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "@/lib/auth-context";
import { getLocalPrice, createPaypalOrder, capturePaypalOrder, getUserStatus } from "@/server/paypal.functions";
import { getPaypalClientId } from "@/server/paypal-config.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CURRENCY_META: Record<string, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  CAD: { name: "Canadian Dollar", symbol: "$" },
  AUD: { name: "Australian Dollar", symbol: "$" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  CHF: { name: "Swiss Franc", symbol: "Fr" },
  SEK: { name: "Swedish Krona", symbol: "kr" },
  NOK: { name: "Norwegian Krone", symbol: "kr" },
  DKK: { name: "Danish Krone", symbol: "kr" },
  PLN: { name: "Polish Złoty", symbol: "zł" },
  CZK: { name: "Czech Koruna", symbol: "Kč" },
  HUF: { name: "Hungarian Forint", symbol: "Ft" },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  MXN: { name: "Mexican Peso", symbol: "$" },
  TWD: { name: "Taiwan Dollar", symbol: "NT$" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$" },
  INR: { name: "Indian Rupee", symbol: "₹" },
};

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to lifetime access — SpeakUpp" },
      {
        name: "description",
        content:
          "Unlock unlimited SpeakUpp speaking practice with a one-time payment. Lifetime access, no subscription, no recurring charges.",
      },
      { property: "og:title", content: "Upgrade to lifetime access — SpeakUpp" },
      {
        property: "og:description",
        content: "One payment, lifetime access to unlimited speaking sessions and AI feedback.",
      },
    ],
  }),
  component: Upgrade,
});

type Price = { currency: string; amount: number; display: string; supported: string[] };

function Upgrade() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [price, setPrice] = useState<Price | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [paypalEnv, setPaypalEnv] = useState<"live" | "sandbox" | null>(null);
  const [busy, setBusy] = useState(false);



  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  // Auto-redirect users who already have an active subscription
  useEffect(() => {
    if (!user) return;
    getUserStatus()
      .then((s) => {
        if (s.hasActive) {
          toast.success("You already have Pro access");
          nav({ to: "/account" });
        }
      })
      .catch(() => {});
  }, [user, nav]);

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        getLocalPrice({ data: {} }),
        getPaypalClientId(),
      ]);
      setPrice({ currency: p.currency, amount: p.amount, display: p.display, supported: p.supported });
      setClientId(c.clientId);
      setPaypalEnv(c.env);
    })().catch((e) => toast.error(e?.message ?? "Failed to load pricing"));
  }, []);

  const changeCurrency = async (cur: string) => {
    setBusy(true);
    try {
      const p = await getLocalPrice({ data: { currencyOverride: cur } });
      setPrice({ currency: p.currency, amount: p.amount, display: p.display, supported: p.supported });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;
  }

  return (
    <div className="min-h-dvh bg-ambient">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/practice" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </nav>

      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-8 min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Lifetime access</p>
          <h1 className="mt-2 font-display text-4xl">Practice without limits</h1>
          <p className="mt-3 text-muted-foreground">
            One payment, lifetime access. Unlimited speaking sessions, full feedback, and full history.
          </p>

          <div className="mt-8 rounded-2xl bg-background p-6 text-center shadow-inner">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Pay once</p>
            <p className="mt-1 font-display text-5xl text-terracotta">
              {price ? price.display : "…"}
            </p>
            {price && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Currency</span>
                <Select value={price.currency} onValueChange={(v) => changeCurrency(v)} disabled={busy}>
                  <SelectTrigger className="h-9 w-[150px] sm:w-[180px] rounded-full border-border bg-card px-4 text-sm font-medium shadow-soft transition hover:border-terracotta/50 focus:ring-2 focus:ring-terracotta/30">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span className="text-terracotta">{CURRENCY_META[price.currency]?.symbol ?? ""}</span>
                        <span>{price.currency}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-2xl border-border bg-card shadow-elevated">
                    {price.supported.map((c) => {
                      const meta = CURRENCY_META[c];
                      return (
                        <SelectItem
                          key={c}
                          value={c}
                          className="cursor-pointer rounded-lg py-2 pl-3 pr-8 text-sm focus:bg-accent/60 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                        >
                          <span className="flex items-center gap-3">
                            <span className="inline-flex h-6 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold text-terracotta">
                              {meta?.symbol ?? c}
                            </span>
                            <span className="font-medium">{c}</span>
                            {meta && <span className="text-xs text-muted-foreground">{meta.name}</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <ul className="mt-6 space-y-2 text-sm">
            <li>✓ Unlimited speaking sessions</li>
            <li>✓ Full AI feedback (pronunciation, fluency, grammar, vocabulary)</li>
            <li>✓ Complete session history with audio replays</li>
            <li>✓ All current and future languages</li>
          </ul>

          <div className="mt-8">
            {clientId && price && paypalEnv ? (
              <PayPalScriptProvider
                options={{
                  clientId,
                  currency: price.currency,
                  intent: "capture",
                  environment: paypalEnv === "live" ? "production" : "sandbox",
                }}
              >
                <PayPalButtons
                  key={`${paypalEnv}-${price.currency}-${price.amount}`}
                  style={{ layout: "vertical", color: "gold", shape: "pill", label: "pay" }}
                  createOrder={async () => {
                    try {
                      const r = await createPaypalOrder({ data: { currency: price.currency } });
                      if (!r?.orderId) throw new Error("Server returned no order id");
                      return r.orderId;
                    } catch (e: any) {
                      console.error("[PayPal] createOrder failed", e);
                      toast.error("Could not start payment. Please try again.");
                      throw e;
                    }
                  }}
                  onApprove={async (data) => {
                    try {
                      const res = await capturePaypalOrder({ data: { orderId: data.orderID } });
                      if ((res as any)?.pendingReconcile) {
                        toast.success("Payment received — finalizing your account. Please refresh in a moment.");
                      } else {
                        toast.success("Payment confirmed — you're unlocked!");
                      }
                      nav({ to: "/practice" });
                    } catch (e: any) {
                      console.error("[PayPal] capture failed", e);
                      toast.error("Payment received — finalizing your account. Please refresh in a moment.");
                    }
                  }}
                  onCancel={() => {
                    toast("Payment cancelled");
                  }}
                  onError={(err: any) => {
                    console.error("PayPal error", err);
                    toast.error("Something went wrong with PayPal. Please try again.");
                  }}
                />
              </PayPalScriptProvider>
            ) : (
              <div className="h-12 animate-pulse rounded-full bg-muted" />
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Secure payment via PayPal. No subscription, no recurring charges.
          </p>

        </div>
      </main>
    </div>
  );
}
