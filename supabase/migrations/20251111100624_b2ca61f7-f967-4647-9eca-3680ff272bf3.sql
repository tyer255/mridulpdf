-- Create world_pdfs table for globally shared PDFs
CREATE TABLE public.world_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  download_url TEXT NOT NULL,
  thumbnail_url TEXT,
  size BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  page_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.world_pdfs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read world PDFs (they're global)
CREATE POLICY "World PDFs are viewable by everyone" 
ON public.world_pdfs 
FOR SELECT 
USING (true);

-- Allow anyone to insert world PDFs
CREATE POLICY "Anyone can upload world PDFs" 
ON public.world_pdfs 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_world_pdfs_timestamp ON public.world_pdfs(timestamp DESC);
CREATE INDEX idx_world_pdfs_tags ON public.world_pdfs USING GIN(tags);