// Diagnose common signup failure causes
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Diagnosing potential signup failure causes...\n');

try {
  // 1. Check if email confirmation is required
  console.log('1️⃣ Checking email confirmation settings...');
  
  // Try to get auth settings (this might not work with anon key)
  const testSignup = await supabase.auth.signUp({
    email: 'diagnostic-test@example.com',
    password: 'testpassword123'
  });
  
  if (testSignup.error) {
    console.log('❌ Test signup failed:', testSignup.error.message);
    
    if (testSignup.error.message.includes('email')) {
      console.log('📧 Issue might be email-related (confirmation, format, etc.)');
    }
  } else {
    console.log('✅ Basic signup works');
    console.log('📧 Email confirmed at:', testSignup.data.user?.email_confirmed_at || 'Not confirmed');
    
    if (!testSignup.data.user?.email_confirmed_at) {
      console.log('⚠️  Email confirmation appears to be required');
      console.log('💡 This might be why your signup seemed to fail');
    }
  }
  
  console.log('\n2️⃣ Common signup failure causes:');
  console.log('   📧 Email confirmation required but not completed');
  console.log('   🔒 Password too weak (less than 6 characters)');
  console.log('   📱 Browser blocking popup/redirect');
  console.log('   🎭 Dummy mode interfering with real signup');
  console.log('   🔄 Network issues during signup process');
  console.log('   💾 LocalStorage/cache conflicts');
  
  console.log('\n3️⃣ Recommended solutions:');
  console.log('   ✅ Use the helper script to create account directly');
  console.log('   ✅ Clear browser cache/localStorage before trying again');
  console.log('   ✅ Disable dummy mode explicitly before signup');
  console.log('   ✅ Check email for confirmation links');
  
} catch (err) {
  console.error('❌ Diagnostic failed:', err.message);
}