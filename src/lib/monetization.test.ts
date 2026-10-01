import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isMonetizationEnabled, isPracticeAllowed, shouldEnforceQuota } from "./monetization";
import { assertWithinFreeQuota } from "@/backend/quota.backend";

describe("Monetization Configuration & Policy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MONETIZATION_ENABLED;
    delete process.env.VITE_MONETIZATION_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to false (SpeakUpp is free for initial launch)", () => {
    expect(isMonetizationEnabled()).toBe(false);
    expect(shouldEnforceQuota()).toBe(false);
  });

  describe("isPracticeAllowed policy", () => {
    it("allows unlimited practice for all users when monetization is disabled", () => {
      // 0 sessions, no subscription
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 0 })).toBe(true);

      // 14 sessions (free limit - 1)
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 14 })).toBe(true);

      // 15 sessions (hitting the free limit)
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 15 })).toBe(true);

      // 50 sessions (far exceeding the free limit)
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 50 })).toBe(true);

      // With or without active subscription
      expect(isPracticeAllowed({ hasActiveSubscription: true, sessionCount: 100 })).toBe(true);
    });

    it("respects free quota and active subscription when monetization is enabled", () => {
      process.env.MONETIZATION_ENABLED = "true";
      expect(isMonetizationEnabled()).toBe(true);

      // Within quota
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 0 })).toBe(true);
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 14 })).toBe(true);

      // At or over quota without subscription -> blocked
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 15 })).toBe(false);
      expect(isPracticeAllowed({ hasActiveSubscription: false, sessionCount: 20 })).toBe(false);

      // Over quota WITH active subscription -> allowed
      expect(isPracticeAllowed({ hasActiveSubscription: true, sessionCount: 20 })).toBe(true);
    });
  });

  describe("assertWithinFreeQuota", () => {
    it("immediately passes without throwing when monetization is disabled", async () => {
      // Monetization is disabled by default
      expect(isMonetizationEnabled()).toBe(false);

      // Should not query supabaseAdmin or throw even with arbitrary userId
      await expect(assertWithinFreeQuota("00000000-0000-0000-0000-000000000000")).resolves.toBeUndefined();
    });
  });
});
