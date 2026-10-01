// Server-only PayPal + geo/FX helpers.
// Set PAYPAL_ENV secret to "live" to use production. Defaults to sandbox.
import { captureServerException } from "@/backend/observability.backend";
import { supabaseAdmin } from "@/integrations/supabase/client.backend";


function resolvePaypalBase() {
  const env = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
  return env === "live" || env === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// Base price in USD (single source of truth)
// -----------------------------------------------------------------------------
// Currency Configuration
// -----------------------------------------------------------------------------
export const BASE_USD = 9.99;

// Country -> PayPal-supported currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD",
  JP: "JPY", CN: "HKD", HK: "HKD", SG: "SGD", TW: "TWD",
  TH: "THB", PH: "PHP", MY: "MYR", IN: "INR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF",
  BR: "BRL", MX: "MXN", IL: "ILS", RU: "RUB",
  // Eurozone
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", PT: "EUR",
  IE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
  // MENA — PayPal does NOT support MAD/AED/SAR for transactions, fall back to USD
  MA: "USD", AE: "USD", SA: "USD", EG: "USD", DZ: "USD", TN: "USD", QA: "USD", KW: "USD",
};

export const SUPPORTED_CURRENCIES = [
  "USD","EUR","GBP","CAD","AUD","JPY","CHF","SEK","NOK","DKK","PLN","CZK","HUF",
  "BRL","MXN","ILS","HKD","SGD","TWD","THB","PHP","MYR","INR","NZD","RUB",
];

const ZERO_DECIMAL = new Set(["JPY", "HUF", "TWD"]);

// FX cache (24h). In-memory for the current instance; DB-backed for cross-instance reuse.
let fxCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const FX_TTL_MS = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Exchange Rate Handling
// -----------------------------------------------------------------------------
async function loadFxFromDb(): Promise<{ rates: Record<string, number>; fetchedAt: number } | null> {
  try {
    const { data } = await supabaseAdmin
      .from("fx_cache" as never)
      .select("rates, fetched_at")
      .eq("base", "USD")
      .maybeSingle();
    if (!data) return null;
    const row = data as { rates: Record<string, number>; fetched_at: string };
    return { rates: row.rates, fetchedAt: new Date(row.fetched_at).getTime() };
  } catch (e) {
    console.error("[FX] DB read failed", e);
    return null;
  }
}

async function saveFxToDb(rates: Record<string, number>) {
  try {
    await supabaseAdmin
      .from("fx_cache" as never)
      .upsert({ base: "USD", rates, fetched_at: new Date().toISOString() } as never);
  } catch (e) {
    console.error("[FX] DB write failed", e);
  }
}

async function getRates(): Promise<Record<string, number>> {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) return fxCache.rates;

  // Warm in-memory cache from DB if empty
  if (!fxCache) {
    const fromDb = await loadFxFromDb();
    if (fromDb) fxCache = fromDb;
    if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) return fxCache.rates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = await res.json();
    if (json?.rates) {
      fxCache = { rates: json.rates, fetchedAt: Date.now() };
      // Fire-and-forget DB persistence
      void saveFxToDb(json.rates);
      return json.rates;
    }
  } catch (e) {
    console.error("[FX] fetch failed", e);
  }
  // Stale-while-error: fall back to whatever we last had (memory or DB)
  return fxCache?.rates ?? { USD: 1 };
}

function roundClean(amount: number, currency: string): number {
  if (ZERO_DECIMAL.has(currency)) return Math.round(amount);
  // Round to nearest .49 / .99 for nicer pricing
  const cents = Math.round(amount * 100);
  const lastTwo = cents % 100;
  let adjusted: number;
  if (lastTwo < 49) adjusted = cents - lastTwo + 49;
  else if (lastTwo < 99) adjusted = cents - lastTwo + 99;
  else adjusted = cents;
  return adjusted / 100;
}

// -----------------------------------------------------------------------------
// Price Calculation
// -----------------------------------------------------------------------------
export async function computeLocalPrice(currency: string): Promise<{
  currency: string;
  amount: number; // human-readable (e.g. 9.99)
  amountMinor: number; // integer minor units
  display: string;
}> {
  const cur = SUPPORTED_CURRENCIES.includes(currency) ? currency : "USD";
  const rates = await getRates();
  const rate = rates[cur] ?? 1;
  const raw = BASE_USD * rate;
  const amount = roundClean(raw, cur);
  const amountMinor = ZERO_DECIMAL.has(cur) ? Math.round(amount) : Math.round(amount * 100);
  const display = new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
  return { currency: cur, amount, amountMinor, display };
}

// -----------------------------------------------------------------------------
// Geolocation
// -----------------------------------------------------------------------------
export function currencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return "USD";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}

export async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (text.length === 2) return text.toUpperCase();
    return null;
  } catch {
    return null;
  }
}

// PayPal API
// -----------------------------------------------------------------------------
// PayPal API Client
// -----------------------------------------------------------------------------
export async function getPaypalToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  console.log(`[PayPal] Auth attempt | base=${getPaypalBase()} | clientId prefix=${id.slice(0, 6)}... len=${id.length} | secret len=${secret.length}`);
  const res = await fetch(`${getPaypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[PayPal] Auth FAILED ${res.status}: ${body}`);
    captureServerException(new Error(`PayPal auth ${res.status}`), { area: "paypal", op: "auth", status: res.status });
    throw new Error("Payment service is temporarily unavailable. Please try again.");
  }
  const json = await res.json();
  return json.access_token as string;
}

export function getPaypalBase() {
  return resolvePaypalBase();
}

// -----------------------------------------------------------------------------
// Order Creation
// -----------------------------------------------------------------------------
export async function paypalCreateOrder(currency: string, amount: number, userId?: string): Promise<string> {
  const token = await getPaypalToken();
  const res = await fetch(`${getPaypalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: currency, value: amount.toFixed(ZERO_DECIMAL.has(currency) ? 0 : 2) },
        description: "SpeakUpp Lifetime Access",
        ...(userId ? { custom_id: userId } : {}),
      }],
      application_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", brand_name: "SpeakUpp" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[PayPal] CreateOrder FAILED ${res.status}: ${body}`);
    captureServerException(new Error(`PayPal createOrder ${res.status}`), { area: "paypal", op: "create_order", status: res.status });
    throw new Error("Could not start payment. Please try again.");
  }
  const json = await res.json();
  return json.id as string;
}

// -----------------------------------------------------------------------------
// Order Capture
// -----------------------------------------------------------------------------
export async function paypalCaptureOrder(orderId: string): Promise<{
  captureId: string;
  currency: string;
  amount: number;
  payerEmail?: string;
}> {
  const token = await getPaypalToken();
  const res = await fetch(`${getPaypalBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[PayPal] Capture FAILED ${res.status}: ${body}`);
    captureServerException(new Error(`PayPal capture ${res.status}`), { area: "paypal", op: "capture", status: res.status, orderId });
    throw new Error("Payment failed, please try again.");
  }
  const json = await res.json();
  if (json.status !== "COMPLETED") {
    console.error(`[PayPal] capture not completed: ${json.status}`);
    captureServerException(new Error(`PayPal capture not completed: ${json.status}`), { area: "paypal", op: "capture_status", orderId });
    throw new Error("Payment failed, please try again.");
  }
  const cap = json.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = cap?.id as string;
  const currency = cap?.amount?.currency_code as string;
  const amount = parseFloat(cap?.amount?.value ?? "0");
  const payerEmail = json.payer?.email_address as string | undefined;
  return { captureId, currency, amount, payerEmail };
}
