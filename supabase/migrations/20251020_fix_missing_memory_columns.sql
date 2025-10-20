-- Fix missing memory table columns that the application expects

-- Add missing columns to memories table
ALTER TABLE public.memories 
ADD COLUMN IF NOT EXISTS is_primary_chunk BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_memories_is_primary_chunk ON public.memories(is_primary_chunk) WHERE is_primary_chunk = TRUE;
CREATE INDEX IF NOT EXISTS idx_memories_source_type ON public.memories(source_type);

-- Add comments explaining the new columns
COMMENT ON COLUMN public.memories.is_primary_chunk IS 'Indicates if this is the primary/first chunk of a memory group';
COMMENT ON COLUMN public.memories.source_type IS 'How this memory was created: manual, conversation_auto_save, solin_conversation, etc.';

-- Update existing memories to have proper values
UPDATE public.memories 
SET is_primary_chunk = (chunk_sequence = 1 OR chunk_sequence IS NULL)
WHERE is_primary_chunk IS NULL;

-- Ensure all memories have a source_type
UPDATE public.memories 
SET source_type = 'manual'
WHERE source_type IS NULL;

-- Add constraint to ensure chunk_sequence is positive
ALTER TABLE public.memories 
ADD CONSTRAINT memories_chunk_sequence_positive 
CHECK (chunk_sequence > 0);