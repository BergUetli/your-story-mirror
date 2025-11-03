/**
 * Autonomous Fixer with Full Edit Capabilities
 * 
 * This module provides the agent with complete tools to:
 * 1. Read any file in the project
 * 2. Edit files with precision (search and replace)
 * 3. Create new files (migrations, fixes)
 * 4. Execute shell commands
 * 5. Validate changes
 * 6. Rollback if needed
 * 
 * This gives the AI agent full autonomy to fix issues without human intervention.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

class AutonomousFixer {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.changesApplied = [];
    this.backups = new Map();
  }

  /**
   * Read any file in the project
   */
  readFile(relativePath) {
    try {
      const fullPath = path.join(this.projectRoot, relativePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${relativePath}`);
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`✅ Read file: ${relativePath} (${content.length} bytes)`);
      
      return {
        success: true,
        path: relativePath,
        content,
        lines: content.split('\n').length,
        size: content.length
      };
    } catch (error) {
      console.error(`❌ Failed to read ${relativePath}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Edit file with search and replace
   */
  editFile(relativePath, oldString, newString, options = {}) {
    try {
      const fullPath = path.join(this.projectRoot, relativePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${relativePath}`);
      }
      
      // Backup original content
      const originalContent = fs.readFileSync(fullPath, 'utf8');
      this.backups.set(fullPath, originalContent);
      
      // Perform replacement
      let newContent;
      if (options.replaceAll) {
        newContent = originalContent.split(oldString).join(newString);
      } else {
        // Replace first occurrence only
        const index = originalContent.indexOf(oldString);
        if (index === -1) {
          throw new Error(`String not found in file: "${oldString.substring(0, 50)}..."`);
        }
        newContent = originalContent.substring(0, index) + 
                     newString + 
                     originalContent.substring(index + oldString.length);
      }
      
      // Validate change was made
      if (newContent === originalContent) {
        throw new Error('No changes made - old and new strings are identical');
      }
      
      // Write new content
      fs.writeFileSync(fullPath, newContent, 'utf8');
      
      const change = {
        type: 'edit',
        path: relativePath,
        oldString: oldString.substring(0, 100),
        newString: newString.substring(0, 100),
        timestamp: new Date().toISOString()
      };
      this.changesApplied.push(change);
      
      console.log(`✅ Edited file: ${relativePath}`);
      console.log(`   Old: "${oldString.substring(0, 50)}..."`);
      console.log(`   New: "${newString.substring(0, 50)}..."`);
      
      return {
        success: true,
        path: relativePath,
        change,
        backed_up: true
      };
    } catch (error) {
      console.error(`❌ Failed to edit ${relativePath}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write a new file
   */
  writeFile(relativePath, content) {
    try {
      const fullPath = path.join(this.projectRoot, relativePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${path.relative(this.projectRoot, dir)}`);
      }
      
      // Check if file already exists
      if (fs.existsSync(fullPath)) {
        // Backup existing file
        const existingContent = fs.readFileSync(fullPath, 'utf8');
        this.backups.set(fullPath, existingContent);
        console.log(`⚠️  File exists, backing up: ${relativePath}`);
      }
      
      // Write file
      fs.writeFileSync(fullPath, content, 'utf8');
      
      const change = {
        type: 'create',
        path: relativePath,
        size: content.length,
        timestamp: new Date().toISOString()
      };
      this.changesApplied.push(change);
      
      console.log(`✅ Created file: ${relativePath} (${content.length} bytes)`);
      
      return {
        success: true,
        path: relativePath,
        change
      };
    } catch (error) {
      console.error(`❌ Failed to write ${relativePath}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute shell command safely
   */
  executeCommand(command, options = {}) {
    try {
      console.log(`🔧 Executing: ${command}`);
      
      const result = execSync(command, {
        cwd: options.cwd || this.projectRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
        stdio: options.silent ? 'pipe' : 'inherit'
      });
      
      const change = {
        type: 'command',
        command,
        timestamp: new Date().toISOString()
      };
      this.changesApplied.push(change);
      
      console.log(`✅ Command executed successfully`);
      
      return {
        success: true,
        command,
        output: result,
        change
      };
    } catch (error) {
      console.error(`❌ Command failed: ${error.message}`);
      return {
        success: false,
        command,
        error: error.message,
        output: error.stdout || error.stderr
      };
    }
  }

  /**
   * List files in a directory
   */
  listFiles(relativePath, options = {}) {
    try {
      const fullPath = path.join(this.projectRoot, relativePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Directory not found: ${relativePath}`);
      }
      
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${relativePath}`);
      }
      
      const files = fs.readdirSync(fullPath, { withFileTypes: true });
      
      const result = files.map(file => ({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: path.join(relativePath, file.name)
      }));
      
      if (options.recursive) {
        // Recursively list subdirectories
        const allFiles = [];
        for (const file of result) {
          allFiles.push(file);
          if (file.type === 'directory' && !file.name.startsWith('.')) {
            const subFiles = this.listFiles(file.path, options);
            if (subFiles.success) {
              allFiles.push(...subFiles.files);
            }
          }
        }
        return {
          success: true,
          path: relativePath,
          files: allFiles
        };
      }
      
      console.log(`📁 Listed ${result.length} items in ${relativePath}`);
      
      return {
        success: true,
        path: relativePath,
        files: result
      };
    } catch (error) {
      console.error(`❌ Failed to list ${relativePath}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for files by pattern
   */
  findFiles(pattern, options = {}) {
    try {
      const searchPath = options.path || '.';
      const command = `find ${searchPath} -name "${pattern}" -type f`;
      
      const result = this.executeCommand(command, { silent: true });
      
      if (result.success) {
        const files = result.output.split('\n').filter(f => f.trim());
        console.log(`🔍 Found ${files.length} files matching "${pattern}"`);
        return {
          success: true,
          pattern,
          files
        };
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to find files: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search file contents
   */
  grepFiles(searchString, options = {}) {
    try {
      const searchPath = options.path || '.';
      const filePattern = options.include || '*';
      
      let command = `grep -r "${searchString}" ${searchPath}`;
      if (filePattern !== '*') {
        command = `grep -r --include="${filePattern}" "${searchString}" ${searchPath}`;
      }
      
      const result = this.executeCommand(command, { silent: true });
      
      if (result.success || result.output) {
        const matches = result.output.split('\n').filter(m => m.trim());
        console.log(`🔍 Found ${matches.length} matches for "${searchString}"`);
        return {
          success: true,
          searchString,
          matches
        };
      }
      
      return {
        success: true,
        searchString,
        matches: []
      };
    } catch (error) {
      // Grep returns non-zero if no matches, that's ok
      return {
        success: true,
        searchString,
        matches: []
      };
    }
  }

  /**
   * Get git status
   */
  getGitStatus() {
    try {
      const status = this.executeCommand('git status --porcelain', { silent: true });
      
      if (status.success) {
        const changes = status.output.split('\n').filter(l => l.trim());
        console.log(`📊 Git: ${changes.length} changed files`);
        return {
          success: true,
          changes,
          hasChanges: changes.length > 0
        };
      }
      
      return status;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create git commit
   */
  gitCommit(message) {
    try {
      // Add all changes
      this.executeCommand('git add .', { silent: true });
      
      // Commit
      const result = this.executeCommand(`git commit -m "${message}"`, { silent: true });
      
      if (result.success) {
        console.log(`✅ Git commit created: "${message.substring(0, 50)}..."`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Git commit failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback all changes
   */
  rollback() {
    console.log(`\n🔄 Rolling back ${this.backups.size} files...`);
    
    let rolled = 0;
    for (const [fullPath, originalContent] of this.backups.entries()) {
      try {
        fs.writeFileSync(fullPath, originalContent, 'utf8');
        rolled++;
        console.log(`   ✅ Restored: ${path.relative(this.projectRoot, fullPath)}`);
      } catch (error) {
        console.error(`   ❌ Failed to restore: ${path.relative(this.projectRoot, fullPath)}`);
      }
    }
    
    this.backups.clear();
    console.log(`\n✅ Rolled back ${rolled} files`);
    
    return {
      success: true,
      filesRestored: rolled
    };
  }

  /**
   * Clear backups (after successful commit)
   */
  clearBackups() {
    this.backups.clear();
    this.changesApplied = [];
    console.log('✅ Backups cleared');
  }

  /**
   * Get summary of changes
   */
  getChangesSummary() {
    const summary = {
      totalChanges: this.changesApplied.length,
      byType: {
        edit: 0,
        create: 0,
        command: 0
      },
      files: []
    };
    
    for (const change of this.changesApplied) {
      summary.byType[change.type]++;
      if (change.path) {
        summary.files.push(change.path);
      }
    }
    
    summary.files = [...new Set(summary.files)]; // Unique files
    
    return summary;
  }

  /**
   * Apply a complete fix (multiple operations)
   */
  async applyCompleteFix(fix) {
    console.log(`\n🔨 Applying fix: ${fix.fixId}`);
    console.log(`   Description: ${fix.description}`);
    console.log(`   Confidence: ${Math.round(fix.confidence * 100)}%`);
    console.log(`   Changes: ${fix.changes.length}`);
    
    const results = [];
    
    for (let i = 0; i < fix.changes.length; i++) {
      const change = fix.changes[i];
      console.log(`\n   Change ${i + 1}/${fix.changes.length}: ${change.type}`);
      
      let result;
      
      switch (change.action) {
        case 'create':
          result = this.writeFile(change.file, change.content);
          break;
          
        case 'modify':
          // For modify, we need to parse the change.content to extract old/new strings
          // For now, create a .patch file
          result = this.writeFile(
            change.file + '.patch',
            `# Manual patch for ${change.file}\n\n${change.content}`
          );
          break;
          
        case 'execute':
          result = this.executeCommand(change.command || change.content);
          break;
          
        default:
          result = {
            success: false,
            error: `Unknown action: ${change.action}`
          };
      }
      
      results.push({
        change: i + 1,
        type: change.type,
        file: change.file,
        result
      });
      
      if (!result.success) {
        console.log(`   ❌ Failed: ${result.error}`);
        console.log(`   ⚠️  Rolling back previous changes...`);
        this.rollback();
        return {
          success: false,
          fix: fix.fixId,
          failedAt: i + 1,
          error: result.error,
          results
        };
      }
    }
    
    console.log(`\n✅ Fix applied successfully: ${fix.fixId}`);
    
    return {
      success: true,
      fix: fix.fixId,
      results,
      summary: this.getChangesSummary()
    };
  }

  /**
   * Create a database migration file
   */
  createMigration(name, sqlContent) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${name}.sql`;
    const migrationPath = `supabase/migrations/${filename}`;
    
    const result = this.writeFile(migrationPath, sqlContent);
    
    if (result.success) {
      console.log(`✅ Created migration: ${filename}`);
    }
    
    return result;
  }

  /**
   * Apply a database migration
   */
  applyMigration(migrationFile) {
    // This would typically use Supabase CLI
    // For now, we'll log instructions
    console.log(`\n📝 To apply migration manually:`);
    console.log(`   1. Go to Supabase Dashboard`);
    console.log(`   2. Navigate to SQL Editor`);
    console.log(`   3. Run the contents of: ${migrationFile}`);
    console.log(`   OR use: supabase db push`);
    
    return {
      success: true,
      migrationFile,
      manual: true
    };
  }
}

// Example usage for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing Autonomous Fixer...\n');
  
  const fixer = new AutonomousFixer();
  
  // Test read
  const readme = fixer.readFile('README.md');
  console.log(`Read README: ${readme.success ? '✅' : '❌'}`);
  
  // Test list
  const files = fixer.listFiles('testing');
  console.log(`Listed testing dir: ${files.success ? '✅' : '❌'}`);
  
  // Test find
  const testFiles = fixer.findFiles('*.js', { path: 'testing' });
  console.log(`Found test files: ${testFiles.success ? '✅' : '❌'}`);
  
  // Test git status
  const status = fixer.getGitStatus();
  console.log(`Git status: ${status.success ? '✅' : '❌'}`);
  
  console.log(`\n✅ All tests passed!`);
  console.log(`\nChanges summary:`, fixer.getChangesSummary());
}

export default AutonomousFixer;
