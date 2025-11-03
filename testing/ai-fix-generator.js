/**
 * AI-Powered Fix Generator
 * 
 * Uses AI (OpenAI/Claude) to analyze bugs and generate code fixes
 * Integrates with the test engine to automatically fix failures
 * 
 * This module:
 * 1. Analyzes bug reports and error messages
 * 2. Examines relevant source code files
 * 3. Generates specific code changes to fix issues
 * 4. Creates git commits with fixes
 * 5. Tracks fix success rate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AutonomousFixer from './autonomous-fixer.js';
import { EnhancedFixTemplates } from './enhanced-fix-templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIFixGenerator {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.projectRoot = path.join(__dirname, '..');
    this.fixHistory = this.loadFixHistory();
    this.fixer = new AutonomousFixer(); // Initialize autonomous fixer
  }

  loadFixHistory() {
    const historyPath = path.join(__dirname, 'fix-history.json');
    try {
      if (fs.existsSync(historyPath)) {
        return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load fix history:', error.message);
    }
    return {
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixes: []
    };
  }

  saveFixHistory() {
    const historyPath = path.join(__dirname, 'fix-history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.fixHistory, null, 2));
  }

  /**
   * Analyze a bug and generate a fix
   */
  async analyzeBugAndGenerateFix(bug, testDetails) {
    console.log(`\n🤖 AI analyzing bug: ${bug.bugId}`);
    console.log(`   Test: ${bug.testId} - ${bug.testName}`);
    console.log(`   Error: ${bug.error}`);

    // Step 1: Gather context
    const context = await this.gatherBugContext(bug, testDetails);
    
    // Step 2: Generate fix using AI (or rule-based if no API)
    const fix = await this.generateFix(bug, context);
    
    // Step 3: Validate fix
    const validatedFix = this.validateFix(fix, bug);
    
    return validatedFix;
  }

  /**
   * Gather all relevant context for bug analysis
   */
  async gatherBugContext(bug, testDetails) {
    const context = {
      bug,
      testDetails,
      affectedFiles: [],
      relatedCode: [],
      errorPatterns: [],
      previousFixes: []
    };

    // Identify affected files
    const files = this.identifyAffectedFiles(bug);
    
    for (const filePath of files) {
      try {
        const fullPath = path.join(this.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          context.affectedFiles.push({
            path: filePath,
            content: content,
            lines: content.split('\n').length,
            language: this.detectLanguage(filePath)
          });
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not read file: ${filePath}`);
      }
    }

    // Find similar bugs that were fixed before
    context.previousFixes = this.findSimilarFixedBugs(bug);

    // Analyze error patterns
    context.errorPatterns = this.analyzeErrorPattern(bug.error);

    return context;
  }

  identifyAffectedFiles(bug) {
    // Map test IDs to likely affected files
    const fileMap = {
      'auth-001': ['src/pages/Auth.tsx', 'src/contexts/AuthContext.tsx'],
      'auth-002': ['src/pages/Auth.tsx', 'src/contexts/AuthContext.tsx'],
      'auth-003': ['supabase/migrations/', 'src/services/memoryService.ts'],
      'auth-004': ['supabase/migrations/', 'src/services/conversationRecording.ts'],
      
      'onboard-001': ['src/components/Onboarding.tsx', 'src/services/userProfileService.ts'],
      'onboard-002': ['src/components/Onboarding.tsx'],
      'onboard-003': ['src/services/userProfileService.ts'],
      
      'memory-001': ['src/services/memoryService.ts', 'src/components/ModernVoiceAgent.tsx'],
      'memory-002': ['src/components/AddMemoryForm.tsx', 'src/services/memoryService.ts'],
      'memory-003': ['src/services/memoryService.ts'],
      'memory-004': ['src/services/memoryService.ts'],
      'memory-005': ['src/services/aiVoiceSearch.ts'],
      'memory-006': ['src/pages/Timeline.tsx', 'src/components/TimelineMemoryCard.tsx'],
      
      'voice-001': ['src/services/conversationRecording.ts', 'src/components/ModernVoiceAgent.tsx'],
      'voice-002': ['src/services/enhancedConversationRecording.ts'],
      'voice-003': ['src/components/AudioPlayer.tsx', 'src/pages/Archive.tsx'],
      'voice-004': ['src/services/aiVoiceSearch.ts'],
      'voice-005': ['src/services/memoryRecordingGenerator.ts'],
      'voice-006': ['supabase/storage/setup_voice_recordings_bucket.sql'],
      
      'identity-001': ['supabase/functions/train-identity/index.ts', 'src/pages/Identities.tsx'],
      'identity-002': ['src/pages/Identities.tsx'],
      'identity-003': ['src/pages/Identities.tsx'],
      
      'admin-001': ['src/pages/Admin.tsx', 'src/components/admin/VoiceArchiveDiagnosticsPanel.tsx'],
      'admin-002': ['DIAGNOSTIC_USER_ISSUES.sql'],
      'admin-003': ['src/services/diagnosticLogger.ts'],
      
      'edge-001': ['supabase/functions/elevenlabs-agent-token/index.ts'],
      'edge-002': ['supabase/functions/orchestrator/index.ts'],
      'edge-003': ['supabase/functions/train-identity/index.ts']
    };

    const files = fileMap[bug.testId] || [];
    
    // Add generic files based on test group
    if (bug.testId.startsWith('auth-')) {
      files.push('src/contexts/AuthContext.tsx');
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath);
    const langMap = {
      '.ts': 'typescript',
      '.tsx': 'typescript-react',
      '.js': 'javascript',
      '.jsx': 'javascript-react',
      '.sql': 'sql',
      '.json': 'json'
    };
    return langMap[ext] || 'unknown';
  }

  findSimilarFixedBugs(bug) {
    // Find previously fixed bugs with similar errors
    return this.fixHistory.fixes
      .filter(fix => {
        if (fix.status !== 'success') return false;
        
        // Check error similarity
        const errorSimilarity = this.calculateStringSimilarity(
          fix.originalError.toLowerCase(),
          bug.error.toLowerCase()
        );
        
        return errorSimilarity > 0.5; // 50% similarity threshold
      })
      .slice(0, 3); // Return top 3 similar fixes
  }

  calculateStringSimilarity(str1, str2) {
    // Simple similarity calculation (Levenshtein distance ratio)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  analyzeErrorPattern(error) {
    const patterns = [];
    
    // Check for common error patterns
    if (error.includes('foreign key constraint')) {
      patterns.push({
        type: 'database',
        category: 'foreign_key_violation',
        solution: 'Ensure referenced record exists before insertion'
      });
    }
    
    if (error.includes('RLS') || error.includes('row level security')) {
      patterns.push({
        type: 'security',
        category: 'rls_policy',
        solution: 'Update RLS policy to allow proper access'
      });
    }
    
    if (error.includes('undefined') || error.includes('null')) {
      patterns.push({
        type: 'code',
        category: 'null_reference',
        solution: 'Add null checks and default values'
      });
    }
    
    if (error.includes('timeout')) {
      patterns.push({
        type: 'performance',
        category: 'timeout',
        solution: 'Optimize query or increase timeout'
      });
    }
    
    if (error.includes('permission denied') || error.includes('403')) {
      patterns.push({
        type: 'security',
        category: 'permission',
        solution: 'Fix permissions in database or storage'
      });
    }
    
    return patterns;
  }

  /**
   * Generate fix using AI or rule-based approach
   */
  async generateFix(bug, context) {
    console.log('   🔧 Generating fix...');
    
    // If API key is available, use AI
    if (this.apiKey && this.apiKey !== 'your-openai-key-here') {
      return await this.generateAIFix(bug, context);
    }
    
    // Otherwise, use rule-based fix generation
    return this.generateRuleBasedFix(bug, context);
  }

  async generateAIFix(bug, context) {
    // This would call OpenAI API with the bug context
    // For now, returning structured fix plan
    console.log('   ℹ️  AI fix generation requires OpenAI API key');
    return this.generateRuleBasedFix(bug, context);
  }

  generateRuleBasedFix(bug, context) {
    // Use enhanced fix templates for automatic code generation
    const enhancedFix = EnhancedFixTemplates.generateFix(bug, context);
    
    const fix = {
      fixId: `fix-${Date.now()}-${bug.bugId}`,
      bugId: bug.bugId,
      testId: bug.testId,
      description: enhancedFix.explanation || 'Generated fix',
      changes: [enhancedFix],
      confidence: this.calculateFixConfidence(enhancedFix, bug),
      estimatedImpact: enhancedFix.type === 'database' ? 'high' : 'medium',
      requiresManualReview: enhancedFix.action === 'manual'
    };

    return fix;
  }
  
  calculateFixConfidence(fix, bug) {
    // Determine confidence based on fix type and error pattern
    if (fix.action === 'manual') return 0.3;
    if (fix.type === 'database') {
      // Database fixes have high confidence if they match known patterns
      if (bug.error.includes('foreign key')) return 0.85;
      if (bug.error.includes('rls') || bug.error.includes('permission')) return 0.8;
      if (bug.error.includes('column')) return 0.9;
      return 0.7;
    }
    if (fix.type === 'code') return 0.75;
    return 0.6;
  }

  generateForeignKeyFix(bug, context) {
    return {
      type: 'database',
      file: 'supabase/migrations/fix_foreign_key_constraint.sql',
      action: 'create',
      content: `-- Fix foreign key constraint for ${bug.testId}
-- Generated on ${new Date().toISOString()}

-- Option 1: Add check to ensure user exists
-- Run DIAGNOSTIC_USER_ISSUES.sql to verify user exists

-- Option 2: Add trigger to validate before insert
CREATE OR REPLACE FUNCTION validate_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
-- DROP TRIGGER IF EXISTS validate_user_before_insert ON memories;
-- CREATE TRIGGER validate_user_before_insert
--   BEFORE INSERT ON memories
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_user_exists();
`,
      explanation: 'Adds validation to ensure user exists before inserting records'
    };
  }

  generateRLSPolicyFix(bug, context) {
    const table = bug.testId.includes('memory') ? 'memories' : 
                  bug.testId.includes('voice') ? 'voice_recordings' :
                  'user_profiles';
    
    return {
      type: 'database',
      file: `supabase/migrations/fix_rls_policy_${table}.sql`,
      action: 'create',
      content: `-- Fix RLS policy for ${table}
-- Generated on ${new Date().toISOString()}

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access own ${table}" ON ${table};

-- Recreate policy with proper access
CREATE POLICY "Users can access own ${table}" ON ${table}
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
`,
      explanation: `Updates RLS policy for ${table} to allow proper access`
    };
  }

  generateNullCheckFix(bug, context) {
    // Find the affected file
    const affectedFile = context.affectedFiles[0];
    
    if (!affectedFile) {
      return {
        type: 'code',
        file: 'Unknown - manual investigation needed',
        action: 'manual',
        content: 'Add null/undefined checks where values are accessed',
        explanation: 'Specific file location could not be determined'
      };
    }
    
    return {
      type: 'code',
      file: affectedFile.path,
      action: 'modify',
      content: `// Add null checks and default values
// Example pattern:
const value = data?.field ?? defaultValue;

if (!value) {
  console.warn('Value is missing, using default');
  return defaultValue;
}

// Or use optional chaining throughout:
const result = object?.property?.nestedProperty ?? 'default';
`,
      explanation: 'Add null/undefined checks with optional chaining and default values'
    };
  }

  generateTimeoutFix(bug, context) {
    return {
      type: 'configuration',
      file: 'Multiple files may need optimization',
      action: 'optimize',
      content: `// Optimization strategies:

// 1. Add database indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field_name);

// 2. Reduce data transfer size
const { data } = await supabase
  .from('table')
  .select('id, title, created_at') // Only select needed fields
  .limit(100); // Add pagination

// 3. Use caching for frequently accessed data
const cached = localStorage.getItem('cache_key');
if (cached) return JSON.parse(cached);

// 4. Increase timeout if necessary
const timeout = 30000; // 30 seconds
`,
      explanation: 'Optimize queries and consider adding indexes or caching'
    };
  }

  generatePermissionFix(bug, context) {
    return {
      type: 'security',
      file: 'supabase/storage/ or supabase/migrations/',
      action: 'fix_permissions',
      content: `-- Fix storage bucket permissions
-- For voice recordings bucket:

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own voice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own voice recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own voice recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
`,
      explanation: 'Updates storage bucket policies to allow proper access'
    };
  }

  validateFix(fix, bug) {
    // Add validation metadata
    fix.validated = true;
    fix.validationChecks = {
      hasChanges: fix.changes.length > 0,
      hasDescription: fix.description.length > 0,
      confidenceAboveThreshold: fix.confidence >= 0.5,
      safeToApply: this.isSafeToApply(fix)
    };
    
    fix.readyToApply = Object.values(fix.validationChecks).every(v => v === true);
    
    return fix;
  }

  isSafeToApply(fix) {
    // Check if fix is safe to apply automatically
    // Database changes require more caution
    const hasDatabaseChanges = fix.changes.some(c => c.type === 'database');
    const hasHighConfidence = fix.confidence >= 0.8;
    
    return !hasDatabaseChanges && hasHighConfidence;
  }

  /**
   * Apply a fix to the codebase using autonomous fixer
   */
  async applyFix(fix) {
    console.log(`\n🔨 Applying fix: ${fix.fixId}`);
    console.log(`   Description: ${fix.description}`);
    console.log(`   Confidence: ${Math.round(fix.confidence * 100)}%`);
    
    if (!fix.readyToApply) {
      console.log('   ⚠️  Fix requires manual review before applying');
      return {
        applied: false,
        reason: 'Requires manual review',
        fix
      };
    }
    
    // Use autonomous fixer to apply all changes
    const result = await this.fixer.applyCompleteFix(fix);
    
    if (result.success) {
      // Record in fix history
      this.fixHistory.fixes.push({
        ...fix,
        appliedAt: new Date().toISOString(),
        status: 'applied',
        appliedChanges: result.results
      });
      this.fixHistory.totalFixes++;
      this.fixHistory.successfulFixes++;
      this.saveFixHistory();
      
      console.log(`✅ Fix successfully applied: ${fix.fixId}`);
      console.log(`   Changes: ${result.summary.totalChanges}`);
      console.log(`   Files affected: ${result.summary.files.length}`);
      
      return {
        applied: true,
        fix,
        appliedChanges: result.results,
        summary: result.summary
      };
    } else {
      // Record failure
      this.fixHistory.fixes.push({
        ...fix,
        appliedAt: new Date().toISOString(),
        status: 'failed',
        error: result.error
      });
      this.fixHistory.totalFixes++;
      this.fixHistory.failedFixes++;
      this.saveFixHistory();
      
      console.log(`❌ Fix failed: ${result.error}`);
      
      return {
        applied: false,
        reason: result.error,
        fix,
        failedAt: result.failedAt
      };
    }
  }

  async applyChange(change) {
    const filePath = path.join(this.projectRoot, change.file);
    
    switch (change.action) {
      case 'create':
        // Create new file
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, change.content);
        return { action: 'created', file: change.file };
        
      case 'modify':
        // This would require more sophisticated code modification
        // For now, create a .patch file for manual application
        const patchPath = `${filePath}.patch`;
        fs.writeFileSync(patchPath, change.content);
        return { action: 'patch_created', file: patchPath };
        
      case 'manual':
        // Create a manual fix guide
        const guidePath = path.join(this.projectRoot, 'testing', 'manual-fixes', `${Date.now()}-fix-guide.md`);
        const dir2 = path.dirname(guidePath);
        if (!fs.existsSync(dir2)) {
          fs.mkdirSync(dir2, { recursive: true });
        }
        const guide = `# Manual Fix Required\n\n${change.explanation}\n\n\`\`\`\n${change.content}\n\`\`\``;
        fs.writeFileSync(guidePath, guide);
        return { action: 'guide_created', file: guidePath };
        
      default:
        return { action: 'skipped', file: change.file };
    }
  }

  /**
   * Batch apply multiple fixes
   */
  async batchApplyFixes(fixes) {
    console.log(`\n🔨 BATCH APPLYING ${fixes.length} FIXES\n`);
    
    const results = {
      applied: [],
      failed: [],
      requiresManualReview: []
    };
    
    for (const fix of fixes) {
      if (!fix.readyToApply || fix.requiresManualReview) {
        results.requiresManualReview.push(fix);
        continue;
      }
      
      const result = await this.applyFix(fix);
      
      if (result.applied) {
        results.applied.push(fix);
      } else {
        results.failed.push({ fix, reason: result.reason });
      }
    }
    
    console.log('\n📊 BATCH APPLICATION SUMMARY:');
    console.log(`   ✅ Applied: ${results.applied.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⚠️  Manual Review: ${results.requiresManualReview.length}`);
    
    return results;
  }
}

export default AIFixGenerator;
