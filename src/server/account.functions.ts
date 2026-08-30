import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status, payment_provider, paypal_order_id, paypal_capture_id, currency, amount_minor, paid_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return { subscription: null as null };

    const zeroDecimal = ["JPY", "HUF", "TWD"].includes(data.currency ?? "");
    const amount = data.amount_minor != null
      ? (zeroDecimal ? data.amount_minor : data.amount_minor / 100)
      : null;
    const display = amount != null && data.currency
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(amount)
      : null;

    return {
      subscription: {
        id: data.id,
        plan: data.plan,
        status: data.status,
        provider: data.payment_provider,
        orderId: data.paypal_order_id,
        captureId: data.paypal_capture_id,
        currency: data.currency,
        amount,
        amountDisplay: display,
        paidAt: data.paid_at,
        createdAt: data.created_at,
      },
    };
  });
