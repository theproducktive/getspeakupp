
-- 1) Tighten sessions_self_update: only allow updates to pending sessions
DROP POLICY IF EXISTS sessions_self_update ON public.sessions;
CREATE POLICY sessions_self_update ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND score IS NULL
    AND transcript IS NULL
    AND status = 'pending'
    AND duration_sec IS NULL
  );

-- 2) Lock immutable session fields on user UPDATE via trigger (admin/service role bypass)
CREATE OR REPLACE FUNCTION public.lock_session_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypass (no auth.uid())
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Admin bypass
  IF app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify a completed session';
  END IF;

  IF NEW.user_id     IS DISTINCT FROM OLD.user_id
     OR NEW.language    IS DISTINCT FROM OLD.language
     OR NEW.level_id    IS DISTINCT FROM OLD.level_id
     OR NEW.topic_id    IS DISTINCT FROM OLD.topic_id
     OR NEW.topic_prompt IS DISTINCT FROM OLD.topic_prompt
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at
     OR NEW.score       IS DISTINCT FROM OLD.score
     OR NEW.transcript  IS DISTINCT FROM OLD.transcript
     OR NEW.status      IS DISTINCT FROM OLD.status
     OR NEW.duration_sec IS DISTINCT FROM OLD.duration_sec
  THEN
    RAISE EXCEPTION 'Only audio_path can be updated on a session';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_session_immutable_fields ON public.sessions;
CREATE TRIGGER trg_lock_session_immutable_fields
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.lock_session_immutable_fields();

-- 3) Tighten feedback_self_insert: require session ownership
DROP POLICY IF EXISTS feedback_self_insert ON public.feedback;
CREATE POLICY feedback_self_insert ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND s.user_id = auth.uid()
    )
  );

-- 4) Prevent duplicate feedback rows per session (defense in depth)
CREATE UNIQUE INDEX IF NOT EXISTS feedback_session_id_unique ON public.feedback(session_id);
