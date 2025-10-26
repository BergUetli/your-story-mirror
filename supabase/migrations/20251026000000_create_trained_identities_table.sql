-- Create trained_identities table for storing user-trained identity models
CREATE TABLE IF NOT EXISTS public.trained_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_name TEXT NOT NULL,
  model_id TEXT NOT NULL UNIQUE, -- HuggingFace repo name
  huggingface_repo_url TEXT NOT NULL,
  num_training_images INTEGER NOT NULL CHECK (num_training_images BETWEEN 3 AND 40),
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'ready', 'failed')),
  training_config JSONB,
  thumbnail_url TEXT,
  version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trained_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create index for efficient user queries
CREATE INDEX idx_trained_identities_user_id ON public.trained_identities(user_id);
CREATE INDEX idx_trained_identities_status ON public.trained_identities(status);
CREATE INDEX idx_trained_identities_model_id ON public.trained_identities(model_id);

-- Enable Row Level Security
ALTER TABLE public.trained_identities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own identities
CREATE POLICY "Users can view own identities"
  ON public.trained_identities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own identities
CREATE POLICY "Users can create own identities"
  ON public.trained_identities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own identities
CREATE POLICY "Users can update own identities"
  ON public.trained_identities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own identities
CREATE POLICY "Users can delete own identities"
  ON public.trained_identities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trained_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_trained_identities_timestamp
  BEFORE UPDATE ON public.trained_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_trained_identities_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.trained_identities IS 'Stores user-trained identity models for face/person recognition and image generation';
COMMENT ON COLUMN public.trained_identities.model_id IS 'Unique HuggingFace repository name';
COMMENT ON COLUMN public.trained_identities.status IS 'Training status: training, ready, or failed';
COMMENT ON COLUMN public.trained_identities.training_config IS 'JSON configuration used for training (steps, learning_rate, etc.)';
