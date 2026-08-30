import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  computeLocalPrice,
  currencyForCountry,
  lookupCountry,
  paypalCaptureOrder,
  paypalCreateOrder,
  SUPPORTED_CURRENCIES,
} from "./paypal.server";

// Detect user's currency based on IP, with optional override
export const getLocalPrice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ currencyOverride: z.string().length(3).optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    let currency = data.currencyOverride;
    let country: string | null = null;
    if (!currency) {
      const headers = getRequestHeaders();
      const ip =
        (headers["cf-connecting-ip"] as string | undefined) ||
        (headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        null;
      country = await lookupCountry(ip);
      currency = currencyForCountry(country);
    }
    const price = await computeLocalPrice(currency);
    return { ...price, country, supported: SUPPORTED_CURRENCIES };
  });

// Returns session count + active subscription status
export const getUserStatus = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    return { sessionCount: count ?? 0, hasActive: (subs?.length ?? 0) > 0 };
  });

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ currency: z.string().length(3) }).parse(data)
  )
  .handler(async ({ data, context }) => {
    console.log("[PayPal] createPaypalOrder called", { userId: context.userId, currency: data.currency });
    const cur = SUPPORTED_CURRENCIES.includes(data.currency) ? data.currency : "USD";
    const price = await computeLocalPrice(cur);
    try {
      const orderId = await paypalCreateOrder(price.currency, price.amount, context.userId);
      // Persist (orderId -> userId) binding so capture can verify ownership.
      const { error: bindErr } = await supabaseAdmin.from("paypal_orders").insert({
        order_id: orderId,
        user_id: context.userId,
        currency: price.currency,
        amount: price.amount,
      });
      if (bindErr) {
        console.error("[PayPal] order ownership binding failed", { orderId, bindErr });
        throw new Error("Could not start payment. Please try again.");
      }
      console.log("[PayPal] order created", { orderId, currency: price.currency, amount: price.amount });
      return { orderId, currency: price.currency, amount: price.amount };
    } catch (e) {
      console.error("[PayPal] createPaypalOrder threw", e);
      throw e;
    }
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().min(5).max(64) }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Ownership check: the orderId must have been created by this same user.
    const { data: ownerRow, error: ownerErr } = await supabaseAdmin
      .from("paypal_orders")
      .select("user_id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (ownerErr) throw new Error(`Order lookup failed: ${ownerErr.message}`);
    if (!ownerRow || ownerRow.user_id !== userId) {
      throw new Response("Forbidden: order does not belong to the authenticated user", { status: 403 });
    }

    // Idempotency: if we already recorded this order, return success
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("paypal_order_id", data.orderId)
      .maybeSingle();
    if (existing) return { success: true, alreadyRecorded: true };

    const cap = await paypalCaptureOrder(data.orderId);
    const amountMinor = Math.round(
      cap.amount * (["JPY", "HUF", "TWD"].includes(cap.currency) ? 1 : 100)
    );

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan: "lifetime",
      status: "active",
      payment_provider: "paypal",
      paypal_order_id: data.orderId,
      paypal_capture_id: cap.captureId,
      currency: cap.currency,
      amount_minor: amountMinor,
      paid_at: new Date().toISOString(),
    });
    if (error) {
      // Unique-constraint race (webhook or another tab inserted first): treat as success.
      if ((error as any).code === "23505") {
        console.log("[PayPal] capture insert hit unique constraint — already recorded", data.orderId);
        return { success: true, alreadyRecorded: true };
      }
      // Payment captured but our DB write failed. Don't show "failed" to the user —
      // the webhook (PAYMENT.CAPTURE.COMPLETED) will reconcile via custom_id.
      console.error("[PayPal] capture succeeded but DB insert failed", { orderId: data.orderId, error });
      return { success: true, pendingReconcile: true as const };
    }
    return { success: true };
  });
