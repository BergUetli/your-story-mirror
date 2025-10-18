-- Add persistent biography narrative storage system

-- Create persistent_biography table for storing AI-generated narratives
CREATE TABLE IF NOT EXISTS public.persistent_biography (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core narrative content (AI-generated)
  introduction TEXT NOT NULL,
  conclusion TEXT NOT NULL,
  
  -- Narrative metadata
  style_version TEXT DEFAULT 'proprietary_v1',
  generation_model TEXT DEFAULT 'gpt-4',
  narrative_tone TEXT DEFAULT 'reflective_optimistic',
  
  -- Tracking and versioning
  memories_included UUID[] DEFAULT '{}', -- Array of memory group IDs included in this narrative
  last_regenerated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  regeneration_reason TEXT, -- 'initial_creation', 'memory_added', 'user_requested', 'manual_edit'
  
  -- Generation parameters for consistency
  generation_prompt_hash TEXT, -- Hash of the prompt used for consistency checks
  narrative_length_preference TEXT DEFAULT 'comprehensive', -- 'brief', 'moderate', 'comprehensive'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one biography per user
  UNIQUE(user_id)
);

-- Create biography_chapters table for storing chapter narratives
CREATE TABLE IF NOT EXISTS public.biography_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persistent_biography_id UUID NOT NULL REFERENCES public.persistent_biography(id) ON DELETE CASCADE,
  
  -- Chapter content
  chapter_title TEXT NOT NULL,
  chapter_content TEXT NOT NULL,
  chapter_sequence INTEGER NOT NULL, -- Order of chapters (1, 2, 3...)
  
  -- Chapter metadata
  life_period TEXT NOT NULL, -- 'early_years', 'adolescence', 'young_adult', 'building_years', 'flourishing', 'wisdom_years'
  age_range_start INTEGER, -- Starting age for this chapter
  age_range_end INTEGER, -- Ending age for this chapter
  memory_group_ids UUID[] DEFAULT '{}', -- Memory groups included in this chapter
  
  -- AI generation tracking
  generated_by TEXT DEFAULT 'gpt-4',
  generation_context JSONB DEFAULT '{}'::jsonb, -- Context used for generating this chapter
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique sequence per biography
  UNIQUE(persistent_biography_id, chapter_sequence)
);

-- Enable RLS on both tables
ALTER TABLE public.persistent_biography ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biography_chapters ENABLE ROW LEVEL SECURITY;

-- RLS policies for persistent_biography
CREATE POLICY "Users can view their own persistent biography"
ON public.persistent_biography
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own persistent biography"
ON public.persistent_biography
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persistent biography"
ON public.persistent_biography
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persistent biography"
ON public.persistent_biography
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for biography_chapters
CREATE POLICY "Users can view their own biography chapters"
ON public.biography_chapters
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own biography chapters"
ON public.biography_chapters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biography chapters"
ON public.biography_chapters
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biography chapters"
ON public.biography_chapters
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_persistent_biography_user_id ON public.persistent_biography(user_id);
CREATE INDEX IF NOT EXISTS idx_persistent_biography_last_regenerated ON public.persistent_biography(last_regenerated_at DESC);

CREATE INDEX IF NOT EXISTS idx_biography_chapters_user_id ON public.biography_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_biography_chapters_biography_id ON public.biography_chapters(persistent_biography_id);
CREATE INDEX IF NOT EXISTS idx_biography_chapters_sequence ON public.biography_chapters(persistent_biography_id, chapter_sequence);
CREATE INDEX IF NOT EXISTS idx_biography_chapters_life_period ON public.biography_chapters(life_period);

-- Add triggers for updated_at
CREATE TRIGGER update_persistent_biography_updated_at
  BEFORE UPDATE ON public.persistent_biography
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biography_chapters_updated_at
  BEFORE UPDATE ON public.biography_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.persistent_biography IS 'Stores AI-generated persistent biography narratives that remain consistent across sessions';
COMMENT ON TABLE public.biography_chapters IS 'Stores individual chapter narratives for the persistent biography, organized by life periods';
COMMENT ON COLUMN public.persistent_biography.memories_included IS 'Array of memory group IDs that were used to generate this narrative version';
COMMENT ON COLUMN public.persistent_biography.generation_prompt_hash IS 'Hash of the generation prompt to ensure consistency when checking for regeneration needs';
COMMENT ON COLUMN public.biography_chapters.memory_group_ids IS 'Memory groups that contributed to this specific chapter narrative';