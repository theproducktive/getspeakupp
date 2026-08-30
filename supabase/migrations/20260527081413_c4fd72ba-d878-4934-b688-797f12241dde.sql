-- Sessions: strict user ownership for reads, no user deletes, and limited user updates.
DROP POLICY IF EXISTS sessions_self_all ON public.sessions;
DROP POLICY IF EXISTS sessions_self_select ON public.sessions;
DROP POLICY IF EXISTS sessions_self_update ON public.sessions;
DROP POLICY IF EXISTS sessions_self_delete ON public.sessions;
DROP POLICY IF EXISTS sessions_admin_all ON public.sessions;
DROP POLICY IF EXISTS sessions_self_insert ON public.sessions;

CREATE POLICY sessions_self_select
ON public.sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY sessions_admin_all
ON public.sessions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY sessions_self_insert
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND score IS NULL
  AND transcript IS NULL
  AND status = 'pending'
  AND duration_sec IS NULL
);

CREATE POLICY sessions_self_update
ON public.sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND score IS NULL
  AND transcript IS NULL
  AND status = 'pending'
  AND duration_sec IS NULL
);

-- Ensure normal clients cannot delete sessions; service-role backend code still bypasses RLS.

-- Payment requests: keep user inserts pending and immutable review fields empty.
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_user_insert_pending,
  ADD CONSTRAINT payment_requests_user_insert_pending
  CHECK (status = 'pending'::payment_status OR reviewed_by IS NOT NULL OR reviewed_at IS NOT NULL);

DROP POLICY IF EXISTS pr_self_insert ON public.payment_requests;
CREATE POLICY pr_self_insert
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::payment_status
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

DROP POLICY IF EXISTS pr_admin_update ON public.payment_requests;
-- Only trusted backend code using the service role should change status. No regular-user/admin RLS update policy is defined.

-- fx_cache: backend/service role only. This policy does not grant anon or authenticated access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_cache TO service_role;
DROP POLICY IF EXISTS fx_cache_service_role_select ON public.fx_cache;
CREATE POLICY fx_cache_service_role_select
ON public.fx_cache
FOR SELECT
TO service_role
USING (true);

-- topic_cache: expose only public server-generated cache rows to authenticated users.
ALTER TABLE public.topic_cache
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS topic_cache_authenticated_read ON public.topic_cache;
CREATE POLICY topic_cache_authenticated_read
ON public.topic_cache
FOR SELECT
TO authenticated
USING (is_public = true);

-- topic_generation_log: users may inspect only their own rows; writes remain service-role only.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_generation_log TO service_role;
DROP POLICY IF EXISTS topic_generation_log_self_select ON public.topic_generation_log;
CREATE POLICY topic_generation_log_self_select
ON public.topic_generation_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);