import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSessionHistory = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("id,created_at,language,level_id,topic_prompt,score,status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("getSessionHistory error", error);
      return { rows: [] as Array<{ id: string; created_at: string; language: string; level_id: number; topic_prompt: string; score: number | null; status: string }> };
    }
    return { rows: data ?? [] };
  });
