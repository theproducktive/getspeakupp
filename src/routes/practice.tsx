import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n, LANGUAGES, type LangCode } from "@/lib/i18n";
import { INTERESTS, interestLabel } from "@/lib/interests";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSession } from "@/functions/analyze.functions";
import { generateTopic } from "@/functions/topic.functions";
import { getUserStatus, getLocalPrice } from "@/functions/paypal.functions";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { getOnboarding } from "@/functions/onboarding.functions";
import { trackEvent } from "@/lib/observability";

const FREE_LIMIT = 15;

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice speaking — SpeakUpp" },
      {
        name: "description",
        content:
          "Start a new SpeakUpp speaking session: pick a language, get a topic, think for 3 minutes, speak for 1, and receive AI feedback.",
      },
      { property: "og:title", content: "Practice speaking — SpeakUpp" },
      {
        property: "og:description",
        content: "Get a personalized speaking topic and instant AI feedback on your fluency.",
      },
    ],
  }),
  component: Practice,
});

type Phase = "idle" | "thinking" | "speaking" | "uploading" | "done";
type Feedback = {
  overall_summary: string;
  score: number;
  pronunciation_notes: string;
  fluency_notes: string;
  grammar: Array<{ issue: string; correction: string }>;
  vocabulary: Array<{ word: string; suggestion: string }>;
};

const INTERESTS_KEY = "orador.interests";

