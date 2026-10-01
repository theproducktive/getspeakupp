// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Mic, Sparkles, Timer, Trophy, Plane, UtensilsCrossed, Music, Laptop } from "lucide-react";
import { Logo } from "@/components/logo";
import { AppHeader } from "@/components/app-header";

// -----------------------------------------------------------------------------
// Route Configuration
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "Practice speaking with AI feedback. Pick a topic, think for 3 minutes, speak for 1, and improve fluency in English, French, or Arabic.",
      },
      { property: "og:title", content: "SpeakUpp — AI Speaking Practice for English, French & Arabic" },
      {
        property: "og:description",
        content:
          "Practice speaking with AI feedback. Pick a topic, think for 3 minutes, speak for 1, and improve fluency in English, French, or Arabic.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SpeakUpp",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          description:
            "AI-powered speaking practice for English, French, and Arabic. Get real-time feedback on pronunciation, fluency, grammar, and vocabulary.",
          url: "https://orador.lovable.app",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
});

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            lang === l.code ? "bg-primary text-primary-foreground" : "text-ink-light hover:text-foreground"
          }`}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
function Landing() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-ambient text-foreground">
      {user ? (
        <AppHeader />
      ) : (
        <nav className="relative z-20 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <Logo />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LangSwitcher />
            <Link to="/login" className="hidden text-sm font-medium text-ink-light hover:text-foreground sm:inline">
              {t.nav.signIn}
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-5"
            >
              {t.nav.signUp}
            </Link>
          </div>
        </nav>
      )}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-5 pt-4 pb-16 sm:gap-16 sm:px-6 sm:pt-8 sm:pb-24 md:px-8 lg:flex-row lg:items-start lg:gap-24">
        <div className="flex w-full max-w-xl flex-1 flex-col items-center text-center lg:items-start lg:text-left">

          <h1 className="text-balance font-display text-[2.5rem] leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t.landing.title1}
            <br />
            {t.landing.title2}
          </h1>

          <p className="mt-5 max-w-[42ch] text-pretty text-base font-light leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t.landing.subtitle}
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-6 sm:mt-10 sm:flex-row sm:items-center sm:gap-8 lg:items-start">
            <Link
              to={user ? "/practice" : "/signup"}
              className="w-full max-w-xs rounded-full bg-accent px-8 py-4 text-center text-lg font-medium text-accent-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated sm:w-auto"
            >
              {t.landing.cta}
            </Link>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t.landing.languages}
              </span>
              <div className="flex flex-wrap justify-center gap-2 text-sm font-medium text-muted-foreground sm:justify-start">
                {LANGUAGES.map((l) => (
                  <span key={l.code} className="rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
                    {l.native}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Practice card preview */}
        <div className="relative mx-auto w-full max-w-sm flex-1 sm:max-w-md">
          <div className="absolute inset-0 rotate-6 scale-105 rounded-[3rem] bg-secondary opacity-60 blur-md" />
          <div className="relative flex flex-col gap-6 rounded-[3rem] border border-card/80 bg-card p-6 shadow-elevated sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2 shadow-sm">
                <div className="size-2 rounded-full bg-terracotta" />
                <span className="text-sm font-medium tabular-nums">02:47</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles className="size-3.5 text-terracotta" />
                Personalized for you
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                { Icon: Plane, l: "Travel" },
                { Icon: UtensilsCrossed, l: "Food" },
                { Icon: Music, l: "Music" },
                { Icon: Laptop, l: "Tech" },
              ].map(({ Icon, l }) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/40 bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <Icon className="size-3.5 text-terracotta" strokeWidth={2.25} />
                  {l}
                </span>
              ))}
            </div>

            <div className="rounded-3xl bg-background p-6 text-center shadow-inner">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{t.practice.yourTopic}</p>
              <p className="font-display text-xl font-medium">
                Describe a meal from your travels that you can't forget.
              </p>
            </div>

            <button className="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-5 text-lg font-medium text-primary-foreground shadow-elevated">
              <div className="size-3 animate-pulse rounded-full bg-accent" />
              {t.practice.holdToSpeak}
            </button>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-6 sm:pb-24 md:px-8">
        <h2 className="mb-8 text-center font-display text-3xl tracking-tight sm:mb-12 sm:text-4xl md:text-5xl">{t.landing.howTitle}</h2>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sparkles, title: t.landing.step1Title, desc: t.landing.step1Desc },
            { icon: Timer, title: t.landing.step2Title, desc: t.landing.step2Desc },
            { icon: Mic, title: t.landing.step3Title, desc: t.landing.step3Desc },
            { icon: Trophy, title: t.landing.step4Title, desc: t.landing.step4Desc },
          ].map((s, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-accent/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
              <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/40 via-secondary to-sage/30 shadow-soft ring-1 ring-border">
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow">
                  {i + 1}
                </span>
                <s.icon className="size-6 text-terracotta" strokeWidth={1.75} />
              </div>
              <h3 className="relative font-display text-xl font-medium">{s.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
