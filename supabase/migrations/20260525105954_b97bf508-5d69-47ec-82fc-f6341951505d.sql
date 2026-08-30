-- Allow authenticated users to read cached topics
CREATE POLICY "topic_cache_authenticated_read"
ON public.topic_cache
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to insert (server-side uses service role and bypasses RLS)
CREATE POLICY "topic_cache_admin_insert"
ON public.topic_cache
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update (server-side uses service role and bypasses RLS)
CREATE POLICY "topic_cache_admin_update"
ON public.topic_cache
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));