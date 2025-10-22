# 🔧 Fix Voice Recordings Storage - Using Supabase UI (EASIER METHOD)

## ⚠️ Why the SQL Failed

The error `must be owner of table objects` happens because the SQL Editor doesn't have direct permissions to modify the `storage.objects` table. 

**Solution**: Use Supabase's **Storage UI** instead - it has the proper permissions!

---

## ✅ Step-by-Step Fix (Using UI)

### Step 1: Create the Storage Bucket

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu
2. **Click "Storage"** in the left sidebar
3. **Click "New bucket"** button (top right)
4. **Configure the bucket**:
   - **Name**: `voice-recordings`
   - **Public bucket**: ❌ **UNCHECK** (keep it private)
   - **File size limit**: `50` MB
   - **Allowed MIME types**: Add these one by one:
     - `audio/webm`
     - `audio/wav`
     - `audio/mp3`
     - `audio/mp4`
     - `audio/mpeg`
     - `audio/ogg`
     - `audio/x-wav`
5. **Click "Save"** or "Create bucket"

### Step 2: Configure Storage Policies

Now you need to add RLS policies for the bucket.

1. Still in **Storage** section
2. Find your `voice-recordings` bucket in the list
3. **Click the three dots** (⋮) or **"Policies"** button next to the bucket
4. **Click "New Policy"** or "Add Policy"

You need to create **5 policies**. For each one:

---

#### Policy 1: Upload (INSERT)

- **Policy Name**: `Authenticated users can upload voice recordings`
- **Operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy Definition**:
  ```sql
  (bucket_id = 'voice-recordings'::text) 
  AND ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **WITH CHECK expression**: (same as above)
- **Click "Review"** then **"Save policy"**

---

#### Policy 2: View/Download (SELECT)

- **Policy Name**: `Authenticated users can view voice recordings`
- **Operation**: `SELECT`
- **Target roles**: `authenticated`
- **Policy Definition (USING)**:
  ```sql
  (bucket_id = 'voice-recordings'::text) 
  AND (
    ((auth.uid())::text = (storage.foldername(name))[1])
    OR (name ~ '^guest-'::text)
    OR (name ~ '^demo-'::text)
  )
  ```
- **Click "Review"** then **"Save policy"**

---

#### Policy 3: Update (UPDATE)

- **Policy Name**: `Authenticated users can update voice recordings`
- **Operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy Definition (USING)**:
  ```sql
  (bucket_id = 'voice-recordings'::text) 
  AND ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **Click "Review"** then **"Save policy"**

---

#### Policy 4: Delete (DELETE)

- **Policy Name**: `Authenticated users can delete voice recordings`
- **Operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy Definition (USING)**:
  ```sql
  (bucket_id = 'voice-recordings'::text) 
  AND ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **Click "Review"** then **"Save policy"**

---

#### Policy 5: Guest Access (ALL)

- **Policy Name**: `Anyone can access guest voice recordings`
- **Operation**: `ALL` (or create separate SELECT/INSERT/UPDATE/DELETE for guests)
- **Target roles**: `anon` (or leave as default)
- **Policy Definition (USING)**:
  ```sql
  (bucket_id = 'voice-recordings'::text) 
  AND (
    (name ~ '^guest-'::text)
    OR (name ~ '^demo-'::text)
  )
  ```
- **WITH CHECK expression**: (same as above)
- **Click "Review"** then **"Save policy"**

---

## 🎯 Simplified Alternative: Use Policy Templates

If Supabase offers policy templates, you can use:

### For Authenticated Users:
- **Template**: "Allow authenticated users to access their own folder"
- **Customize for**: `voice-recordings` bucket
- **Folder pattern**: `{user_id}/*`

### For Public/Guest Access:
- **Template**: "Allow public access to specific folders"
- **Customize for**: `voice-recordings` bucket  
- **Folder patterns**: `guest-*` and `demo-*`

---

## 🧪 Verify the Setup

### Check Bucket Exists

1. Go to **Storage** → Should see `voice-recordings` bucket listed
2. Click on it → Should show empty (or with files if you've uploaded)
3. Check settings → Should show:
   - Public: ❌ No
   - Size limit: 50 MB
   - MIME types: audio files listed

### Check Policies Exist

1. Go to **Storage** → `voice-recordings` bucket
2. Click **"Policies"** tab
3. Should see **5 policies** listed:
   - Upload for authenticated users
   - View for authenticated users  
   - Update for authenticated users
   - Delete for authenticated users
   - All operations for guest users

### Test in Application

1. **Go to Admin Panel** → Voice Diagnostics → Recording Testing Tools
2. **Click "Test Audio File Save & Retrieval"**
3. **Expected Result**: ✅ Audio File Save Test - PASSED

4. **Go to Solin Interface**
5. **Start a conversation** and create a memory
6. **Check Archive Page** → Recording should appear
7. **Try playing it back** → Should work

---

## 🚨 If You Still Can't Create Policies via UI

Try this **minimal SQL approach** that should work:

### Option A: Just Create the Bucket (SQL)

```sql
-- This part should work without errors
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings', 
  false,
  52428800,
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/x-wav']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/x-wav'];
```

Then add policies via the UI as described above.

### Option B: Disable RLS Temporarily (NOT RECOMMENDED)

Only use this as a last resort for testing:

```sql
-- ⚠️ WARNING: This makes the bucket PUBLIC - only for testing!
UPDATE storage.buckets 
SET public = true 
WHERE id = 'voice-recordings';
```

**Remember to re-enable security after testing!**

---

## 📞 Need Help?

If you're still stuck:

1. **Screenshot the error** you're getting
2. **Check your user role** - Make sure you're logged in as an admin/owner
3. **Try incognito mode** - Sometimes browser cache causes issues
4. **Check Supabase status** - Make sure there are no platform issues

---

## ✅ Expected Final State

**Bucket Configuration**:
- ✅ Name: `voice-recordings`
- ✅ Privacy: Private
- ✅ Size: 50MB limit
- ✅ MIME types: 7 audio formats

**Policies**:
- ✅ 5 total policies
- ✅ Authenticated users: upload, view, update, delete
- ✅ Guest users: all operations on guest-*/demo-* folders

**Application**:
- ✅ Audio File Save Test passes
- ✅ Solin recordings save to Archive
- ✅ Can play back recordings

---

Let me know which method works for you or if you need further assistance!
