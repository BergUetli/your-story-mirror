/**
 * Enhanced Fix Templates with Actual Code Modifications
 * 
 * This provides templates for common fixes that can be applied automatically
 * using the autonomous fixer's search-and-replace capabilities.
 */

export class EnhancedFixTemplates {
  /**
   * Generate fix for foreign key constraint violations
   */
  static foreignKeyConstraintFix(bug, context) {
    const table = bug.testId.includes('memory') ? 'memories' : 
                  bug.testId.includes('voice') ? 'voice_recordings' :
                  bug.testId.includes('profile') ? 'user_profiles' : 'unknown_table';
    
    // Create a database migration
    const migrationSQL = `-- Fix foreign key constraint for ${table}
-- Generated on ${new Date().toISOString()}
-- Bug: ${bug.bugId}

-- Step 1: Add check to ensure user exists before insert
CREATE OR REPLACE FUNCTION check_user_exists_${table}()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users table. Please sign up first.', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger if not exists
DROP TRIGGER IF EXISTS ensure_user_exists_${table} ON ${table};
CREATE TRIGGER ensure_user_exists_${table}
  BEFORE INSERT OR UPDATE ON ${table}
  FOR EACH ROW
  EXECUTE FUNCTION check_user_exists_${table}();

-- Step 3: Verify constraint
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraint validation added for ${table}';
END $$;
`;

    return {
      type: 'database',
      action: 'create',
      file: `supabase/migrations/${Date.now()}_fix_fk_${table}.sql`,
      content: migrationSQL,
      explanation: `Adds validation trigger to ensure user_id exists in auth.users before inserting into ${table}`,
      applyInstructions: [
        'This fix creates a database migration',
        'Apply via: supabase db push',
        'Or run manually in Supabase SQL Editor'
      ]
    };
  }

  /**
   * Generate fix for RLS policy issues
   */
  static rlsPolicyFix(bug, context) {
    const table = bug.testId.includes('memory') ? 'memories' : 
                  bug.testId.includes('voice') ? 'voice_recordings' :
                  bug.testId.includes('profile') ? 'user_profiles' : 'unknown_table';
    
    const migrationSQL = `-- Fix RLS policies for ${table}
-- Generated on ${new Date().toISOString()}
-- Bug: ${bug.bugId}

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access own ${table}" ON ${table};
DROP POLICY IF EXISTS "Users can insert own ${table}" ON ${table};
DROP POLICY IF EXISTS "Users can update own ${table}" ON ${table};
DROP POLICY IF EXISTS "Users can delete own ${table}" ON ${table};

-- Enable RLS
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
CREATE POLICY "Users can view own ${table}"
  ON ${table}
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ${table}"
  ON ${table}
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ${table}"
  ON ${table}
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ${table}"
  ON ${table}
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for ${table}';
END $$;
`;

    return {
      type: 'database',
      action: 'create',
      file: `supabase/migrations/${Date.now()}_fix_rls_${table}.sql`,
      content: migrationSQL,
      explanation: `Updates RLS policies for ${table} to ensure proper access control`,
      applyInstructions: [
        'This fix updates Row Level Security policies',
        'Apply via: supabase db push',
        'Or run manually in Supabase SQL Editor'
      ]
    };
  }

  /**
   * Generate fix for null/undefined reference errors
   */
  static nullCheckFix(bug, context) {
    // Identify the file and line where null error occurs
    const affectedFile = context.affectedFiles[0];
    
    if (!affectedFile) {
      return {
        type: 'code',
        action: 'manual',
        file: 'Unknown - manual investigation needed',
        content: 'Add null/undefined checks where values are accessed',
        explanation: 'Could not determine specific file location'
      };
    }

    // Generate a patch showing recommended null checks
    const patchContent = `Recommended null checks for ${affectedFile.path}:

1. Add optional chaining for object property access:
   const value = data?.field ?? defaultValue;

2. Add early returns for missing values:
   if (!value) {
     console.warn('Value is missing:', fieldName);
     return defaultValue;
   }

3. Use type guards:
   if (typeof value === 'undefined' || value === null) {
     // Handle missing value
   }

4. For arrays:
   const items = arrayValue ?? [];
   const firstItem = items[0] ?? null;

5. For async operations:
   try {
     const result = await operation();
     if (!result) return fallbackValue;
   } catch (error) {
     console.error('Operation failed:', error);
     return fallbackValue;
   }
`;

    return {
      type: 'code',
      action: 'modify',
      file: affectedFile.path,
      content: patchContent,
      explanation: 'Add null/undefined checks with optional chaining and default values'
    };
  }

