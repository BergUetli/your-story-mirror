/**
 * DATABASE SETUP SERVICE
 * 
 * Service for setting up missing database tables and structures
 * that are required for the application to function properly.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SetupResult {
  success: boolean;
  message: string;
  details?: string[];
}

export class DatabaseSetupService {
  
  /**
   * Check if voice_recordings table exists and is accessible
   */
  async checkVoiceRecordingsTable(): Promise<SetupResult> {
    try {
      console.log('🔍 Checking voice_recordings table...');
      
      // Try to query the table
      const { data, error } = await supabase
        .from('voice_recordings')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('voice_recordings') && 
            (error.message.includes('does not exist') || 
             error.message.includes('not found') ||
             error.message.includes('schema cache'))) {
          
          return {
            success: false,
            message: 'Voice recordings table does not exist',
            details: [
              '❌ voice_recordings table not found',
              '🔧 This table is required for the Archive feature',
              '📋 Use manual SQL creation in Supabase Dashboard',
              '💡 Copy contents from fix_voice_recordings.sql file'
            ]
          };
        }
        
        return {
          success: false,
          message: `Database error: ${error.message}`,
          details: [`❌ Error: ${error.message}`]
        };
      }

      return {
        success: true,
        message: 'Voice recordings table exists and is accessible',
        details: [
          '✅ voice_recordings table found and accessible',
          '📊 Archive feature should work properly',
          '🎯 No action needed'
        ]
      };

    } catch (error) {
      console.error('❌ Table check failed:', error);
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [`💥 Unexpected error occurred`]
      };
    }
  }

  /**
   * Attempt to create voice_recordings table using available methods
   * Note: This may have limitations due to RLS and permissions
   */
  async attemptTableCreation(): Promise<SetupResult> {
    try {
      console.log('🛠️ Attempting to create voice_recordings table...');
      
      // First check if we can access table creation functions
      const { data: functions, error: funcError } = await supabase.rpc('version');
      
      if (funcError) {
        return {
          success: false,
          message: 'Cannot execute database functions - insufficient permissions',
          details: [
            '🔒 Database function execution blocked',
            '⚡ This requires admin-level database access',
            '📋 Manual creation required in Supabase SQL Editor',
            '💡 Use the provided fix_voice_recordings.sql script'
          ]
        };
      }

      // Since we can't create tables directly through the client,
      // provide detailed instructions for manual setup
      return {
        success: false,
        message: 'Automatic table creation not supported',
        details: [
          '🔧 Tables must be created manually for security reasons',
          '📋 Step 1: Go to Supabase Dashboard → SQL Editor',
          '📄 Step 2: Copy contents from fix_voice_recordings.sql',
          '▶️ Step 3: Run the SQL script',
          '✅ Step 4: Return here and re-check table status'
        ]
      };

    } catch (error) {
      console.error('❌ Table creation attempt failed:', error);
      return {
        success: false,
        message: `Creation attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: ['💥 Automatic creation not possible']
      };
    }
  }

  /**
   * Get setup instructions for missing tables
   */
  getSetupInstructions(): SetupResult {
    return {
      success: true,
      message: 'Manual setup instructions',
      details: [
        '🎯 QUICK FIX FOR ARCHIVE PAGE:',
        '',
        '1️⃣ Open Supabase Dashboard',
        '2️⃣ Go to SQL Editor',
        '3️⃣ Copy contents from fix_voice_recordings.sql (in project root)',
        '4️⃣ Paste and run the SQL script',
        '5️⃣ Return to Admin panel and re-check table',
        '',
        '📄 The SQL file contains:',
        '   • Complete voice_recordings table structure',
        '   • All required indexes and constraints', 
        '   • Row Level Security policies',
        '   • Triggers and functions',
        '',
        '🚀 Once created, Archive page will work immediately!'
      ]
    };
  }

  /**
   * Check all required tables for the application
   */
  async checkAllRequiredTables(): Promise<SetupResult> {
    const results: string[] = [];
    let allGood = true;

    // Check voice_recordings table
    const voiceResult = await this.checkVoiceRecordingsTable();
    if (voiceResult.success) {
      results.push('✅ voice_recordings table: OK');
    } else {
      results.push('❌ voice_recordings table: MISSING');
      allGood = false;
    }

    // Check system_configuration table
    try {
      const { error } = await supabase
        .from('system_configuration')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('system_configuration')) {
        results.push('❌ system_configuration table: MISSING');
        allGood = false;
      } else {
        results.push('✅ system_configuration table: OK');
      }
    } catch {
      results.push('❌ system_configuration table: UNKNOWN');
      allGood = false;
    }

    // Check user_profiles table
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('user_profiles')) {
        results.push('❌ user_profiles table: MISSING');
        allGood = false;
      } else {
        results.push('✅ user_profiles table: OK');
      }
    } catch {
      results.push('❌ user_profiles table: UNKNOWN');
      allGood = false;
    }

    return {
      success: allGood,
      message: allGood ? 'All required tables exist' : 'Some required tables are missing',
      details: results
    };
  }
}

export const databaseSetup = new DatabaseSetupService();