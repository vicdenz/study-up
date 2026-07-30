-- Supabase migration.
-- Create a storage bucket for course materials if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old, less-secure policies if they exist, to avoid conflicts
DROP POLICY IF EXISTS "Users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their course materials" ON storage.objects;

-- Create policy for authenticated users to insert files.
-- This policy ensures users can only upload to a path that includes their own user ID.
CREATE POLICY "Users can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course_materials' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[3]
);

-- Create a policy for viewing files.
-- This ensures that only users who own the course can view the associated materials.
-- While the bucket is public (direct links work for anyone), this protects against unauthorized listing of files.
CREATE POLICY "Users can view their course assignment materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  public.is_course_owner_for_assignment(((storage.foldername(name))[4])::uuid)
);

-- Create a policy for deleting files.
-- This policy ensures users can only delete files from a path that includes their own user ID.
CREATE POLICY "Users can delete their course materials" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course_materials' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[3]
);
