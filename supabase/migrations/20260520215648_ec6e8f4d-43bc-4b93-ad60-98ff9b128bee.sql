CREATE TABLE IF NOT EXISTS public.topic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lang text NOT NULL CHECK (lang IN ('en','fr','ar')),
  level text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  interests_hash text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic_cache_lookup
  ON public.topic_cache (lang, level, interests_hash, created_at DESC);

ALTER TABLE public.topic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_cache_authenticated_read"
  ON public.topic_cache
  FOR SELECT
  TO authenticated
  USING (true);
