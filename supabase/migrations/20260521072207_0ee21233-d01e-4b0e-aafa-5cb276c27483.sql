
-- Drop the overly-broad FOR ALL policy that allowed users to UPDATE their own
-- sessions (including the AI-computed `score`) directly from the browser.
DROP POLICY IF EXISTS sessions_self_all ON public.sessions;

-- Recreate access as separate, narrower policies. Note: no UPDATE policy for
-- regular users — score/transcript/status are written by the server via the
-- service-role client in analyzeSession.
CREATE POLICY sessions_self_select ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY sessions_self_insert ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_self_delete ON public.sessions
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Admin full access (incl. UPDATE for moderation).
CREATE POLICY sessions_admin_all ON public.sessions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
