// Help with real user signup
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Real User';

if (!email || !password) {
  console.log('🔧 Usage: node help-real-signup.js <email> <password> [name]');
  console.log('📧 Example: node help-real-signup.js user@example.com mypassword123 "John Doe"');
  process.exit(1);
}

console.log('🔐 Attempting to create real user account...');
console.log(`📧 Email: ${email}`);
console.log(`👤 Name: ${name}`);
console.log('🔑 Password: [hidden]');

try {
  // First, check if user already exists in auth
  console.log('\n1️⃣ Checking if user already exists...');
  
  const { data: signInTest, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) {
    if (signInError.message.includes('Invalid login credentials')) {
      console.log('✅ User does not exist yet, proceeding with signup...');
    } else {
      console.log('❓ Unexpected signin error:', signInError.message);
    }
  } else {
    console.log('✅ User already exists and can sign in!');
    console.log(`👤 User ID: ${signInTest.user?.id}`);
    console.log('🎉 You should be able to login with these credentials in the app.');
    
    // Check profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', signInTest.user?.id)
      .single();
    
    if (profile) {
      console.log(`📋 Profile: ${profile.name} (${profile.email})`);
    }
    process.exit(0);
  }
  
  console.log('\n2️⃣ Creating new user account...');
  
  // Attempt signup
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: name
      }
    }
  });
  
  if (signupError) {
    console.error('❌ Signup failed:', signupError.message);
    
    if (signupError.message.includes('User already registered')) {
      console.log('💡 User exists but password might be wrong. Try signing in instead.');
    }
    process.exit(1);
  }
  
  console.log('✅ Signup successful!');
  console.log(`👤 Auth User ID: ${signupData.user?.id}`);
  console.log(`📧 Email: ${signupData.user?.email}`);
  
  if (signupData.user?.email_confirmed_at) {
    console.log('✅ Email confirmed automatically');
  } else {
    console.log('📧 Email confirmation may be required - check your email');
  }
  
  // Wait for trigger to create profile
  console.log('\n3️⃣ Waiting for profile creation...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check profile creation
  const { data: newProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', signupData.user?.id)
    .single();
  
  if (profileError) {
    console.error('❌ Profile creation failed:', profileError);
    console.log('🔧 The auth user was created but profile trigger failed');
  } else {
    console.log('✅ Profile created successfully!');
    console.log(`📋 Profile: ${newProfile.name} (${newProfile.email})`);
  }
  
  console.log('\n🎉 SUCCESS! You can now sign in to the app with:');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: [the password you provided]`);
  
} catch (err) {
  console.error('❌ Signup helper failed:', err.message);
}