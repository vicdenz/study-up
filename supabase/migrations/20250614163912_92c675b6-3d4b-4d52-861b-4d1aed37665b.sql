-- Supabase migration.
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  color TEXT DEFAULT 'bg-blue-500',
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create course materials table
CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'document', 'video', 'link', 'image'
  url TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for courses
CREATE POLICY "Users can view their own courses" ON public.courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" ON public.courses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for assignments
CREATE POLICY "Users can view assignments for their courses" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assignments for their courses" ON public.assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assignments for their courses" ON public.assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments for their courses" ON public.assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for course materials
CREATE POLICY "Users can view materials for their courses" ON public.course_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create materials for their courses" ON public.course_materials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update materials for their courses" ON public.course_materials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete materials for their courses" ON public.course_materials
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
