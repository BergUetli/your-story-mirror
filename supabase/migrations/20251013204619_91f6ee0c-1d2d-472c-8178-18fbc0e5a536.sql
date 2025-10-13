-- Fix RLS for demo user by making demo policies PERMISSIVE so they don't combine restrictively with auth.uid() policies

-- Memories table: drop and recreate demo policy as PERMISSIVE
DROP POLICY IF EXISTS "Allow demo user to manage memories (TEMPORARY)" ON public.memories;
CREATE POLICY "Allow demo user to manage memories (TEMPORARY)"
ON public.memories
AS PERMISSIVE
FOR ALL
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Memory_artifacts table: drop and recreate demo policy as PERMISSIVE
DROP POLICY IF EXISTS "Allow demo user memory-artifact links (TEMPORARY)" ON public.memory_artifacts;
CREATE POLICY "Allow demo user memory-artifact links (TEMPORARY)"
ON public.memory_artifacts
AS PERMISSIVE
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM memories m
    WHERE m.id = memory_artifacts.memory_id
      AND m.user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memories m
    WHERE m.id = memory_artifacts.memory_id
      AND m.user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
);
