// Check current login status and localStorage
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Checking current authentication status...\n');

try {
  // Check current session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Session check error:', error);
  } else if (session) {
    console.log('✅ User is currently logged in:');
    console.log(`   📧 Email: ${session.user?.email}`);
    console.log(`   🆔 User ID: ${session.user?.id}`);
    console.log(`   ⏰ Expires: ${new Date(session.expires_at * 1000).toLocaleString()}`);
  } else {
    console.log('❌ No active session - user is not logged in');
  }
  
  console.log('\n📱 Browser localStorage status:');
  console.log('   🎭 useDummyAuth:', localStorage.getItem('useDummyAuth') || 'not set');
  console.log('   🎮 demoMode:', localStorage.getItem('demoMode') || 'not set');
  
  // Check if dummy mode is active
  const isDummyMode = localStorage.getItem('useDummyAuth') === 'true';
  const isDemoMode = localStorage.getItem('demoMode') === 'true';
  
  console.log('\n🎯 Current Mode Analysis:');
  console.log(`   🎭 Dummy Mode Active: ${isDummyMode}`);
  console.log(`   🎮 Demo Mode Active: ${isDemoMode}`);
  console.log(`   🔐 Real Session Active: ${!!session}`);
  
  if (isDummyMode && session) {
    console.log('\n⚠️  CONFLICT DETECTED:');
    console.log('   You have both dummy mode enabled AND a real session active');
    console.log('   The app will use dummy mode, ignoring your real login');
    console.log('   💡 Solution: Clear dummy mode to use real authentication');
  } else if (isDummyMode && !session) {
    console.log('\n🎭 Using dummy mode (no real session)');
  } else if (!isDummyMode && session) {
    console.log('\n✅ Using real authentication (dummy mode disabled)');
  } else {
    console.log('\n❌ No authentication method active');
    console.log('   💡 Either login with real credentials or enable demo mode');
  }
  
} catch (err) {
  console.error('❌ Status check failed:', err);
}