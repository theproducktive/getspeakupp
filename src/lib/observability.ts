// Client-side error monitoring (Sentry) + product analytics (PostHog).
// Both are no-ops until the respective env vars are configured at build time.
// We dynamic-import to keep the initial bundle as small as possible.

let sentryReady = false;
let posthogReady = false;
let posthogClient: typeof import("posthog-js").default | null = null;

export async function initObservability(): Promise<void> {
  if (typeof window === "undefined") return;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (sentryDsn && !sentryReady) {
    sentryReady = true;
    try {
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
      });
    } catch (e) {
      console.warn("[observability] Sentry init failed", e);
    }
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const posthogHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
  if (posthogKey && !posthogReady) {
    posthogReady = true;
    try {
      const ph = (await import("posthog-js")).default;
      ph.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
      posthogClient = ph;
    } catch (e) {
      console.warn("[observability] PostHog init failed", e);
    }
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture(name, props);
  } catch {
    /* ignore */
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!posthogClient) return;
  try {
    posthogClient.identify(userId, traits);
  } catch {
    /* ignore */
  }
}

export function resetUser(): void {
  if (!posthogClient) return;
  try {
    posthogClient.reset();
  } catch {
    /* ignore */
  }
}

export async function captureClientException(err: unknown, ctx?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    console.error("[client error]", err, ctx);
    return;
  }
  try {
    const Sentry = await import("@sentry/react");
    Sentry.captureException(err, { extra: ctx });
  } catch {
    console.error("[client error]", err, ctx);
  }
}
