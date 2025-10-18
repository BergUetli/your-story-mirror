// Verify the real user account is properly set up
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Verifying BergUetli\'s account setup...\n');

try {
  // Check users in database
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('👥 All users in database:');
  users.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.name} - ${user.email}`);
    console.log(`   🆔 User ID: ${user.user_id}`);
    console.log(`   📅 Created: ${user.created_at}`);
    console.log(`   ✅ Onboarding: ${user.onboarding_completed}`);
    
    if (user.email === 'berguetli@gmail.com') {
      console.log('   🎉 THIS IS THE REAL USER ACCOUNT! ✅');
    } else if (user.email.includes('demo@') || user.name === 'Demo User') {
      console.log('   🎭 This is demo/dummy data');
    }
  });
  
  // Test login
  console.log('\n🔐 Testing login with real credentials...');
  const { data: loginTest, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'berguetli@gmail.com',
    password: 'zippy6'
  });
  
  if (loginError) {
    console.error('❌ Login test failed:', loginError.message);
  } else {
    console.log('✅ Login test successful!');
    console.log(`👤 Logged in as: ${loginTest.user?.email}`);
    console.log(`🆔 Auth User ID: ${loginTest.user?.id}`);
  }
  
} catch (err) {
  console.error('❌ Verification failed:', err);
}