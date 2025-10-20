-- Create diagnostic logs table for error tracking and validation
-- This can be run in Supabase SQL editor if you want to persist diagnostic events

CREATE TABLE IF NOT EXISTS public.diagnostic_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    category TEXT NOT NULL CHECK (category IN ('voice_recording', 'memory_saving', 'archive_display', 'database', 'system')),
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    event TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    stack_trace TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_timestamp ON public.diagnostic_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_category ON public.diagnostic_logs(category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_level ON public.diagnostic_logs(level);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_user_id ON public.diagnostic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_session_id ON public.diagnostic_logs(session_id);

-- Add RLS policies
ALTER TABLE public.diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own diagnostic logs
CREATE POLICY "Users can insert their own diagnostic logs" ON public.diagnostic_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow authenticated users to read their own diagnostic logs
CREATE POLICY "Users can view their own diagnostic logs" ON public.diagnostic_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow admins to view all diagnostic logs (you may need to adjust this based on your admin role system)
-- CREATE POLICY "Admins can view all diagnostic logs" ON public.diagnostic_logs
--     FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Add comments
COMMENT ON TABLE public.diagnostic_logs IS 'Stores diagnostic events and error logs for voice archiving system validation';
COMMENT ON COLUMN public.diagnostic_logs.category IS 'Category of the diagnostic event: voice_recording, memory_saving, archive_display, database, or system';
COMMENT ON COLUMN public.diagnostic_logs.level IS 'Log level: info, warn, error, or debug';
COMMENT ON COLUMN public.diagnostic_logs.event IS 'Short description of the diagnostic event';
COMMENT ON COLUMN public.diagnostic_logs.details IS 'JSON object with additional event details and context';
COMMENT ON COLUMN public.diagnostic_logs.session_id IS 'Diagnostic session ID for grouping related events';
COMMENT ON COLUMN public.diagnostic_logs.stack_trace IS 'Error stack trace if applicable';