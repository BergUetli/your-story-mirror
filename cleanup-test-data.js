// Clean up test accounts from database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🧹 Cleaning up test accounts...\n');

try {
  // Find and remove test accounts (emails starting with "test-")
  const { data: testUsers, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .like('email', 'test-%@example.com');
  
  if (fetchError) {
    console.error('❌ Error fetching test users:', fetchError);
    process.exit(1);
  }
  
  if (testUsers.length === 0) {
    console.log('✅ No test accounts found to clean up');
    process.exit(0);
  }
  
  console.log(`🔍 Found ${testUsers.length} test account(s):`);
  testUsers.forEach(user => {
    console.log(`   📧 ${user.email} (${user.name})`);
    console.log(`   🆔 User ID: ${user.user_id}`);
  });
  
  // Delete test users from public.users table
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .like('email', 'test-%@example.com');
  
  if (deleteError) {
    console.error('❌ Error deleting test users:', deleteError);
  } else {
    console.log('\n✅ Test accounts cleaned up from public.users table');
  }
  
  // Note: We can't delete from auth.users table with the anon key
  // Those will need to be cleaned up manually from Supabase dashboard
  console.log('📝 Note: Auth entries need manual cleanup from Supabase dashboard');
  
} catch (err) {
  console.error('❌ Cleanup failed:', err);
}