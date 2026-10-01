import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { getSessionHistory } from "@/functions/history.functions";
import { AppHeader } from "@/components/app-header";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session history — SpeakUpp" },
      {
        name: "description",
        content:
          "Browse your past SpeakUpp speaking sessions, scores, and AI feedback to track your progress over time.",
      },
      { property: "og:title", content: "Session history — SpeakUpp" },
      {
        property: "og:description",
        content: "Review past speaking sessions, scores, and AI feedback.",
      },
    ],
  }),
  component: History,
});

type Row = {
  id: string;
  created_at: string;
  language: string;
  level_id: number;
  topic_prompt: string;
  score: number | null;
  status: string;
};

function History() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const fetchHistory = useServerFn(getSessionHistory);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  const { data } = useQuery({
    queryKey: ["session-history", user?.id],
    queryFn: () => fetchHistory(),
    enabled: !!user,
  });
  const rows: Row[] = (data?.rows ?? []) as Row[];

  if (loading || !user) return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-display text-4xl">{t.nav.history}</h1>
        <div className="mt-6 space-y-3">
          {rows.length === 0 && (
            <p className="text-muted-foreground">No sessions yet. Try your first one!</p>
          )}
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/session/$id"
              params={{ id: r.id }}
              className="group block rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-terracotta/40 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {r.language.toUpperCase()} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 font-display text-lg">{r.topic_prompt}</p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  {r.score != null ? (
                    <p className="font-display text-3xl text-terracotta">{r.score}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{r.status}</p>
                  )}
                  <ChevronRight className="size-5 text-muted-foreground transition group-hover:text-terracotta" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
