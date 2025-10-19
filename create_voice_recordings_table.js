import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gulydhhzwlltkxbfnclu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bHlkaGh6d2xsdGt4YmZuY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ1ODIsImV4cCI6MjA3MjY1MDU4Mn0.hyegbm0PfIo5D0KdZRYoTHYVJw6k1WTITgoq-g_wFGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createVoiceRecordingsTable() {
  console.log('🏗️ Creating voice_recordings table...');
  
  try {
    // First, create the update_updated_at_column function if it doesn't exist
    const updateFunction = `
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError } = await supabase.rpc('exec_sql', { query: updateFunction });
    if (funcError) {
      console.error('❌ Error creating update function:', funcError);
    } else {
      console.log('✅ Update function created/updated');
    }

    // Now create the voice_recordings table
    const createTableSQL = `
      -- Voice recordings table for storing conversation audio metadata and search functionality
      CREATE TABLE IF NOT EXISTS public.voice_recordings (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        
        -- Recording metadata
        session_id TEXT NOT NULL, -- Links to conversation session
        recording_type TEXT NOT NULL DEFAULT 'conversation', -- 'conversation', 'memory_creation', 'voice_search'
        
        -- Audio file information  
        storage_path TEXT NOT NULL, -- Path in Supabase Storage
        original_filename TEXT,
        file_size_bytes INTEGER,
        duration_seconds NUMERIC(8,2),
        
        -- Audio technical details
        mime_type TEXT DEFAULT 'audio/webm',
        compression_type TEXT DEFAULT 'opus',
        sample_rate INTEGER DEFAULT 48000,
        bit_rate INTEGER DEFAULT 64000,
        
        -- Content and search
        transcript_text TEXT, -- Full transcript for text search
        conversation_summary TEXT, -- AI-generated summary
        memory_ids UUID[], -- Associated memory IDs created during this recording
        topics TEXT[], -- Extracted topics/themes for search
        
        -- Session context
        session_mode TEXT, -- daily_journal, memory_creation, memory_browsing, general_chat
        conversation_phase TEXT, -- greeting, mode_selection, active_conversation, wrap_up
        
        -- Metadata and lifecycle
        is_compressed BOOLEAN DEFAULT true,
        retention_days INTEGER DEFAULT 90, -- Auto-delete after this many days
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { query: createTableSQL });
    if (tableError) {
      console.error('❌ Error creating table:', tableError);
    } else {
      console.log('✅ voice_recordings table created');
    }

    // Enable RLS
    const rlsSQL = `
      ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { query: rlsSQL });
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled on voice_recordings');
    }

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

createVoiceRecordingsTable();