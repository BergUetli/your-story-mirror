-- Increase WhatsApp session timeout to 60 minutes to allow for photo uploads
UPDATE public.system_configuration 
SET value = '"60"'::jsonb
WHERE key = 'whatsapp_session_timeout_minutes';