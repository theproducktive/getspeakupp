CREATE POLICY "session_usage_self_select"
  ON public.session_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);