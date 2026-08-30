import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/server/auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Helper: assert the calling user is an admin via trusted server-side lookup.
 * Throws 403 otherwise.
 */
async function assertAdmin(ctx: { supabase: any; userId: string; claims?: any }) {
  // Defense in depth: verify both the role AND the JWT email match the single allowed admin.
  // Email is sourced from server env (ADMIN_EMAIL) to avoid hardcoding identities in source.
  const allowedAdminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (!allowedAdminEmail) {
    throw new Response("Server misconfigured: ADMIN_EMAIL not set", { status: 500 });
  }
  const email = (ctx.claims?.email ?? "").toString().toLowerCase();
  if (email !== allowedAdminEmail) {
    throw new Response("Forbidden: admin only", { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (error) throw new Response("Forbidden", { status: 403 });
  if (!data) throw new Response("Forbidden: admin only", { status: 403 });
}

async function logAudit(adminId: string, action: string, opts?: {
  targetUserId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_user_id: opts?.targetUserId ?? null,
    target_id: opts?.targetId ?? null,
    metadata: (opts?.metadata ?? {}) as any,
  });
}

// ---------------- check ----------------
export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const allowedAdminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
    const email = ((context as any).claims?.email ?? "").toString().toLowerCase();
    if (!allowedAdminEmail || email !== allowedAdminEmail) return { isAdmin: false };
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    return { isAdmin: !!data };
  });

// ---------------- overview ----------------
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ count: usersCount }, { count: activeSubs }, { count: pendingPayments }, { count: sessions7 }, { count: sessions30 }, revenueRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }).gte("created_at", since7),
        supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }).gte("created_at", since30),
        supabaseAdmin.from("subscriptions").select("amount_mad").eq("status", "active"),
      ]);

    const revenueMad = (revenueRes.data ?? []).reduce((s, r: any) => s + (r.amount_mad ?? 0), 0);

    return {
      usersCount: usersCount ?? 0,
      activeSubs: activeSubs ?? 0,
      pendingPayments: pendingPayments ?? 0,
      sessions7: sessions7 ?? 0,
      sessions30: sessions30 ?? 0,
      revenueMad,
    };
  });

// ---------------- users ----------------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ search: z.string().max(120).optional(), page: z.number().int().min(0).max(500).default(0) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const pageSize = 25;

    // Pull auth.users for emails via admin API
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page + 1,
      perPage: pageSize,
    });
    if (authErr) throw new Response(authErr.message, { status: 500 });

    let users = authList.users;
    if (data.search) {
      const s = data.search.toLowerCase();
      users = users.filter((u) => (u.email ?? "").toLowerCase().includes(s));
    }
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return { users: [], page: data.page };

    const [{ data: profiles }, { data: roles }, { data: subs }, { data: sessAgg }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("subscriptions").select("user_id, status").in("user_id", ids),
      supabaseAdmin.from("sessions").select("user_id").in("user_id", ids),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const subMap = new Map((subs ?? []).map((s: any) => [s.user_id, s.status]));
    const sessionCount = new Map<string, number>();
    (sessAgg ?? []).forEach((s: any) => sessionCount.set(s.user_id, (sessionCount.get(s.user_id) ?? 0) + 1));

    return {
      page: data.page,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        displayName: (profileMap.get(u.id) as any)?.display_name ?? null,
        roles: roleMap.get(u.id) ?? [],
        subStatus: subMap.get(u.id) ?? null,
        sessionsCount: sessionCount.get(u.id) ?? 0,
      })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "user"]),
      grant: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    // Guard: never remove the last admin
    if (data.role === "admin" && !data.grant) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Response("Cannot remove the last admin", { status: 400 });
      }
    }

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Response(error.message, { status: 500 });
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Response(error.message, { status: 500 });
    }

    await logAudit(context.userId, data.grant ? "role.grant" : "role.revoke", {
      targetUserId: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

// ---------------- payment requests ----------------
export const listPaymentRequests = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = supabaseAdmin
      .from("payment_requests")
      .select("id, user_id, proof_url, note, status, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const profileMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, p.display_name ?? ""));
    }

    return { requests: (rows ?? []).map((r) => ({ ...r, displayName: profileMap.get(r.user_id) ?? null })) };
  });

export const decidePaymentRequest = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), decision: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("payment_requests")
      .select("id, user_id, status")
      .eq("id", data.id)
      .single();
    if (reqErr || !req) throw new Response("Payment request not found", { status: 404 });
    if (req.status !== "pending") throw new Response("Already reviewed", { status: 400 });

    const newStatus = data.decision === "approve" ? "approved" : "rejected";
    const { error: updErr } = await supabaseAdmin
      .from("payment_requests")
      .update({
        status: newStatus,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        ...(data.note ? { note: data.note } : {}),
      })
      .eq("id", data.id);
    if (updErr) throw new Response(updErr.message, { status: 500 });

    if (data.decision === "approve") {
      const { error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: req.user_id,
            plan: "lifetime",
            status: "active",
            paid_at: new Date().toISOString(),
            approved_by: context.userId,
          },
          { onConflict: "user_id" },
        );
      if (subErr) throw new Response(subErr.message, { status: 500 });
    }

    await logAudit(context.userId, `payment.${data.decision}`, {
      targetUserId: req.user_id,
      targetId: req.id,
    });
    return { ok: true };
  });

// ---------------- subscriptions ----------------
export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["active", "pending", "rejected", "expired", "all"]).default("active") }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, plan, status, amount_mad, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const profileMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, p.display_name ?? ""));
    }
    return { subs: (rows ?? []).map((r) => ({ ...r, displayName: profileMap.get(r.user_id) ?? null })) };
  });

export const updateSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "expired", "rejected"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("user_id")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    await logAudit(context.userId, "subscription.update_status", {
      targetUserId: row?.user_id,
      targetId: data.id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

// ---------------- sessions ----------------
export const listAllSessions = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ page: z.number().int().min(0).max(500).default(0) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const pageSize = 30;
    const from = data.page * pageSize;
    const to = from + pageSize - 1;
    const { data: rows, error } = await supabaseAdmin
      .from("sessions")
      .select("id, user_id, language, level_id, topic_prompt, score, duration_sec, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Response(error.message, { status: 500 });

    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const profileMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, p.display_name ?? ""));
    }
    return { sessions: (rows ?? []).map((r) => ({ ...r, displayName: profileMap.get(r.user_id) ?? null })), page: data.page };
  });

// ---------------- topics ----------------
export const listTopics = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("topics")
      .select("id, language, level_id, prompt, category, created_at")
      .order("language", { ascending: true })
      .order("level_id", { ascending: true })
      .limit(500);
    if (error) throw new Response(error.message, { status: 500 });
    return { topics: data ?? [] };
  });

export const upsertTopic = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      language: z.enum(["en", "fr", "ar"]),
      levelId: z.number().int().min(1).max(10),
      prompt: z.string().trim().min(3).max(500),
      category: z.string().trim().max(50).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      language: data.language,
      level_id: data.levelId,
      prompt: data.prompt,
      category: data.category ?? null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("topics")
      .upsert(payload as any)
      .select("id")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    await logAudit(context.userId, data.id ? "topic.update" : "topic.create", { targetId: row?.id });
    return { ok: true, id: row?.id };
  });

export const deleteTopic = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin.from("topics").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    await logAudit(context.userId, "topic.delete", { targetId: data.id });
    return { ok: true };
  });

// ---------------- audit log ----------------
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, admin_id, action, target_user_id, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Response(error.message, { status: 500 });
    return { entries: data ?? [] };
  });
