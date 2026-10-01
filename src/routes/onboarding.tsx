import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { saveOnboarding, getOnboarding } from "@/functions/onboarding.functions";
import { INTERESTS, interestLabel } from "@/lib/interests";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { ArrowRight, Check, Globe2, Target, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your practice — SpeakUpp" },
      { name: "description", content: "Tell us your language, level, and interests so we can tailor your speaking practice." },
    ],
  }),
  component: Onboarding,
});

const LANGUAGES = [
  { code: "en" as const, label: "English", native: "English" },
  { code: "fr" as const, label: "French", native: "Français" },
  { code: "ar" as const, label: "Arabic", native: "العربية" },
];

const LEVELS = [
  { code: "A1" as const, label: "Beginner", desc: "I know a few words" },
  { code: "A2" as const, label: "Elementary", desc: "Simple sentences" },
  { code: "B1" as const, label: "Intermediate", desc: "Everyday conversations" },
  { code: "B2" as const, label: "Upper-Int.", desc: "Complex topics" },
  { code: "C1" as const, label: "Advanced", desc: "Fluent and nuanced" },
  { code: "C2" as const, label: "Mastery", desc: "Near-native" },
];

const GOALS = [3, 5, 7];

function Onboarding() {
  const { user, loading } = useAuth();
  const { lang: uiLang } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<"en" | "fr" | "ar">("en");
  const [level, setLevel] = useState<typeof LEVELS[number]["code"]>("A2");
  const [goal, setGoal] = useState(5);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    getOnboarding().then((p) => {
      if (p?.onboardedAt) nav({ to: "/dashboard" });
    }).catch(() => {});
  }, [user, nav]);

  const toggleInterest = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const submit = async () => {
    setSaving(true);
    try {
      await saveOnboarding({
        data: { targetLanguage: lang, levelCode: level, weeklyGoal: goal, interests },
      });
      nav({ to: "/dashboard" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user)
    return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  return (
    <div className="min-h-dvh bg-ambient">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Step {step} of 3
        </span>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-terracotta" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-10">
            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Globe2 className="size-4 text-terracotta" /> Language
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">What do you want to practice?</h1>
            <p className="mt-2 text-muted-foreground">Pick the language you'd like to speak more confidently.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {LANGUAGES.map((l) => {
                const active = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition ${
                      active
                        ? "border-terracotta bg-accent/40"
                        : "border-border bg-background hover:border-terracotta/40"
                    }`}
                  >
                    <span className="font-display text-2xl">{l.native}</span>
                    <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
              >
                Continue <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-10">
            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Target className="size-4 text-terracotta" /> Level & goal
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">Where are you starting from?</h1>
            <p className="mt-2 text-muted-foreground">Pick your current level and a weekly practice goal.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {LEVELS.map((lv) => {
                const active = level === lv.code;
                return (
                  <button
                    key={lv.code}
                    onClick={() => setLevel(lv.code)}
                    className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
                      active ? "border-terracotta bg-accent/40" : "border-border bg-background hover:border-terracotta/40"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{lv.label} <span className="text-xs text-muted-foreground">· {lv.code}</span></p>
                      <p className="text-xs text-muted-foreground">{lv.desc}</p>
                    </div>
                    {active && <Check className="size-5 text-terracotta" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Sessions per week</p>
              <div className="mt-3 flex gap-3">
                {GOALS.map((g) => {
                  const active = goal === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`flex-1 rounded-2xl border-2 px-4 py-4 transition ${
                        active ? "border-terracotta bg-accent/40" : "border-border bg-background hover:border-terracotta/40"
                      }`}
                    >
                      <p className="font-display text-2xl">{g}</p>
                      <p className="text-xs text-muted-foreground">/ week</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
              >
                Continue <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-10">
            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="size-4 text-terracotta" /> Interests
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">What do you love talking about?</h1>
            <p className="mt-2 text-muted-foreground">Pick a few — we'll use these to suggest practice topics.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = interests.includes(i.id);
                const Icon = i.icon;
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-terracotta bg-terracotta text-white"
                        : "border-border bg-background hover:border-terracotta/40"
                    }`}
                  >
                    <Icon className="size-4" strokeWidth={2} />
                    {interestLabel(i, uiLang)}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{interests.length} selected</p>

            <div className="mt-10 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-soft transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Finish setup"} <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
