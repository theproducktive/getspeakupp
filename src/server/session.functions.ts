import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSessionDetail = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { sessionId } = data;

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("id, created_at, language, level_id, topic_prompt, score, status, transcript, audio_path, duration_sec, user_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) throw new Error("Session not found");
    if (session.user_id !== userId) throw new Error("Forbidden");

    const { data: feedback } = await supabaseAdmin
      .from("feedback")
      .select("overall_summary, pronunciation_notes, fluency_notes, grammar, vocabulary")
      .eq("session_id", sessionId)
      .maybeSingle();

    let audioUrl: string | null = null;
    if (session.audio_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("recordings")
        .createSignedUrl(session.audio_path, 60 * 60);
      audioUrl = signed?.signedUrl ?? null;
    }

    return {
      session: {
        id: session.id,
        createdAt: session.created_at,
        language: session.language,
        levelId: session.level_id,
        topic: session.topic_prompt,
        score: session.score,
        status: session.status,
        transcript: session.transcript,
        durationSec: session.duration_sec,
      },
      feedback: feedback
        ? {
            overall: feedback.overall_summary,
            pronunciation: feedback.pronunciation_notes,
            fluency: feedback.fluency_notes,
            grammar: (feedback.grammar as Array<{ issue: string; correction: string }>) ?? [],
            vocabulary: (feedback.vocabulary as Array<{ word: string; suggestion: string }>) ?? [],
          }
        : null,
      audioUrl,
    };
  });
