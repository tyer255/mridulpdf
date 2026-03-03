
-- Create user_pdfs table for authenticated users' private PDFs (cross-device sync)
CREATE TABLE public.user_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  download_url TEXT NOT NULL,
  thumbnail_url TEXT,
  size BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  page_count INTEGER,
  is_ocr BOOLEAN DEFAULT false,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_pdfs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own PDFs
CREATE POLICY "Users can view own PDFs"
  ON public.user_pdfs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own PDFs
CREATE POLICY "Users can insert own PDFs"
  ON public.user_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
  ON public.user_pdfs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own PDFs
CREATE POLICY "Users can update own PDFs"
  ON public.user_pdfs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
