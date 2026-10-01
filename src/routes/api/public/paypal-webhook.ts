// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.backend";
import { getPaypalBase, getPaypalToken } from "@/backend/paypal.backend";

// -----------------------------------------------------------------------------
// Webhook Signature Verification
// -----------------------------------------------------------------------------
// PayPal webhook handler
// Configure in PayPal Developer Dashboard:
//  - URL: https://<your-domain>/api/public/paypal-webhook
//  - Events: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED
//  - Copy the Webhook ID and store as secret PAYPAL_WEBHOOK_ID
async function verifyPaypalSignature(request: Request, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  const headers = {
    transmission_id: request.headers.get("paypal-transmission-id"),
    transmission_time: request.headers.get("paypal-transmission-time"),
    cert_url: request.headers.get("paypal-cert-url"),
    auth_algo: request.headers.get("paypal-auth-algo"),
    transmission_sig: request.headers.get("paypal-transmission-sig"),
  };

  if (Object.values(headers).some((v) => !v)) {
    console.error("[PayPal Webhook] Missing signature headers", headers);
    return false;
  }

  const token = await getPaypalToken();
  const res = await fetch(`${getPaypalBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.auth_algo,
      cert_url: headers.cert_url,
      transmission_id: headers.transmission_id,
      transmission_sig: headers.transmission_sig,
      transmission_time: headers.transmission_time,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!res.ok) {
    console.error("[PayPal Webhook] verify call failed", res.status, await res.text());
    return false;
  }
  const json = await res.json();
  return json.verification_status === "SUCCESS";
}

// -----------------------------------------------------------------------------
// Route & POST Handler
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/api/public/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const valid = await verifyPaypalSignature(request, rawBody);
        if (!valid) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(rawBody);
        const eventType = event.event_type as string;
        const resource = event.resource ?? {};

        console.log(`[PayPal Webhook] event=${eventType} id=${event.id}`);

// -----------------------------------------------------------------------------
// Payment Capture Processing
// -----------------------------------------------------------------------------
        try {
          if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const orderId =
              resource.supplementary_data?.related_ids?.order_id || null;
            const captureId = resource.id as string;
            const currency = resource.amount?.currency_code as string;
            const value = parseFloat(resource.amount?.value ?? "0");
            const amountMinor = Math.round(
              value * (["JPY", "HUF", "TWD"].includes(currency) ? 1 : 100)
            );
            // custom_id was set to the user_id when the order was created
            const userId = (resource.custom_id as string | undefined) || null;

            if (!orderId) {
              console.error("[PayPal Webhook] capture has no order_id; skipping");
              return new Response("ok", { status: 200 });
            }

            // Idempotency: skip if already recorded
            const { data: existing } = await supabaseAdmin
              .from("subscriptions")
              .select("id, user_id")
              .eq("paypal_order_id", orderId)
              .maybeSingle();

            if (existing) {
              console.log("[PayPal Webhook] order already recorded", orderId);
              return new Response("ok", { status: 200 });
            }

            if (!userId) {
              console.error(
                "[PayPal Webhook] cannot recover — no custom_id (user_id) on capture. Order:",
                orderId
              );
              return new Response("ok", { status: 200 });
            }

            // Recovery insert: browser flow didn't complete, but payment did
            const { error } = await supabaseAdmin.from("subscriptions").insert({
              user_id: userId,
              plan: "lifetime",
              status: "active",
              payment_provider: "paypal",
              paypal_order_id: orderId,
              paypal_capture_id: captureId,
              currency,
              amount_minor: amountMinor,
              paid_at: new Date().toISOString(),
            });
            if (error) {
              console.error("[PayPal Webhook] recovery insert failed", error);
              return new Response("error", { status: 500 });
            }
            console.log("[PayPal Webhook] recovered subscription via webhook", { userId, orderId });
            return new Response("ok", { status: 200 });
          }

// -----------------------------------------------------------------------------
// Refund Processing
// -----------------------------------------------------------------------------
          if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
            // resource.id is the refund id; the original capture id is in links
            const captureId =
              resource.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop() ||
              null;

            if (!captureId) {
              console.error("[PayPal Webhook] refund missing capture id");
              return new Response("ok", { status: 200 });
            }

            const { error } = await supabaseAdmin
              .from("subscriptions")
              .update({ status: "refunded" })
              .eq("paypal_capture_id", captureId);

            if (error) {
              console.error("[PayPal Webhook] failed to mark refunded", error);
              return new Response("error", { status: 500 });
            }
            console.log("[PayPal Webhook] subscription marked refunded", captureId);
            return new Response("ok", { status: 200 });
          }

          // Unknown event — ack so PayPal doesn't retry
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("[PayPal Webhook] handler error", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
