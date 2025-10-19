-- Quick fix script for voice_recordings guest user support
-- Run this manually in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can create their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON public.voice_recordings;

-- Change user_id to TEXT to support guest IDs
ALTER TABLE public.voice_recordings ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Create new policies for both authenticated and guest users
CREATE POLICY "Authenticated users view own recordings"
ON public.voice_recordings FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Authenticated users create own recordings"  
ON public.voice_recordings FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view guest recordings"
ON public.voice_recordings FOR SELECT  
USING (user_id LIKE 'guest-%');

CREATE POLICY "Anyone can create guest recordings"
ON public.voice_recordings FOR INSERT
WITH CHECK (user_id LIKE 'guest-%');