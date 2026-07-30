-- Supabase migration.
-- Create a table to track user activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  related_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  related_course_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own activities
CREATE POLICY "Users can view their own activities" 
  ON public.activities 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own activities
CREATE POLICY "Users can create their own activities" 
  ON public.activities 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create an index for better performance on user_id queries
CREATE INDEX idx_activities_user_id ON public.activities(user_id);

-- Create an index for better performance on created_at queries (for ordering)
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
