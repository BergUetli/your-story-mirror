-- User Profiles Table
-- This table stores comprehensive user information collected during the First Conversation
-- and used to enhance the Story and personalize interactions

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    preferred_name TEXT,
    age INTEGER,
    location TEXT, -- City, country or region
    occupation TEXT,
    relationship_status TEXT,
    
    -- Personal Background  
    cultural_background TEXT[],
    languages_spoken TEXT[],
    hometown TEXT,
    education_background TEXT,
    
    -- Key Relationships
    family_members JSONB DEFAULT '[]', -- Array of {name, relationship, description, importance}
    close_friends JSONB DEFAULT '[]', -- Array of {name, relationship, description, importance}
    significant_others JSONB DEFAULT '[]', -- Current or past relationships
    
    -- Life Experiences & Interests
    major_life_events JSONB DEFAULT '[]', -- Array of {event, year, description, impact}
    hobbies_interests TEXT[],
    career_history JSONB DEFAULT '[]', -- Array of {role, company, years, description}
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
    communication_style TEXT, -- formal, casual, humorous, direct, etc.
    topics_of_interest TEXT[],
    sensitive_topics TEXT[], -- Topics to handle carefully
    
    -- Profile Metadata
    onboarding_completed BOOLEAN DEFAULT FALSE,
    first_conversation_completed BOOLEAN DEFAULT FALSE,
    profile_completeness_score INTEGER DEFAULT 0, -- 0-100 based on filled fields
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_conversation_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completed ON public.user_profiles(onboarding_completed, first_conversation_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON public.user_profiles(updated_at);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profiles
CREATE POLICY "Users can view their own profiles" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles" ON public.user_profiles  
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Function to calculate profile completeness score
CREATE OR REPLACE FUNCTION calculate_profile_completeness(profile_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    total_fields INTEGER := 20; -- Adjust based on important fields
BEGIN
    -- Basic fields (5 points each)
    IF profile_data->>'preferred_name' IS NOT NULL AND profile_data->>'preferred_name' != '' THEN score := score + 5; END IF;
    IF profile_data->>'age' IS NOT NULL THEN score := score + 5; END IF;
    IF profile_data->>'location' IS NOT NULL AND profile_data->>'location' != '' THEN score := score + 5; END IF;
    IF profile_data->>'occupation' IS NOT NULL AND profile_data->>'occupation' != '' THEN score := score + 5; END IF;
    
    -- Relationship fields (10 points each for having content)
    IF jsonb_array_length(COALESCE(profile_data->'family_members', '[]')) > 0 THEN score := score + 10; END IF;
    IF jsonb_array_length(COALESCE(profile_data->'close_friends', '[]')) > 0 THEN score := score + 10; END IF;
    
    -- Interest fields (5 points each for having content)  
    IF jsonb_array_length(COALESCE(profile_data->'hobbies_interests', '[]')) > 0 THEN score := score + 5; END IF;
    IF jsonb_array_length(COALESCE(profile_data->'core_values', '[]')) > 0 THEN score := score + 5; END IF;
    IF jsonb_array_length(COALESCE(profile_data->'life_goals', '[]')) > 0 THEN score := score + 5; END IF;
    
    -- Cultural fields (5 points each)
    IF jsonb_array_length(COALESCE(profile_data->'cultural_background', '[]')) > 0 THEN score := score + 5; END IF;
    IF jsonb_array_length(COALESCE(profile_data->'languages_spoken', '[]')) > 0 THEN score := score + 5; END IF;
    
    -- Return capped at 100
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.user_profiles IS 'Comprehensive user profiles for personalized interactions and story enhancement';
COMMENT ON COLUMN public.user_profiles.family_members IS 'JSON array of family member objects with name, relationship, description, importance';
COMMENT ON COLUMN public.user_profiles.major_life_events IS 'JSON array of significant life events with event, year, description, impact';
COMMENT ON COLUMN public.user_profiles.profile_completeness_score IS 'Calculated score (0-100) based on profile completeness';