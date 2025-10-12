-- Add indexes to memories table for efficient retrieval
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON public.memories(user_id, created_at DESC);

-- Add GIN index for tag search if needed
CREATE INDEX IF NOT EXISTS idx_memories_tags ON public.memories USING GIN(tags);

-- Add text search index for content
CREATE INDEX IF NOT EXISTS idx_memories_text_search ON public.memories USING GIN(to_tsvector('english', text || ' ' || title));