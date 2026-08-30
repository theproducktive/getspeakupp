CREATE TABLE IF NOT EXISTS public.fx_cache (
  base text PRIMARY KEY,
  rates jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fx_cache ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server) reads/writes this table.