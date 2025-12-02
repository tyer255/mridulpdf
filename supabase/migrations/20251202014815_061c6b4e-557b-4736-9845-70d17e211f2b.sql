-- Create storage buckets for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('pdfs', 'pdfs', true, 52428800, ARRAY['application/pdf']::text[]),
  ('thumbnails', 'thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDFs bucket
CREATE POLICY "Anyone can view PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdfs');

CREATE POLICY "Anyone can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Anyone can delete PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdfs');

-- Storage policies for thumbnails bucket
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can delete thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails');

-- Update world_pdfs table to use storage paths instead of base64
ALTER TABLE public.world_pdfs 
  ALTER COLUMN download_url TYPE text,
  ALTER COLUMN thumbnail_url TYPE text;

COMMENT ON COLUMN public.world_pdfs.download_url IS 'Storage path: pdfs/user_id/pdf_id.pdf';
COMMENT ON COLUMN public.world_pdfs.thumbnail_url IS 'Storage path: thumbnails/user_id/pdf_id.jpg';