import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSessionDetail } from "@/functions/session.functions";
import { AppHeader } from "@/components/app-header";
import { ArrowLeft, Sparkles, Mic, BookOpen, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/session/$id")({
  head: () => ({
    meta: [
      { title: "Session details — SpeakUpp" },
      {
        name: "description",
        content:
          "Review your SpeakUpp speaking session: transcript, recording, score, and AI feedback on pronunciation, fluency, grammar, and vocabulary.",
      },
      { property: "og:title", content: "Session details — SpeakUpp" },
      {
        property: "og:description",
        content: "Transcript, recording, and AI feedback for your speaking session.",
      },
    ],
  }),
  component: SessionDetail,
});

type Detail = Awaited<ReturnType<typeof getSessionDetail>>;

const LANG_LABEL: Record<string, string> = { en: "English", fr: "French", ar: "Arabic" };

function SessionDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    getSessionDetail({ data: { sessionId: id } })
      .then(setData)
      .catch((e) => setErr(e?.message ?? "Could not load session"));
  }, [user, id]);

  if (loading || !user) return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> History
        </Link>

        {err && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}

        {!data && !err && (
          <div className="mt-6 h-48 animate-pulse rounded-3xl bg-card" />
        )}

        {data && (
          <div className="mt-4 space-y-5">
            {/* Header card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {LANG_LABEL[data.session.language] ?? data.session.language} ·{" "}
                {new Date(data.session.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl">{data.session.topic}</h1>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-display text-5xl text-terracotta sm:text-6xl">
                  {data.session.score ?? "—"}
                </span>
                {data.session.score != null && (
                  <span className="text-sm text-muted-foreground">/ 100</span>
                )}
              </div>
              {data.feedback?.overall && (
                <p className="mt-3 text-sm text-muted-foreground">{data.feedback.overall}</p>
              )}
            </div>

            {/* Audio */}
            {data.audioUrl && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h2 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-normal">
                  <Mic className="size-4 text-terracotta" /> Your recording
                </h2>
                <audio controls src={data.audioUrl} className="w-full" preload="metadata" />
              </div>
            )}

            {/* Transcript */}
            {data.session.transcript && (
              <Section icon={<MessageSquare className="size-4 text-terracotta" />} title="Transcript">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {data.session.transcript}
                </p>
              </Section>
            )}

            {data.feedback && (
              <>
                {data.feedback.pronunciation && (
                  <Section icon={<Sparkles className="size-4 text-terracotta" />} title="Pronunciation">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {data.feedback.pronunciation}
                    </p>
                  </Section>
                )}

                {data.feedback.fluency && (
                  <Section icon={<Sparkles className="size-4 text-terracotta" />} title="Fluency">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {data.feedback.fluency}
                    </p>
                  </Section>
                )}

                {data.feedback.grammar.length > 0 && (
                  <Section icon={<BookOpen className="size-4 text-terracotta" />} title="Grammar">
                    <ul className="space-y-3">
                      {data.feedback.grammar.map((g, i) => (
                        <li key={i} className="rounded-xl border border-border bg-background p-3">
                          <p className="text-sm text-muted-foreground line-through">{g.issue}</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{g.correction}</p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {data.feedback.vocabulary.length > 0 && (
                  <Section icon={<BookOpen className="size-4 text-terracotta" />} title="Vocabulary">
                    <ul className="space-y-3">
                      {data.feedback.vocabulary.map((v, i) => (
                        <li key={i} className="rounded-xl border border-border bg-background p-3">
                          <p className="text-sm text-muted-foreground">{v.word}</p>
                          <p className="mt-1 text-sm font-medium text-foreground">→ {v.suggestion}</p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-normal">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}
