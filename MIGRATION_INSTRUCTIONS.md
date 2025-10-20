# Database Migration Instructions

## Problem
The memories are not being saved to the database because the `memories` table is missing two required columns:
- `is_primary_chunk` (BOOLEAN)
- `source_type` (TEXT)

## Solution
You need to execute the following SQL in your Supabase dashboard:

### Step 1: Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `gulydhhzwlltkxbfnclu`
3. Go to the SQL Editor

### Step 2: Execute Migration SQL
Copy and paste this SQL into the SQL editor and run it:

```sql
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
```

### Step 3: Verify Migration
After running the SQL, you can verify it worked by running this query:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'memories' 
  AND table_schema = 'public' 
  AND column_name IN ('is_primary_chunk', 'source_type')
ORDER BY column_name;
```

You should see both columns listed.

## What This Fixes
Once this migration is applied:
1. ✅ Memories will save properly to the database
2. ✅ Auto-saved conversations will appear in the Memory Archive
3. ✅ Completed memories will show up in both Timeline and Archive
4. ✅ The "DATABASE COMMITTED" console logs will represent actual saves

## After Migration
Test the functionality by:
1. Having a conversation with the AI
2. Ending the conversation (this should auto-save as a memory)
3. Check the Memory Archive to see if the memory appears
4. Check the Timeline to see if it shows there too