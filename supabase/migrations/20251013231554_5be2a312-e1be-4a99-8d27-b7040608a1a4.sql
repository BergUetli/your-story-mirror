-- Allow demo user to upload memory images
CREATE POLICY "Demo user can upload memory images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'memory-images' 
  AND (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow demo user to view their memory images  
CREATE POLICY "Demo user can view memory images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'memory-images'
  AND (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow demo user to delete their memory images
CREATE POLICY "Demo user can delete memory images"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'memory-images'
  AND (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow demo user to update their memory images
CREATE POLICY "Demo user can update memory images"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'memory-images'
  AND (storage.foldername(name))[1] = '00000000-0000-0000-000000000000'
);