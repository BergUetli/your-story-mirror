// Test Supabase connection to diagnose API key issues
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

console.log('🔍 Testing Supabase connection...');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Key (first 20 chars):', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Test 1: Basic connection
console.log('\n📊 Test 1: Basic Supabase client creation');
console.log('✅ Supabase client created successfully');

// Test 2: Try to fetch from a simple table
console.log('\n📊 Test 2: Test database connection (fetch users)');
try {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Database query error:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Database connection successful');
    console.log('📊 Sample data:', data);
  }
} catch (err) {
  console.error('❌ Database connection failed:', err);
}

// Test 3: Try to sign up a test user (where the original error occurs)
console.log('\n📊 Test 3: Test user signup (where invalid API key error occurs)');
try {
  const { data, error } = await supabase.auth.signUp({
    email: 'test-' + Date.now() + '@example.com',
    password: 'testpassword123'
  });
  
  if (error) {
    console.error('❌ Auth signup error:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Auth signup successful');
    console.log('📊 Auth data:', data);
  }
} catch (err) {
  console.error('❌ Auth signup failed:', err);
}

// Test 4: Check if we can access the ElevenLabs edge function
console.log('\n📊 Test 4: Test ElevenLabs edge function access');
try {
  const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
    body: { test: true }
  });
  
  if (error) {
    console.error('❌ Edge function error:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Edge function accessible');
    console.log('📊 Function response:', data);
  }
} catch (err) {
  console.error('❌ Edge function failed:', err);
}