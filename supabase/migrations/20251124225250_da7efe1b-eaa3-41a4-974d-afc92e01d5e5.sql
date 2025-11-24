-- Migrate WhatsApp memories from old accounts to current web user
-- Old WhatsApp user IDs: f8246fa9-1176-42f7-b314-54ebf7caab42, 7b02d3b9-d901-4af4-85dc-0d3ca4a4d869
-- Web user ID: 19e6ba16-8a06-447e-951d-ceb0299bbdb0

-- Migrate memories
UPDATE memories 
SET user_id = '19e6ba16-8a06-447e-951d-ceb0299bbdb0'
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869')
  AND source_type = 'whatsapp';

-- Migrate WhatsApp messages
UPDATE whatsapp_messages 
SET user_id = '19e6ba16-8a06-447e-951d-ceb0299bbdb0'
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');

-- Migrate WhatsApp sessions
UPDATE whatsapp_sessions 
SET user_id = '19e6ba16-8a06-447e-951d-ceb0299bbdb0'
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');

-- Migrate memory insights
UPDATE memory_insights 
SET user_id = '19e6ba16-8a06-447e-951d-ceb0299bbdb0'
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');

-- Clean up old user records
DELETE FROM user_phone_numbers 
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');

DELETE FROM user_profiles 
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');

DELETE FROM users 
WHERE user_id IN ('f8246fa9-1176-42f7-b314-54ebf7caab42', '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869');