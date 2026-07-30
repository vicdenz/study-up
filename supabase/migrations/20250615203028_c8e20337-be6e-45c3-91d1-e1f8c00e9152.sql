-- Supabase migration.
-- This function helps check if a user owns a course. We need it for the security rules.
CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id AND c.user_id = auth.uid()
  );
$$;

-- First, let's remove all the old policies on the 'course-materials' bucket to avoid any conflicts.
DROP POLICY IF EXISTS "Users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their course assignment materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their assignment materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their assignment materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their assignment materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view materials from their courses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete materials from their courses" ON storage.objects;

-- This new policy allows users to upload files, and it checks if it's for a course or for an assignment.
CREATE POLICY "Authenticated users can upload to course-materials" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'course-materials' AND
    auth.role() = 'authenticated' AND
    (
        -- This handles course-level materials (path: {course_id}/{filename})
        (
            array_length(storage.foldername(name), 1) = 1 AND
            public.is_course_owner((storage.foldername(name))[1]::uuid)
        ) OR
        -- This handles assignment-level materials (path: assignment_materials/{user_id}/{assignment_id}/{filename})
        (
            array_length(storage.foldername(name), 1) = 3 AND
            (storage.foldername(name))[1] = 'assignment_materials' AND
            auth.uid()::text = (storage.foldername(name))[2]
        )
    )
);

-- This new policy allows users to view files, checking for course or assignment ownership.
CREATE POLICY "Users can view materials from their courses" ON storage.objects
FOR SELECT USING (
    bucket_id = 'course-materials' AND
    (
        -- This handles course-level materials
        (
            array_length(storage.foldername(name), 1) = 1 AND
            public.is_course_owner((storage.foldername(name))[1]::uuid)
        ) OR
        -- This handles assignment-level materials
        (
            array_length(storage.foldername(name), 1) = 3 AND
            (storage.foldername(name))[1] = 'assignment_materials' AND
            public.is_course_owner_for_assignment((storage.foldername(name))[3]::uuid)
        )
    )
);

-- This new policy allows users to delete their files, for both courses and assignments.
CREATE POLICY "Users can delete materials from their courses" ON storage.objects
FOR DELETE USING (
    bucket_id = 'course-materials' AND
    auth.role() = 'authenticated' AND
    (
        -- This handles course-level materials
        (
            array_length(storage.foldername(name), 1) = 1 AND
            public.is_course_owner((storage.foldername(name))[1]::uuid)
        ) OR
        -- This handles assignment-level materials
        (
            array_length(storage.foldername(name), 1) = 3 AND
            (storage.foldername(name))[1] = 'assignment_materials' AND
            auth.uid()::text = (storage.foldername(name))[2]
        )
    )
);
