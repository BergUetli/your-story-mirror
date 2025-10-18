// Check existing users and their credentials
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('📋 Checking user accounts in database...\n');

try {
  // Get all users from the public.users table
  const { data: users, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching users:', error);
  } else {
    console.log('👥 Users in public.users table:');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Onboarding: ${user.onboarding_completed}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🔐 Testing login with known credentials...\n');
  
  // Try to find and test credentials
  if (users && users.length > 0) {
    const demoUser = users.find(u => u.email?.includes('demo') || u.name?.includes('Demo'));
    if (demoUser) {
      console.log(`🎭 Found demo user: ${demoUser.email}`);
      console.log('📝 Note: Cannot determine password from database for security reasons.');
      console.log('💡 Common demo passwords to try: "password", "demo123", "123456", "password123"');
    }
  }
  
} catch (err) {
  console.error('❌ Script failed:', err);
}