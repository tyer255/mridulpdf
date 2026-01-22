-- Drop existing overly permissive policies on world_pdfs
DROP POLICY IF EXISTS "Anyone can upload world PDFs" ON public.world_pdfs;
DROP POLICY IF EXISTS "Allow delete for world PDFs" ON public.world_pdfs;

-- Create secure INSERT policy - users must be authenticated and can only insert with their own user_id
CREATE POLICY "Authenticated users can upload world PDFs" 
ON public.world_pdfs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid()::text = user_id
);

-- Create secure DELETE policy - users can only delete their own documents
CREATE POLICY "Users can delete own world PDFs" 
ON public.world_pdfs 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- Drop overly permissive storage DELETE policies
DROP POLICY IF EXISTS "Anyone can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete thumbnails" ON storage.objects;

-- Create secure storage DELETE policies - users can only delete files in their own folder
CREATE POLICY "Users can delete own PDFs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'pdfs' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own thumbnails" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update INSERT policies for storage to require authentication
DROP POLICY IF EXISTS "Anyone can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload thumbnails" ON storage.objects;

CREATE POLICY "Authenticated users can upload PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdfs' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can upload thumbnails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'thumbnails' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);