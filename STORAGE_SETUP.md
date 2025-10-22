# Storage Bucket Setup for Voice Recordings

## Issue
The `voice-recordings` storage bucket needs to be created but client-side creation is blocked by Row Level Security (RLS) policies.

## Solution
The bucket must be created by a Supabase administrator using the Supabase dashboard or SQL interface.

## Required Bucket Configuration

### Via Supabase Dashboard:
1. Go to Supabase Dashboard → Storage
2. Click "Create Bucket" 
3. Use these settings:
   - **Bucket Name**: `voice-recordings`
   - **Public**: `false` (private bucket)
   - **File Size Limit**: `50 MB`
   - **Allowed MIME Types**: 
     - `audio/webm`
     - `audio/wav`  
     - `audio/mpeg`
     - `audio/mp4`

### Via SQL (Alternative):
Execute this SQL in the Supabase SQL Editor:

```sql
-- Create the voice-recordings bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings', 
  false,
  52428800, -- 50MB in bytes
  ARRAY['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4']
);

-- Set up RLS policies for the bucket (adjust user permissions as needed)
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own voice recordings" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'voice-recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files  
CREATE POLICY "Users can read own voice recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own voice recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Testing After Setup

Once the bucket is created:

1. Go to Admin → Voice Archive Diagnostics → Storage Inspector
2. Click "Test Upload" to verify the bucket is accessible
3. Go to Testing Tools → "Create Test Recording" to generate a sample file
4. Check that the recording appears in the Archive

## Folder Structure

Files will be organized as:
```
voice-recordings/
├── {user-id-1}/
│   ├── session_123_recording.webm
│   ├── test_recording_456.wav
│   └── conversation_789.webm
├── {user-id-2}/
│   └── session_abc_recording.webm
└── guest-{timestamp}/
    └── guest_session_xyz.webm
```

## Troubleshooting

If you still get "bucket not found" errors after setup:
1. Verify bucket name is exactly `voice-recordings` 
2. Check RLS policies allow your user to access the bucket
3. Use the admin "Test Upload" function to verify permissions
4. Check browser console for detailed error messages

## Alternative: Temporary File Upload (No Storage)

If storage bucket cannot be created, the recording system can be modified to:
- Save recordings to browser local storage temporarily
- Export recordings as downloadable files
- Store only metadata in the database (without audio files)