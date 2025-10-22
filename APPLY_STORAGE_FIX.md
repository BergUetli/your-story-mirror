# 🔧 Voice Recordings Storage Fix - URGENT

## Problem
The voice-recordings storage bucket either doesn't exist or has incorrect RLS policies, causing:
- ❌ Audio File Save Test failing with 400 error
- ❌ Voice recordings not being saved when creating memories in Solin

## Solution
Apply the migration manually via Supabase Dashboard

---

## Steps to Fix

### 1. Open Supabase Dashboard SQL Editor
1. Go to: https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### 2. Copy and Paste the Migration SQL
Open the file: `/supabase/migrations/20251021100000_fix_voice_recordings_storage.sql`

Copy the ENTIRE contents and paste into the SQL Editor.

### 3. Run the Query
Click "Run" button (or press Cmd/Ctrl + Enter)

### 4. Verify Success
You should see a success message. The migration will:
- ✅ Create the `voice-recordings` bucket (if missing)
- ✅ Set proper file size limit (50MB)
- ✅ Configure allowed audio MIME types
- ✅ Enable RLS on storage.objects
- ✅ Create policies for authenticated users (upload, view, update, delete)
- ✅ Create policies for guest users (access guest-* and demo-* files)

---

## Verification

### Test 1: Check Bucket Exists
Run this in SQL Editor:
```sql
SELECT * FROM storage.buckets WHERE id = 'voice-recordings';
```

You should see:
- `id`: voice-recordings
- `name`: voice-recordings
- `public`: false
- `file_size_limit`: 52428800 (50MB)
- `allowed_mime_types`: {audio/webm, audio/wav, audio/mp3, ...}

### Test 2: Check Policies Exist
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage' 
  AND policyname LIKE '%voice%'
ORDER BY policyname;
```

You should see 5 policies:
1. `Authenticated users can upload voice recordings` (INSERT)
2. `Authenticated users can view voice recordings` (SELECT)
3. `Authenticated users can update voice recordings` (UPDATE)
4. `Authenticated users can delete voice recordings` (DELETE)
5. `Anyone can access guest voice recordings` (ALL)

### Test 3: Run Audio File Save Test Again
1. Go to Admin panel in the app
2. Click "Recording Testing Tools" tab
3. Click "Test Audio File Save & Retrieval"
4. Should now show: ✅ Audio File Save Test - PASSED

### Test 4: Test Voice Recording in Solin
1. Go to Solin interface
2. Start a conversation
3. Say something and create a memory
4. Check Archive page - recording should be saved

---

## Troubleshooting

### If you still get 400 errors after applying the fix:

1. **Check user authentication:**
   ```sql
   SELECT auth.uid()::text AS current_user_id;
   ```

2. **Check if files can be uploaded:**
   - Make sure you're logged in (not guest mode)
   - Check browser console for detailed error messages

3. **Verify path format:**
   - Files should be uploaded to: `{user_id}/{session_id}_*.webm`
   - Example: `a1b2c3d4-1234-5678-90ab-cdef12345678/conv_xyz_conversation.webm`

4. **Check RLS is actually enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```
   Should show `rowsecurity: true`

---

## Why This Happened

The previous migrations defined storage policies but never actually created the bucket or applied the policies in the `storage.objects` table. The policies only existed in migration files, not in the actual database.

This migration explicitly:
1. Creates the bucket with proper configuration
2. Enables RLS on storage.objects
3. Drops any conflicting policies
4. Creates fresh, correct policies with proper path matching

---

## After Fixing

Once the migration is applied:
- ✅ Audio recordings will save properly
- ✅ Users can upload/view/delete their own recordings
- ✅ Guest users can manage guest-* recordings
- ✅ Test Audio File Save & Retrieval will pass
- ✅ Solin voice recordings will be stored in Archive

Let me know if you encounter any issues!
