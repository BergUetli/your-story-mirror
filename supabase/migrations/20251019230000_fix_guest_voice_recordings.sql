-- Fix voice_recordings table to support guest users
-- This migration updates the table structure and RLS policies to allow guest recordings

-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
    -- Drop the foreign key constraint to allow guest user IDs
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%voice_recordings_user_id_fkey%'
    ) THEN
        ALTER TABLE public.voice_recordings DROP CONSTRAINT voice_recordings_user_id_fkey;
    END IF;
END $$;

-- Update the user_id column to TEXT if it's still UUID
DO $$
BEGIN
    -- Check if column is UUID and alter it to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_recordings' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Convert UUID column to TEXT
        ALTER TABLE public.voice_recordings ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;
END $$;

-- Drop existing RLS policies that might conflict
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can create their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Public can view guest recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Public can create guest recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Public can update guest recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Public can delete guest recordings" ON public.voice_recordings;

-- Create new RLS policies that handle both authenticated users and guests
-- Authenticated users: user_id matches their UUID (as text)
CREATE POLICY "Authenticated users can view their own recordings"
ON public.voice_recordings
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND auth.uid()::text = user_id
);

CREATE POLICY "Authenticated users can create their own recordings"
ON public.voice_recordings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid()::text = user_id
);

CREATE POLICY "Authenticated users can update their own recordings"
ON public.voice_recordings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND auth.uid()::text = user_id
);

CREATE POLICY "Authenticated users can delete their own recordings"
ON public.voice_recordings
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND auth.uid()::text = user_id
);

-- Guest users: anyone can access guest recordings (user_id starts with 'guest-')
CREATE POLICY "Anyone can view guest recordings"
ON public.voice_recordings
FOR SELECT
USING (user_id LIKE 'guest-%');

CREATE POLICY "Anyone can create guest recordings"
ON public.voice_recordings
FOR INSERT
WITH CHECK (user_id LIKE 'guest-%');

CREATE POLICY "Anyone can update guest recordings"
ON public.voice_recordings
FOR UPDATE
USING (user_id LIKE 'guest-%');

CREATE POLICY "Anyone can delete guest recordings"
ON public.voice_recordings
FOR DELETE
USING (user_id LIKE 'guest-%');

-- Add comment explaining the change
COMMENT ON COLUMN public.voice_recordings.user_id IS 'User identifier - either a UUID for authenticated users or guest-{timestamp} for guest sessions';