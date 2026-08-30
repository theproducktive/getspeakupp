
CREATE OR REPLACE FUNCTION public.force_session_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.score := NULL;
  NEW.transcript := NULL;
  NEW.status := 'pending';
  NEW.duration_sec := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.force_session_insert_defaults() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_force_session_insert_defaults ON public.sessions;
CREATE TRIGGER trg_force_session_insert_defaults
BEFORE INSERT ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.force_session_insert_defaults();

-- Tighten INSERT RLS: own row + must submit safe defaults
DROP POLICY IF EXISTS sessions_self_insert ON public.sessions;
CREATE POLICY sessions_self_insert
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND score IS NULL
  AND transcript IS NULL
  AND status = 'pending'
);

ALTER TABLE public.sessions ALTER COLUMN status SET DEFAULT 'pending';
