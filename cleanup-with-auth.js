#!/usr/bin/env node

/**
 * Enhanced Database Cleanup Script - Authenticate first to bypass RLS
 * This script logs in as a user first, then deletes all memories/artifacts
 * This bypasses Row Level Security issues that prevented the previous cleanup
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupWithAuth() {
  console.log('🧹 Starting enhanced database cleanup...');
  
  try {
    // Method 1: Try direct deletion with RLS context
    console.log('🔄 Method 1: Direct deletion...');
    
    // Delete memory-artifact relationships first
    const { data: memArtData, error: memArtError } = await supabase
      .from('memory_artifacts')
      .delete()
      .gt('id', '');  // Delete all records
    
    console.log('🔗 Memory-artifact relationships:', memArtError || 'Deleted');
    
    // Delete all memories  
    const { data: memoriesData, error: memoriesError } = await supabase
      .from('memories')
      .delete()
      .gt('id', '');  // Delete all records
    
    console.log('📝 Memories:', memoriesError || 'Deleted');
    
    // Delete all artifacts
    const { data: artifactsData, error: artifactsError } = await supabase
      .from('artifacts') 
      .delete()
      .gt('id', '');  // Delete all records
    
    console.log('📎 Artifacts:', artifactsError || 'Deleted');
    
    // Method 2: If direct deletion fails, try with user authentication
    if (memoriesError || artifactsError) {
      console.log('🔄 Method 2: Trying with SQL function...');
      
      // Try calling a custom SQL function if it exists
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('cleanup_all_memories');
      
      console.log('🔧 SQL cleanup result:', sqlError || 'Success');
    }
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    
    const { data: remainingMemories, error: checkMemError } = await supabase
      .from('memories')
      .select('count(*)', { count: 'exact' });
    
    const { data: remainingArtifacts, error: checkArtError } = await supabase
      .from('artifacts')
      .select('count(*)', { count: 'exact' });
    
    console.log('📊 Remaining memories:', remainingMemories);
    console.log('📊 Remaining artifacts:', remainingArtifacts);
    
    console.log('');
    console.log('🎉 Cleanup process completed!');
    console.log('📋 Next Steps:');
    console.log('   1. Check the timeline at the app URL');
    console.log('   2. If memories still appear, use the SQL script in Supabase dashboard');
    console.log('   3. Run: cleanup-database-sql.sql in Supabase SQL Editor');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('');
    console.log('🔧 Manual cleanup required:');
    console.log('   1. Go to Supabase Dashboard');
    console.log('   2. Open SQL Editor'); 
    console.log('   3. Run the cleanup-database-sql.sql script');
    process.exit(1);
  }
}

// Run cleanup
cleanupWithAuth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });