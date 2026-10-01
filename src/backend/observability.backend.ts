// Server-only error capture. Inert until SENTRY_DSN is configured.
// We avoid importing @sentry/node so the Worker bundle stays lean; the client
// SDK (@sentry/react) plus structured server logs are enough until a Worker-
// compatible Sentry transport is wired.

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type CaptureContext = Record<string, string | number | boolean | undefined>;

// -----------------------------------------------------------------------------
// Server Error Capture
// -----------------------------------------------------------------------------
export function captureServerException(err: unknown, ctx: CaptureContext = {}): void {
  const sentryDsn = process.env.SENTRY_DSN;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  // Always log structured for the built-in server-function-logs viewer.
  console.error(
    JSON.stringify({
      level: "error",
      msg: message,
      stack,
      ...ctx,
      sentry_enabled: Boolean(sentryDsn),
    }),
  );

// -----------------------------------------------------------------------------
// Sentry HTTP Envelope
// -----------------------------------------------------------------------------
  if (!sentryDsn) return;

  // Best-effort fire-and-forget to Sentry's HTTP envelope endpoint. Works in the
  // Worker runtime without pulling in @sentry/node's Node-only transport.
  try {
    const match = sentryDsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!match) return;
    const [, publicKey, host, projectId] = match;
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      logger: "server",
      message: { formatted: message },
      exception: { values: [{ type: err instanceof Error ? err.name : "Error", value: message, stacktrace: stack ? { frames: [{ filename: "server", function: "handler", context_line: stack.split("\n").slice(0, 3).join(" ") }] } : undefined }] },
      tags: ctx,
    };
    const envelope =
      JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event);
    void fetch(`https://${host}/api/${projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=orador-server/1.0`,
      },
      body: envelope,
    }).catch(() => {});
  } catch {
    /* swallow — observability must never break the request */
  }
}
