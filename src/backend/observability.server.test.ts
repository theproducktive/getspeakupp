import { describe, it, expect } from "vitest";
import { captureServerException } from "@/backend/observability.backend";

describe("captureServerException", () => {
  it("does not throw when SENTRY_DSN is not set", () => {
    delete process.env.SENTRY_DSN;
    expect(() => captureServerException(new Error("boom"), { area: "test" })).not.toThrow();
  });

  it("does not throw on malformed DSN", () => {
    process.env.SENTRY_DSN = "not-a-valid-dsn";
    expect(() => captureServerException(new Error("boom"), { area: "test" })).not.toThrow();
    delete process.env.SENTRY_DSN;
  });

  it("accepts non-Error values", () => {
    expect(() => captureServerException("string error")).not.toThrow();
    expect(() => captureServerException({ weird: "object" })).not.toThrow();
    expect(() => captureServerException(null)).not.toThrow();
  });
});
