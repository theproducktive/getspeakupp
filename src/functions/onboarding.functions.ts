// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/backend/auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.backend";

const SaveSchema = z.object({
  targetLanguage: z.enum(["en", "fr", "ar"]),
  levelCode: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  weeklyGoal: z.number().int().min(1).max(14),
  interests: z.array(z.string().min(1).max(40)).max(20),
});

// -----------------------------------------------------------------------------
// Get Onboarding RPC
// -----------------------------------------------------------------------------
export const getOnboarding = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("user_preferences")
      .select("target_language, level_code, weekly_goal, interests, onboarded_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      targetLanguage: data.target_language,
      levelCode: data.level_code,
      weeklyGoal: data.weekly_goal,
      interests: data.interests ?? [],
      onboardedAt: data.onboarded_at,
    };
  });

// -----------------------------------------------------------------------------
// Save Onboarding RPC
// -----------------------------------------------------------------------------
export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("user_preferences")
      .upsert({
        user_id: userId,
        target_language: data.targetLanguage,
        level_code: data.levelCode,
        weekly_goal: data.weeklyGoal,
        interests: data.interests,
        onboarded_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
