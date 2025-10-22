-- Create characters table to track people in user's life
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL, -- e.g., "mother", "best friend", "colleague"
  description TEXT, -- details about this person
  personality_traits TEXT[], -- array of traits
  important_dates JSONB DEFAULT '[]'::jsonb, -- birthdays, anniversaries, etc.
  shared_memories TEXT[], -- references to memories involving this person
  is_user BOOLEAN DEFAULT false, -- flag for if they become a user later
  linked_user_id UUID, -- if they become a user, link here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create solin_conversations table to store conversation history
CREATE TABLE public.solin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'solin')),
  message TEXT NOT NULL,
  context_used JSONB, -- metadata about what context was used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solin_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for characters
CREATE POLICY "Users can view their own characters"
  ON public.characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own characters"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON public.characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
  ON public.characters FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for solin_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.solin_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.solin_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_characters_user_id ON public.characters(user_id);
CREATE INDEX idx_solin_conversations_user_id ON public.solin_conversations(user_id);
CREATE INDEX idx_solin_conversations_created_at ON public.solin_conversations(created_at DESC);

-- Create trigger for updated_at on characters
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();