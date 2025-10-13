-- Add permissive policies for demo user on artifacts table
CREATE POLICY "Allow demo user to manage artifacts (TEMPORARY)"
ON public.artifacts
AS PERMISSIVE
FOR ALL
USING (true)
WITH CHECK (true);