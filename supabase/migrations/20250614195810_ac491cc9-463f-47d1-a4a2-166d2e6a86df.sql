-- Supabase migration.
-- Add a column to store extracted text from course materials
ALTER TABLE public.course_materials ADD COLUMN content TEXT;

-- Add a comment to describe the new column
COMMENT ON COLUMN public.course_materials.content IS 'Extracted text content from the material file, if applicable (e.g., from PDFs).';
