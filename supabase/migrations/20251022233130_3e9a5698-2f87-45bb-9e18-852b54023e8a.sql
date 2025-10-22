-- Remove the redundant foreign key constraint on memories.user_id
-- This constraint is unnecessary because RLS policies already ensure 
-- that auth.uid() = user_id, providing the same protection

ALTER TABLE public.memories 
DROP CONSTRAINT IF EXISTS memories_user_id_fkey;