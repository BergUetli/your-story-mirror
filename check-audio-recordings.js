// Simple script to check for voice recordings  
// This helps debug audio recording functionality

import { createClient } from '@supabase/supabase-js';

// Note: In production, use environment variables
const supabaseUrl = 'https://ipmioevhtuoyygbxuzah.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwbWlvZXZodHVveXlnYnh1emFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2ODE0ODYsImV4cCI6MjA0NTI1NzQ4Nn0.ynRO_U5aT0R2E5cQPrY0L4vn-XC68YNaOmveUvCZ7xk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudioRecordings() {
  console.log('🔍 Checking for voice recordings...');
  
  try {
    // Check for recent memories with "Shiven" in the title
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select('id, title, created_at, user_id')
      .ilike('title', '%shiven%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (memoriesError) {
      console.error('❌ Error fetching memories:', memoriesError);
      return;
    }

    console.log(`📝 Found ${memories?.length || 0} memories with "Shiven":`);
    memories?.forEach((memory, idx) => {
      console.log(`  ${idx + 1}. "${memory.title}" (ID: ${memory.id})`);
      console.log(`     Created: ${new Date(memory.created_at).toLocaleString()}`);
    });

    if (memories && memories.length > 0) {
      // Check for voice recordings for these memories
      const { data: recordings, error: recordingsError } = await supabase
        .from('voice_recordings')
        .select('*')
        .in('memory_id', memories.map(m => m.id));

      if (recordingsError) {
        console.error('❌ Error fetching recordings:', recordingsError);
        return;
      }

      console.log(`🎤 Found ${recordings?.length || 0} voice recordings for these memories:`);
      recordings?.forEach((recording, idx) => {
        console.log(`  ${idx + 1}. Memory ID: ${recording.memory_id}`);
        console.log(`     Audio Path: ${recording.audio_path}`);
        console.log(`     Duration: ${recording.duration_ms}ms`);
        console.log(`     Recorded: ${new Date(recording.created_at).toLocaleString()}`);
      });

      // Check all voice recordings for user (recent ones)
      if (memories[0]?.user_id) {
        const { data: allRecordings, error: allError } = await supabase
          .from('voice_recordings')
          .select('*')
          .eq('user_id', memories[0].user_id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!allError) {
          console.log(`📊 Total recent voice recordings for user: ${allRecordings?.length || 0}`);
          allRecordings?.forEach((rec, idx) => {
            console.log(`  ${idx + 1}. Session: ${rec.session_id?.slice(0, 8)}...`);
            console.log(`     Memory ID: ${rec.memory_id || 'None'}`);
            console.log(`     Audio: ${rec.audio_path ? 'Yes' : 'No'}`);
            console.log(`     Duration: ${rec.duration_ms}ms`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkAudioRecordings().then(() => {
  console.log('✅ Audio recording check complete');
}).catch(error => {
  console.error('❌ Script error:', error);
});