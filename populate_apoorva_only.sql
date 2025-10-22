-- Populate user profile for Apoorva only
-- (Rishi already has a profile, Rajendra and Chirag don't have accounts yet)

INSERT INTO user_profiles (
  user_id, preferred_name, age, location, hometown, occupation, relationship_status,
  cultural_background, languages_spoken, education_background,
  family_members, close_friends, significant_others, major_life_events,
  hobbies_interests, career_history, travel_experiences,
  core_values, personality_traits, life_goals, fears_concerns,
  religious_spiritual_beliefs, political_views, social_causes, cultural_influences,
  communication_style, topics_of_interest, sensitive_topics,
  onboarding_completed, first_conversation_completed, profile_completeness_score
)
SELECT 
  au.id, 
  'Apoorva', 
  29, 
  'Bangalore, India', 
  'Chennai, India', 
  'UX Designer', 
  'In a relationship',
  ARRAY['Indian', 'Tamil'], 
  ARRAY['Tamil', 'English', 'Hindi', 'Kannada'],
  'Bachelor in Design from NID Ahmedabad, Master in HCI from IIT Bombay',
  '[
    {"name": "Lakshmi", "relationship": "Mother", "age": 58, "occupation": "Retired Teacher", "location": "Chennai"},
    {"name": "Mohan", "relationship": "Father", "age": 61, "occupation": "Engineer", "location": "Chennai"},
    {"name": "Arun", "relationship": "Brother", "age": 26, "occupation": "Software Developer", "location": "Hyderabad"}
  ]'::jsonb,
  '[
    {"name": "Divya", "relationship": "Best Friend", "known_since": "2014", "context": "College roommate at NID"},
    {"name": "Preethi", "relationship": "Close Friend", "known_since": "2019", "context": "Colleague turned friend"},
    {"name": "Meera", "relationship": "Childhood Friend", "known_since": "2000", "context": "Grew up in same neighborhood"}
  ]'::jsonb,
  '[{"name": "Karthik", "years_together": 3, "context": "Met at design conference"}]'::jsonb,
  '[
    {"year": 2016, "event": "Graduated from NID with Gold Medal", "significance": "Started design career"},
    {"year": 2017, "event": "First job at design studio Mumbai", "significance": "Independent life began"},
    {"year": 2019, "event": "Completed Masters from IIT Bombay", "significance": "Specialized in UX/HCI"},
    {"year": 2020, "event": "Moved to Bangalore for dream job", "significance": "Career breakthrough"},
    {"year": 2022, "event": "Led redesign of major e-commerce platform", "significance": "Professional recognition"}
  ]'::jsonb,
  ARRAY['Sketching and illustration', 'Bharatanatyam dance', 'Watercolor painting', 'Reading design books', 'Traveling', 'Cooking South Indian cuisine', 'Yoga'],
  '[
    {"company": "Design Studio Mumbai", "role": "Junior Designer", "years": "2016-2017", "focus": "Brand identity"},
    {"company": "IIT Bombay", "role": "Research Assistant", "years": "2017-2019", "focus": "HCI research"},
    {"company": "Tech Startup Bangalore", "role": "UX Designer", "years": "2019-2021", "focus": "Mobile apps"},
    {"company": "Major Tech Company", "role": "Senior UX Designer", "years": "2021-Present", "focus": "E-commerce platform"}
  ]'::jsonb,
  ARRAY['India (most states)', 'Singapore (work conference)', 'Thailand (vacation)', 'Dubai (family trip)', 'Sri Lanka (cultural tour)', 'Bali (solo travel)'],
  ARRAY['Creativity', 'User empathy', 'Cultural preservation', 'Authenticity', 'Learning', 'Balance'],
  ARRAY['Creative', 'Empathetic', 'Detail-oriented', 'Collaborative', 'Organized', 'Open-minded', 'Patient'],
  ARRAY['Become design director', 'Start design mentorship program for underprivileged', 'Open small design studio', 'Publish book on Indian design aesthetics', 'Travel to 30 countries', 'Master classical dance'],
  ARRAY['Losing creative spark', 'Family health issues', 'Not making meaningful impact', 'Work-life imbalance'],
  'Hindu, practices yoga and meditation daily',
  'Progressive, supports women empowerment and education',
  ARRAY['Women in tech', 'Design education access', 'Environmental sustainability', 'Arts and culture preservation'],
  ARRAY['South Indian classical arts', 'Minimalist Japanese design', 'Scandinavian design principles', 'Indian traditional crafts'],
  'Warm and friendly, expressive, good listener, asks thoughtful questions',
  ARRAY['UX design', 'Design thinking', 'Indian classical arts', 'Travel and culture', 'Food and cooking', 'Sustainable living', 'Yoga and wellness'],
  ARRAY['Salary discussions', 'Dating app experiences', 'Family pressure about marriage'],
  true, 
  true, 
  92
FROM auth.users au
WHERE au.email = 'apoorvamohan04@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
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

-- Verification
SELECT 
  up.preferred_name,
  up.age,
  up.location,
  up.occupation,
  up.profile_completeness_score,
  au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
ORDER BY up.preferred_name;

-- Success message
DO $$
DECLARE
  profile_count int;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  RAISE NOTICE '✅ Apoorva profile populated successfully!';
  RAISE NOTICE '📊 Total profiles in database: %', profile_count;
  RAISE NOTICE '📝 Note: Rajendra and Chirag need to sign up first before their profiles can be created.';
END $$;
