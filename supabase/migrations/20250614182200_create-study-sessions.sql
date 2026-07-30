-- Supabase migration.
-- Create study_sessions table
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own study sessions
CREATE POLICY "Users can view their own study sessions" 
  ON public.study_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own study sessions
CREATE POLICY "Users can create their own study sessions" 
  ON public.study_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own study sessions
CREATE POLICY "Users can update their own study sessions" 
  ON public.study_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own study sessions
CREATE POLICY "Users can delete their own study sessions" 
  ON public.study_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_course_id ON public.study_sessions(course_id);
CREATE INDEX idx_study_sessions_scheduled_date ON public.study_sessions(scheduled_date);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.study_sessions 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
