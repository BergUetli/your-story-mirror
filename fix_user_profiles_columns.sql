-- Fix user_profiles table by adding missing columns
-- Run this in your Supabase SQL Editor: https://gulydhhzwlltkxbfnclu.supabase.co

-- Add missing columns if they don't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hometown TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_conversation_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_conversation_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completeness_score INTEGER NOT NULL DEFAULT 0;

-- Add additional profile columns for future use
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cultural_background TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS education_background TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS close_friends JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS significant_others JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS major_life_events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hobbies_interests TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS travel_experiences TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS core_values TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personality_traits TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS life_goals TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS fears_concerns TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS religious_spiritual_beliefs TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS political_views TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_causes TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cultural_influences TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS communication_style TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS topics_of_interest TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sensitive_topics TEXT[];

-- Ensure timestamps exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for updated_at if it doesn't exist
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
COMMENT ON COLUMN user_profiles.age IS 'User''s age in years';
COMMENT ON COLUMN user_profiles.location IS 'User''s current location (city, country)';
COMMENT ON COLUMN user_profiles.hometown IS 'User''s birthplace or hometown';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed initial onboarding flow';
COMMENT ON COLUMN user_profiles.first_conversation_completed IS 'Whether user has completed their first conversation with Solin';
COMMENT ON COLUMN user_profiles.profile_completeness_score IS 'Score from 0-100 indicating how complete the profile is';

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ user_profiles table has been updated with all required columns!';
    RAISE NOTICE '✅ You can now complete the onboarding process';
END $$;
