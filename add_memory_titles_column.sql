-- Add memory_titles column to voice_recordings table for easy identification
-- This allows showing memory titles in the archive interface

-- Add the memory_titles column
ALTER TABLE public.voice_recordings 
ADD COLUMN IF NOT EXISTS memory_titles TEXT[];

-- Add index for the new column for better query performance
CREATE INDEX IF NOT EXISTS idx_voice_recordings_memory_titles 
ON public.voice_recordings 
USING GIN(memory_titles);

-- Add comment for documentation
COMMENT ON COLUMN public.voice_recordings.memory_titles IS 'Array of memory titles created during this recording session for easy identification in archive';