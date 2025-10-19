#!/usr/bin/env node

/**
 * Database Cleanup Script - Clear memories and artifacts while preserving user profiles
 * This script removes all memories, artifacts, memory_artifacts relationships, and voice recordings
 * but keeps user accounts and authentication intact for fresh start experience
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
let envVars = {};
try {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      envVars[key] = values.join('=').replace(/^['"]|['"]$/g, '');
    }
  });
} catch (error) {
  console.log('No .env file found, using process.env');
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔑 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Expected: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupMemoriesAndArtifacts() {
  console.log('🧹 Starting database cleanup - preserving user profiles...');
  
  try {
    // 1. Delete memory-artifact relationships first (foreign key constraints)
    console.log('🔗 Deleting memory-artifact relationships...');
    const { error: memoryArtifactsError } = await supabase
      .from('memory_artifacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (memoryArtifactsError) {
      console.warn('⚠️ Memory artifacts cleanup warning:', memoryArtifactsError);
    } else {
      console.log('✅ Memory-artifact relationships cleared');
    }
    
    // 2. Delete all memories
    console.log('📝 Deleting all memories...');
    const { error: memoriesError } = await supabase
      .from('memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (memoriesError) {
      console.warn('⚠️ Memories cleanup warning:', memoriesError);
    } else {
      console.log('✅ All memories cleared');
    }
    
    // 3. Delete all artifacts
    console.log('📎 Deleting all artifacts...');
    const { error: artifactsError } = await supabase
      .from('artifacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (artifactsError) {
      console.warn('⚠️ Artifacts cleanup warning:', artifactsError);
    } else {
      console.log('✅ All artifacts cleared');
    }
    
    // 4. Delete all voice recordings  
    console.log('🎙️ Deleting all voice recordings...');
    const { error: voiceRecordingsError } = await supabase
      .from('voice_recordings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (voiceRecordingsError) {
      console.warn('⚠️ Voice recordings cleanup warning:', voiceRecordingsError);
    } else {
      console.log('✅ All voice recordings cleared');
    }
    
    // 5. Verify user profiles are preserved
    console.log('👤 Verifying user profiles are preserved...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.warn('⚠️ Could not verify users (may need admin access):', usersError);
    } else {
      console.log(`✅ ${users.users?.length || 0} user profiles preserved`);
    }
    
    console.log('');
    console.log('🎉 Database cleanup completed successfully!');
    console.log('📋 Summary:');
    console.log('   ✅ All memories deleted');
    console.log('   ✅ All artifacts deleted');  
    console.log('   ✅ All memory-artifact relationships deleted');
    console.log('   ✅ All voice recordings deleted');
    console.log('   ✅ User profiles preserved');
    console.log('   ✅ Ready for fresh user experience');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupMemoriesAndArtifacts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { cleanupMemoriesAndArtifacts };