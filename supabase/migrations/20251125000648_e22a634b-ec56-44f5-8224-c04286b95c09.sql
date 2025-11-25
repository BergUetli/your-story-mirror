-- Fix: Update storage paths for WhatsApp artifacts that have wrong user_id prefix
-- These artifacts belong to memories under user 19e6ba16-8a06-447e-951d-ceb0299bbdb0
-- but have storage paths starting with old user_id 7b02d3b9-d901-4af4-85dc-0d3ca4a4d869

UPDATE artifacts
SET storage_path = REPLACE(storage_path, '7b02d3b9-d901-4af4-85dc-0d3ca4a4d869', '19e6ba16-8a06-447e-951d-ceb0299bbdb0')
WHERE id IN (
  '9f7f6081-2b78-4e2c-9f9b-42535d07d499',
  'c2a3b7fd-009a-4ae6-bef2-cc4c8c67a05e'
);