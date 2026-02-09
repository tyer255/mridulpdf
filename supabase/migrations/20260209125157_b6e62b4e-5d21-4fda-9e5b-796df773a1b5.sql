
-- Add is_ocr flag to world_pdfs table
ALTER TABLE public.world_pdfs ADD COLUMN IF NOT EXISTS is_ocr boolean DEFAULT false;
