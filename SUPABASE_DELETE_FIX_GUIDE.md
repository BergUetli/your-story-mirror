# 🗑️ SUPABASE DELETE FUNCTIONALITY FIX GUIDE

## 🎯 **ISSUE**: Voice recordings not deleting from storage

You're absolutely correct! The issue is likely missing or incorrect storage policies in Supabase that prevent the delete operations from working properly.

---

## 🚀 **STEP-BY-STEP FIX**

### **Step 1: Run Storage Policy Fix** 
1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** 
3. **Copy and paste** the entire contents of `fix_storage_delete_policies.sql`
4. **Click "Run"** to execute the script

This script will:
- ✅ Ensure the `voice-recordings` bucket exists
- ✅ Enable Row Level Security (RLS) 
- ✅ Create proper DELETE policies for authenticated users
- ✅ Create policies for guest recordings
- ✅ Fix any conflicting existing policies

### **Step 2: Test the Configuration**
1. **In Supabase SQL Editor**, run the contents of `test_storage_permissions.sql`
2. **Look for** ✅ green checkmarks in the results
3. **If you see** ❌ red X marks, note what's missing

### **Step 3: Add Missing Database Column**
1. **Run** `add_memory_titles_column.sql` in Supabase SQL Editor
2. This adds the `memory_titles` column needed for the enhanced features

---

## 🔧 **WHAT THE FIX DOES**

### **Storage Policies Created:**
```sql
-- Critical DELETE policy (this is what you need!)
CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### **Path Structure:**
- **User files**: `user_id/filename.webm` (e.g., `abc123/conv_67890.webm`)
- **Guest files**: `guest-session_id/filename.webm` 
- **Demo files**: `demo-*/filename.webm`

---

## 🧪 **TESTING THE FIX**

### **After running the SQL scripts:**

1. **Test in your app**:
   - Go to Archive page
   - Try to delete a recording
   - Check browser console for any storage errors

2. **Check Supabase logs**:
   - Dashboard → Logs → API logs  
   - Look for storage delete operations
   - Should see successful `DELETE /storage/v1/object/voice-recordings/...`

3. **Verify in Supabase Storage**:
   - Dashboard → Storage → voice-recordings bucket
   - Confirm files are actually being removed

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: "Bucket not found"**
**Solution**: The bucket doesn't exist
```sql
-- Run this to create it:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-recordings', 'voice-recordings', false);
```

### **Issue 2: "Row Level Security policy violation"** 
**Solution**: Missing or incorrect delete policy
- Run the `fix_storage_delete_policies.sql` script
- Ensure RLS is enabled on `storage.objects`

### **Issue 3: "Path doesn't match user"**
**Solution**: File path format issue
- Files must be stored as: `{user_id}/{filename}`
- Check `storage_path` values in `voice_recordings` table

### **Issue 4: Delete works but files remain**
**Solution**: Policy allows deletion but storage cleanup failed
- Check Supabase storage manually
- Look for orphaned files
- May need to run cleanup script

---

## ✅ **VERIFICATION CHECKLIST**

After running the fixes, you should have:

- [ ] ✅ `voice-recordings` bucket exists and is private
- [ ] ✅ RLS enabled on `storage.objects` table  
- [ ] ✅ Delete policy created for authenticated users
- [ ] ✅ Guest access policy for demo recordings
- [ ] ✅ `memory_titles` column added to `voice_recordings` table
- [ ] ✅ Delete button appears in Archive interface
- [ ] ✅ Files actually disappear from Supabase Storage
- [ ] ✅ Database records are removed
- [ ] ✅ No console errors during deletion

---

## 🎊 **EXPECTED RESULT**

Once fixed, you should be able to:
1. **See trash buttons** on each recording in the Archive
2. **Click delete** and see confirmation dialog  
3. **Confirm deletion** and see success toast
4. **Recording disappears** from Archive list immediately
5. **File is removed** from Supabase Storage bucket
6. **Database record deleted** completely

---

## 📞 **NEED HELP?**

If you still have issues after running the scripts:
1. **Check browser console** for detailed error messages
2. **Check Supabase logs** for storage operation failures  
3. **Run the diagnostic script** to see what's misconfigured
4. **Share the specific error message** for targeted troubleshooting

The delete functionality should work perfectly once the storage policies are properly configured! 🎉