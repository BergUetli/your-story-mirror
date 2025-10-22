-- Create user_profiles table with full schema
-- This table stores comprehensive user profile information for personalized experiences

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  preferred_name TEXT,
  age INTEGER,
  location TEXT,
  occupation TEXT,
  relationship_status TEXT,
  
  -- Personal Background
  cultural_background TEXT[],
  languages_spoken TEXT[],
  hometown TEXT,
  education_background TEXT,
  
  -- Key Relationships (stored as JSONB for flexibility)
  family_members JSONB DEFAULT '[]'::jsonb,
  close_friends JSONB DEFAULT '[]'::jsonb,
  significant_others JSONB DEFAULT '[]'::jsonb,
  
  -- Life Experiences & Interests
  major_life_events JSONB DEFAULT '[]'::jsonb,
  hobbies_interests TEXT[],
  career_history JSONB DEFAULT '[]'::jsonb,
  travel_experiences TEXT[],
  
  -- Values & Personality
  core_values TEXT[],
  personality_traits TEXT[],
  life_goals TEXT[],
  fears_concerns TEXT[],
  
  -- Cultural & Social Context
  religious_spiritual_beliefs TEXT,
  political_views TEXT,
  social_causes TEXT[],
  cultural_influences TEXT[],
  
  -- Communication Preferences
  communication_style TEXT,
  topics_of_interest TEXT[],
  sensitive_topics TEXT[],
  
  -- Profile Metadata
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  first_conversation_completed BOOLEAN NOT NULL DEFAULT false,
  first_conversation_completed_at TIMESTAMP WITH TIME ZONE,
  profile_completeness_score INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
ON user_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Comprehensive user profile information for personalized experiences and narrative context';
COMMENT ON COLUMN user_profiles.preferred_name IS 'User''s preferred first name for display (e.g., "Rishi")';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed initial onboarding flow';
COMMENT ON COLUMN user_profiles.first_conversation_completed IS 'Whether user has completed their first conversation with Solin';
COMMENT ON COLUMN user_profiles.profile_completeness_score IS 'Score from 0-100 indicating how complete the profile is';

-- Create profile for existing users who don't have one yet
INSERT INTO user_profiles (user_id, onboarding_completed, first_conversation_completed, profile_completeness_score)
SELECT id, false, false, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Verification
DO $$
DECLARE
    table_exists boolean;
    policy_count int;
    profile_count int;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) INTO table_exists;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_profiles' 
      AND schemaname = 'public';
    
    SELECT COUNT(*) INTO profile_count
    FROM user_profiles;
    
    RAISE NOTICE '✅ user_profiles table exists: %', table_exists;
    RAISE NOTICE '✅ Created % RLS policies', policy_count;
    RAISE NOTICE '✅ Found % user profiles', profile_count;
END $$;
