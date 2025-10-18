-- HOTFIX: Add missing columns to memories table for chunking and voice recordings
-- This should be run directly in the Supabase SQL editor

-- Add missing columns to memories table (if they don't exist)
DO $$
BEGIN
    -- Add memory_group_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'memory_group_id') THEN
        ALTER TABLE public.memories ADD COLUMN memory_group_id UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added memory_group_id column';
    END IF;

    -- Add chunk_sequence column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'chunk_sequence') THEN
        ALTER TABLE public.memories ADD COLUMN chunk_sequence INTEGER DEFAULT 1;
        RAISE NOTICE 'Added chunk_sequence column';
    END IF;

    -- Add total_chunks column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'total_chunks') THEN
        ALTER TABLE public.memories ADD COLUMN total_chunks INTEGER DEFAULT 1;
        RAISE NOTICE 'Added total_chunks column';
    END IF;

    -- Add memory_location column (if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'memory_location') THEN
        ALTER TABLE public.memories ADD COLUMN memory_location TEXT;
        RAISE NOTICE 'Added memory_location column';
    END IF;

    -- Add memory_date column (if it doesn't exist)  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'memory_date') THEN
        ALTER TABLE public.memories ADD COLUMN memory_date DATE;
        RAISE NOTICE 'Added memory_date column';
    END IF;
END $$;

-- Create indexes for efficient queries (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_memories_group_id ON public.memories(memory_group_id);
CREATE INDEX IF NOT EXISTS idx_memories_group_sequence ON public.memories(memory_group_id, chunk_sequence);
CREATE INDEX IF NOT EXISTS idx_memories_date ON public.memories(memory_date DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.memories.memory_group_id IS 'Groups related memory chunks together. All chunks of the same memory share this ID.';
COMMENT ON COLUMN public.memories.chunk_sequence IS 'Sequence number of this chunk within the memory group (1, 2, 3, etc.)';
COMMENT ON COLUMN public.memories.total_chunks IS 'Total number of chunks in this memory group';

-- Display success message
SELECT 'Hotfix applied successfully - missing columns added to memories table' as result;