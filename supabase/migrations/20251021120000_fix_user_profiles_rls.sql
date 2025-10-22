-- Fix user_profiles RLS policies to allow users to read their own profiles
-- The 406 error indicates RLS is blocking legitimate access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_profiles;

-- Enable RLS (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for user_profiles

-- SELECT policy - users can read their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT policy - users can create their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy - users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE policy - users can delete their own profile (optional)
CREATE POLICY "Users can delete own profile"
ON user_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON POLICY "Users can view own profile" ON user_profiles 
IS 'Allows authenticated users to view their own profile data';

COMMENT ON POLICY "Users can insert own profile" ON user_profiles 
IS 'Allows authenticated users to create their initial profile';

COMMENT ON POLICY "Users can update own profile" ON user_profiles 
IS 'Allows authenticated users to update their profile information';

-- Verify the policies
DO $$
DECLARE
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_profiles' 
      AND schemaname = 'public';
    
    RAISE NOTICE '✅ Created % RLS policies for user_profiles table', policy_count;
END $$;
