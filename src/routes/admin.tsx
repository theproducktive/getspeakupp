// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import {
  checkAdmin,
  getAdminOverview,
  listUsers,
  setUserRole,
  listPaymentRequests,
  decidePaymentRequest,
  listSubscriptions,
  updateSubscriptionStatus,
  listAllSessions,
  listTopics,
  upsertTopic,
  deleteTopic,
  listAuditLog,
} from "@/functions/admin.functions";
import { Shield, Users, CreditCard, BadgeCheck, Mic, MessageSquare, Activity, Loader2 } from "lucide-react";
import { isMonetizationEnabled } from "@/lib/monetization";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SpeakUpp" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Tab = "overview" | "users" | "payments" | "subscriptions" | "sessions" | "topics" | "audit";

// -----------------------------------------------------------------------------
// Main Admin Dashboard
// -----------------------------------------------------------------------------
function AdminPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    checkAdmin()
      .then((r) => {
        if (!r.isAdmin) {
          toast.error("Admin access required");
          nav({ to: "/dashboard" });
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => {
        nav({ to: "/dashboard" });
      });
  }, [user, nav]);

  if (loading || authorized !== true) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ambient">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Overview", Icon: Activity },
    { id: "users", label: "Users", Icon: Users },
    { id: "payments", label: "Payments", Icon: CreditCard },
    { id: "subscriptions", label: "Subscriptions", Icon: BadgeCheck },
    { id: "sessions", label: "Sessions", Icon: Mic },
    { id: "topics", label: "Topics", Icon: MessageSquare },
    { id: "audit", label: "Audit log", Icon: Shield },
  ];

  return (
    <div className="min-h-dvh bg-ambient">
      <AppHeader isAdmin={authorized === true} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-2 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-terracotta" />
            <h1 className="font-display text-3xl tracking-tight">Admin</h1>
          </div>
          {!isMonetizationEnabled() && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Monetization: Dormant (Free Mode)
            </span>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                tab === id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "subscriptions" && <SubscriptionsTab />}
        {tab === "sessions" && <SessionsTab />}
        {tab === "topics" && <TopicsTab />}
        {tab === "audit" && <AuditTab />}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// UI Helpers
// -----------------------------------------------------------------------------
function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Overview Tab
// -----------------------------------------------------------------------------
function OverviewTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  useEffect(() => {
    getAdminOverview().then(setData).catch(() => {});
  }, []);
  if (!data) return <Loading />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card label="Total users" value={data.usersCount} />
      <Card label="Active subscribers" value={data.activeSubs} />
      <Card label="Pending payments" value={data.pendingPayments} />
      <Card label="Sessions (7d)" value={data.sessions7} />
      <Card label="Sessions (30d)" value={data.sessions30} />
      <Card label="Revenue (MAD)" value={data.revenueMad} />
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Users Management
// -----------------------------------------------------------------------------
function UsersTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof listUsers>> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = () => {
    listUsers({ data: { search: search || undefined, page } })
      .then(setData)
      .catch(() => setData(null));
  };
  useEffect(() => { reload(); }, [page]);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    setBusyId(userId);
    try {
      await setUserRole({ data: { userId, role: "admin", grant: !isAdmin } });
      toast.success(isAdmin ? "Admin removed" : "Promoted to admin");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          reload();
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm"
        />
        <button className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">Search</button>
      </form>

      {!data ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Sessions</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.displayName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.subStatus === "active" ? (
                        <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-medium text-terracotta">Pro</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{u.sessionsCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={busyId === u.id}
                        onClick={() => toggleAdmin(u.id, isAdmin)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {isAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-full border border-border px-3 py-1 text-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Payments Management
// -----------------------------------------------------------------------------
function PaymentsTab() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [data, setData] = useState<Awaited<ReturnType<typeof listPaymentRequests>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => {
    listPaymentRequests({ data: { status } }).then(setData).catch(() => setData(null));
  };
  useEffect(() => { reload(); }, [status]);

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusy(id);
    try {
      await decidePaymentRequest({ data: { id, decision } });
      toast.success(`Payment ${decision}d`);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs ${status === s ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {!data ? (
        <Loading />
      ) : data.requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No requests</p>
      ) : (
        <div className="space-y-3">
          {data.requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.displayName ?? r.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} · status: {r.status}
                  </p>
                  {r.note && <p className="mt-2 text-sm">{r.note}</p>}
                  {r.proof_url && /^https:\/\//i.test(r.proof_url) && (
                    <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-terracotta underline">
                      View proof
                    </a>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, "approve")}
                      className="rounded-full bg-sage/30 px-3 py-1 text-xs font-medium text-foreground hover:bg-sage/50 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, "reject")}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subscriptions Management
// -----------------------------------------------------------------------------
function SubscriptionsTab() {
  const [status, setStatus] = useState<"active" | "pending" | "expired" | "rejected" | "all">("active");
  const [data, setData] = useState<Awaited<ReturnType<typeof listSubscriptions>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => listSubscriptions({ data: { status } }).then(setData).catch(() => setData(null));
  useEffect(() => { reload(); }, [status]);

  const update = async (id: string, newStatus: "active" | "expired" | "rejected") => {
    setBusy(id);
    try {
      await updateSubscriptionStatus({ data: { id, status: newStatus } });
      toast.success("Updated");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["active", "pending", "expired", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs ${status === s ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">MAD</th>
                <th className="px-4 py-3">Paid at</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.subs.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">{s.displayName ?? s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{s.plan}</td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 tabular-nums">{s.amount_mad ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status !== "expired" && (
                      <button
                        disabled={busy === s.id}
                        onClick={() => update(s.id, "expired")}
                        className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Mark expired
                      </button>
                    )}
                    {s.status !== "active" && (
                      <button
                        disabled={busy === s.id}
                        onClick={() => update(s.id, "active")}
                        className="ml-2 rounded-full bg-sage/30 px-3 py-1 text-xs hover:bg-sage/50 disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sessions Management
// -----------------------------------------------------------------------------
function SessionsTab() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof listAllSessions>> | null>(null);
  useEffect(() => {
    listAllSessions({ data: { page } }).then(setData).catch(() => setData(null));
  }, [page]);

  return (
    <div className="space-y-4">
      {!data ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Lvl</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">{s.displayName ?? s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 uppercase">{s.language}</td>
                  <td className="px-4 py-3 tabular-nums">{s.level_id}</td>
                  <td className="max-w-md truncate px-4 py-3" title={s.topic_prompt}>{s.topic_prompt}</td>
                  <td className="px-4 py-3 tabular-nums">{s.score ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between">
        <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40">← Prev</button>
        <button onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border px-3 py-1 text-sm">Next →</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Topics Management
// -----------------------------------------------------------------------------
function TopicsTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listTopics>> | null>(null);
  const [form, setForm] = useState({ id: "", language: "en" as "en" | "fr" | "ar", levelId: 1, prompt: "", category: "" });
  const [busy, setBusy] = useState(false);

  const reload = () => listTopics().then(setData).catch(() => setData(null));
  useEffect(() => { reload(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertTopic({
        data: {
          id: form.id || undefined,
          language: form.language,
          levelId: Number(form.levelId),
          prompt: form.prompt,
          category: form.category || undefined,
        },
      });
      toast.success(form.id ? "Updated" : "Added");
      setForm({ id: "", language: "en", levelId: 1, prompt: "", category: "" });
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this topic?")) return;
    try {
      await deleteTopic({ data: { id } });
      toast.success("Deleted");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
        <select
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value as any })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="ar">AR</option>
        </select>
        <input
          type="number"
          min={1}
          max={10}
          value={form.levelId}
          onChange={(e) => setForm({ ...form, levelId: Number(e.target.value) })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Prompt"
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          className="sm:col-span-4 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button disabled={busy} className="sm:col-span-1 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
          {form.id ? "Update" : "Add topic"}
        </button>
      </form>

      {!data ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Lvl</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.topics.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 uppercase">{t.language}</td>
                  <td className="px-4 py-3 tabular-nums">{t.level_id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.category ?? "—"}</td>
                  <td className="max-w-md px-4 py-3">{t.prompt}</td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        setForm({
                          id: t.id,
                          language: t.language as any,
                          levelId: t.level_id,
                          prompt: t.prompt,
                          category: t.category ?? "",
                        })
                      }
                      className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove(t.id)} className="rounded-full border border-border px-3 py-1 text-xs text-terracotta hover:bg-muted">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Audit Log
// -----------------------------------------------------------------------------
function AuditTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listAuditLog>> | null>(null);
  useEffect(() => {
    listAuditLog().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <Loading />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Target user</th>
            <th className="px-4 py-3">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
              <td className="px-4 py-3 text-xs">{e.target_user_id?.slice(0, 8) ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {JSON.stringify(e.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
