// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { isMonetizationEnabled } from "@/lib/monetization";

// -----------------------------------------------------------------------------
// PayPal Client ID RPC
// -----------------------------------------------------------------------------
export const getPaypalClientId = createServerFn({ method: "GET" }).handler(async () => {
  if (!isMonetizationEnabled()) {
    return { clientId: null, env: "sandbox" as const };
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("PAYPAL_CLIENT_ID not configured");
  const envRaw = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
  const env: "live" | "sandbox" =
    envRaw === "live" || envRaw === "production" ? "live" : "sandbox";
  return { clientId, env };
});
