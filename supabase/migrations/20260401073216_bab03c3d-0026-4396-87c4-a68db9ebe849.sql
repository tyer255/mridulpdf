
-- Allow anonymous uploads to private/ folder in pdfs bucket
CREATE POLICY "Allow anonymous uploads to private folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = 'private');

-- Allow anonymous uploads to private/ folder in thumbnails bucket
CREATE POLICY "Allow anonymous uploads to private thumbnails"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'private');

-- Allow authenticated users to upload to their own folder in pdfs bucket
CREATE POLICY "Authenticated users upload own pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow authenticated users to upload to their own folder in thumbnails bucket  
CREATE POLICY "Authenticated users upload own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users delete own pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Authenticated users delete own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);
