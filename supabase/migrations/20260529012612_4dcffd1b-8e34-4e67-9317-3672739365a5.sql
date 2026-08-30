
-- Restrictive policy: only admins may INSERT into user_roles (defense-in-depth on top of default-deny and the enforce_sole_admin_email trigger)
CREATE POLICY "user_roles_insert_admin_only"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

-- Add admin DELETE policy for topic_cache (no other DELETE policy = default-deny for non-admins)
CREATE POLICY "topic_cache_admin_delete"
  ON public.topic_cache
  FOR DELETE
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));