  /**
   * Generate fix for timeout issues
   */
  static timeoutFix(bug, context) {
    if (bug.testId.includes('memory')) {
      // Database query optimization
      const migrationSQL = `-- Optimize memory table queries
-- Generated on ${new Date().toISOString()}
-- Bug: ${bug.bugId}

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_user_created 
  ON memories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_user_date 
  ON memories(user_id, memory_date DESC) 
  WHERE memory_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memories_tags_gin 
  ON memories USING gin(tags);

-- Update statistics
ANALYZE memories;

DO $$
BEGIN
  RAISE NOTICE 'Memory table indexes optimized';
END $$;
`;

      return {
        type: 'database',
        action: 'create',
        file: `supabase/migrations/${Date.now()}_optimize_memory_queries.sql`,
        content: migrationSQL,
        explanation: 'Adds database indexes to speed up memory queries'
      };
    }

    // Generic timeout fix
    return {
      type: 'configuration',
      action: 'manual',
      file: 'Multiple files may need optimization',
      content: `Timeout optimization strategies:

1. Add database indexes (if database query)
2. Implement pagination (if loading many items)
3. Add caching (if data doesn't change often)
4. Increase timeout threshold (if necessary)
5. Optimize query to select only needed fields
`,
      explanation: 'Review and optimize slow operations'
    };
  }

  /**
   * Generate fix for storage/permission errors
   */
  static storagePermissionFix(bug, context) {
    const bucket = bug.testId.includes('voice') ? 'voice-recordings' : 'memories';
    
    const migrationSQL = `-- Fix storage bucket permissions for ${bucket}
-- Generated on ${new Date().toISOString()}
-- Bug: ${bug.bugId}

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('${bucket}', '${bucket}', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload to ${bucket}" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from ${bucket}" ON storage.objects;
DROP POLICY IF EXISTS "Users can update in ${bucket}" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from ${bucket}" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Users can upload to ${bucket}"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = '${bucket}' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read from ${bucket}"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = '${bucket}' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update in ${bucket}"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = '${bucket}' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete from ${bucket}"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = '${bucket}' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DO $$
BEGIN
  RAISE NOTICE 'Storage permissions updated for ${bucket} bucket';
END $$;
`;

    return {
      type: 'database',
      action: 'create',
      file: `supabase/migrations/${Date.now()}_fix_storage_${bucket}.sql`,
      content: migrationSQL,
      explanation: `Updates storage bucket policies for ${bucket} to allow proper user access`
    };
  }

  /**
   * Generate fix for missing columns
   */
  static missingColumnFix(bug, context) {
    // Extract column name from error message
    const columnMatch = bug.error.match(/column "([^"]+)"/);
    const columnName = columnMatch ? columnMatch[1] : 'unknown_column';
    
    const table = bug.testId.includes('memory') ? 'memories' : 
                  bug.testId.includes('voice') ? 'voice_recordings' :
                  bug.testId.includes('profile') ? 'user_profiles' : 'unknown_table';
    
    const migrationSQL = `-- Add missing column ${columnName} to ${table}
-- Generated on ${new Date().toISOString()}
-- Bug: ${bug.bugId}

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '${table}' AND column_name = '${columnName}'
  ) THEN
    ALTER TABLE ${table} ADD COLUMN ${columnName} TEXT;
    RAISE NOTICE 'Column ${columnName} added to ${table}';
  ELSE
    RAISE NOTICE 'Column ${columnName} already exists in ${table}';
  END IF;
END $$;
`;

    return {
      type: 'database',
      action: 'create',
      file: `supabase/migrations/${Date.now()}_add_${columnName}_to_${table}.sql`,
      content: migrationSQL,
      explanation: `Adds missing column ${columnName} to ${table} table`
    };
  }

  /**
   * Generate comprehensive fix based on error pattern
   */
  static generateFix(bug, context) {
    const error = bug.error.toLowerCase();
    
    if (error.includes('foreign key constraint')) {
      return this.foreignKeyConstraintFix(bug, context);
    }
    
    if (error.includes('rls') || error.includes('row level security') || error.includes('permission denied')) {
      return this.rlsPolicyFix(bug, context);
    }
    
    if (error.includes('column') && error.includes('does not exist')) {
      return this.missingColumnFix(bug, context);
    }
    
    if (error.includes('undefined') || error.includes('null') || error.includes('cannot read prop')) {
      return this.nullCheckFix(bug, context);
    }
    
    if (error.includes('timeout') || error.includes('slow')) {
      return this.timeoutFix(bug, context);
    }
    
    if (error.includes('storage') || error.includes('bucket')) {
      return this.storagePermissionFix(bug, context);
    }
    
    // Default generic fix
    return {
      type: 'manual',
      action: 'manual',
      file: 'Manual investigation needed',
      content: `Error: ${bug.error}\n\nReview test: ${bug.testId}\nSteps: ${JSON.stringify(bug.steps, null, 2)}`,
      explanation: 'Unable to generate automatic fix - manual review required'
    };
  }
}

export default EnhancedFixTemplates;
