import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVoiceRecordings() {
  console.log('🔍 Testing voice_recordings table...');
  
  try {
    // Test if table exists by trying to select from it
    const { data, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing voice_recordings table:', error);
      
      // Check if it's a table not found error
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('📋 Table does not exist - need to create it!');
      }
    } else {
      console.log('✅ voice_recordings table exists and is accessible');
      console.log('📊 Sample data length:', data?.length || 0);
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

testVoiceRecordings();