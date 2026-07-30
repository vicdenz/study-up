-- Supabase migration.
-- Create a table to store AI summaries for notes
CREATE TABLE IF NOT EXISTS public.note_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to note_summaries table
ALTER TABLE public.note_summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for note_summaries if they exist (to handle re-runs)
DROP POLICY IF EXISTS "Users can view summaries of their own notes" ON public.note_summaries;
DROP POLICY IF EXISTS "Users can create summaries for their own notes" ON public.note_summaries;
DROP POLICY IF EXISTS "Users can update summaries of their own notes" ON public.note_summaries;
DROP POLICY IF EXISTS "Users can delete summaries of their own notes" ON public.note_summaries;

-- Create policies for note_summaries (access through note ownership)
CREATE POLICY "Users can view summaries of their own notes" 
  ON public.note_summaries 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_summaries.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create summaries for their own notes" 
  ON public.note_summaries 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_summaries.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update summaries of their own notes" 
  ON public.note_summaries 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_summaries.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete summaries of their own notes" 
  ON public.note_summaries 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_summaries.note_id 
      AND notes.user_id = auth.uid()
    )
  );

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updating the updated_at column (drop first if they exist)
DROP TRIGGER IF EXISTS update_note_summaries_updated_at ON public.note_summaries;
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;

CREATE TRIGGER update_note_summaries_updated_at 
  BEFORE UPDATE ON public.note_summaries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at 
  BEFORE UPDATE ON public.notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
