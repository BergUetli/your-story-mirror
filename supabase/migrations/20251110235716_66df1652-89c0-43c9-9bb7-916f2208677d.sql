-- Add memory_mode column to memories table to support different conversation modes
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS memory_mode text DEFAULT 'past' CHECK (memory_mode IN ('present', 'past', 'future', 'wisdom'));

-- Add flag to show on timeline
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS show_on_timeline boolean DEFAULT true;

-- Add future_date for future memories/plans
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS future_date date;

-- Update existing memories to have proper mode
UPDATE memories 
SET memory_mode = 'past', show_on_timeline = true 
WHERE memory_mode IS NULL;

-- Create index for better querying
CREATE INDEX IF NOT EXISTS idx_memories_mode ON memories(memory_mode);
CREATE INDEX IF NOT EXISTS idx_memories_timeline ON memories(show_on_timeline) WHERE show_on_timeline = true;