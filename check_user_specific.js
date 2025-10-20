#!/usr/bin/env node

/**
 * User-specific database diagnostic for the conversation test
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);

// User ID from console logs
const testUserId = '19e6ba16-8a06-447e-951d-ceb0299bbdb0';
const recordingSessionId = 'conv_1760976320593_xn7cowvnd';

async function checkUserSpecificData() {
  console.log('🔍 Checking specific user data...');
  console.log(`👤 User ID: ${testUserId}`);
  console.log(`🎤 Recording Session: ${recordingSessionId}\n`);

  // Check memories for this specific user
  console.log('📝 MEMORIES FOR THIS USER:');
  const { data: userMemories, error: memoriesError } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (memoriesError) {
    console.error('❌ Error fetching user memories:', memoriesError);
  } else {
    console.log(`Found ${userMemories.length} memories for user:`);
    userMemories.forEach((memory, i) => {
      console.log(`  ${i + 1}. ID: ${memory.id}`);
      console.log(`     Title: ${memory.title}`);
      console.log(`     Date: ${memory.memory_date || 'No date'}`);
      console.log(`     Location: ${memory.memory_location || 'No location'}`);
      console.log(`     Created: ${memory.created_at}`);
      console.log(`     Source: ${memory.source_type || 'manual'}`);
      console.log(`     Chunk: ${memory.chunk_sequence}`);
      console.log('');
    });
  }

  // Check voice recordings for this user
  console.log('\n🎤 VOICE RECORDINGS FOR THIS USER:');
  const { data: userRecordings, error: recordingsError } = await supabase
    .from('voice_recordings')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recordingsError) {
    console.error('❌ Error fetching user recordings:', recordingsError);
  } else {
    console.log(`Found ${userRecordings.length} recordings for user:`);
    userRecordings.forEach((recording, i) => {
      console.log(`  ${i + 1}. ID: ${recording.id}`);
      console.log(`     Session: ${recording.session_id}`);
      console.log(`     Duration: ${recording.duration_seconds}s`);
      console.log(`     Memory IDs: ${recording.memory_ids ? JSON.stringify(recording.memory_ids) : 'None'}`);
      console.log(`     Created: ${recording.created_at}`);
      console.log(`     Has transcript: ${recording.transcript_text ? 'Yes' : 'No'}`);
      console.log('');
    });
  }

  // Check for the specific recording session
  console.log('\n🔍 SPECIFIC RECORDING SESSION:');
  const { data: specificRecording, error: specificError } = await supabase
    .from('voice_recordings')
    .select('*')
    .eq('session_id', recordingSessionId)
    .maybeSingle();

  if (specificError) {
    console.error('❌ Error fetching specific recording:', specificError);
  } else if (specificRecording) {
    console.log('✅ Found the recording from your test conversation:');
    console.log(`   Session: ${specificRecording.session_id}`);
    console.log(`   User: ${specificRecording.user_id}`);
    console.log(`   Duration: ${specificRecording.duration_seconds}s`);
    console.log(`   Memory IDs: ${specificRecording.memory_ids ? JSON.stringify(specificRecording.memory_ids) : 'None linked'}`);
    console.log(`   Transcript: ${specificRecording.transcript_text ? 'Yes (' + specificRecording.transcript_text.length + ' chars)' : 'No'}`);
    console.log(`   Created: ${specificRecording.created_at}`);
  } else {
    console.log('❌ Recording session not found in database');
  }

  // Check for memories created around the conversation time
  console.log('\n⏰ MEMORIES CREATED AROUND CONVERSATION TIME:');
  const conversationTime = new Date('2025-10-20T16:06:36.078Z'); // From console logs
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  const startTime = new Date(conversationTime.getTime() - timeWindow);
  const endTime = new Date(conversationTime.getTime() + timeWindow);
  
  const { data: recentMemories, error: recentError } = await supabase
    .from('memories')
    .select('*')
    .gte('created_at', startTime.toISOString())
    .lte('created_at', endTime.toISOString())
    .order('created_at', { ascending: false });

  if (recentError) {
    console.error('❌ Error fetching recent memories:', recentError);
  } else {
    console.log(`Found ${recentMemories.length} memories created around conversation time:`);
    recentMemories.forEach((memory, i) => {
      console.log(`  ${i + 1}. ID: ${memory.id}`);
      console.log(`     User: ${memory.user_id}`);
      console.log(`     Title: ${memory.title}`);
      console.log(`     Created: ${memory.created_at}`);
      console.log(`     Matches user: ${memory.user_id === testUserId ? 'YES' : 'NO'}`);
      console.log('');
    });
  }
}

checkUserSpecificData().catch(console.error);