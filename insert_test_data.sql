-- Insert test voice recording data
-- This SQL bypasses RLS for testing purposes and creates sample data

-- First, let's check if we have any users in the system
-- If not, we'll create a test user entry or use a UUID that matches your auth.users

-- Insert a test voice recording (you may need to replace the user_id with your actual user ID)
INSERT INTO public.voice_recordings (
  id,
  user_id,
  session_id,
  recording_type,
  storage_path,
  original_filename,
  file_size_bytes,
  duration_seconds,
  mime_type,
  compression_type,
  transcript_text,
  conversation_summary,
  memory_ids,
  topics,
  session_mode,
  conversation_phase,
  is_compressed,
  retention_days,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1), -- Uses the first user in your system
  'test-session-graduation-' || extract(epoch from now()),
  'conversation',
  'conversations/test-graduation-recording.webm',
  'graduation_conversation_2024.webm',
  287500,
  52.3,
  'audio/webm',
  'opus',
  'Hello Solin, I wanted to share something really important with you today. I just graduated from the University of Chicago Booth School of Business, and it feels absolutely incredible! Walking across that stage was such a surreal moment. I keep thinking about all the late nights studying, the challenging case studies, the group projects, and everything that led up to this moment. My parents were there in the audience, and I could see how proud they were. My mom was actually crying happy tears! This MBA has been such a transformative experience for me. Not just academically, but personally too. I feel like I''ve grown so much as a leader and as a person. The network I''ve built, the skills I''ve developed, and the confidence I''ve gained - it''s all going to help me in my career. I''m excited about what comes next, but I also want to take a moment to really appreciate this achievement. It represents two years of dedication, hard work, and pushing myself outside my comfort zone.',
  'The user shared their recent graduation from University of Chicago Booth School of Business, describing it as an incredible and transformative experience. They reflected on the journey including late nights studying, challenging coursework, and group projects. The user was emotional about having their parents there, particularly noting their mother''s happy tears. They emphasized how the MBA was transformative both academically and personally, helping them grow as a leader and person. The user expressed excitement about their future career while taking time to appreciate this significant achievement representing two years of dedication and personal growth.',
  '{}', -- Empty array for memory_ids
  ARRAY['education', 'graduation', 'university of chicago', 'booth school', 'mba', 'achievement', 'family', 'career development', 'personal growth', 'milestone'],
  'memory_creation',
  'active_conversation',
  true,
  90,
  now(),
  now()
);

-- Insert another test recording for more variety
INSERT INTO public.voice_recordings (
  id,
  user_id,
  session_id,
  recording_type,
  storage_path,
  original_filename,
  file_size_bytes,
  duration_seconds,
  mime_type,
  compression_type,
  transcript_text,
  conversation_summary,
  memory_ids,
  topics,
  session_mode,
  conversation_phase,
  is_compressed,
  retention_days,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'test-session-family-' || extract(epoch from now()),
  'conversation',
  'conversations/test-family-recording.webm',
  'family_dinner_2024.webm',
  195800,
  34.7,
  'audio/webm',
  'opus',
  'Solin, I had the most wonderful family dinner last night. It''s been a while since we were all together in one place. My sister flew in from Seattle, and my brother drove up from Austin. We all gathered at my parents'' house, and mom made her famous lasagna - the same recipe she''s been using for over twenty years. We spent hours just talking, laughing, and catching up on each other''s lives. My nephew has grown so much since I last saw him, and he kept us all entertained with his stories from kindergarten. There''s something so special about these moments when the whole family is together. We shared old memories, made new ones, and just enjoyed being present with each other. I realized how much I cherish these gatherings and how important family really is.',
  'The user described a heartwarming family dinner where siblings traveled from different cities (Seattle and Austin) to gather at their parents'' house. The mother prepared her signature lasagna using a 20-year-old recipe. The evening was filled with conversation, laughter, and catching up, with special mention of an entertaining nephew sharing kindergarten stories. The user reflected on the precious nature of family gatherings and the importance of being present together, emphasizing how much they cherish these moments and value family connections.',
  '{}',
  ARRAY['family', 'dinner', 'gathering', 'siblings', 'parents', 'nephew', 'memories', 'connection', 'lasagna', 'togetherness'],
  'daily_journal',
  'active_conversation',
  true,
  90,
  now() - interval '3 days', -- Make this 3 days ago for variety
  now() - interval '3 days'
);

-- Verify the insertions worked
SELECT 
  id,
  session_id,
  duration_seconds,
  conversation_summary,
  array_length(topics, 1) as topic_count,
  created_at
FROM public.voice_recordings
WHERE session_id LIKE 'test-session-%'
ORDER BY created_at DESC;