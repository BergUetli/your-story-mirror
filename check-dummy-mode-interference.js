// Check if dummy mode interferes with signup
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Checking for dummy mode interference...\n');

try {
  // Check current users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('👥 Current users in database:');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} - ${user.email}`);
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Created: ${user.created_at}`);
    
    // Check if this looks like dummy data
    if (user.user_id === '00000000-0000-0000-0000-000000000000' || 
        user.email.includes('demo@') || 
        user.name === 'Demo User') {
      console.log('   🎭 This appears to be dummy/demo data');
    } else {
      console.log('   ✅ This appears to be real user data');
    }
    console.log('');
  });
  
  console.log('🔍 Analysis:');
  
  const dummyUsers = users.filter(u => 
    u.user_id === '00000000-0000-0000-0000-000000000000' || 
    u.email.includes('demo@') || 
    u.name === 'Demo User'
  );
  
  const realUsers = users.filter(u => 
    u.user_id !== '00000000-0000-0000-0000-000000000000' && 
    !u.email.includes('demo@') && 
    u.name !== 'Demo User'
  );
  
  console.log(`📊 Dummy/demo users: ${dummyUsers.length}`);
  console.log(`📊 Real users: ${realUsers.length}`);
  
  if (realUsers.length > 0) {
    console.log('\n✅ Found real user accounts:');
    realUsers.forEach(user => {
      console.log(`   📧 ${user.email} (${user.name})`);
    });
    
    console.log('\n💡 Suggestion: Try signing in with one of these real accounts.');
    console.log('   If you created an account but see dummy data, there might be a browser cache issue.');
  } else {
    console.log('\n❌ No real user accounts found.');
    console.log('💡 This suggests either:');
    console.log('   1. You haven\'t successfully signed up yet');
    console.log('   2. There was an issue during signup');
    console.log('   3. The trigger isn\'t working properly');
  }
  
} catch (err) {
  console.error('❌ Script failed:', err);
}