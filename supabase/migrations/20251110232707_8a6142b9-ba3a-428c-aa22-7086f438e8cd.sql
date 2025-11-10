-- Delete existing demo user memories
DELETE FROM memories WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Insert beautiful demo memories
INSERT INTO memories (user_id, title, text, memory_date, tags, recipient, source_type) VALUES
-- Childhood memories
('00000000-0000-0000-0000-000000000000', 
 'First Day of School', 
 'Walking through the big red doors with my new backpack, holding mom''s hand. The classroom smelled like fresh crayons and the teacher had the kindest smile.',
 '1985-09-01',
 ARRAY['childhood', 'school', 'family'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Summer at Grandma''s Farm',
 'Spending endless summer days catching fireflies in mason jars, helping grandma bake apple pies, and falling asleep to crickets chirping outside the window.',
 '1987-07-15',
 ARRAY['childhood', 'family', 'summer'],
 'public',
 'manual'),

-- Teen years
('00000000-0000-0000-0000-000000000000',
 'Learning to Drive',
 'Dad teaching me to drive in the empty parking lot on Sunday mornings. His patient voice saying "you''re doing great" even when I stalled the car for the fifth time.',
 '1995-06-20',
 ARRAY['milestone', 'family', 'learning'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'High School Graduation',
 'Walking across the stage in my cap and gown, seeing my family cheering in the crowd. The feeling of possibility and excitement for what came next.',
 '1997-06-15',
 ARRAY['milestone', 'graduation', 'achievement'],
 'public',
 'manual'),

-- College years
('00000000-0000-0000-0000-000000000000',
 'First Day of College',
 'Moving into the dorm with boxes and dreams. Meeting my roommate who would become a lifelong friend. Everything felt new and exciting.',
 '1997-09-01',
 ARRAY['college', 'milestone', 'friendship'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Study Abroad in Paris',
 'Six months in Paris studying art and culture. Morning croissants at the corner café, getting lost in the Louvre, and watching the Eiffel Tower sparkle at night.',
 '1999-03-10',
 ARRAY['travel', 'college', 'adventure'],
 'public',
 'manual'),

-- Career
('00000000-0000-0000-0000-000000000000',
 'First Job Offer',
 'The phone call that changed everything. Getting my first real job offer after months of interviews. Calling my parents with tears of joy.',
 '2001-05-22',
 ARRAY['career', 'milestone', 'achievement'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Promoted to Manager',
 'My boss calling me into her office with a smile. The promotion I had worked so hard for. Celebrating with the team that believed in me.',
 '2008-11-10',
 ARRAY['career', 'achievement', 'milestone'],
 'public',
 'manual'),

-- Personal milestones
('00000000-0000-0000-0000-000000000000',
 'Adopted My First Pet',
 'Walking into the shelter and locking eyes with the scruffy little dog in the corner. Taking Max home and feeling my heart get bigger.',
 '2005-04-12',
 ARRAY['pets', 'family', 'milestone'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Running My First Marathon',
 'Crossing the finish line after months of training. Exhausted, proud, and overwhelmed. The medal they put around my neck felt like gold.',
 '2010-10-17',
 ARRAY['achievement', 'health', 'milestone'],
 'public',
 'manual'),

-- Recent memories
('00000000-0000-0000-0000-000000000000',
 'Family Reunion at the Lake House',
 'Three generations gathered by the water. Kids playing in the shallows, grandparents sharing stories on the porch, and everyone together for a perfect weekend.',
 '2015-08-08',
 ARRAY['family', 'reunion', 'celebration'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Learning to Play Guitar',
 'Finally mastering that chord progression I had been practicing for weeks. Playing my first complete song without looking at my fingers.',
 '2018-03-25',
 ARRAY['learning', 'music', 'hobby'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'First Trip to Japan',
 'Cherry blossoms in full bloom, the quiet beauty of ancient temples, and discovering a culture that felt both foreign and familiar. A journey that changed how I see the world.',
 '2019-04-05',
 ARRAY['travel', 'adventure', 'culture'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Starting My Garden',
 'Planting tomatoes and herbs in the backyard. Getting dirt under my fingernails and discovering the simple joy of growing something with my own hands.',
 '2020-05-12',
 ARRAY['hobby', 'nature', 'home'],
 'public',
 'manual'),

('00000000-0000-0000-0000-000000000000',
 'Virtual Family Game Night',
 'Setting up video calls with family scattered across different states. Laughing together over silly games and staying connected despite the distance.',
 '2020-11-20',
 ARRAY['family', 'connection', 'celebration'],
 'public',
 'manual');