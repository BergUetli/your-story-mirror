// Test the ElevenLabs Edge function to diagnose the issue
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

console.log('🧪 Testing ElevenLabs Edge function...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

try {
  // First, authenticate with real user
  console.log('1️⃣ Authenticating with real user...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'berguetli@gmail.com',
    password: 'zippy6'
  });
  
  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    process.exit(1);
  }
  
  console.log('✅ Authentication successful');
  console.log(`👤 User: ${loginData.user?.email}`);
  
  // Test the Edge function
  console.log('\n2️⃣ Testing elevenlabs-agent-token Edge function...');
  
  const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
    body: { 
      agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4'
    }
  });
  
  console.log('📋 Edge function response:');
  console.log('   Data:', data);
  console.log('   Error:', error);
  
  if (error) {
    console.error('\n❌ Edge function failed!');
    console.error('🔍 Error details:');
    console.error('   Message:', error.message);
    console.error('   Status:', error.status || 'unknown');
    console.error('   Context:', error.context || 'none');
    
    // Check for common issues
    if (error.message?.includes('ElevenLabs API key not configured')) {
      console.log('\n💡 SOLUTION NEEDED:');
      console.log('   1. Go to Supabase dashboard: https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu');
      console.log('   2. Navigate to Settings → Environment Variables');
      console.log('   3. Add: ELEVENLABS_API_KEY = [your ElevenLabs API key]');
      console.log('   4. Redeploy the Edge functions');
    } else if (error.message?.includes('Agent ID')) {
      console.log('\n💡 AGENT ID ISSUE:');
      console.log('   Current agent ID: agent_3201k6n4rrz8e2wrkf9tv372y0w4');
      console.log('   Verify this matches your ElevenLabs agent');
    } else if (error.message?.includes('Unauthorized')) {
      console.log('\n💡 AUTH ISSUE:');
      console.log('   JWT token might be invalid or expired');
    }
  } else {
    console.log('\n✅ Edge function successful!');
    console.log('🔗 Signed URL received:', data?.signed_url ? 'Yes' : 'No');
    if (data?.signed_url) {
      console.log('✅ Voice agent should work now!');
    }
  }
  
} catch (err) {
  console.error('❌ Test failed:', err.message);
}