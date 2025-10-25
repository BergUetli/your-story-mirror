-- Create storage bucket for identity training images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-training-images',
  'identity-training-images',
  false,
  20971520, -- 20MB per file
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for identity training images bucket
CREATE POLICY "Users can upload their own identity training images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-training-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own identity training images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-training-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own identity training images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-training-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create trained_identities table
CREATE TABLE IF NOT EXISTS trained_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_type TEXT DEFAULT 'flux-lora',
  hf_model_id TEXT,
  hf_repo_name TEXT,
  training_status TEXT DEFAULT 'pending' CHECK (training_status IN ('pending', 'uploading', 'training', 'completed', 'failed')),
  training_job_id TEXT,
  training_error TEXT,
  image_storage_paths TEXT[],
  thumbnail_url TEXT,
  num_training_images INTEGER,
  training_started_at TIMESTAMP WITH TIME ZONE,
  training_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trained_identities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own trained identities"
ON trained_identities FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trained identities"
ON trained_identities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trained identities"
ON trained_identities FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trained identities"
ON trained_identities FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_trained_identities_user_id ON trained_identities(user_id);
CREATE INDEX idx_trained_identities_status ON trained_identities(training_status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_trained_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trained_identities_updated_at
BEFORE UPDATE ON trained_identities
FOR EACH ROW
EXECUTE FUNCTION update_trained_identities_updated_at();