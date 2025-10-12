-- Create storage bucket for memory images
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-images', 'memory-images', true)
ON CONFLICT (id) DO NOTHING;

-- Add image_urls column to memories table
ALTER TABLE public.memories 
ADD COLUMN IF NOT EXISTS image_urls text[];

-- Create RLS policies for memory images bucket
CREATE POLICY "Users can upload their own memory images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'memory-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own memory images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'memory-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own memory images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'memory-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own memory images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'memory-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public access for memory images (since bucket is public)
CREATE POLICY "Memory images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'memory-images');