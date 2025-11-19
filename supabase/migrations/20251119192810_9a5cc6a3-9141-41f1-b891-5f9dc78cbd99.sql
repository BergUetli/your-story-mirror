-- Enable RLS on user_phone_numbers table if not already enabled
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_phone_numbers
-- Users can only view their own phone numbers
CREATE POLICY "Users can view own phone numbers"
ON public.user_phone_numbers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own phone numbers
CREATE POLICY "Users can insert own phone numbers"
ON public.user_phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own phone numbers
CREATE POLICY "Users can update own phone numbers"
ON public.user_phone_numbers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can only delete their own phone numbers
CREATE POLICY "Users can delete own phone numbers"
ON public.user_phone_numbers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);