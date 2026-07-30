-- Harden storage and cross-table ownership checks for existing deployments.

UPDATE storage.buckets
SET public = false,
    file_size_limit = 20971520
WHERE id = 'course-materials';

CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = p_course_id
      AND course.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_owner_for_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments AS assignment
    JOIN public.courses AS course ON course.id = assignment.course_id
    WHERE assignment.id = p_assignment_id
      AND course.user_id = (SELECT auth.uid())
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can upload to course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view materials from their courses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete materials from their courses" ON storage.objects;

CREATE POLICY "Authenticated users can upload to course-materials"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND public.is_course_owner((storage.foldername(name))[1]::uuid)
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 3
      AND (storage.foldername(name))[1] = 'assignment_materials'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      AND public.is_course_owner_for_assignment((storage.foldername(name))[3]::uuid)
    )
  )
);

CREATE POLICY "Users can view materials from their courses"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND public.is_course_owner((storage.foldername(name))[1]::uuid)
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 3
      AND (storage.foldername(name))[1] = 'assignment_materials'
      AND public.is_course_owner_for_assignment((storage.foldername(name))[3]::uuid)
    )
  )
);

CREATE POLICY "Users can delete materials from their courses"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    (
      array_length(storage.foldername(name), 1) = 1
      AND public.is_course_owner((storage.foldername(name))[1]::uuid)
    )
    OR
    (
      array_length(storage.foldername(name), 1) = 3
      AND (storage.foldername(name))[1] = 'assignment_materials'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      AND public.is_course_owner_for_assignment((storage.foldername(name))[3]::uuid)
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
CREATE POLICY "Users can create their own notes"
ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (course_id IS NULL OR public.is_course_owner(course_id))
);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (course_id IS NULL OR public.is_course_owner(course_id))
);

DROP POLICY IF EXISTS "Users can create their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can create their own study sessions"
ON public.study_sessions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_course_owner(course_id)
);

DROP POLICY IF EXISTS "Users can update their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can update their own study sessions"
ON public.study_sessions
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_course_owner(course_id)
);

DROP POLICY IF EXISTS "Users can create their own AI chats" ON public.ai_chats;
CREATE POLICY "Users can create their own AI chats"
ON public.ai_chats
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    assignment_id IS NULL
    OR public.is_course_owner_for_assignment(assignment_id)
  )
);

DROP POLICY IF EXISTS "Users can update their own AI chats" ON public.ai_chats;
CREATE POLICY "Users can update their own AI chats"
ON public.ai_chats
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    assignment_id IS NULL
    OR public.is_course_owner_for_assignment(assignment_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_materials_assignment_id ON public.assignment_materials(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON public.ai_chats(user_id);

-- The UI models one current summary per note. Remove legacy duplicates before
-- enforcing that invariant so upsert can update instead of creating duplicates.
DELETE FROM public.note_summaries AS older
USING public.note_summaries AS newer
WHERE older.note_id = newer.note_id
  AND (
    older.created_at < newer.created_at
    OR (older.created_at = newer.created_at AND older.id < newer.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_summaries_note_id
ON public.note_summaries(note_id);
