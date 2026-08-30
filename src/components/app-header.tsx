import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, Sparkles, Shield } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

type Props = {
  /** Show the "Pro" badge (or "Upgrade" pill) — pass undefined to hide entirely */
  hasActive?: boolean;
  /** Whether to display the admin link. This should be set by a route-level auth check. */
  isAdmin?: boolean;
};

/**
 * Shared header for authenticated routes.
 * - Desktop: inline links
 * - Mobile (<md): hamburger that opens a slide-down sheet
 */
export function AppHeader({ hasActive, isAdmin = false }: Props) {
  const { signOut, user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const ProPill =
    hasActive === undefined ? null : hasActive ? (
      <Link
        to="/account"
        onClick={close}
        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta hover:bg-terracotta/20"
      >
        <Sparkles className="size-3.5" /> Pro
      </Link>
    ) : (
      <Link
        to="/upgrade"
        onClick={close}
        className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta hover:bg-terracotta/20"
      >
        Upgrade
      </Link>
    );

  return (
    <>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <Logo />

        {/* Desktop nav */}
        <div className="hidden items-center gap-5 text-sm md:flex">
          <Link to="/practice" className="text-muted-foreground hover:text-foreground">
            {t.nav.practice}
          </Link>
          <Link to="/history" className="text-muted-foreground hover:text-foreground">
            {t.nav.history}
          </Link>
          <Link to="/rankings" className="text-muted-foreground hover:text-foreground">
            {t.nav.rankings}
          </Link>
          {ProPill}
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/10"
            >
              <Shield className="size-3.5" /> Admin
            </Link>
          )}
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            {t.nav.signOut}
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute inset-x-0 top-0 rounded-b-3xl border-b border-border bg-card p-4 shadow-elevated">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={close}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border text-foreground"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-1 text-base">
              <MobileLink to="/dashboard" onClick={close}>
                {t.nav.dashboard}
              </MobileLink>
              <MobileLink to="/practice" onClick={close}>
                {t.nav.practice}
              </MobileLink>
              <MobileLink to="/history" onClick={close}>
                {t.nav.history}
              </MobileLink>
              <MobileLink to="/rankings" onClick={close}>
                {t.nav.rankings}
              </MobileLink>
              <MobileLink to="/account" onClick={close}>
                Account
              </MobileLink>
              {isAdmin && (
                <MobileLink to="/admin" onClick={close}>
                  Admin
                </MobileLink>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              {ProPill ?? <span />}
              <button
                onClick={() => {
                  close();
                  signOut();
                }}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t.nav.signOut}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileLink({
  to,
  children,
  onClick,
}: {
  to: "/dashboard" | "/practice" | "/history" | "/rankings" | "/account" | "/admin";
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-2xl px-4 py-3 font-medium text-foreground transition hover:bg-secondary"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {children}
    </Link>
  );
}
