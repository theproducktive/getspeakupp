import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { trackEvent } from "@/lib/observability";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — SpeakUpp" },
      {
        name: "description",
        content:
          "Create a free SpeakUpp account and start practicing English, French, or Arabic speaking with AI feedback.",
      },
      { property: "og:title", content: "Create your account — SpeakUpp" },
      {
        property: "og:description",
        content: "Sign up free and start improving your speaking with personalized AI feedback.",
      },
    ],
  }),
  component: Signup,
});

function Signup() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    trackEvent("signup_completed", { method: "email" });
    toast.success("Check your email to confirm your account.");
    nav({ to: "/login" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ambient px-4 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
        <Link to="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">← SpeakUpp</Link>
        <h1 className="font-display text-3xl">{t.auth.signUpTitle}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-name" className="text-sm font-medium">{t.auth.displayName}</label>
            <input id="signup-name" name="displayName" autoComplete="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="signup-email" className="text-sm font-medium">{t.auth.email}</label>
            <input id="signup-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="signup-password" className="text-sm font-medium">{t.auth.password}</label>
            <input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button disabled={loading} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
            {loading ? "..." : t.auth.signUp}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.auth.hasAccount} <Link to="/login" className="font-medium text-foreground underline">{t.auth.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
