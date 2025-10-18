// Create demo user in Supabase auth system
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gulydhhzwlltkxbfnclu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('🔐 Creating demo user in Supabase auth system...\n');

try {
  // Create the demo user
  const { data, error } = await supabase.auth.signUp({
    email: 'demo@youremembered.app',
    password: 'demo123',  // Simple demo password
    options: {
      emailRedirectTo: 'http://localhost:3000/',
      data: {
        name: 'Demo User'
      }
    }
  });
  
  if (error) {
    if (error.message.includes('User already registered')) {
      console.log('✅ Demo user already exists in auth system');
      console.log('📧 Email: demo@youremembered.app');
      console.log('🔑 Password: demo123');
      
      // Try to sign in to verify
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'demo@youremembered.app',
        password: 'demo123'
      });
      
      if (signInError) {
        console.log('❌ Sign-in test failed:', signInError.message);
        console.log('💡 Try other common passwords: "password", "password123", "123456"');
      } else {
        console.log('✅ Sign-in test successful! You can use these credentials.');
      }
      
    } else {
      console.error('❌ Error creating demo user:', error.message);
    }
  } else {
    console.log('🎉 Demo user created successfully!');
    console.log('📧 Email: demo@youremembered.app');
    console.log('🔑 Password: demo123');
    console.log('👤 User ID:', data.user?.id);
    console.log('\n✅ You can now sign in with these credentials!');
  }
  
} catch (err) {
  console.error('❌ Script failed:', err);
}