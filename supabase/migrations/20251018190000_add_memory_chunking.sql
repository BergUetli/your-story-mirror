-- Add memory chunking support and biography table for general topics

-- Add memory grouping fields to memories table
ALTER TABLE public.memories
ADD COLUMN memory_group_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN chunk_sequence INTEGER DEFAULT 1,
ADD COLUMN total_chunks INTEGER DEFAULT 1,
ADD COLUMN memory_location TEXT,
ADD COLUMN memory_date DATE;

-- Create index for efficient memory group retrieval
CREATE INDEX IF NOT EXISTS idx_memories_group_id ON public.memories(memory_group_id);
CREATE INDEX IF NOT EXISTS idx_memories_group_sequence ON public.memories(memory_group_id, chunk_sequence);
CREATE INDEX IF NOT EXISTS idx_memories_date ON public.memories(memory_date DESC);

-- Create biography table for general topics (not specific memories)
CREATE TABLE IF NOT EXISTS public.biography_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_category TEXT NOT NULL, -- e.g., 'personality', 'values', 'preferences', 'background', 'philosophy', 'relationships'
  topic_title TEXT NOT NULL,
  content TEXT NOT NULL,
  context_notes TEXT, -- Additional context or prompts that led to this entry
  source TEXT DEFAULT 'solin_conversation', -- How this was collected ('solin_conversation', 'manual_entry', etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on biography_entries
ALTER TABLE public.biography_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for biography_entries
CREATE POLICY "Users can view their own biography entries"
ON public.biography_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own biography entries"
ON public.biography_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biography entries"
ON public.biography_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biography entries"
ON public.biography_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for biography_entries
CREATE INDEX IF NOT EXISTS idx_biography_entries_user_id ON public.biography_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_biography_entries_category ON public.biography_entries(topic_category);
CREATE INDEX IF NOT EXISTS idx_biography_entries_created_at ON public.biography_entries(created_at DESC);

-- Add trigger for updated_at on biography_entries
CREATE TRIGGER update_biography_entries_updated_at
  BEFORE UPDATE ON public.biography_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining memory chunking
COMMENT ON COLUMN public.memories.memory_group_id IS 'Groups related memory chunks together. All chunks of the same memory share this ID.';
COMMENT ON COLUMN public.memories.chunk_sequence IS 'Sequence number of this chunk within the memory group (1, 2, 3, etc.)';
COMMENT ON COLUMN public.memories.total_chunks IS 'Total number of chunks in this memory group';
COMMENT ON TABLE public.biography_entries IS 'Stores general biographical information and topics that are not specific memories but describe the user as a person.';