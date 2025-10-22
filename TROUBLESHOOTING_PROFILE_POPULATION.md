# Troubleshooting Profile Population

## 🔴 Error You're Seeing

```
ERROR: 23503: insert or update on table "user_profiles" violates foreign key constraint "user_profiles_user_id_fkey"
DETAIL: Key (user_id)=(c7bbaada-1d3d-46df-bee2-496ecd71bb36) is not present in table "users".
```

## 🔍 What This Means

The foreign key constraint `user_profiles_user_id_fkey` is checking if the `user_id` exists in a parent table. The error says it's checking the `users` table, but this might be misleading - it could actually be checking `auth.users`.

## 📋 Step-by-Step Fix

### **Step 1: Run Diagnostic Queries**

First, let's understand your database structure. Run this in Supabase SQL Editor:

**File:** `diagnose_user_relationships.sql`

```sql
-- Check what's in auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Check what's in users table
SELECT 
  'users table' as source,
  user_id,
  email,
  name,
  created_at
FROM users
ORDER BY created_at DESC;

-- Check the foreign key constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_profiles' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check if emails exist and where
SELECT 
  email,
  EXISTS(SELECT 1 FROM auth.users WHERE email = e.email) as in_auth_users,
  EXISTS(SELECT 1 FROM users WHERE email = e.email) as in_users_table
FROM (
  VALUES 
    ('neurosugerryindia@gmail.com'),
    ('apoorvamohan04@gmail.com'),
    ('chirag.de.jain@gmail.com'),
    ('berguetli@gmail.com')
) AS e(email);
```

### **Step 2: Check Foreign Key Target**

Run this to see exactly which table the foreign key references:

**File:** `check_foreign_key_target.sql`

```sql
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table_name,
  a.attname AS column_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.contype = 'f'
  AND conrelid::regclass::text = 'user_profiles';
```

### **Step 3: Based on Results, Choose Solution**

---

## ✅ **Solution A: Users Exist in auth.users**

If the diagnostic shows users exist in `auth.users`, use this script:

**File:** `populate_profiles_direct_from_auth.sql`

This queries `auth.users` directly by email.

**Run it now!** This is most likely your solution.

---

## ✅ **Solution B: Users Don't Exist Yet**

If users don't exist in `auth.users`, they need to sign up first:

1. Have each user create an account in your app
2. Once they sign up, their `auth.users` record will be created
3. Then run the population script

**Check who's missing:**
```sql
SELECT 
  email,
  EXISTS(SELECT 1 FROM auth.users WHERE email = e.email) as account_exists
FROM (VALUES 
  ('neurosugerryindia@gmail.com'),
  ('apoorvamohan04@gmail.com'),
  ('chirag.de.jain@gmail.com')
) AS e(email);
```

---

## ✅ **Solution C: Foreign Key Points to Wrong Table**

If the foreign key actually references the `users` table (not `auth.users`), you need to either:

**Option 1: Drop and recreate the constraint to point to auth.users**
```sql
-- Drop existing constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Add new constraint pointing to auth.users
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;
```

**Option 2: Ensure users table is synced with auth.users**
```sql
-- Check if users need to be created in users table
INSERT INTO users (user_id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.user_id = au.id
);
```

---

## 🎯 **Quick Test Before Full Run**

Test with just one user first:

```sql
-- Test with Rajendra only
INSERT INTO user_profiles (user_id, preferred_name, age, location)
SELECT 
  au.id,
  'Rajendra',
  52,
  'Mumbai, India'
FROM auth.users au
WHERE au.email = 'neurosugerryindia@gmail.com';

-- If this works, proceed with full script
-- If this fails, check the error message
```

---

## 📊 **Expected Output After Success**

```
✅ User profiles populated successfully!
📊 Total profiles: 4
🎯 Profiles ready to enhance Story pages!

preferred_name | age | location           | occupation
---------------|-----|--------------------|-------------------
Apoorva        | 29  | Bangalore, India   | UX Designer
Chirag         | 32  | London, UK         | Investment Banker
Rajendra       | 52  | Mumbai, India      | Neurosurgeon
Rishi          | 35  | Zurich, Switzerland| Software Engineer
```

---

## 🆘 **Still Having Issues?**

1. **Share the output** of the diagnostic queries
2. **Check if users have signed up** - they need accounts first
3. **Verify foreign key target** - make sure it points to the right table
4. **Check RLS policies** - they might be blocking inserts

---

## 📁 **Files in This Folder**

1. `diagnose_user_relationships.sql` - Understand your database structure
2. `check_foreign_key_target.sql` - See what the FK references
3. `populate_profiles_direct_from_auth.sql` - **USE THIS ONE** (queries auth.users)
4. `populate_profiles_from_users_table.sql` - Alternative (queries users table)

---

**Start with running the diagnostic queries, then use `populate_profiles_direct_from_auth.sql`!**
