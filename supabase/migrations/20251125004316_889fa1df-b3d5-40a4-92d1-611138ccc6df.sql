-- Add memory status tracking for incomplete/draft memories
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'complete' CHECK (status IN ('incomplete', 'complete', 'draft'));

ALTER TABLE memories
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN memories.status IS 'Track memory completion: incomplete (auto-saved, needs details), complete (fully processed), draft (user-created, unfinished)';

COMMENT ON COLUMN memories.needs_review IS 'Flag for memories that need user attention or completion';

-- Create index for efficient incomplete memory queries
CREATE INDEX IF NOT EXISTS idx_memories_incomplete 
ON memories(user_id, status, created_at DESC) 
WHERE status IN ('incomplete', 'draft');

-- Create index for needs_review flag
CREATE INDEX IF NOT EXISTS idx_memories_needs_review 
ON memories(user_id, needs_review, created_at DESC) 
WHERE needs_review = true;