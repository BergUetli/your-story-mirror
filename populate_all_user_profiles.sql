-- Populate user_profiles with rich synthetic data for all users
-- This creates comprehensive profiles that will enhance AI-generated stories

-- =============================================================================
-- USER 1: Rajendra (neurosugerryindia@gmail.com)
-- =============================================================================
INSERT INTO user_profiles (
  user_id,
  preferred_name,
  age,
  location,
  hometown,
  occupation,
  relationship_status,
  cultural_background,
  languages_spoken,
  education_background,
  family_members,
  close_friends,
  significant_others,
  major_life_events,
  hobbies_interests,
  career_history,
  travel_experiences,
  core_values,
  personality_traits,
  life_goals,
  fears_concerns,
  religious_spiritual_beliefs,
  political_views,
  social_causes,
  cultural_influences,
  communication_style,
  topics_of_interest,
  sensitive_topics,
  onboarding_completed,
  first_conversation_completed,
  profile_completeness_score
) VALUES (
  '8c2963ba-faaa-467a-b910-5e530af0d56a',
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
)
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

-- =============================================================================
-- USER 2: (diagnostic-test@example.com) - Test User
-- =============================================================================
INSERT INTO user_profiles (
  user_id,
  preferred_name,
  age,
  location,
  hometown,
  occupation,
  relationship_status,
  cultural_background,
  languages_spoken,
  education_background,
  family_members,
  close_friends,
  major_life_events,
  hobbies_interests,
  career_history,
  travel_experiences,
  core_values,
  personality_traits,
  life_goals,
  religious_spiritual_beliefs,
  communication_style,
  topics_of_interest,
  onboarding_completed,
  first_conversation_completed,
  profile_completeness_score
) VALUES (
  'a5a67ff8-d97b-474a-8a76-362cbe80ff874',
  'Alex',
  28,
  'San Francisco, California',
  'Austin, Texas',
  'Quality Assurance Engineer',
  'Single',
  ARRAY['American', 'Mixed'],
  ARRAY['English'],
  'BS Computer Science from UT Austin',
  '[
    {"name": "Linda", "relationship": "Mother", "age": 55, "location": "Austin, Texas"},
    {"name": "David", "relationship": "Father", "age": 57, "location": "Austin, Texas"}
  ]'::jsonb,
  '[
    {"name": "Jamie", "relationship": "College Friend", "known_since": "2015", "context": "Roommate at UT Austin"},
    {"name": "Sam", "relationship": "Work Friend", "known_since": "2020", "context": "Fellow QA engineer"}
  ]'::jsonb,
  '[
    {"year": 2019, "event": "Graduated UT Austin with honors", "significance": "Started tech career"},
    {"year": 2020, "event": "Moved to San Francisco for dream job", "significance": "Big life change"},
    {"year": 2022, "event": "Led major product launch testing", "significance": "Career milestone"}
  ]'::jsonb,
  ARRAY['Video gaming', 'Rock climbing', 'Craft beer', 'Coding side projects', 'Podcasts'],
  '[
    {"company": "Small Startup Austin", "role": "Junior QA Engineer", "years": "2019-2020", "focus": "Mobile app testing"},
    {"company": "Tech Giant SF", "role": "QA Engineer", "years": "2020-Present", "focus": "Web platform testing"}
  ]'::jsonb,
  ARRAY['USA (most states)', 'Mexico (vacation)', 'Canada (Vancouver)'],
  ARRAY['Quality', 'Continuous improvement', 'Work-life balance', 'Honesty'],
  ARRAY['Detail-oriented', 'Methodical', 'Team player', 'Problem solver'],
  ARRAY['Become senior QA lead', 'Start own testing consultancy', 'Visit Japan', 'Learn Japanese'],
  'Agnostic, open-minded',
  'Direct and clear, prefers written communication, logical approach',
  ARRAY['Software testing', 'Gaming', 'Technology trends', 'Craft beer culture'],
  true,
  true,
  70
)
ON CONFLICT (user_id) DO UPDATE SET
  preferred_name = EXCLUDED.preferred_name,
  age = EXCLUDED.age,
  location = EXCLUDED.location,
  hometown = EXCLUDED.hometown,
  occupation = EXCLUDED.occupation,
  relationship_status = EXCLUDED.relationship_status,
  updated_at = now();

-- =============================================================================
-- USER 3: Apoorva (apoorvamohan04@gmail.com)
-- =============================================================================
INSERT INTO user_profiles (
  user_id,
  preferred_name,
  age,
  location,
  hometown,
  occupation,
  relationship_status,
  cultural_background,
  languages_spoken,
  education_background,
  family_members,
  close_friends,
  significant_others,
  major_life_events,
  hobbies_interests,
  career_history,
  travel_experiences,
  core_values,
  personality_traits,
  life_goals,
  fears_concerns,
  religious_spiritual_beliefs,
  political_views,
  social_causes,
  cultural_influences,
  communication_style,
  topics_of_interest,
  sensitive_topics,
  onboarding_completed,
  first_conversation_completed,
  profile_completeness_score
) VALUES (
  'd6a3ed67-1297-4091-88cb-4b2c04bc19b81',
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
)
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

-- =============================================================================
-- USER 4: Chirag (chirag.de.jain@gmail.com)
-- =============================================================================
INSERT INTO user_profiles (
  user_id,
  preferred_name,
  age,
  location,
  hometown,
  occupation,
  relationship_status,
  cultural_background,
  languages_spoken,
  education_background,
  family_members,
  close_friends,
  significant_others,
  major_life_events,
  hobbies_interests,
  career_history,
  travel_experiences,
  core_values,
  personality_traits,
  life_goals,
  fears_concerns,
  religious_spiritual_beliefs,
  political_views,
  social_causes,
  cultural_influences,
  communication_style,
  topics_of_interest,
  sensitive_topics,
  onboarding_completed,
  first_conversation_completed,
  profile_completeness_score
) VALUES (
  'fea6629d-2f39-420c-a874-1c5681fca0c4d',
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
)
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

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
SELECT 
  preferred_name,
  age,
  location,
  occupation,
  relationship_status,
  array_length(hobbies_interests, 1) as hobbies_count,
  profile_completeness_score,
  onboarding_completed,
  first_conversation_completed
FROM user_profiles
ORDER BY preferred_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All user profiles populated with comprehensive synthetic data!';
    RAISE NOTICE '📊 Profile Details:';
    RAISE NOTICE '  - Rajendra: 52, Neurosurgeon in Mumbai (90%% complete)';
    RAISE NOTICE '  - Alex: 28, QA Engineer in San Francisco (70%% complete)';
    RAISE NOTICE '  - Apoorva: 29, UX Designer in Bangalore (92%% complete)';
    RAISE NOTICE '  - Chirag: 32, Investment Banker in London (88%% complete)';
    RAISE NOTICE '🎯 All profiles ready to enhance Story pages!';
END $$;
