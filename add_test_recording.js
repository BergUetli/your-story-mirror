/**
 * ADD TEST VOICE RECORDING
 * 
 * This script adds a sample voice recording to the voice_recordings table
 * for testing the Archive playback functionality.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestRecording() {
  console.log('🎵 Adding test voice recording...');
  
  try {
    // First, let's get a user ID to associate with the recording
    // We'll check if there are any existing users in the system
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('⚠️ Cannot access user list, using mock user ID');
    }

    // For testing, we'll create a sample recording entry
    // In production, this would be created when actual audio is recorded
    const testRecording = {
      user_id: '00000000-0000-0000-0000-000000000001', // Mock user ID for testing
      session_id: 'test-session-' + Date.now(),
      recording_type: 'conversation',
      storage_path: 'test/sample-conversation.webm', // Mock storage path
      original_filename: 'conversation_2024_10_19.webm',
      file_size_bytes: 256000, // ~256KB
      duration_seconds: 45.5, // 45.5 seconds
      mime_type: 'audio/webm',
      transcript_text: `Hello Solin, I wanted to tell you about my graduation from University of Chicago Booth School of Business. It was such an incredible milestone in my life. I remember walking across that stage feeling so proud of all the hard work I had put in over the past two years. The ceremony was beautiful, and having my family there made it even more special. This degree represents not just academic achievement, but personal growth and the foundation for my career in business.`,
      conversation_summary: `User shared their graduation experience from University of Chicago Booth School of Business, describing it as an incredible milestone. They felt proud walking across the stage and appreciated having family present. The user emphasized that the degree represents both academic achievement and personal growth, serving as a foundation for their business career.`,
      memory_ids: [], // Empty for now, would be filled when memories are created
      topics: ['education', 'graduation', 'university of chicago', 'booth school', 'family', 'achievement', 'career', 'milestone'],
      session_mode: 'memory_creation',
      conversation_phase: 'active_conversation',
      is_compressed: true,
      retention_days: 90
    };

    console.log('📋 Inserting test recording...');
    const { data, error } = await supabase
      .from('voice_recordings')
      .insert([testRecording])
      .select();

    if (error) {
      console.error('❌ Error inserting test recording:', error);
      
      // If it's a user_id foreign key constraint error, try with a different approach
      if (error.message.includes('violates foreign key constraint')) {
        console.log('🔧 User ID constraint issue, trying alternative approach...');
        
        // Try to get actual user from auth.users table
        const { data: authUsers } = await supabase
          .from('auth.users')
          .select('id')
          .limit(1);
          
        if (authUsers && authUsers.length > 0) {
          testRecording.user_id = authUsers[0].id;
          console.log('🆔 Using real user ID:', authUsers[0].id);
          
          const { data: retryData, error: retryError } = await supabase
            .from('voice_recordings')
            .insert([testRecording])
            .select();
            
          if (retryError) {
            console.error('❌ Retry failed:', retryError);
            return;
          }
          
          data = retryData;
        } else {
          console.log('❌ No users found in system. Cannot create test recording without valid user.');
          console.log('💡 Please log in to the app first, then run this script.');
          return;
        }
      } else {
        return;
      }
    }

    if (data && data.length > 0) {
      console.log('✅ Test recording created successfully!');
      console.log('📊 Recording details:');
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Duration: ${data[0].duration_seconds} seconds`);
      console.log(`   Topics: ${data[0].topics.join(', ')}`);
      console.log(`   Summary: ${data[0].conversation_summary.substring(0, 100)}...`);
      console.log('');
      console.log('🎯 Now refresh the Archive page to see the test recording!');
      console.log('🎵 Note: The audio file is mock data - playback will show the transcript');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Also create a function to add a sample memory that could be linked
async function addSampleMemory() {
  console.log('📝 Adding sample memory for testing...');
  
  try {
    const sampleMemory = {
      user_id: '00000000-0000-0000-0000-000000000001', // Same mock user ID
      title: 'Graduation from University of Chicago Booth',
      content: `My graduation from the University of Chicago Booth School of Business was truly a defining moment in my life. Walking across that stage, I felt an overwhelming sense of pride and accomplishment. The two years of rigorous study, late nights, challenging projects, and personal growth all culminated in that single moment.

Having my family there to witness this milestone made it infinitely more meaningful. Their support throughout my MBA journey was invaluable, and seeing their proud faces in the audience was emotional. This wasn't just an academic achievement - it represented my commitment to excellence and my preparation for the next chapter of my career in business.

The Booth experience taught me not just business principles, but leadership, analytical thinking, and the importance of networking and collaboration. As I held that diploma, I knew I was ready to take on new challenges and make a meaningful impact in the business world.`,
      year: 2023,
      month: 6,
      day: 15,
      memory_type: 'milestone',
      tags: ['education', 'graduation', 'achievement', 'booth', 'mba', 'family'],
      is_private: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('memories')
      .insert([sampleMemory])
      .select();

    if (error) {
      console.log('⚠️ Could not create sample memory:', error.message);
      console.log('💡 This is okay - the voice recording will still work without linked memories');
    } else if (data && data.length > 0) {
      console.log('✅ Sample memory created successfully!');
      console.log(`📝 Memory: "${data[0].title}" (${data[0].year})`);
      
      // Now update the voice recording to link to this memory
      const { error: updateError } = await supabase
        .from('voice_recordings')
        .update({ 
          memory_ids: [data[0].id] 
        })
        .eq('session_id', testRecording.session_id);
        
      if (!updateError) {
        console.log('🔗 Voice recording linked to memory successfully!');
      }
    }
  } catch (error) {
    console.log('⚠️ Memory creation failed, but voice recording will still work');
  }
}

// Run both functions
addTestRecording().then(() => {
  return addSampleMemory();
});