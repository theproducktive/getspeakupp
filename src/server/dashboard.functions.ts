import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Session = {
  id: string;
  created_at: string;
  language: string;
  score: number | null;
  status: string;
};

function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function computeStreak(sessions: Session[]): { current: number; longest: number; lastDate: string | null } {
  const days = new Set(sessions.map((s) => ymd(new Date(s.created_at))));
  if (days.size === 0) return { current: 0, longest: 0, lastDate: null };

  // longest
  const sorted = Array.from(days).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    const cur = new Date(sorted[i] + "T00:00:00Z");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) run++;
    else run = 1;
    if (run > longest) longest = run;
  }

  // current: walk back from today (or yesterday if no session today)
  const today = new Date();
  const todayStr = ymd(today);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const yesterdayStr = ymd(yesterday);

  let current = 0;
  let cursor: Date;
  if (days.has(todayStr)) cursor = new Date(today);
  else if (days.has(yesterdayStr)) cursor = new Date(yesterday);
  else return { current: 0, longest, lastDate: sorted[sorted.length - 1] };

  while (days.has(ymd(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return { current, longest, lastDate: sorted[sorted.length - 1] };
}

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Pull last 90 days of sessions for streak + weekly chart + last session
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("sessions")
      .select("id, created_at, language, score, status")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const sessions = (rows ?? []) as Session[];
    const streak = computeStreak(sessions);

    // Weekly counts: last 7 days, oldest -> newest
    const weekly: { date: string; label: string; count: number }[] = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = ymd(d);
      const count = sessions.filter((s) => ymd(new Date(s.created_at)) === key).length;
      weekly.push({ date: key, label: dayLabels[d.getUTCDay()], count });
    }

    const totalSessions = sessions.length;
    const last = sessions[0] ?? null;

    // Average score (last 7 sessions with a score)
    const scored = sessions.filter((s) => s.score != null).slice(0, 7);
    const avgScore7 = scored.length > 0
      ? Math.round(scored.reduce((s, x) => s + (x.score ?? 0), 0) / scored.length)
      : null;

    // Practiced today?
    const today = ymd(new Date());
    const practicedToday = sessions.some((s) => ymd(new Date(s.created_at)) === today);

    // Active subscription check
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    const hasActive = (subs?.length ?? 0) > 0;

    // Onboarding + weekly goal
    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("weekly_goal, onboarded_at")
      .eq("user_id", userId)
      .maybeSingle();
    const weeklyGoal = prefs?.weekly_goal ?? null;
    const onboarded = !!prefs?.onboarded_at;

    // Sessions this calendar week (Mon -> Sun, UTC)
    const now = new Date();
    const dow = (now.getUTCDay() + 6) % 7; // 0 = Mon
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
    const sessionsThisWeek = sessions.filter((s) => new Date(s.created_at) >= weekStart).length;

    return {
      streak,
      weekly,
      totalSessions,
      avgScore7,
      practicedToday,
      lastSession: last
        ? { id: last.id, language: last.language, score: last.score, createdAt: last.created_at }
        : null,
      hasActive,
      weeklyGoal,
      sessionsThisWeek,
      onboarded,
    };
  });
