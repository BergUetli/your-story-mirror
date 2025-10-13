-- Add temporary policy to allow demo user (00000000-0000-0000-0000-000000000000) to test memory features
-- This should be removed once real authentication is implemented

CREATE POLICY "Allow demo user to manage memories (TEMPORARY)"
ON public.memories
FOR ALL
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Also allow demo user to manage memory-artifact links
CREATE POLICY "Allow demo user memory-artifact links (TEMPORARY)"
ON public.memory_artifacts
FOR ALL
TO anon
USING (
  EXISTS (
    SELECT 1 FROM memories m 
    WHERE m.id = memory_artifacts.memory_id 
    AND m.user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memories m 
    WHERE m.id = memory_artifacts.memory_id 
    AND m.user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
);