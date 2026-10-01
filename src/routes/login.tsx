// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Route Configuration
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SpeakUpp" },
      {
        name: "description",
        content:
          "Sign in to SpeakUpp to continue your AI-guided speaking practice in English, French, or Arabic.",
      },
      { property: "og:title", content: "Sign in — SpeakUpp" },
      {
        property: "og:description",
        content: "Sign in to SpeakUpp to continue your speaking practice journey.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    nav({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ambient px-4 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
        <Link to="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">← SpeakUpp</Link>
        <h1 className="font-display text-3xl">{t.auth.signInTitle}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium">{t.auth.email}</label>
            <input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="login-password" className="text-sm font-medium">{t.auth.password}</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button disabled={loading} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
            {loading ? "..." : t.auth.signIn}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.auth.noAccount} <Link to="/signup" className="font-medium text-foreground underline">{t.auth.signUp}</Link>
        </p>
      </div>
    </div>
  );
}
