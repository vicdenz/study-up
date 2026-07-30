-- Supabase migration.
-- Create a table to store AI chat sessions
CREATE TABLE public.ai_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments ON DELETE SET NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments to clarify column purposes
COMMENT ON COLUMN public.ai_chats.assignment_id IS 'Link to a specific assignment, can be null';
COMMENT ON COLUMN public.ai_chats.messages IS 'Stores the full chat history as a JSON array';

-- Enable Row Level Security to ensure data privacy
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

-- Create policies to control access to the ai_chats table
CREATE POLICY "Users can view their own AI chats"
  ON public.ai_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI chats"
  ON public.ai_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI chats"
  ON public.ai_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI chats"
  ON public.ai_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the 'updated_at' timestamp on modification
CREATE TRIGGER handle_ai_chats_updated_at
  BEFORE UPDATE ON public.ai_chats
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
