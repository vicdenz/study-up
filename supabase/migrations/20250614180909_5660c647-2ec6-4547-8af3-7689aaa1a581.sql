-- Supabase migration.
-- Create a storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true);

-- Create policy for authenticated users to insert files
CREATE POLICY "Users can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated'
);

-- Create policy for users to view materials for their courses
CREATE POLICY "Users can view course materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated'
);

-- Create policy for users to delete their own course materials
CREATE POLICY "Users can delete their course materials" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated'
);
