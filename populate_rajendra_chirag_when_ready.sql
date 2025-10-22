-- Populate profiles for Rajendra and Chirag
-- RUN THIS ONLY AFTER they have created accounts in your app

-- First, verify they have accounts:
SELECT 
  email,
  id,
  created_at,
  CASE 
    WHEN email = 'neurosugerryindia@gmail.com' THEN '✅ Rajendra has account'
    WHEN email = 'chirag.de.jain@gmail.com' THEN '✅ Chirag has account'
  END as status
FROM auth.users
WHERE email IN ('neurosugerryindia@gmail.com', 'chirag.de.jain@gmail.com');

-- If the above query returns 2 rows, proceed with the inserts below
-- If not, wait for them to sign up first

-- =============================================================================
-- Rajendra (neurosugerryindia@gmail.com)
-- =============================================================================
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
  'Rajendra',
  52,
  'Mumbai, India',
  'Pune, India',
  'Neurosurgeon',
  'Married',
  ARRAY['Indian', 'Maharashtrian'],
  ARRAY['Hindi', 'Marathi', 'English'],
  'MBBS from Pune University, MS Neurosurgery from AIIMS Delhi, Fellowship in Pediatric Neurosurgery from Johns Hopkins',
  '[
    {"name": "Priya", "relationship": "Wife", "age": 48, "occupation": "Teacher", "context": "Married for 25 years"},
    {"name": "Aditya", "relationship": "Son", "age": 22, "occupation": "Medical Student", "context": "Following in father''s footsteps"},
    {"name": "Kavya", "relationship": "Daughter", "age": 19, "occupation": "Engineering Student", "context": "At IIT Bombay"}
  ]'::jsonb,
  '[
    {"name": "Dr. Mehta", "relationship": "Colleague", "known_since": "1998", "context": "Fellow surgeon at hospital"},
    {"name": "Ramesh", "relationship": "College Friend", "known_since": "1990", "context": "From medical school days"}
  ]'::jsonb,
  '[{"name": "Priya", "years_together": 25, "context": "Met during residency"}]'::jsonb,
  '[
    {"year": 1995, "event": "Completed MBBS from Pune University", "significance": "Started medical career"},
    {"year": 1999, "event": "Completed MS Neurosurgery from AIIMS", "significance": "Specialized in neurosurgery"},
    {"year": 2002, "event": "Fellowship at Johns Hopkins USA", "significance": "International training in pediatric neurosurgery"},
    {"year": 2005, "event": "Started neurosurgery department at hospital", "significance": "Leadership role"},
    {"year": 2015, "event": "Performed first awake brain surgery in hospital", "significance": "Medical breakthrough"}
  ]'::jsonb,
  ARRAY['Classical Indian music', 'Playing tabla', 'Reading medical journals', 'Hiking', 'Photography', 'Teaching medical students'],
  '[
    {"institution": "Municipal Hospital Mumbai", "role": "Resident", "years": "1995-1999", "focus": "General Surgery"},
    {"institution": "AIIMS Delhi", "role": "Senior Resident", "years": "1999-2002", "focus": "Neurosurgery"},
    {"institution": "Johns Hopkins", "role": "Fellow", "years": "2002-2003", "focus": "Pediatric Neurosurgery"},
    {"institution": "Lilavati Hospital Mumbai", "role": "Senior Consultant Neurosurgeon", "years": "2003-Present", "focus": "Brain tumors and pediatric cases"}
  ]'::jsonb,
  ARRAY['India (all states)', 'USA (Johns Hopkins, conferences)', 'UK (medical conferences)', 'Switzerland (neurosurgery symposium)', 'Singapore (training)', 'Japan (medical exchange)'],
  ARRAY['Compassion', 'Excellence in medicine', 'Dedication to patients', 'Teaching and mentorship', 'Family', 'Continuous learning'],
  ARRAY['Meticulous', 'Calm under pressure', 'Patient', 'Detail-oriented', 'Empathetic', 'Strong leadership', 'Humble'],
  ARRAY['Train the next generation of neurosurgeons', 'Publish research on brain tumor treatments', 'Establish free neurosurgery clinic for underprivileged', 'See children succeed in their careers', 'Visit all major neurosurgery centers worldwide'],
  ARRAY['Patient complications', 'Losing patients during surgery', 'Children''s safety', 'Missing important family moments due to emergencies'],
  'Hindu, practices daily meditation and prayer',
  'Centrist, believes in accessible healthcare for all',
  ARRAY['Healthcare reform', 'Medical education access', 'Child welfare', 'Rural healthcare'],
  ARRAY['Indian classical traditions', 'Western medical practices', 'Hippocratic oath', 'Family values from Maharashtra culture'],
  'Calm and measured, speaks with authority yet kindness, excellent bedside manner',
  ARRAY['Neurosurgery advances', 'Brain research', 'Medical education', 'Indian classical music', 'Medical ethics', 'Family values'],
  ARRAY['Medical malpractice accusations', 'Politics in healthcare', 'Financial discussions about medical care'],
  true,
  true,
  90
