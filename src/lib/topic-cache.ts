// Pure helpers shared by generateTopic and its tests.
// Hashing is deterministic so the same (lang, level, sorted-interests) triple
// always resolves to the same cache bucket.

import { createHash } from "crypto";

export function interestsHash(interests: string[]): string {
  const normalized = interests
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return createHash("sha256").update(normalized.join("|")).digest("hex").slice(0, 32);
}

export const CACHE_TARGET_POOL = 20;
export const CACHE_MIN_BEFORE_REUSE = 5;
