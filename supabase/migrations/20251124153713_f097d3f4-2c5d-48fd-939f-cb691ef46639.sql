-- Create memory_insights table for storing extracted insights
CREATE TABLE IF NOT EXISTS memory_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Extracted insights (JSONB for flexibility)
  insights JSONB NOT NULL DEFAULT '{
    "people": [],
    "places": [],
    "dates": [],
    "events": [],
    "themes": [],
    "emotions": [],
    "objects": [],
    "relationships": [],
    "time_periods": []
  }'::jsonb,
  
  -- Conversation context analysis
  conversation_context JSONB NOT NULL DEFAULT '{
    "key_moments": [],
    "emotional_tone": "",
    "narrative_arc": ""
  }'::jsonb,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{
    "word_count": 0,
    "estimated_time_span": null,
    "confidence_scores": {
      "date_extraction": 0,
      "location_extraction": 0,
      "people_extraction": 0
    }
  }'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_insights_memory_id ON memory_insights(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_insights_user_id ON memory_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_insights_created_at ON memory_insights(created_at DESC);

-- GIN index for JSONB searching
CREATE INDEX IF NOT EXISTS idx_memory_insights_insights ON memory_insights USING gin(insights);
CREATE INDEX IF NOT EXISTS idx_memory_insights_context ON memory_insights USING gin(conversation_context);

-- Enable Row Level Security
ALTER TABLE memory_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insights"
  ON memory_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
  ON memory_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON memory_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
  ON memory_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Update memories table with tags and metadata columns
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{
  "people": [],
  "places": [],
  "dates": [],
  "events": [],
  "themes": [],
  "emotions": [],
  "objects": [],
  "relationships": [],
  "time_periods": []
}'::jsonb;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
  "processed_at": null,
  "word_count": 0,
  "confidence_scores": {}
}'::jsonb;

-- Add GIN index for tag searching
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING gin(tags);

-- Add index for memory_date
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON memories(memory_date);