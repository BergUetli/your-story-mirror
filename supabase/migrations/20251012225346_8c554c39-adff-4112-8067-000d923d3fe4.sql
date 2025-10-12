-- Add memory_date column to store when the memory actually occurred
ALTER TABLE public.memories
ADD COLUMN memory_date DATE;

-- Add memory_location column to store where the memory occurred
ALTER TABLE public.memories
ADD COLUMN memory_location TEXT;

-- Add index for efficient date-based queries
CREATE INDEX idx_memories_memory_date ON public.memories(memory_date);

-- Add comment for documentation
COMMENT ON COLUMN public.memories.memory_date IS 'The actual date when the memory occurred (not when it was recorded)';
COMMENT ON COLUMN public.memories.memory_location IS 'The location where the memory occurred';