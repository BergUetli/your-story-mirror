-- System Configuration Table
-- This table stores configurable system parameters for the Solin AI application

CREATE TABLE IF NOT EXISTS public.system_configuration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Conversation Timing Configuration
    conversation_end_timeout_ms INTEGER NOT NULL DEFAULT 5000, -- 5 seconds default
    natural_end_grace_period_ms INTEGER NOT NULL DEFAULT 3000, -- 3 seconds default
    speaking_check_interval_ms INTEGER NOT NULL DEFAULT 500,   -- 0.5 seconds default
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure there's always one configuration record
INSERT INTO public.system_configuration (
    conversation_end_timeout_ms,
    natural_end_grace_period_ms,
    speaking_check_interval_ms
) VALUES (
    5000,  -- 5 seconds timeout
    3000,  -- 3 seconds grace period  
    500    -- 0.5 seconds check interval
)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_configuration_updated_at ON public.system_configuration(updated_at);

-- RLS Policies (Admin only access)
ALTER TABLE public.system_configuration ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view configuration (for app functionality)
CREATE POLICY "Authenticated users can view system config" ON public.system_configuration
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify configuration (admin operations through backend)
CREATE POLICY "Service role can modify system config" ON public.system_configuration
    FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_system_configuration_updated_at ON public.system_configuration;
CREATE TRIGGER trigger_update_system_configuration_updated_at
    BEFORE UPDATE ON public.system_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_system_configuration_updated_at();

-- Comments
COMMENT ON TABLE public.system_configuration IS 'System-wide configuration parameters for Solin AI application';
COMMENT ON COLUMN public.system_configuration.conversation_end_timeout_ms IS 'Maximum time to wait for Solin to finish speaking after Save & End is clicked (milliseconds)';
COMMENT ON COLUMN public.system_configuration.natural_end_grace_period_ms IS 'Time to wait after Solin stops speaking before ending conversation (milliseconds)';
COMMENT ON COLUMN public.system_configuration.speaking_check_interval_ms IS 'Interval for checking if Solin is still speaking (milliseconds)';