function Practice() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();

  const [language, setLanguage] = useState<LangCode>("en");
  const [interests, setInterests] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState<"A1"|"A2"|"B1"|"B2"|"C1"|"C2" | undefined>(undefined);
  const [topic, setTopic] = useState<string | null>(null);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [hasActive, setHasActive] = useState<boolean>(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speakingStartedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  // Load saved interests + onboarding preferences (preferences take precedence on first load)
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(INTERESTS_KEY);
      if (raw) setInterests(JSON.parse(raw));
    } catch {}
    if (!user) return;
    getOnboarding()
      .then((p) => {
        if (cancelled || !p) return;
        if (p.targetLanguage === "en" || p.targetLanguage === "fr" || p.targetLanguage === "ar") {
          setLanguage(p.targetLanguage);
        }
        setUserLevel(p.levelCode as "A1"|"A2"|"B1"|"B2"|"C1"|"C2");
        // Only seed interests from onboarding if user has no local picks yet
        try {
          const raw = localStorage.getItem(INTERESTS_KEY);
          const local = raw ? (JSON.parse(raw) as string[]) : [];
          if (local.length === 0 && p.interests.length > 0) {
            setInterests(p.interests);
            localStorage.setItem(INTERESTS_KEY, JSON.stringify(p.interests));
          }
        } catch {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // Load user status (session count + subscription)
  const loadStatus = async () => {
    try {
      const s = await getUserStatus();
      setSessionCount(s.sessionCount);
      setHasActive(s.hasActive);
      setStatusLoaded(true);
      if (!s.hasActive && s.sessionCount >= FREE_LIMIT - 1) {
        // preload local price for paywall display
        try {
          const p = await getLocalPrice({ data: {} });
          setPriceDisplay(p.display);
        } catch {}
      }
    } catch (e) {
      setStatusLoaded(true);
    }
  };
  useEffect(() => {
    if (user) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(INTERESTS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Phase timer
  useEffect(() => {
    if (phase !== "thinking" && phase !== "speaking") return;
    if (secondsLeft <= 0) {
      if (phase === "thinking") {
        setPhase("speaking");
        setSecondsLeft(60);
        startRecording();
      } else {
        finishRecording();
      }
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  const startRecording = async () => {
    if (speakingStartedRef.current) return;
    speakingStartedRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
    } catch (e) {
      toast.error(t.practice.micBlocked);
      setPhase("idle");
      speakingStartedRef.current = false;
    }
  };

  const finishRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) {
      setPhase("idle");
      return;
    }
    setPhase("uploading");
    const stopped = new Promise<Blob>((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
    });
    mr.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const blob = await stopped;
    setAudioUrl(URL.createObjectURL(blob));

    try {
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage.from("recordings").upload(path, blob, {
        contentType: "audio/webm",
      });
      if (upErr) throw upErr;

      // Create session row (level_id kept as 1 for schema compatibility)
      const { data: session, error: insErr } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          language,
          level_id: 1,
          topic_id: null,
          topic_prompt: topic!,
          audio_path: path,
          duration_sec: 60,
          status: "processing",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const result = await analyzeSession({
        data: {
          sessionId: session.id,
          audioPath: path,
          language,
          topic: topic!,
          levelId: 1,
          durationSec: 60,
        },
      });
      setTranscript(result.transcript);
      setFeedback(result.feedback);
      setPhase("done");
      trackEvent("session_analyzed", { language, score: result.feedback?.score });
      loadStatus();
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
      setPhase("idle");
    } finally {
      speakingStartedRef.current = false;
      mediaRecorderRef.current = null;
    }
  };

  const start = async () => {
    setStarting(true);
    try {
      let prompt: string;
      if (useCustomTopic) {
        const trimmed = customTopic.trim();
        if (trimmed.length < 5) { toast.error("Please enter a topic (at least 5 characters)."); return; }
        prompt = trimmed;
      } else {
        if (interests.length === 0) {
          toast.error("Pick at least one interest first.");
          return;
        }
        const labels = INTERESTS.filter((i) => interests.includes(i.id)).map((i) => interestLabel(i, lang));
        const res = await generateTopic({ data: { language, interests: labels, level: userLevel } });
        prompt = res.prompt;
        trackEvent("practice_topic_generated", { language, level: userLevel, cache_hit: res.cacheHit });
      }
      setTopic(prompt);
      setFeedback(null);
      setTranscript("");
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
      setPhase("thinking");
      setSecondsLeft(180);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate a topic");
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setPhase("idle");
    setTopic(null);
    setFeedback(null);
    setTranscript("");
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (loading || !user) return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader hasActive={hasActive} />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:px-6 sm:py-8">
        {phase === "idle" && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <h1 className="font-display text-3xl">{t.practice.pickLanguage}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    language === l.code ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {l.native}
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-baseline justify-between">
              <h2 className="font-display text-2xl">Your interests</h2>
              <p className="text-xs text-muted-foreground">
                {interests.length} selected
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll craft topics inspired by what you love.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = interests.includes(i.id);
                const Icon = i.icon;
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all ${
                      active
                        ? "border-terracotta bg-accent text-accent-foreground shadow-soft scale-[1.02]"
                        : "border-border bg-card text-foreground hover:border-terracotta/50 hover:bg-secondary/60"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className={`size-4 ${active ? "text-terracotta" : "text-muted-foreground group-hover:text-terracotta"}`} strokeWidth={2} />
                    <span className="font-medium">{interestLabel(i, lang)}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Custom topic</p>
                  <p className="text-xs text-muted-foreground">Write your own prompt instead.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomTopic((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition ${useCustomTopic ? "bg-accent" : "bg-muted"}`}
                  aria-pressed={useCustomTopic}
                  aria-label={useCustomTopic ? "Disable custom topic" : "Enable custom topic"}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${useCustomTopic ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              {useCustomTopic && (
                <textarea
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Describe your favorite childhood memory."
                  rows={3}
                  maxLength={400}
                  className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}
            </div>

            {(() => {
              if (!statusLoaded) return null;
              const nextSession = sessionCount + 1;
              const locked = !hasActive && sessionCount >= FREE_LIMIT;
              if (locked) {
                return (
                  <div className="mt-6 rounded-2xl border border-terracotta/40 bg-accent/30 p-5 text-center">
                    <p className="font-display text-lg">You've used all {FREE_LIMIT} free sessions</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unlock unlimited practice {priceDisplay ? `for ${priceDisplay}` : ""} — one-time payment, lifetime access.
                    </p>
                    <Link
                      to="/upgrade"
                      className="mt-4 inline-block rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft"
                    >
                      Unlock unlimited
                    </Link>
                  </div>
                );
              }
              return (
                <>
                  {!hasActive && nextSession >= 7 && nextSession <= 13 && (
                    <div className="mt-6 rounded-full bg-secondary/60 px-4 py-2 text-center text-xs text-muted-foreground">
                      {sessionCount} of {FREE_LIMIT} free sessions used
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-terracotta/70" style={{ width: `${(sessionCount / FREE_LIMIT) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {!hasActive && nextSession === 14 && (
                    <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50/40 px-4 py-3 text-center text-sm text-foreground">
                      ✨ 1 free session remaining — enjoy it!
                    </div>
                  )}
                  {!hasActive && nextSession === 15 && (
                    <div className="mt-6 rounded-2xl border border-terracotta/40 bg-accent/20 px-4 py-3 text-center text-sm text-foreground">
                      Last free session — let's make it a great one
                    </div>
                  )}
                  <button
                    onClick={start}
                    disabled={starting || (!useCustomTopic && interests.length === 0)}
                    className="mt-6 w-full rounded-full bg-accent py-4 text-lg font-medium text-accent-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {starting ? t.practice.starting : t.practice.start}
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {(phase === "thinking" || phase === "speaking") && topic && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {phase === "thinking" ? t.practice.thinking : t.practice.speaking}
            </p>
            <p className="mt-2 font-display text-5xl tabular-nums">{fmt(secondsLeft)}</p>
            <div className="mt-8 rounded-2xl bg-background p-6 shadow-inner">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.practice.yourTopic}</p>
              <p className="mt-2 font-display text-xl">{topic}</p>
            </div>
            {phase === "speaking" && (
              <>
                <div className="mt-8 flex items-center justify-center gap-3 text-muted-foreground">
                  <div className="size-3 animate-pulse rounded-full bg-destructive" />
                  <span className="text-sm">Recording…</span>
                </div>
                <button
                  onClick={() => {
                    setSecondsLeft(0);
                  }}
                  className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
                >
                  {t.practice.stopRecording}
                </button>
              </>
            )}
          </div>
        )}

        {phase === "uploading" && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-4 text-muted-foreground">{t.practice.analyzing}</p>
          </div>
        )}

        {phase === "done" && feedback && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
              <p className="mt-1 font-display text-6xl text-terracotta">{feedback.score}</p>
              <p className="mt-3 text-muted-foreground">{feedback.overall_summary}</p>
            </div>

            {!hasActive && sessionCount === FREE_LIMIT && (
              <div className="rounded-3xl border-2 border-terracotta/50 bg-gradient-to-br from-accent/30 to-peach/20 p-6 shadow-elevated">
                <p className="text-xs uppercase tracking-widest text-terracotta">✨ Premium preview</p>
                <h3 className="mt-2 font-display text-2xl">This was your last free session</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlock unlimited sessions, deeper feedback, and your full speaking history forever.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li>♾️ Unlimited practice sessions</li>
                  <li>🎯 Full pronunciation, fluency, grammar & vocabulary analysis</li>
                  <li>📈 Lifetime progress tracking</li>
                </ul>
                <Link
                  to="/upgrade"
                  className="mt-5 inline-block rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft"
                >
                  Unlock for {priceDisplay || "lifetime"} →
                </Link>
              </div>
            )}

            {audioUrl && (
              <Section title="Your recording">
                <div className="rounded-2xl bg-gradient-to-r from-peach/30 via-sunlight to-sage/40 p-4 shadow-inner ring-1 ring-border/50">
                  <audio
                    controls
                    src={audioUrl}
                    className="w-full [&::-webkit-media-controls-panel]:bg-transparent"
                  />
                </div>
              </Section>
            )}

            {transcript && (
              <Section title="Transcript">
                <p className="text-sm leading-relaxed">{transcript}</p>
              </Section>
            )}
            <Section title="Pronunciation">
              <p className="text-sm leading-relaxed">{feedback.pronunciation_notes}</p>
            </Section>
            <Section title="Fluency">
              <p className="text-sm leading-relaxed">{feedback.fluency_notes}</p>
            </Section>
            {feedback.grammar.length > 0 && (
              <Section title="Grammar">
                <ul className="space-y-2 text-sm">
                  {feedback.grammar.map((g, i) => (
                    <li key={i}>
                      <span className="text-muted-foreground line-through">{g.issue}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{g.correction}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {feedback.vocabulary.length > 0 && (
              <Section title="Vocabulary">
                <ul className="space-y-2 text-sm">
                  {feedback.vocabulary.map((v, i) => (
                    <li key={i}>
                      <span className="font-medium">{v.word}</span>
                      <span className="ml-2 text-muted-foreground">— {v.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button onClick={reset} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
                Try another
              </button>
              <Link
                to="/history"
                className="rounded-full border border-border bg-card px-6 py-3 font-medium text-foreground"
              >
                {t.nav.history}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
