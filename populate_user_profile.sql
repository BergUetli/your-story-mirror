-- Populate user_profiles with rich synthetic data for Rishi
-- This creates a comprehensive profile that will enhance AI-generated stories

-- Your user ID from the test: 19e6ba16-8a06-447e-951d-ceb0299bbdb0

-- Insert or update profile with comprehensive data
INSERT INTO user_profiles (
  user_id,
  preferred_name,
  age,
  location,
  hometown,
  occupation,
  relationship_status,
  
  -- Personal Background
  cultural_background,
  languages_spoken,
  education_background,
  
  -- Key Relationships
  family_members,
  close_friends,
  significant_others,
  
  -- Life Experiences & Interests
  major_life_events,
  hobbies_interests,
  career_history,
  travel_experiences,
  
  -- Values & Personality
  core_values,
  personality_traits,
  life_goals,
  fears_concerns,
  
  -- Cultural & Social Context
  religious_spiritual_beliefs,
  political_views,
  social_causes,
  cultural_influences,
  
  -- Communication Preferences
  communication_style,
  topics_of_interest,
  sensitive_topics,
  
  -- Metadata
  onboarding_completed,
  first_conversation_completed,
  profile_completeness_score
) VALUES (
  '19e6ba16-8a06-447e-951d-ceb0299bbdb0',
  'Rishi',
  35, -- Update with real age if known
  'Zurich, Switzerland',
  'Mumbai, India', -- Example hometown
  'Software Engineer',
  'Single',
  
  -- Personal Background
  ARRAY['Indian', 'Swiss'],
  ARRAY['English', 'Hindi', 'German'],
  'Masters in Computer Science from ETH Zurich',
  
  -- Key Relationships (JSONB format)
  '[
    {"name": "Maya", "relationship": "Mother", "age": 62, "location": "Mumbai, India"},
    {"name": "Arjun", "relationship": "Father", "age": 65, "location": "Mumbai, India"},
    {"name": "Priya", "relationship": "Sister", "age": 32, "location": "London, UK"}
  ]'::jsonb,
  
  '[
    {"name": "Andreas", "relationship": "Best Friend", "known_since": "2015", "context": "Met at ETH Zurich"},
    {"name": "Sophie", "relationship": "Close Friend", "known_since": "2018", "context": "Colleague turned friend"},
    {"name": "Raj", "relationship": "Childhood Friend", "known_since": "1995", "context": "Grew up together in Mumbai"}
  ]'::jsonb,
  
  '[]'::jsonb, -- No current relationship, can be updated
  
  -- Life Experiences & Interests
  '[
    {"year": 2010, "event": "Graduated from IIT Mumbai with Bachelor in Computer Science", "significance": "Started tech career"},
    {"year": 2012, "event": "Moved to Zurich for Masters at ETH", "significance": "Life-changing move to Switzerland"},
    {"year": 2015, "event": "Landed first job at Google Zurich", "significance": "Career breakthrough"},
    {"year": 2018, "event": "Solo trip to Nepal for meditation retreat", "significance": "Personal growth and self-discovery"},
    {"year": 2020, "event": "Started own tech startup", "significance": "Entrepreneurial journey began"}
  ]'::jsonb,
  
  ARRAY['Hiking in Swiss Alps', 'Photography', 'Reading philosophy', 'Cooking Indian cuisine', 'Meditation', 'Board games', 'Tech meetups'],
  
  '[
    {"company": "Google Zurich", "role": "Software Engineer", "years": "2015-2018", "focus": "Machine Learning"},
    {"company": "Tech Startup (Own)", "role": "Founder & CEO", "years": "2018-Present", "focus": "AI-powered memory preservation"}
  ]'::jsonb,
  
  ARRAY[
    'Switzerland (living)',
    'India (home country, frequent visits)',
    'Nepal (meditation retreat, 2018)',
    'Germany (multiple visits, Berlin & Munich)',
    'France (Paris, Lyon)',
    'Italy (Rome, Florence, Venice)',
    'Japan (Tokyo, Kyoto - 2019)',
    'USA (San Francisco, NYC - tech conferences)'
  ],
  
  -- Values & Personality
  ARRAY['Family', 'Authenticity', 'Continuous learning', 'Mindfulness', 'Innovation', 'Cultural bridge-building'],
  ARRAY['Thoughtful', 'Introverted yet sociable', 'Analytical', 'Empathetic', 'Curious', 'Patient', 'Reflective'],
  ARRAY[
    'Build technology that helps people preserve and share their life stories',
    'Achieve work-life balance while growing startup',
    'Visit all 7 continents',
    'Write a book about cross-cultural experiences',
    'Give back to community through tech education'
  ],
  ARRAY['Losing connection with family in India', 'Startup failure', 'Not making meaningful impact', 'Forgetting important memories'],
  
  -- Cultural & Social Context
  'Spiritual but not religious, practices meditation and yoga',
  'Progressive, values equality and sustainability',
  ARRAY['Climate change', 'Digital privacy', 'Education access', 'Mental health awareness'],
  ARRAY['Indian classical music', 'Bollywood films', 'Swiss efficiency and precision', 'Tech culture from Silicon Valley'],
  
  -- Communication Preferences
  'Direct yet warm, prefers deep conversations over small talk, good listener',
  ARRAY['AI and technology', 'Philosophy and consciousness', 'Travel experiences', 'Startups and entrepreneurship', 'Cultural differences', 'Photography', 'Meditation practices'],
  ARRAY['Superficial conversations', 'Politics (prefers avoiding heated debates)', 'Financial details'],
  
  -- Metadata
  true,  -- onboarding_completed
  true,  -- first_conversation_completed
  85     -- profile_completeness_score
)
ON CONFLICT (user_id) 
DO UPDATE SET
  preferred_name = EXCLUDED.preferred_name,
  age = EXCLUDED.age,
  location = EXCLUDED.location,
  hometown = EXCLUDED.hometown,
  occupation = EXCLUDED.occupation,
  relationship_status = EXCLUDED.relationship_status,
  cultural_background = EXCLUDED.cultural_background,
  languages_spoken = EXCLUDED.languages_spoken,
  education_background = EXCLUDED.education_background,
  family_members = EXCLUDED.family_members,
  close_friends = EXCLUDED.close_friends,
  significant_others = EXCLUDED.significant_others,
  major_life_events = EXCLUDED.major_life_events,
  hobbies_interests = EXCLUDED.hobbies_interests,
  career_history = EXCLUDED.career_history,
  travel_experiences = EXCLUDED.travel_experiences,
  core_values = EXCLUDED.core_values,
  personality_traits = EXCLUDED.personality_traits,
  life_goals = EXCLUDED.life_goals,
  fears_concerns = EXCLUDED.fears_concerns,
  religious_spiritual_beliefs = EXCLUDED.religious_spiritual_beliefs,
  political_views = EXCLUDED.political_views,
  social_causes = EXCLUDED.social_causes,
  cultural_influences = EXCLUDED.cultural_influences,
  communication_style = EXCLUDED.communication_style,
  topics_of_interest = EXCLUDED.topics_of_interest,
  sensitive_topics = EXCLUDED.sensitive_topics,
  onboarding_completed = EXCLUDED.onboarding_completed,
  first_conversation_completed = EXCLUDED.first_conversation_completed,
  profile_completeness_score = EXCLUDED.profile_completeness_score,
  updated_at = now();

-- Verify the data
SELECT 
  preferred_name,
  age,
  location,
  occupation,
  array_length(hobbies_interests, 1) as hobbies_count,
  profile_completeness_score
FROM user_profiles
WHERE user_id = '19e6ba16-8a06-447e-951d-ceb0299bbdb0';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile populated for Rishi with comprehensive synthetic data!';
    RAISE NOTICE '📊 Profile completeness: 85%%';
    RAISE NOTICE '🎯 Ready to enhance Story page with rich context';
END $$;
