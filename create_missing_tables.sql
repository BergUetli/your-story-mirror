-- SQL to create missing artifacts and memory_artifacts tables
-- Run this in your Supabase SQL Editor

-- Create artifacts table for storing images, audio, video separately from memories
CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('image', 'audio', 'video', 'document')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for many-to-many relationship between memories and artifacts
CREATE TABLE IF NOT EXISTS public.memory_artifacts (
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, artifact_id)
);

-- Enable RLS on artifacts
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on memory_artifacts
ALTER TABLE public.memory_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for artifacts (users can access artifacts linked to their memories)
CREATE POLICY "Users can view artifacts linked to their memories"
ON public.artifacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memory_artifacts ma
    JOIN public.memories m ON ma.memory_id = m.id
    WHERE ma.artifact_id = artifacts.id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create artifacts"
ON public.artifacts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update artifacts linked to their memories"
ON public.artifacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memory_artifacts ma
    JOIN public.memories m ON ma.memory_id = m.id
    WHERE ma.artifact_id = artifacts.id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete artifacts linked to their memories"
ON public.artifacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memory_artifacts ma
    JOIN public.memories m ON ma.memory_id = m.id
    WHERE ma.artifact_id = artifacts.id
    AND m.user_id = auth.uid()
  )
);

-- RLS policies for memory_artifacts
CREATE POLICY "Users can view their memory-artifact links"
ON public.memory_artifacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = memory_artifacts.memory_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create memory-artifact links"
ON public.memory_artifacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = memory_artifacts.memory_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their memory-artifact links"
ON public.memory_artifacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = memory_artifacts.memory_id
    AND m.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON public.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON public.artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_artifacts_memory_id ON public.memory_artifacts(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_artifacts_artifact_id ON public.memory_artifacts(artifact_id);

-- Add trigger for updated_at on artifacts (assuming update_updated_at_column function exists)
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();