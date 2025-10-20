#!/usr/bin/env node

/**
 * Database diagnostic script to check what's actually stored
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database content...\n');

  // Check recent voice recordings
  console.log('📊 RECENT VOICE RECORDINGS:');
  const { data: recordings, error: recordingsError } = await supabase
    .from('voice_recordings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recordingsError) {
    console.error('❌ Error fetching recordings:', recordingsError);
  } else {
    console.log(`Found ${recordings.length} recordings:`);
    recordings.forEach((recording, i) => {
      console.log(`  ${i + 1}. ID: ${recording.id}`);
      console.log(`     User: ${recording.user_id}`);
      console.log(`     Session: ${recording.session_id}`);
      console.log(`     Type: ${recording.recording_type}`);
      console.log(`     Duration: ${recording.duration_seconds}s`);
      console.log(`     Created: ${recording.created_at}`);
      console.log(`     Transcript: ${recording.transcript_text ? 'Yes' : 'No'}`);
      console.log('');
    });
  }

  // Check recent memories
  console.log('\n📝 RECENT MEMORIES:');
  const { data: memories, error: memoriesError } = await supabase
    .from('memories')
    .select('id, user_id, title, text, memory_date, created_at, chunk_sequence')
    .order('created_at', { ascending: false })
    .limit(10);

  if (memoriesError) {
    console.error('❌ Error fetching memories:', memoriesError);
  } else {
    console.log(`Found ${memories.length} memories:`);
    memories.forEach((memory, i) => {
      console.log(`  ${i + 1}. ID: ${memory.id}`);
      console.log(`     User: ${memory.user_id}`);
      console.log(`     Title: ${memory.title || 'Untitled'}`);
      console.log(`     Chunk: ${memory.chunk_sequence || 1}`);
      console.log(`     Date: ${memory.memory_date || 'No date'}`);
      console.log(`     Created: ${memory.created_at}`);
      console.log(`     Text length: ${memory.text ? memory.text.length : 0} chars`);
      console.log('');
    });
  }

  // Check users to understand who's been active
  console.log('\n👥 RECENT USERS:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
  } else {
    console.log(`Found ${profiles.length} user profiles:`);
    profiles.forEach((profile, i) => {
      console.log(`  ${i + 1}. ID: ${profile.id}`);
      console.log(`     Email: ${profile.email || 'No email'}`);
      console.log(`     Name: ${profile.full_name || 'No name'}`);
      console.log(`     Created: ${profile.created_at}`);
      console.log('');
    });
  }

  // Check storage bucket contents
  console.log('\n💾 VOICE RECORDINGS STORAGE:');
  const { data: files, error: filesError } = await supabase
    .storage
    .from('voice-recordings')
    .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });

  if (filesError) {
    console.error('❌ Error fetching storage files:', filesError);
  } else {
    console.log(`Found ${files.length} files in storage:`);
    files.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.name}`);
      console.log(`     Size: ${(file.metadata?.size || 0)} bytes`);
      console.log(`     Modified: ${file.updated_at}`);
      console.log('');
    });
  }
}

checkDatabase().catch(console.error);