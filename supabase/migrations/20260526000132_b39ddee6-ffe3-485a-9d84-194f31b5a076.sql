-- Immutable per-user session usage log. One row per session ever created.
-- Survives session deletion so free-tier quota cannot be reset by deleting rows.
CREATE TABLE IF NOT EXISTS public.session_usage (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_usage_user_id_idx ON public.session_usage(user_id);

ALTER TABLE public.session_usage ENABLE ROW LEVEL SECURITY;

-- No policies: only service-role (supabaseAdmin) can read/write. Users cannot
-- SELECT, INSERT, UPDATE, or DELETE — preventing tampering with the counter.

-- Backfill from existing sessions so current users keep their accurate usage.
INSERT INTO public.session_usage (session_id, user_id, created_at)
SELECT id, user_id, created_at FROM public.sessions
ON CONFLICT (session_id) DO NOTHING;

-- Trigger: every new session permanently logs a usage row.
CREATE OR REPLACE FUNCTION public.log_session_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.session_usage (session_id, user_id, created_at)
  VALUES (NEW.id, NEW.user_id, COALESCE(NEW.created_at, now()))
  ON CONFLICT (session_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_session_usage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_session_usage ON public.sessions;
CREATE TRIGGER trg_log_session_usage
AFTER INSERT ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_session_usage();