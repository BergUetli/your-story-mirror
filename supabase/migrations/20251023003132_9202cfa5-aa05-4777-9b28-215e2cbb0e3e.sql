-- Add missing RLS policies for voice_recordings table
-- Currently missing UPDATE and DELETE policies which can cause issues

-- Allow authenticated users to update their own recordings
CREATE POLICY "Authenticated users update own recordings"
ON public.voice_recordings
FOR UPDATE
TO authenticated
USING ((auth.uid())::text = user_id)
WITH CHECK ((auth.uid())::text = user_id);

-- Allow authenticated users to delete their own recordings
CREATE POLICY "Authenticated users delete own recordings"
ON public.voice_recordings
FOR DELETE
TO authenticated
USING ((auth.uid())::text = user_id);

-- Allow guest users to update their recordings
CREATE POLICY "Guest users can update guest recordings"
ON public.voice_recordings
FOR UPDATE
TO anon
USING (user_id LIKE 'guest-%')
WITH CHECK (user_id LIKE 'guest-%');

-- Allow guest users to delete their recordings
CREATE POLICY "Guest users can delete guest recordings"
ON public.voice_recordings
FOR DELETE
TO anon
USING (user_id LIKE 'guest-%');