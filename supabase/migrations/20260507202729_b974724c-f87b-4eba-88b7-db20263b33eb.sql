CREATE POLICY "recordings_self_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'recordings' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);