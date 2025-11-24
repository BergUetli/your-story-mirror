-- Create user_profiles entry for the specific merged WhatsApp account
INSERT INTO user_profiles (user_id, onboarding_completed, profile_completeness_score)
VALUES ('7b02d3b9-d901-4af4-85dc-0d3ca4a4d869', false, 10)
ON CONFLICT (user_id) DO NOTHING;