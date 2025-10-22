# Memory Save & Voice Recording Issues - Diagnosis and Solutions

## 🐛 Issues Reported

### Issue 1: Memory Save Failure
```
Failed to save memory
insert or update on table "memories" violates foreign key constraint "memories_user_id_fkey"
```

### Issue 2: Voice Recordings Not Appearing
Voice recordings are not showing up in the Archive page despite being created during conversations with Solin.

---

## 🔍 Root Cause Analysis

Both issues stem from the **same root cause**: Your user account's `user_id` is not properly linked to a record in the `auth.users` table.

### Foreign Key Constraints in Database

1. **`memories` table** (line 33 of migration):
   ```sql
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
   ```

2. **`voice_recordings` table** (line 5 of migration):
   ```sql
   user_id TEXT NOT NULL  -- Changed to TEXT to support guest IDs
   ```
   Note: `voice_recordings` uses TEXT for user_id but still expects valid auth.users IDs for authenticated users

3. **`user_profiles` table** (line 4 of migration):
   ```sql
   user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
   ```

### Why the Error Occurs

When you try to save a memory, the Edge Function (`memory-operations`) inserts:
```typescript
{
  user_id: userId,  // This comes from auth.getUser()
  title: memory.title,
  text: memory.text,
  ...
}
```

PostgreSQL checks: "Does this `user_id` exist in `auth.users`?"
- ✅ If YES → Save succeeds
- ❌ If NO → **Foreign key constraint violation!**

### Why Voice Recordings Don't Appear

The Archive page queries (line 511-527 in `aiVoiceSearch.ts`):
```typescript
const { data: recordings, error } = await supabase
  .from('voice_recordings')
  .select('*')
  .eq('user_id', userId)  // Your user ID
  .order('created_at', { ascending: false });
```

If your `userId` doesn't match any records in `voice_recordings`, nothing appears!

---

## 🔧 Diagnostic Steps

### Step 1: Run the Diagnostic SQL Script

I've created `DIAGNOSTIC_USER_ISSUES.sql` - run it in your Supabase SQL Editor:

1. **Open Supabase Dashboard** → SQL Editor
2. **Open the file** `DIAGNOSTIC_USER_ISSUES.sql`
3. **Replace** `'apoorvamohan04@gmail.com'` with your actual email (appears 6 times)
4. **Run the query**

### Step 2: Interpret Results

The diagnostic will show:

**Scenario A: User Exists**
```
✅ User exists in auth.users
✅ User profile exists
voice_recordings_count: 0 or more
memories_count: 0 or more
```
→ **Problem**: Recordings might not be saving properly OR RLS policies blocking

**Scenario B: User Missing**
```
❌ User DOES NOT exist in auth.users - THIS IS THE PROBLEM!
⚠️ User profile missing
voice_recordings_count: 0
memories_count: 0
```
→ **Problem**: Your user account was never created or was deleted

---

## 💡 Solutions

### Solution 1: User Doesn't Exist in auth.users

**This is the most likely scenario if you're getting the foreign key error.**

#### Option A: Sign Up Fresh (Recommended)
1. Sign out of the application
2. Go to the sign-up page
3. Create a new account with your email
4. Complete onboarding
5. Test memory save and voice recording

#### Option B: Recreate User Account (If you had an old account)
Run this SQL in Supabase:
```sql
-- Check if the user exists first
SELECT * FROM auth.users WHERE email = 'your-email@example.com';

-- If it doesn't exist, you need to sign up through the app
-- The app will automatically create the auth.users entry
```

**Note**: You **cannot** manually insert into `auth.users` - Supabase manages this table. You must use the sign-up flow.

### Solution 2: Voice Recordings Exist But Don't Appear

If the diagnostic shows recordings exist but they don't appear in Archive:

#### Check 1: RLS Policies
Run this in Supabase SQL Editor:
```sql
-- Check if you can see your recordings
SELECT 
  id, 
  session_id, 
  storage_path,
  created_at
FROM voice_recordings 
WHERE user_id = (
  SELECT id::text 
  FROM auth.users 
  WHERE email = 'your-email@example.com'
)
ORDER BY created_at DESC
LIMIT 5;
```

If this returns results but Archive doesn't show them, it's an RLS or frontend issue.

