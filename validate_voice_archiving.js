#!/usr/bin/env node

/**
 * VOICE ARCHIVING VALIDATION SCRIPT
 * 
 * Comprehensive validation of voice archiving functionality
 * Run this script to validate the entire voice recording and memory system
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateVoiceArchiving() {
  console.log('🔍 VOICE ARCHIVING VALIDATION');
  console.log('================================');
  
  const results = {
    databaseConnectivity: false,
    voiceRecordingsTable: false,
    memoriesTable: false,
    memoriesTableSchema: false,
    voiceRecordingCount: 0,
    memoryCount: 0,
    errors: [],
    warnings: [],
    recommendations: []
  };

  try {
    // 1. Test basic database connectivity
    console.log('\n1️⃣ Testing database connectivity...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && !error.message.includes('session')) {
        throw error;
      }
      results.databaseConnectivity = true;
      console.log('✅ Database connectivity: OK');
    } catch (error) {
      results.errors.push(`Database connectivity failed: ${error.message}`);
      console.log('❌ Database connectivity: FAILED');
      console.log(`   Error: ${error.message}`);
    }

    // 2. Check voice_recordings table
    console.log('\n2️⃣ Checking voice_recordings table...');
    try {
      const { data, error, count } = await supabase
        .from('voice_recordings')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          results.errors.push('voice_recordings table does not exist');
          console.log('❌ voice_recordings table: MISSING');
        } else {
          results.errors.push(`voice_recordings table error: ${error.message}`);
          console.log('❌ voice_recordings table: ERROR');
          console.log(`   Error: ${error.message}`);
        }
      } else {
        results.voiceRecordingsTable = true;
        results.voiceRecordingCount = count || 0;
        console.log(`✅ voice_recordings table: OK (${count} records)`);
      }
    } catch (error) {
      results.errors.push(`voice_recordings validation failed: ${error.message}`);
      console.log('❌ voice_recordings table: EXCEPTION');
      console.log(`   Error: ${error.message}`);
    }

    // 3. Check memories table
    console.log('\n3️⃣ Checking memories table...');
    try {
      const { data, error, count } = await supabase
        .from('memories')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          results.errors.push('memories table does not exist');
          console.log('❌ memories table: MISSING');
        } else {
          results.errors.push(`memories table error: ${error.message}`);
          console.log('❌ memories table: ERROR');
          console.log(`   Error: ${error.message}`);
        }
      } else {
        results.memoriesTable = true;
        results.memoryCount = count || 0;
        console.log(`✅ memories table: OK (${count} records)`);
      }
    } catch (error) {
      results.errors.push(`memories validation failed: ${error.message}`);
      console.log('❌ memories table: EXCEPTION');
      console.log(`   Error: ${error.message}`);
    }

    // 4. Check memories table schema (required columns)
    console.log('\n4️⃣ Checking memories table schema...');
    try {
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'memories')
        .eq('table_schema', 'public');

      if (error) {
        results.warnings.push(`Could not check memories table schema: ${error.message}`);
        console.log('⚠️ memories table schema: CANNOT CHECK');
        console.log(`   Warning: ${error.message}`);
      } else {
        const columnNames = columns?.map(col => col.column_name) || [];
        const requiredColumns = ['is_primary_chunk', 'source_type'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
          results.errors.push(`Missing required columns in memories table: ${missingColumns.join(', ')}`);
          console.log('❌ memories table schema: MISSING COLUMNS');
          console.log(`   Missing: ${missingColumns.join(', ')}`);
          results.recommendations.push('Run the database migration to add missing columns (see MIGRATION_INSTRUCTIONS.md)');
        } else {
          results.memoriesTableSchema = true;
          console.log('✅ memories table schema: OK');
          console.log(`   All required columns present: ${requiredColumns.join(', ')}`);
        }
      }
    } catch (error) {
      results.warnings.push(`Schema validation failed: ${error.message}`);
      console.log('⚠️ memories table schema: EXCEPTION');
      console.log(`   Error: ${error.message}`);
    }

    // 5. Test sample memory insert (if schema is OK)
    if (results.memoriesTableSchema && results.memoriesTable) {
      console.log('\n5️⃣ Testing sample memory insert...');
      try {
        const testMemory = {
          user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
          title: 'Test Memory - Validation',
          text: 'This is a test memory for validation purposes.',
          is_primary_chunk: true,
          source_type: 'validation_test',
          tags: ['test', 'validation']
        };

        const { data, error } = await supabase
          .from('memories')
          .insert([testMemory])
          .select();

        if (error) {
          if (error.message.includes('foreign key constraint') || 
              error.message.includes('auth.users')) {
            console.log('✅ Sample insert: SCHEMA OK (foreign key constraint expected)');
            console.log('   Memory table accepts inserts with correct schema');
          } else if (error.message.includes('is_primary_chunk') || 
                     error.message.includes('source_type')) {
            results.errors.push(`Memory insert failed - missing columns: ${error.message}`);
            console.log('❌ Sample insert: SCHEMA ERROR');
            console.log(`   Error: ${error.message}`);
          } else {
            results.warnings.push(`Sample insert failed: ${error.message}`);
            console.log('⚠️ Sample insert: OTHER ERROR');
            console.log(`   Error: ${error.message}`);
          }
        } else {
          console.log('✅ Sample insert: SUCCESS');
          console.log('   Memory table accepts inserts correctly');
          
          // Clean up test record
          if (data && data[0]?.id) {
            await supabase.from('memories').delete().eq('id', data[0].id);
            console.log('   Test record cleaned up');
          }
        }
      } catch (error) {
        results.warnings.push(`Sample insert test failed: ${error.message}`);
        console.log('⚠️ Sample insert: EXCEPTION');
        console.log(`   Error: ${error.message}`);
      }
    }

    // 6. Check browser APIs
    console.log('\n6️⃣ Checking browser APIs...');
    
    // Note: These checks would only work in a browser environment
    console.log('ℹ️ Browser API checks:');
    console.log('   - MediaRecorder API: Check in browser console');
    console.log('   - getUserMedia API: Check in browser console');
    console.log('   - These APIs are only available in browser context');

  } catch (error) {
    results.errors.push(`Validation failed: ${error.message}`);
    console.log(`❌ Validation exception: ${error.message}`);
  }

  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('====================');
  
  const successCount = [
    results.databaseConnectivity,
    results.voiceRecordingsTable,
    results.memoriesTable,
    results.memoriesTableSchema
  ].filter(Boolean).length;

  console.log(`✅ Passed checks: ${successCount}/4`);
  console.log(`📊 Voice recordings: ${results.voiceRecordingCount}`);
  console.log(`📊 Memories: ${results.memoryCount}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log(`⚠️ Warnings: ${results.warnings.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    results.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  // Generate recommendations
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('\n🎉 ALL CHECKS PASSED!');
    console.log('   Voice archiving system should be fully functional.');
  } else {
    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (!results.memoriesTableSchema) {
      console.log('   1. Apply database migration to add missing columns');
      console.log('      → See MIGRATION_INSTRUCTIONS.md');
      console.log('      → Run the SQL in Supabase dashboard');
    }
    
    if (!results.voiceRecordingsTable) {
      console.log('   2. Check voice_recordings table exists and has proper permissions');
    }
    
    if (!results.memoriesTable) {
      console.log('   3. Check memories table exists and has proper permissions');
    }

    if (results.voiceRecordingCount === 0) {
      console.log('   4. No voice recordings found - test recording functionality');
    }

    if (results.memoryCount === 0) {
      console.log('   5. No memories found - test memory saving functionality');
    }

    console.log('   6. Use the Voice Diagnostics panel in Admin dashboard for real-time monitoring');
    console.log('   7. Check browser console for detailed error logs during testing');
  }

  console.log('\n🔍 NEXT STEPS:');
  console.log('   1. Open the app in browser and go to /admin');
  console.log('   2. Click "Voice Diagnostics" tab');
  console.log('   3. Click "Run Validation" for real-time browser-based tests');
  console.log('   4. Test actual voice recording and memory saving functionality');

  return results;
}

// Run validation
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load environment variables
  try {
    const envContent = readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (error) {
    console.warn('⚠️ Could not load .env file, using existing environment variables');
  }

  validateVoiceArchiving().catch(console.error);
}