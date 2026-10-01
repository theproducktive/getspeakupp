// Server-only freemium quota enforcement. Prevents paywall bypass via direct
// server-function calls. The 15-session free limit MUST be checked server-side
// because the client cap in src/routes/practice.tsx can be skipped trivially.
import { supabaseAdmin } from "@/integrations/supabase/client.backend";

export const FREE_SESSION_LIMIT = 15;

export async function assertWithinFreeQuota(userId: string): Promise<void> {
  // Active lifetime/paid subscription bypasses the cap.
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (subErr) {
    console.error("[quota] subscription lookup failed:", subErr.message);
    throw new Error("Could not verify your account, please try again.");
  }
  if (sub) return;

  // Count from the immutable session_usage log — not the sessions table —
  // so deleting sessions cannot reset the free-tier quota.
  const { count, error: cntErr } = await supabaseAdmin
    .from("session_usage")
    .select("session_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (cntErr) {
    console.error("[quota] usage count failed:", cntErr.message);
    throw new Error("Could not verify your account, please try again.");
  }
  if ((count ?? 0) >= FREE_SESSION_LIMIT) {
    throw new Error(
      `You've reached the ${FREE_SESSION_LIMIT}-session free limit. Upgrade to continue practicing.`,
    );
  }
}
