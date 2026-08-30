CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;

DROP POLICY IF EXISTS audit_admin_insert ON public.admin_audit_log;
CREATE POLICY audit_admin_insert
ON public.admin_audit_log
FOR INSERT
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND admin_id = auth.uid());

DROP POLICY IF EXISTS audit_admin_select ON public.admin_audit_log;
CREATE POLICY audit_admin_select
ON public.admin_audit_log
FOR SELECT
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS pr_self_select ON public.payment_requests;
CREATE POLICY pr_self_select
ON public.payment_requests
FOR SELECT
USING (auth.uid() = user_id OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS sessions_admin_all ON public.sessions;
CREATE POLICY sessions_admin_all
ON public.sessions
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS subs_admin_all ON public.subscriptions;
CREATE POLICY subs_admin_all
ON public.subscriptions
FOR ALL
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS subs_self_select ON public.subscriptions;
CREATE POLICY subs_self_select
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS topic_cache_admin_insert ON public.topic_cache;
CREATE POLICY topic_cache_admin_insert
ON public.topic_cache
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS topic_cache_admin_update ON public.topic_cache;
CREATE POLICY topic_cache_admin_update
ON public.topic_cache
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS topics_admin_write ON public.topics;
CREATE POLICY topics_admin_write
ON public.topics
FOR ALL
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all
ON public.user_roles
FOR ALL
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_self_select ON public.user_roles;
CREATE POLICY user_roles_self_select
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR app_private.has_role(auth.uid(), 'admin'::public.app_role));