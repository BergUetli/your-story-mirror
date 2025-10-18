// Debug signup issue - check what's in the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Debugging signup issue...\n');

try {
  // 1. Check all users in public.users table
  console.log('1️⃣ Checking public.users table:');
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (publicError) {
    console.error('❌ Error fetching public users:', publicError);
  } else {
    console.log(`📊 Found ${publicUsers.length} users in public.users:`);
    publicUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Onboarding: ${user.onboarding_completed}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // 2. Test signup with a new user to see what happens
  console.log('\n2️⃣ Testing signup process:');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  
  console.log(`📧 Test email: ${testEmail}`);
  console.log(`🔑 Test password: ${testPassword}`);
  
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        name: 'Test Real User'
      }
    }
  });
  
  if (signupError) {
    console.error('❌ Signup failed:', signupError);
  } else {
    console.log('✅ Signup successful!');
    console.log(`👤 Auth User ID: ${signupData.user?.id}`);
    console.log(`📧 Auth Email: ${signupData.user?.email}`);
    
    // Wait a moment for trigger to execute
    console.log('\n⏳ Waiting for trigger to create profile...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if profile was created correctly
    const { data: newProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', signupData.user?.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile not found:', profileError);
    } else {
      console.log('✅ Profile created successfully!');
      console.log(`👤 Profile Name: ${newProfile.name}`);
      console.log(`📧 Profile Email: ${newProfile.email}`);
      console.log(`🆔 Profile User ID: ${newProfile.user_id}`);
    }
  }
  
} catch (err) {
  console.error('❌ Debug script failed:', err);
}