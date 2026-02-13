-- Allow anyone (including guests) to upload to pdfs bucket under 'private/' folder
CREATE POLICY "Anyone can upload private PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = 'private');

-- Allow anyone to upload private thumbnails
CREATE POLICY "Anyone can upload private thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'private');

-- Allow anyone to delete private PDFs (for cleanup)
CREATE POLICY "Anyone can delete private PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = 'private');

-- Allow anyone to delete private thumbnails
CREATE POLICY "Anyone can delete private thumbnails"
ON storage.objects
FOR DELETE
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'private');