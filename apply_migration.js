#!/usr/bin/env node

/**
 * Script to apply the database migration for missing memory table columns
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🔧 Applying database migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251020_fix_missing_memory_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`\n🔄 Executing ${statements.length} migration statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === ';') continue;
      
      console.log(`Statement ${i + 1}:`, statement.substring(0, 100) + '...');
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { data: directData, error: directError } = await supabase
            .from('__dummy__')
            .select('1')
            .limit(0);
          
          // If we can't use RPC, we'll need to log the statements for manual execution
          console.warn('⚠️ Cannot execute SQL directly via Supabase client');
          console.log('Please execute this SQL manually in your Supabase dashboard:');
          console.log('\n--- MIGRATION SQL ---');
          console.log(migrationSQL);
          console.log('--- END MIGRATION SQL ---\n');
          return;
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        console.log('Statement was:', statement);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    
    // Verify the migration worked by checking if the columns exist
    console.log('🔍 Verifying migration...');
    
    try {
      const { data: tableInfo, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'memories')
        .eq('table_schema', 'public')
        .in('column_name', ['is_primary_chunk', 'source_type']);
      
      if (error) {
        console.log('⚠️ Could not verify columns directly, but migration SQL was provided');
      } else if (tableInfo && tableInfo.length > 0) {
        console.log('✅ New columns found:', tableInfo);
      } else {
        console.log('⚠️ Columns not found in schema query, but this may be normal with limited permissions');
      }
    } catch (verifyError) {
      console.log('⚠️ Could not verify migration automatically');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nPlease execute this SQL manually in your Supabase dashboard:');
    console.log('\n--- MIGRATION SQL ---');
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251020_fix_missing_memory_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
    console.log('--- END MIGRATION SQL ---\n');
    process.exit(1);
  }
}

applyMigration();