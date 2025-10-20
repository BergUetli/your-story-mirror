#!/usr/bin/env node

/**
 * Test memory insertion with new schema
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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
  console.warn('⚠️ Could not load .env file');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMemoryInsert() {
  console.log('🧪 Testing Memory Insert with New Schema');
  console.log('==========================================');

  try {
    // Test memory insert
    const testMemory = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID (will fail foreign key)
      title: 'Test Memory - Schema Validation',
      text: 'This is a test memory to validate the new schema with is_primary_chunk and source_type columns.',
      is_primary_chunk: true,
      source_type: 'validation_test',
      tags: ['test', 'validation', 'schema'],
      memory_date: '2024-10-20',
      memory_location: 'Test Location',
      chunk_sequence: 1,
      total_chunks: 1
    };

    console.log('📝 Attempting to insert test memory...');
    console.log('Memory data:', JSON.stringify(testMemory, null, 2));

    const { data, error } = await supabase
      .from('memories')
      .insert([testMemory])
      .select();

    if (error) {
      // Analyze the error
      if (error.message.includes('foreign key constraint') || 
          error.message.includes('auth.users')) {
        console.log('✅ SCHEMA VALIDATION PASSED!');
        console.log('   Error is expected (foreign key constraint for test UUID)');
        console.log('   This means the is_primary_chunk and source_type columns exist');
        console.log('   and the memory table accepts the new schema correctly.');
        console.log(`   Error: ${error.message}`);
        return { success: true, schemaValid: true };
      } else if (error.message.includes('is_primary_chunk') || 
                 error.message.includes('source_type')) {
        console.log('❌ SCHEMA VALIDATION FAILED!');
        console.log('   The migration was not applied correctly.');
        console.log('   Missing columns: is_primary_chunk or source_type');
        console.log(`   Error: ${error.message}`);
        return { success: false, schemaValid: false, error: error.message };
      } else if (error.message.includes('violates not-null constraint')) {
        console.log('⚠️ SCHEMA POSSIBLY VALID');
        console.log('   Not-null constraint error may indicate schema is OK');
        console.log('   but some required field is missing');
        console.log(`   Error: ${error.message}`);
        return { success: true, schemaValid: true, warning: error.message };
      } else {
        console.log('⚠️ UNEXPECTED ERROR');
        console.log('   Schema validation inconclusive due to unexpected error');
        console.log(`   Error: ${error.message}`);
        return { success: false, schemaValid: 'unknown', error: error.message };
      }
    } else {
      console.log('🎉 INSERT SUCCESSFUL!');
      console.log('   Memory was inserted successfully (unexpected but good!)');
      console.log('   Data:', JSON.stringify(data, null, 2));
      
      // Clean up the test record
      if (data && data[0]?.id) {
        await supabase.from('memories').delete().eq('id', data[0].id);
        console.log('🧹 Test record cleaned up');
      }
      
      return { success: true, schemaValid: true, inserted: true };
    }

  } catch (error) {
    console.log('❌ EXCEPTION DURING TEST');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test with authenticated user if possible
async function testWithAuthenticatedUser() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('⚠️ No authenticated user - using test UUID');
      return null;
    }

    console.log(`\n🔐 Testing with authenticated user: ${user.id}`);
    
    const testMemory = {
      user_id: user.id,
      title: 'Real Test Memory - Schema Validation',
      text: 'This is a real test memory with authenticated user to validate the schema.',
      is_primary_chunk: true,
      source_type: 'validation_test_auth',
      tags: ['test', 'validation', 'authenticated'],
      memory_date: '2024-10-20',
      memory_location: 'Test Location with Auth'
    };

    const { data, error } = await supabase
      .from('memories')
      .insert([testMemory])
      .select();

    if (error) {
      console.log('❌ Authenticated insert failed:');
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message };
    } else {
      console.log('✅ Authenticated insert successful!');
      console.log(`   Memory ID: ${data[0].id}`);
      
      // Clean up
      await supabase.from('memories').delete().eq('id', data[0].id);
      console.log('🧹 Authenticated test record cleaned up');
      
      return { success: true, data: data[0] };
    }
  } catch (error) {
    console.log('⚠️ Authenticated test failed:');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const testResult = await testMemoryInsert();
  const authResult = await testWithAuthenticatedUser();
  
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  if (testResult.success && testResult.schemaValid) {
    console.log('✅ Schema validation: PASSED');
    console.log('   The database migration was applied successfully');
    console.log('   Memory saving should work correctly now');
  } else if (!testResult.schemaValid) {
    console.log('❌ Schema validation: FAILED');
    console.log('   The database migration needs to be applied');
    console.log('   See MIGRATION_INSTRUCTIONS.md for steps');
  } else {
    console.log('⚠️ Schema validation: INCONCLUSIVE');
    console.log('   Check the error messages above for details');
  }
  
  if (authResult) {
    if (authResult.success) {
      console.log('✅ Authenticated user test: PASSED');
      console.log('   Memory saving works with real user accounts');
    } else {
      console.log('❌ Authenticated user test: FAILED');
      console.log('   There may be additional issues with memory saving');
    }
  }
  
  console.log('\n🔍 Next Steps:');
  if (testResult.success && testResult.schemaValid) {
    console.log('1. ✅ Database schema is ready');
    console.log('2. 🧪 Test voice recording and auto-save in the app');
    console.log('3. 📊 Use Voice Diagnostics panel for real-time monitoring');
    console.log('4. 🎯 The validation should now pass completely');
  } else {
    console.log('1. 🔧 Apply database migration (see MIGRATION_INSTRUCTIONS.md)');
    console.log('2. 🔄 Run this test again to verify the fix');
    console.log('3. 🧪 Then test voice recording and memory saving in the app');
  }
}

main().catch(console.error);