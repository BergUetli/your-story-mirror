#!/usr/bin/env node

/**
 * Test script to check onboarding status in the database
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

async function testOnboardingStatus() {
  console.log('🔍 Testing onboarding status...');
  
  try {
    // Check if users table exists and what's in it
    console.log('📋 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users found:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('📊 Sample users:', users.map(u => ({
          user_id: u.user_id,
          onboarding_completed: u.onboarding_completed
        })));
      }
    }

    // Check if user_profiles table exists
    console.log('\n📋 Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log('❌ User_profiles table error:', profilesError);
      
      // Try creating a user_profiles record via UserProfileService if table exists
      console.log('\n🔧 Attempting to create user_profiles table via SQL...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
          onboarding_completed BOOLEAN DEFAULT false,
          first_conversation_completed BOOLEAN DEFAULT false,
          first_conversation_completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec', { query: createTableSQL });
      if (createError) {
        console.log('❌ Table creation failed:', createError);
      } else {
        console.log('✅ Table creation attempted');
      }
    } else {
      console.log('✅ Profiles found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('📊 Sample profiles:', profiles.map(p => ({
          id: p.id,
          user_id: p.user_id,
          onboarding_completed: p.onboarding_completed,
          first_conversation_completed: p.first_conversation_completed
        })));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOnboardingStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });