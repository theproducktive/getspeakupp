// -----------------------------------------------------------------------------
// Centralized Monetization Configuration & Policy
// -----------------------------------------------------------------------------
// Single source of truth for whether monetization, paid subscriptions,
// paywalls, quotas, and checkout are active across SpeakUpp.
//
// Current state: OFF (initial launch is completely FREE for all users).
// Existing payment/subscription infrastructure remains in the codebase as
// dormant infrastructure for future reactivation or replacement.
//
// Activation:
// - Set environment variable MONETIZATION_ENABLED="true" or VITE_MONETIZATION_ENABLED="true"
// - Or toggle MONETIZATION_DEFAULT_ENABLED = true below.

const MONETIZATION_DEFAULT_ENABLED = false;

function resolveMonetizationFlag(): boolean {
  // Check client-side / Vite environment
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env.VITE_MONETIZATION_ENABLED !== undefined) {
      return import.meta.env.VITE_MONETIZATION_ENABLED === "true";
    }
  }
  // Check server-side / Node environment
  if (typeof process !== "undefined" && process.env) {
    if (process.env.VITE_MONETIZATION_ENABLED !== undefined) {
      return process.env.VITE_MONETIZATION_ENABLED === "true";
    }
    if (process.env.MONETIZATION_ENABLED !== undefined) {
      return process.env.MONETIZATION_ENABLED === "true";
    }
  }
  return MONETIZATION_DEFAULT_ENABLED;
}

export const MONETIZATION_ENABLED: boolean = resolveMonetizationFlag();

/**
 * Returns whether monetization (subscriptions, paywalls, checkout) is active.
 */
export function isMonetizationEnabled(): boolean {
  return resolveMonetizationFlag();
}

/**
 * Checks if a user is allowed to practice.
 * In free mode (monetization OFF), all authenticated users have unlimited practice.
 * In monetized mode (monetization ON), users must either have an active subscription
 * or be within the free quota limit.
 */
export function isPracticeAllowed(params: {
  hasActiveSubscription?: boolean;
  sessionCount?: number;
  freeLimit?: number;
}): boolean {
  if (!isMonetizationEnabled()) {
    return true;
  }
  if (params.hasActiveSubscription) {
    return true;
  }
  const limit = params.freeLimit ?? 15;
  return (params.sessionCount ?? 0) < limit;
}

/**
 * Helper to determine if quota enforcement applies.
 */
export function shouldEnforceQuota(): boolean {
  return isMonetizationEnabled();
}
