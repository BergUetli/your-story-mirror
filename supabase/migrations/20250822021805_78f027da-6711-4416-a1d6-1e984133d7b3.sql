-- Add profile fields to users table
ALTER TABLE public.users 
ADD COLUMN birth_date DATE,
ADD COLUMN birth_place TEXT,
ADD COLUMN current_location TEXT,
ADD COLUMN age INTEGER,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;