// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";

// -----------------------------------------------------------------------------
// Security Headers Middleware
// -----------------------------------------------------------------------------
const securityHeaders = createMiddleware().server(async ({ next }) => {
  setResponseHeaders(
    new Headers({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    }),
  );
  return next();
});

// -----------------------------------------------------------------------------
// Application Entry Point
// -----------------------------------------------------------------------------
export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