FROM auth.users au
WHERE au.email = 'neurosugerryindia@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  preferred_name = EXCLUDED.preferred_name,
  age = EXCLUDED.age,
  updated_at = now();

-- =============================================================================
-- Chirag (chirag.de.jain@gmail.com)
-- =============================================================================
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
  'Chirag', 
  32, 
  'London, United Kingdom', 
  'Ahmedabad, India', 
  'Investment Banker', 
  'Married',
  ARRAY['Indian', 'Gujarati', 'British'], 
  ARRAY['Gujarati', 'English', 'Hindi'],
  'BBA from University of Mumbai, MBA from London Business School',
  '[
    {"name": "Rashmi", "relationship": "Wife", "age": 30, "occupation": "Lawyer", "context": "Married for 4 years"},
    {"name": "Jaya", "relationship": "Mother", "age": 60, "location": "Ahmedabad"},
    {"name": "Deepak", "relationship": "Father", "age": 63, "occupation": "Retired Businessman", "location": "Ahmedabad"},
    {"name": "Nisha", "relationship": "Sister", "age": 28, "occupation": "Doctor", "location": "USA"}
  ]'::jsonb,
  '[
    {"name": "Rohan", "relationship": "Best Friend", "known_since": "2010", "context": "College friend from Mumbai"},
    {"name": "James", "relationship": "Close Friend", "known_since": "2017", "context": "MBA classmate"},
    {"name": "Amit", "relationship": "Childhood Friend", "known_since": "1998", "context": "Grew up together in Ahmedabad"}
  ]'::jsonb,
  '[{"name": "Rashmi", "years_together": 6, "married": true, "context": "Met through mutual friends in London"}]'::jsonb,
  '[
    {"year": 2013, "event": "Graduated BBA with distinction", "significance": "Started business career"},
    {"year": 2014, "event": "First job in investment banking Mumbai", "significance": "Entry into finance"},
    {"year": 2016, "event": "Accepted to London Business School", "significance": "International education"},
    {"year": 2018, "event": "Joined Goldman Sachs London", "significance": "Career breakthrough"},
    {"year": 2020, "event": "Married Rashmi in London", "significance": "Started family life"},
    {"year": 2022, "event": "Led major M&A deal", "significance": "Professional recognition"}
  ]'::jsonb,
  ARRAY['Cricket', 'Tennis', 'Fine dining', 'Wine tasting', 'Traveling', 'Reading business books', 'Playing guitar', 'Watching Formula 1'],
  '[
    {"company": "Regional Bank Mumbai", "role": "Analyst", "years": "2013-2014", "focus": "Corporate banking"},
    {"company": "Investment Firm Mumbai", "role": "Associate", "years": "2014-2016", "focus": "M&A advisory"},
    {"company": "Goldman Sachs London", "role": "Associate", "years": "2018-2020", "focus": "Investment banking"},
    {"company": "Goldman Sachs London", "role": "Vice President", "years": "2020-Present", "focus": "Cross-border M&A"}
  ]'::jsonb,
  ARRAY['UK (living)', 'India (frequent visits)', 'USA (business trips)', 'Switzerland (skiing)', 'France (Paris, Nice)', 'Italy (Rome, Milan)', 'Spain (Barcelona)', 'Japan (Tokyo)', 'Singapore (business)', 'Dubai (luxury travel)', 'Greece (honeymoon)'],
  ARRAY['Excellence', 'Integrity', 'Family', 'Ambition', 'Loyalty', 'Work ethic'],
  ARRAY['Ambitious', 'Analytical', 'Confident', 'Strategic thinker', 'Competitive', 'Sociable', 'Disciplined'],
  ARRAY['Make Managing Director before 40', 'Start own investment fund', 'Give back to business education in India', 'Buy property in Mumbai and London', 'Build retirement home in Ahmedabad', 'Start family in next 2 years'],
  ARRAY['Market crashes affecting career', 'Work-life balance', 'Not being there for family', 'Health issues from stress'],
  'Jain by birth, follows principles of non-violence and vegetarianism',
  'Centrist, pragmatic approach to politics',
  ARRAY['Financial literacy education', 'Youth entrepreneurship', 'Education access', 'Environmental causes'],
  ARRAY['Gujarati business culture', 'British professionalism', 'American entrepreneurial spirit', 'Jain philosophy'],
  'Articulate and persuasive, direct in business, warm with friends and family',
  ARRAY['Finance and markets', 'Business strategy', 'Cricket', 'Formula 1', 'Fine dining', 'Travel', 'Real estate', 'Startups'],
  ARRAY['Personal wealth details', 'Deal specifics (confidential)', 'Family business matters'],
  true, 
  true, 
  88
FROM auth.users au
WHERE au.email = 'chirag.de.jain@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  preferred_name = EXCLUDED.preferred_name,
  age = EXCLUDED.age,
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
WHERE au.email IN ('neurosugerryindia@gmail.com', 'chirag.de.jain@gmail.com')
ORDER BY up.preferred_name;

-- Success message
RAISE NOTICE '✅ Profiles for Rajendra and Chirag populated successfully!';
