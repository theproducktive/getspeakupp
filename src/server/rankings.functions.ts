import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  language: z.enum(["en", "fr", "ar"]),
  range: z.enum(["all", "month", "week"]).default("all"),
  minSessions: z.number().int().min(1).max(50).default(3),
  limit: z.number().int().min(1).max(100).default(50),
});

export type RankingRow = {
  user_id: string;
  display_name: string;
  total_score: number;
  sessions_count: number;
};

function sinceForRange(range: "all" | "month" | "week"): string | null {
  if (range === "all") return null;
  const days = range === "week" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const getRankings = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const since = sinceForRange(data.range);

    let query = supabaseAdmin
      .from("sessions")
      .select("user_id, score, language, created_at")
      .eq("language", data.language)
      .not("score", "is", null);
    if (since) query = query.gte("created_at", since);

    const { data: rows } = await query.limit(5000);
    const sessions = rows ?? [];

    // Aggregate per user
    const agg = new Map<string, { total: number; count: number }>();
    for (const s of sessions) {
      const cur = agg.get(s.user_id) ?? { total: 0, count: 0 };
      cur.total += (s.score as number) ?? 0;
      cur.count += 1;
      agg.set(s.user_id, cur);
    }

    // Filter by min sessions and sort
    const ranked = Array.from(agg.entries())
      .filter(([, v]) => v.count >= data.minSessions)
      .map(([user_id, v]) => ({ user_id, total_score: v.total, sessions_count: v.count }))
      .sort((a, b) => b.total_score - a.total_score);

    // Resolve display names for top N + current user
    const top = ranked.slice(0, data.limit);
    const myIdx = ranked.findIndex((r) => r.user_id === userId);
    const ids = new Set<string>(top.map((r) => r.user_id));
    if (myIdx >= 0) ids.add(userId);

    let nameMap = new Map<string, string>();
    if (ids.size > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(ids));
      nameMap = new Map(
        (profiles ?? []).map((p) => [p.id as string, (p.display_name as string) || "Anonymous"])
      );
    }

    const withNames: RankingRow[] = top.map((r) => ({
      ...r,
      display_name: nameMap.get(r.user_id) ?? "Anonymous",
    }));

    const me = myIdx >= 0
      ? {
          rank: myIdx + 1,
          ...ranked[myIdx],
          display_name: nameMap.get(userId) ?? "You",
        }
      : null;

    return {
      rows: withNames,
      me,
      totalRanked: ranked.length,
    };
  });
