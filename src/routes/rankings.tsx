// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n, LANGUAGES, type LangCode } from "@/lib/i18n";
import { getRankings, type RankingRow } from "@/functions/rankings.functions";
import { Trophy, Medal, Award } from "lucide-react";
import { AppHeader } from "@/components/app-header";

// -----------------------------------------------------------------------------
// Route Configuration
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — SpeakUpp" },
      { name: "description", content: "See top speakers and where you stand on the leaderboard." },
    ],
  }),
  component: Rankings,
});

// -----------------------------------------------------------------------------
// Types & UI Components
// -----------------------------------------------------------------------------
type Range = "all" | "month" | "week";

function MeRow({
  rank,
  row,
}: {
  rank: number;
  row: RankingRow;
}) {
// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------
  return (
    <div className="sticky bottom-4 mt-6 rounded-2xl border-2 border-terracotta bg-card p-4 shadow-elevated">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-2xl w-10 text-terracotta">#{rank}</span>
          <div>
            <p className="font-medium">You — {row.display_name}</p>
            <p className="text-xs text-muted-foreground">{row.sessions_count} sessions</p>
          </div>
        </div>
        <p className="font-display text-2xl text-terracotta">{row.total_score}</p>
      </div>
    </div>
  );
}

function PodiumRow({
  rank,
  row,
  isMe,
}: {
  rank: number;
  row: RankingRow;
  isMe: boolean;
}) {
  const styles =
    rank === 1
      ? {
          ring: "ring-2 ring-amber-400",
          bg: "bg-gradient-to-r from-amber-50 to-card",
          icon: <Trophy className="size-5 text-amber-500" />,
          rankText: "text-amber-500",
        }
      : rank === 2
        ? {
            ring: "ring-2 ring-zinc-300",
            bg: "bg-gradient-to-r from-zinc-50 to-card",
            icon: <Medal className="size-5 text-zinc-400" />,
            rankText: "text-zinc-400",
          }
        : {
            ring: "ring-2 ring-orange-300",
            bg: "bg-gradient-to-r from-orange-50/60 to-card",
            icon: <Award className="size-5 text-orange-500" />,
            rankText: "text-orange-500",
          };

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border border-border p-4 shadow-soft ${styles.bg} ${styles.ring} ${
        isMe ? "outline outline-2 outline-terracotta/50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 w-12">
          <span className={`font-display text-2xl ${styles.rankText}`}>{rank}</span>
          {styles.icon}
        </div>
        <div>
          <p className="font-medium">{isMe ? `You — ${row.display_name}` : row.display_name}</p>
          <p className="text-xs text-muted-foreground">{row.sessions_count} sessions</p>
        </div>
      </div>
      <p className="font-display text-2xl text-terracotta">{row.total_score}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
function Rankings() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [language, setLanguage] = useState<LangCode>("en");
  const [range, setRange] = useState<Range>("all");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [me, setMe] = useState<{ rank: number } & RankingRow | null>(null);
  const [totalRanked, setTotalRanked] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

// -----------------------------------------------------------------------------
// Data Loading
// -----------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    setBusy(true);
    getRankings({ data: { language, range, minSessions: 3, limit: 50 } })
      .then((r) => {
        setRows(r.rows);
        setMe(r.me as any);
        setTotalRanked(r.totalRanked);
      })
      .finally(() => setBusy(false));
  }, [language, range, user]);

  if (loading || !user)
    return <div className="flex min-h-dvh items-center justify-center bg-ambient">...</div>;

  const inTop50 = me && me.rank <= 50;

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-display text-4xl">{t.nav.rankings}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Top 50 speakers · minimum 3 sessions to qualify
        </p>

        {/* Language tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
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

        {/* Range filter */}
        <div className="mt-3 inline-flex rounded-full border border-border bg-card p-1 text-xs">
          {([
            { v: "all", label: "All time" },
            { v: "month", label: "This month" },
            { v: "week", label: "This week" },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setRange(opt.v)}
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                range === opt.v ? "bg-terracotta text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {totalRanked} qualified speaker{totalRanked === 1 ? "" : "s"}
        </p>

        <div className="mt-6 space-y-2">
          {busy && <p className="text-muted-foreground">Loading…</p>}
          {!busy && rows.length === 0 && (
            <p className="text-muted-foreground">
              No rankings yet. Be the first — complete 3 sessions to qualify.
            </p>
          )}
          {rows.map((r, i) => {
            const rank = i + 1;
            const isMe = r.user_id === user.id;
            if (rank <= 3) return <PodiumRow key={r.user_id} rank={rank} row={r} isMe={isMe} />;
            return (
              <div
                key={r.user_id}
                className={`flex items-center justify-between rounded-2xl border border-border p-4 shadow-soft ${
                  isMe ? "bg-secondary outline outline-2 outline-terracotta/50" : "bg-card"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-2xl w-10 text-muted-foreground">{rank}</span>
                  <div>
                    <p className="font-medium">{isMe ? `You — ${r.display_name}` : r.display_name}</p>
                    <p className="text-xs text-muted-foreground">{r.sessions_count} sessions</p>
                  </div>
                </div>
                <p className="font-display text-2xl text-terracotta">{r.total_score}</p>
              </div>
            );
          })}
        </div>

        {/* "Where you stand" pill if outside top 50 */}
        {me && !inTop50 && <MeRow rank={me.rank} row={me} />}
        {!me && !busy && rows.length > 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Complete 3 sessions in {LANGUAGES.find((l) => l.code === language)?.native} to appear on the board.
          </p>
        )}
      </main>
    </div>
  );
}
