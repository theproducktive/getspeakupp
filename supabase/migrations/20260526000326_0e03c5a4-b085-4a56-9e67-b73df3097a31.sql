CREATE TABLE IF NOT EXISTS public.topic_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topic_generation_log_user_created_idx
  ON public.topic_generation_log(user_id, created_at DESC);

ALTER TABLE public.topic_generation_log ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.