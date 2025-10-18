// Find user profile for BergUetli
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔍 Looking for BergUetli\'s profile...\n');

try {
  // Look for profile by user_id
  const { data: profileById, error: byIdError } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', '19e6ba16-8a06-447e-951d-ceb0299bbdb0')
    .single();
  
  if (byIdError && byIdError.code !== 'PGRST116') {
    console.error('❌ Error searching by ID:', byIdError);
  } else if (profileById) {
    console.log('✅ Found profile by user_id:');
    console.log(`   👤 Name: ${profileById.name}`);
    console.log(`   📧 Email: ${profileById.email}`);
    console.log(`   🆔 User ID: ${profileById.user_id}`);
    console.log(`   📅 Created: ${profileById.created_at}`);
  } else {
    console.log('❌ No profile found by user_id');
  }
  
  // Look for profile by email
  const { data: profileByEmail, error: byEmailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'berguetli@gmail.com')
    .single();
  
  if (byEmailError && byEmailError.code !== 'PGRST116') {
    console.error('❌ Error searching by email:', byEmailError);
  } else if (profileByEmail) {
    console.log('✅ Found profile by email:');
    console.log(`   👤 Name: ${profileByEmail.name}`);
    console.log(`   📧 Email: ${profileByEmail.email}`);
    console.log(`   🆔 User ID: ${profileByEmail.user_id}`);
  } else {
    console.log('❌ No profile found by email');
  }
  
  // If no profile found, create it manually
  if (!profileById && !profileByEmail) {
    console.log('\n🔧 Profile missing, creating manually...');
    
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert({
        user_id: '19e6ba16-8a06-447e-951d-ceb0299bbdb0',
        email: 'berguetli@gmail.com',
        name: 'BergUetli',
        onboarding_completed: false
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create profile:', createError);
    } else {
      console.log('✅ Profile created successfully!');
      console.log(`   👤 Name: ${newProfile.name}`);
      console.log(`   📧 Email: ${newProfile.email}`);
    }
  }
  
} catch (err) {
  console.error('❌ Search failed:', err);
}