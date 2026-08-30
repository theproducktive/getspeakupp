import { describe, it, expect, vi, beforeEach } from "vitest";
import { currencyForCountry, computeLocalPrice, SUPPORTED_CURRENCIES, BASE_USD } from "@/server/paypal.server";

describe("currencyForCountry", () => {
  it("maps eurozone countries to EUR", () => {
    expect(currencyForCountry("FR")).toBe("EUR");
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("ES")).toBe("EUR");
  });

  it("maps US to USD", () => {
    expect(currencyForCountry("US")).toBe("USD");
  });

  it("falls back to USD for MENA (PayPal does not settle local MENA currencies)", () => {
    expect(currencyForCountry("MA")).toBe("USD");
    expect(currencyForCountry("AE")).toBe("USD");
    expect(currencyForCountry("SA")).toBe("USD");
  });

  it("falls back to USD for unknown countries", () => {
    expect(currencyForCountry("XX")).toBe("USD");
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry(undefined)).toBe("USD");
  });

  it("is case-insensitive", () => {
    expect(currencyForCountry("fr")).toBe("EUR");
    expect(currencyForCountry("us")).toBe("USD");
  });
});

describe("computeLocalPrice", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns clean .49/.99 endings for normal currencies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 1, EUR: 0.92, GBP: 0.79 } }),
      }),
    );
    const eur = await computeLocalPrice("EUR");
    expect(eur.currency).toBe("EUR");
    // 9.99 * 0.92 ≈ 9.19 → round up to clean .49/.99 ending
    const cents = Math.round((eur.amount % 1) * 100);
    expect([49, 99]).toContain(cents);
    expect(eur.amountMinor).toBe(Math.round(eur.amount * 100));
  });

  it("rounds JPY (zero-decimal) to whole units", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 1, JPY: 150 } }),
      }),
    );
    const jpy = await computeLocalPrice("JPY");
    expect(jpy.currency).toBe("JPY");
    expect(Number.isInteger(jpy.amount)).toBe(true);
    expect(jpy.amountMinor).toBe(jpy.amount);
  });

  it("falls back to USD for unsupported currencies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: { USD: 1 } }) }),
    );
    const out = await computeLocalPrice("ZZZ");
    expect(out.currency).toBe("USD");
    expect(out.amount).toBe(BASE_USD);
  });

  it("lists USD as supported", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
    expect(SUPPORTED_CURRENCIES).toContain("EUR");
  });
});
