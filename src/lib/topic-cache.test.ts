import { describe, it, expect } from "vitest";
import { interestsHash } from "@/lib/topic-cache";

describe("interestsHash", () => {
  it("is deterministic regardless of input order", () => {
    const a = interestsHash(["Travel", "Food", "Music"]);
    const b = interestsHash(["music", "TRAVEL", "food"]);
    expect(a).toBe(b);
  });

  it("normalizes whitespace and case", () => {
    expect(interestsHash(["  Tech  "])).toBe(interestsHash(["tech"]));
  });

  it("produces different hashes for different interest sets", () => {
    expect(interestsHash(["travel"])).not.toBe(interestsHash(["food"]));
  });

  it("returns a 32-char hex slice", () => {
    const h = interestsHash(["a", "b", "c"]);
    expect(h).toMatch(/^[a-f0-9]{32}$/);
  });

  it("ignores empty strings", () => {
    expect(interestsHash(["travel", "", "  "])).toBe(interestsHash(["travel"]));
  });
});
