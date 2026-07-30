-- Supabase migration.
-- Create a table for assignment-specific materials
CREATE TABLE public.assignment_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.assignment_materials IS 'Stores materials (files, links, etc.) specific to an assignment.';
COMMENT ON COLUMN public.assignment_materials.assignment_id IS 'FK to the assignment this material belongs to.';

-- Enable Row Level Security on the new table
ALTER TABLE public.assignment_materials ENABLE ROW LEVEL SECURITY;

-- We need a way to check if the current user owns the course that an assignment belongs to.
-- This helper function will make our RLS policies cleaner and more efficient.
CREATE OR REPLACE FUNCTION public.is_course_owner_for_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = p_assignment_id AND c.user_id = auth.uid()
  );
$$;

-- Create a policy that allows users to view materials for assignments in their courses.
CREATE POLICY "Users can view assignment materials for their courses"
ON public.assignment_materials
FOR SELECT
USING (public.is_course_owner_for_assignment(assignment_id));

-- Create a policy that allows users to add materials to assignments in their courses.
CREATE POLICY "Users can add assignment materials for their courses"
ON public.assignment_materials
FOR INSERT
WITH CHECK (public.is_course_owner_for_assignment(assignment_id));

-- Create a policy that allows users to update materials for assignments in their courses.
CREATE POLICY "Users can update assignment materials for their courses"
ON public.assignment_materials
FOR UPDATE
USING (public.is_course_owner_for_assignment(assignment_id));

-- Create a policy that allows users to delete materials for assignments in their courses.
CREATE POLICY "Users can delete assignment materials for their courses"
ON public.assignment_materials
FOR DELETE
USING (public.is_course_owner_for_assignment(assignment_id));
