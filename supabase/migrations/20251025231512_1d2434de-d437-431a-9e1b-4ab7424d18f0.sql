-- Add UPDATE policy for identity training images storage bucket
CREATE POLICY "Users can update their own identity training images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-training-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'identity-training-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);