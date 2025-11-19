-- Add unique constraint for user_id and phone_number combination
ALTER TABLE public.user_phone_numbers
ADD CONSTRAINT user_phone_numbers_user_id_phone_number_key 
UNIQUE (user_id, phone_number);