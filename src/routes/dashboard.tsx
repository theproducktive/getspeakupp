import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { getDashboardStats } from "@/functions/dashboard.functions";
import { Flame, History, Trophy, Sparkles, ArrowRight, Target } from "lucide-react";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SpeakUpp" },
      {
        name: "description",
        content:
          "Track your SpeakUpp speaking practice: current streak, weekly goal progress, recent sessions, and your latest AI feedback score.",
      },
      { property: "og:title", content: "Dashboard — SpeakUpp" },
      {
        property: "og:description",
        content: "Your speaking streak, weekly goal progress, and latest session score.",
      },
    ],
  }),
  component: Dashboard,
});

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

const LANG_LABEL: Record<string, string> = { en: "English", fr: "French", ar: "Arabic" };

function Dashboard() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    getDashboardStats()
      .then((s) => {
        setStats(s);
        if (!s.onboarded) nav({ to: "/onboarding" });
      })
      .catch(() => setStats(null));
  }, [user, nav]);

  if (loading || !user)
    return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  const streak = stats?.streak.current ?? 0;
  const longest = stats?.streak.longest ?? 0;
  const weekly = stats?.weekly ?? [];
  const weekTotal = weekly.reduce((s, d) => s + d.count, 0);
  const maxBar = Math.max(1, ...weekly.map((d) => d.count));
  const last = stats?.lastSession;

  const firstName =
    (user.user_metadata as { display_name?: string } | null)?.display_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader hasActive={stats?.hasActive} />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back, {firstName}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Your progress</h1>
          <p className="mt-2 text-muted-foreground">
            {streak > 0
              ? `You're on a ${streak}-day streak. Keep the momentum.`
              : "Start a session today to begin your streak."}
          </p>
        </header>

        {/* Streak-at-risk reminder */}
        {stats && streak > 0 && !stats.practicedToday && (
          <Link
            to="/practice"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-terracotta/40 bg-accent/30 p-4 shadow-soft transition hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <Flame className="size-6 text-terracotta" />
              <div>
                <p className="font-medium">Keep your {streak}-day streak alive</p>
                <p className="text-xs text-muted-foreground">Practice today — just 1 minute</p>
              </div>
            </div>
            <ArrowRight className="size-5 text-terracotta" />
          </Link>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Streak card */}
          <div className="md:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-normal">
                  <Flame className="size-4 text-terracotta" />
                  Current streak
                </h2>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-display text-6xl text-terracotta sm:text-7xl">{streak}</span>
                  <span className="text-muted-foreground">{streak === 1 ? "day" : "days"}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Longest: <span className="font-medium text-foreground">{longest}</span> ·
                  Total sessions: <span className="font-medium text-foreground">{stats?.totalSessions ?? 0}</span>
                  {stats?.avgScore7 != null && (
                    <> · Avg score: <span className="font-medium text-foreground">{stats.avgScore7}</span></>
                  )}
                </p>
              </div>
              <Link
                to="/practice"
                className="hidden md:inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-soft transition hover:-translate-y-0.5"
              >
                Start session <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* weekly bars */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">This week</p>
                <p className="text-xs text-muted-foreground">
                  {weekTotal} session{weekTotal === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-4 flex h-28 items-end gap-2">
                {weekly.map((d) => {
                  const h = (d.count / maxBar) * 100;
                  const active = d.count > 0;
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-full w-full items-end">
                        <div
                          className={`w-full rounded-md transition-all ${
                            active ? "bg-terracotta" : "bg-muted"
                          }`}
                          style={{ height: `${Math.max(active ? 8 : 4, h)}%` }}
                        />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/practice"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-soft transition hover:-translate-y-0.5 md:hidden"
            >
              Start session <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Last session card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-normal">
              <Sparkles className="size-4 text-terracotta" />
              Last session
            </h2>
            {last ? (
              <div className="mt-4">
                <p className="font-display text-3xl">
                  {last.score != null ? `${last.score}` : "—"}
                  {last.score != null && <span className="text-base text-muted-foreground">/100</span>}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {LANG_LABEL[last.language] ?? last.language}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(last.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <Link
                  to="/session/$id"
                  params={{ id: last.id }}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-terracotta hover:underline"
                >
                  View details <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  No sessions yet. Your first one is one click away.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly goal */}
        {stats?.weeklyGoal != null && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-terracotta/10 text-terracotta">
                  <Target className="size-5" />
                </div>
                <div>
                  <h2 className="font-medium text-base">Weekly goal</h2>
                  <p className="text-xs text-muted-foreground">
                    {stats.sessionsThisWeek} of {stats.weeklyGoal} sessions this week
                  </p>
                </div>
              </div>
              <p className="font-display text-2xl tabular-nums">
                {Math.min(100, Math.round((stats.sessionsThisWeek / stats.weeklyGoal) * 100))}%
              </p>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-terracotta transition-all"
                style={{
                  width: `${Math.min(100, (stats.sessionsThisWeek / stats.weeklyGoal) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            to="/history"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-terracotta/40"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-terracotta/10 text-terracotta">
                <History className="size-5" />
              </div>
              <div>
                <p className="font-medium">{t.nav.history}</p>
                <p className="text-xs text-muted-foreground">Replay your past sessions</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition group-hover:text-terracotta" />
          </Link>

          <Link
            to="/rankings"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-terracotta/40"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-terracotta/10 text-terracotta">
                <Trophy className="size-5" />
              </div>
              <div>
                <p className="font-medium">{t.nav.rankings}</p>
                <p className="text-xs text-muted-foreground">See where you stand</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition group-hover:text-terracotta" />
          </Link>
        </div>
      </main>
    </div>
  );
}