#### Check 2: Browser Console
1. Open Archive page
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for errors related to:
   - `voice_recordings`
   - RLS policy
   - Database query failed

#### Check 3: User ID Mismatch
Run this to verify your user ID:
```sql
-- Get your auth.users ID
SELECT 
  au.id as auth_user_id,
  au.email,
  up.user_id as profile_user_id,
  COUNT(vr.id) as voice_recordings
FROM auth.users au
LEFT JOIN user_profiles up ON up.user_id = au.id
LEFT JOIN voice_recordings vr ON vr.user_id = au.id::text
WHERE au.email = 'your-email@example.com'
GROUP BY au.id, au.email, up.user_id;
```

This should show:
- Your auth.users.id
- Matching profile user_id
- Count of voice recordings

### Solution 3: Orphaned Voice Recordings

If voice recordings exist with a DIFFERENT user_id than your current account:

```sql
-- Find recordings with mismatched user_id
SELECT 
  vr.id,
  vr.user_id as recording_user_id,
  au.id as current_auth_user_id,
  vr.session_id,
  vr.created_at
FROM voice_recordings vr
CROSS JOIN auth.users au
WHERE au.email = 'your-email@example.com'
  AND vr.user_id != au.id::text
ORDER BY vr.created_at DESC;

-- FIX: Update orphaned recordings to use current user_id
-- ⚠️ ONLY RUN THIS IF YOU'RE SURE THESE ARE YOUR RECORDINGS
UPDATE voice_recordings
SET user_id = (
  SELECT id::text 
  FROM auth.users 
  WHERE email = 'your-email@example.com'
)
WHERE user_id IN (
  -- List of orphaned user IDs from the diagnostic
  'old-user-id-1',
  'old-user-id-2'
);
```

---

## 🧪 Testing After Fix

### Test 1: Memory Save
1. Go to the app and talk to Solin
2. Create a memory during conversation
3. Check if it saves without error
4. Verify in Supabase: `SELECT * FROM memories WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 1;`

### Test 2: Voice Recording Appears
1. Have a conversation with Solin
2. Go to Archive page
3. Refresh the page
4. Check if the recording appears
5. Try playing the audio

### Test 3: Verify User Profile
```sql
SELECT 
  au.id,
  au.email,
  up.preferred_name,
  up.onboarding_completed,
  COUNT(DISTINCT m.id) as memories_count,
  COUNT(DISTINCT vr.id) as recordings_count
FROM auth.users au
LEFT JOIN user_profiles up ON up.user_id = au.id
LEFT JOIN memories m ON m.user_id = au.id
LEFT JOIN voice_recordings vr ON vr.user_id = au.id::text
WHERE au.email = 'your-email@example.com'
GROUP BY au.id, au.email, up.preferred_name, up.onboarding_completed;
```

This should show:
- ✅ User exists
- ✅ Profile completed
- ✅ Memories count > 0
- ✅ Recordings count > 0

---

## 📋 Quick Reference

### File Locations
- **Memories Edge Function**: `/supabase/functions/memory-operations/index.ts`
- **Voice Search Service**: `/src/services/aiVoiceSearch.ts`
- **Archive Page**: `/src/pages/Archive.tsx`
- **Database Memory Service**: `/src/services/databaseMemoryService.ts`

### Key Tables
- `auth.users` - Supabase authentication table
- `user_profiles` - Extended user profile data
- `memories` - User memories/journal entries
- `voice_recordings` - Conversation audio archives

### Common Errors and Meanings

| Error | Meaning | Fix |
|-------|---------|-----|
| `violates foreign key constraint "memories_user_id_fkey"` | Your user_id doesn't exist in auth.users | Sign up fresh or verify account |
| `Could not find the 'metadata' column` | Schema mismatch in code | Already fixed in PR #3 |
| `No recordings found` | Either no recordings exist OR query filtering them out | Check diagnostic SQL |
| `relation "voice_recordings" does not exist` | Table not created | Run migrations |

---

## 🚨 Still Having Issues?

If none of these solutions work:

1. **Share the diagnostic SQL results** with me
2. **Check browser console** for JavaScript errors (F12 → Console)
3. **Check Supabase logs** (Dashboard → Database → Logs)
4. **Verify migrations ran** (Dashboard → Database → Migrations)

The most likely fix is to **sign up with a fresh account** if your auth.users entry is missing or corrupted.
