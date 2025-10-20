#!/usr/bin/env node

/**
 * Debug RLS policies and authentication
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);
const testUserId = '19e6ba16-8a06-447e-951d-ceb0299bbdb0';

async function debugDatabase() {
  console.log('🔍 Debugging database access and RLS policies...\n');

  // Test basic connection
  console.log('📡 TESTING CONNECTION:');
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection error:', error);
    } else {
      console.log(`✅ Connection successful. Total memories in database: ${data}`);
    }
  } catch (e) {
    console.error('❌ Connection failed:', e);
  }

  // Test RLS bypassing with service role if available
  console.log('\n🔐 TESTING PERMISSIONS:');
  try {
    // Try to select all memories without user filter to test RLS
    const { data: allMemories, error: allError } = await supabase
      .from('memories')
      .select('id, user_id, title, created_at')
      .limit(5);

    if (allError) {
      console.error('❌ RLS may be blocking access:', allError);
    } else {
      console.log(`✅ Can read memories. Found ${allMemories.length} total memories:`);
      allMemories.forEach((memory, i) => {
        console.log(`  ${i + 1}. User: ${memory.user_id.substring(0, 8)}... Title: ${memory.title}`);
      });
    }
  } catch (e) {
    console.error('❌ Query failed:', e);
  }

  // Test authentication context
  console.log('\n👤 TESTING AUTH CONTEXT:');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ No authenticated user (using anon key):', authError.message);
    } else if (user) {
      console.log(`✅ Authenticated as: ${user.id}`);
      console.log(`   Email: ${user.email}`);
    } else {
      console.log('⚠️ Using anonymous access');
    }
  } catch (e) {
    console.error('❌ Auth check failed:', e);
  }

  // Test direct memory insertion
  console.log('\n💾 TESTING DIRECT MEMORY INSERT:');
  const testMemory = {
    user_id: testUserId,
    title: 'Test Memory Insert',
    text: 'This is a test to see if memories can be inserted',
    memory_date: '1997-01-01',
    memory_location: 'Test Location',
    tags: ['test'],
    chunk_sequence: 1,
    is_primary_chunk: true,
    source_type: 'debug_test'
  };

  try {
    const { data: insertData, error: insertError } = await supabase
      .from('memories')
      .insert(testMemory)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      
      // Check if it's an RLS error
      if (insertError.code === '42501' || insertError.message.includes('policy')) {
        console.log('🚨 This is likely an RLS (Row Level Security) policy issue!');
        console.log('   The user might not be properly authenticated for inserts.');
      }
    } else {
      console.log('✅ Insert successful:', insertData.id);
      
      // Clean up test memory
      await supabase.from('memories').delete().eq('id', insertData.id);
      console.log('🧹 Cleaned up test memory');
    }
  } catch (e) {
    console.error('❌ Insert exception:', e);
  }

  // Test voice recording insert
  console.log('\n🎤 TESTING VOICE RECORDING INSERT:');
  const testRecording = {
    user_id: testUserId,
    session_id: 'debug-test-session',
    recording_type: 'test',
    storage_path: 'test/path.webm',
    duration_seconds: 5.0,
    file_size_bytes: 1000,
    transcript_text: 'Test transcript',
    conversation_summary: 'Test recording for debugging',
    session_mode: 'debug_test',
    mime_type: 'audio/webm'
  };

  try {
    const { data: recData, error: recError } = await supabase
      .from('voice_recordings')
      .insert(testRecording)
      .select()
      .single();

    if (recError) {
      console.error('❌ Voice recording insert failed:', recError);
    } else {
      console.log('✅ Voice recording insert successful:', recData.id);
      
      // Clean up
      await supabase.from('voice_recordings').delete().eq('id', recData.id);
      console.log('🧹 Cleaned up test recording');
    }
  } catch (e) {
    console.error('❌ Voice recording exception:', e);
  }

  console.log('\n🎯 DIAGNOSIS COMPLETE');
}

debugDatabase().catch(console.error);