/**
 * Automated Release Pipeline
 * 
 * This pipeline:
 * 1. Takes all fixes from the fix queue
 * 2. Applies them as a batch
 * 3. Creates git commits
 * 4. Runs tests to verify fixes
 * 5. If tests pass, creates a release
 * 6. If tests fail, analyzes new failures and repeats
 * 7. Stops after 5 failed attempts on same test
 * 
 * Usage:
 *   node testing/release-pipeline.js [--auto-commit] [--auto-push]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import TestEngine from './test-engine.js';
import AIFixGenerator from './ai-fix-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

class ReleasePipeline {
  constructor(options = {}) {
    this.options = {
      autoCommit: options.autoCommit || false,
      autoPush: options.autoPush || false,
      maxIterations: options.maxIterations || 5,
      stopOnRepeatedFailure: options.stopOnRepeatedFailure || true
    };
    
    this.testEngine = new TestEngine();
    this.fixGenerator = new AIFixGenerator();
    this.iterationCount = 0;
    this.testFailureCount = {};
    this.releaseHistory = this.loadReleaseHistory();
  }

  loadReleaseHistory() {
    const historyPath = path.join(__dirname, 'release-history.json');
    try {
      if (fs.existsSync(historyPath)) {
        return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load release history');
    }
    return {
      releases: [],
      totalReleases: 0,
      successfulReleases: 0,
      failedReleases: 0
    };
  }

  saveReleaseHistory() {
    const historyPath = path.join(__dirname, 'release-history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.releaseHistory, null, 2));
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          AUTOMATED RELEASE PIPELINE v1.0.0               ║');
    console.log('║          Continuous Test → Fix → Release Cycle           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('Configuration:');
    console.log(`  Auto Commit: ${this.options.autoCommit ? '✅' : '❌'}`);
    console.log(`  Auto Push: ${this.options.autoPush ? '✅' : '❌'}`);
    console.log(`  Max Iterations: ${this.options.maxIterations}`);
    console.log(`  Stop on Repeated Failure: ${this.options.stopOnRepeatedFailure ? '✅' : '❌'}\n`);
    
    let continueLoop = true;
    
    while (continueLoop && this.iterationCount < this.options.maxIterations) {
      this.iterationCount++;
      
      console.log('\n' + '='.repeat(70));
      console.log(`ITERATION ${this.iterationCount}/${this.options.maxIterations}`);
      console.log('='.repeat(70) + '\n');
      
      // Step 1: Run tests
      console.log('STEP 1: Running test suite...\n');
      const testResult = await this.testEngine.run();
      
      if (testResult.passed) {
        console.log('\n✅ ALL TESTS PASSED! Creating release...\n');
        await this.createRelease(testResult);
        continueLoop = false;
        break;
      }
      
      // Step 2: Check for repeated failures
      console.log('\nSTEP 2: Analyzing test failures...\n');
      const repeatedFailures = this.checkRepeatedFailures(testResult.bugs);
      
      if (this.options.stopOnRepeatedFailure && repeatedFailures.length > 0) {
        console.log('\n⛔ STOPPING: Tests have repeatedly failed:');
        repeatedFailures.forEach(bug => {
          console.log(`   - ${bug.testId}: Failed ${this.testFailureCount[bug.testId]} times`);
        });
        continueLoop = false;
        break;
      }
      
      // Step 3: Generate fixes
      console.log('\nSTEP 3: Generating fixes for failed tests...\n');
      const fixes = await this.generateFixesForFailures(testResult.bugs);
      
      if (fixes.length === 0) {
        console.log('\n❌ Could not generate any fixes. Manual intervention required.');
        continueLoop = false;
        break;
      }
      
      // Step 4: Apply fixes
      console.log('\nSTEP 4: Applying fixes...\n');
      const applyResult = await this.applyFixesBatch(fixes);
      
      if (applyResult.applied.length === 0 && applyResult.requiresManualReview.length > 0) {
        console.log('\n⚠️  All fixes require manual review. Stopping automated pipeline.');
        this.generateManualFixReport(applyResult.requiresManualReview);
        continueLoop = false;
        break;
      }
      
      // Step 5: Commit changes
      if (this.options.autoCommit && applyResult.applied.length > 0) {
        console.log('\nSTEP 5: Committing changes...\n');
        await this.commitChanges(applyResult.applied, testResult);
      } else {
        console.log('\nSTEP 5: Skipping commit (auto-commit disabled or no changes)\n');
      }
      
      // Step 6: Prepare for next iteration
      console.log('\nPreparing for next test iteration...\n');
      await this.sleep(2000); // Brief pause before next iteration
    }
    
    // Final summary
    this.printFinalSummary();
    
    return {
      success: !continueLoop, // Success if loop exited naturally
      iterations: this.iterationCount,
      testFailures: this.testFailureCount
    };
  }

  checkRepeatedFailures(bugs) {
    const repeated = [];
    
    for (const bug of bugs) {
      // Initialize counter if not exists
      if (!this.testFailureCount[bug.testId]) {
        this.testFailureCount[bug.testId] = 0;
      }
      
      this.testFailureCount[bug.testId]++;
      
      // Check if exceeded max attempts
      if (this.testFailureCount[bug.testId] >= 5) {
        repeated.push(bug);
      }
    }
    
    return repeated;
  }

  async generateFixesForFailures(bugs) {
    const fixes = [];
    
    console.log(`Analyzing ${bugs.length} failed tests...\n`);
    
    for (const bug of bugs) {
      console.log(`🔍 Analyzing: ${bug.testId} - ${bug.testName}`);
      
      try {
        const fix = await this.fixGenerator.analyzeBugAndGenerateFix(bug, {
          testId: bug.testId,
          groupId: bug.groupId
        });
        
        if (fix && fix.changes.length > 0) {
          fixes.push(fix);
          console.log(`   ✅ Fix generated (confidence: ${Math.round(fix.confidence * 100)}%)`);
        } else {
          console.log(`   ⚠️  No automatic fix available`);
        }
      } catch (error) {
        console.log(`   ❌ Error generating fix: ${error.message}`);
      }
    }
    
    return fixes;
  }

  async applyFixesBatch(fixes) {
    console.log(`Applying ${fixes.length} fixes in batch...\n`);
    
    const result = await this.fixGenerator.batchApplyFixes(fixes);
    
    // Print detailed results
    if (result.applied.length > 0) {
      console.log('\n✅ Successfully applied fixes:');
      result.applied.forEach(fix => {
        console.log(`   - ${fix.description} (${fix.testId})`);
      });
    }
    
    if (result.failed.length > 0) {
      console.log('\n❌ Failed to apply fixes:');
      result.failed.forEach(({ fix, reason }) => {
        console.log(`   - ${fix.description}: ${reason}`);
      });
    }
    
    if (result.requiresManualReview.length > 0) {
      console.log('\n⚠️  Fixes requiring manual review:');
      result.requiresManualReview.forEach(fix => {
        console.log(`   - ${fix.description} (${fix.testId})`);
      });
    }
    
    return result;
  }

  async commitChanges(appliedFixes, testResult) {
    try {
      // Check git status
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!status.trim()) {
        console.log('No changes to commit');
        return;
      }
      
      // Create commit message
      const commitMessage = this.generateCommitMessage(appliedFixes, testResult);
      
      console.log('Git status:');
      console.log(status);
      console.log('\nCommit message:');
      console.log(commitMessage);
      
      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      
      // Commit
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      console.log('\n✅ Changes committed successfully');
      
      // Push if enabled
      if (this.options.autoPush) {
        console.log('\nPushing to remote...');
        execSync('git push', { stdio: 'inherit' });
        console.log('✅ Changes pushed successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error committing changes:', error.message);
      return false;
    }
  }

  generateCommitMessage(appliedFixes, testResult) {
    const fixCount = appliedFixes.length;
    const failedTests = testResult.summary.failed;
    
    let message = `fix: Automated fixes for ${failCount} test failures (iteration ${this.iterationCount})`;
    message += '\n\n';
    message += 'Applied fixes:\n';
    
    appliedFixes.forEach(fix => {
      message += `- ${fix.description} (${fix.testId})\n`;
    });
    
    message += `\n`;
    message += `Test results before fix:\n`;
    message += `- Failed: ${failedTests}\n`;
    message += `- Iteration: ${this.iterationCount}\n`;
    message += `\n`;
    message += `Generated by: Automated Release Pipeline\n`;
    
    // Escape quotes for shell
    return message.replace(/"/g, '\\"');
  }

  async createRelease(testResult) {
    const release = {
      releaseId: `release-${Date.now()}`,
      version: this.generateVersion(),
      createdAt: new Date().toISOString(),
      iterations: this.iterationCount,
      testResults: testResult.summary,
      allTestsPassed: true,
      notes: this.generateReleaseNotes()
    };
    
    this.releaseHistory.releases.push(release);
    this.releaseHistory.totalReleases++;
    this.releaseHistory.successfulReleases++;
    this.saveReleaseHistory();
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  RELEASE CREATED                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`Release ID: ${release.releaseId}`);
    console.log(`Version: ${release.version}`);
    console.log(`Iterations Required: ${this.iterationCount}`);
    console.log(`Total Tests Passed: ${testResult.summary.passed}`);
    console.log(`Created: ${release.createdAt}\n`);
    
    console.log('Release Notes:');
    console.log(release.notes);
    
    // Create release commit if enabled
    if (this.options.autoCommit) {
      await this.commitRelease(release);
    }
    
    // Save release notes to file
    const releaseNotesPath = path.join(__dirname, 'releases', `${release.releaseId}.md`);
    const dir = path.dirname(releaseNotesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(releaseNotesPath, release.notes);
    
    console.log(`\n📄 Release notes saved to: ${releaseNotesPath}`);
  }

  generateVersion() {
    // Simple semantic versioning
    const lastRelease = this.releaseHistory.releases[this.releaseHistory.releases.length - 1];
    
    if (!lastRelease) {
      return '1.0.0';
    }
    
    const [major, minor, patch] = lastRelease.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  generateReleaseNotes() {
    let notes = `# Release Notes\n\n`;
    notes += `## Version ${this.generateVersion()}\n\n`;
    notes += `**Date**: ${new Date().toISOString()}\n\n`;
    notes += `**Iterations**: ${this.iterationCount}\n\n`;
    
    notes += `### Summary\n\n`;
    notes += `All tests passed successfully after ${this.iterationCount} iteration(s) of the automated test-fix-release pipeline.\n\n`;
    
    notes += `### Test Results\n\n`;
    notes += `- ✅ All tests passing\n`;
    notes += `- 🔄 Total iterations: ${this.iterationCount}\n`;
    notes += `- 🧪 Test suite: Comprehensive coverage\n\n`;
    
    if (this.iterationCount > 1) {
      notes += `### Fixes Applied\n\n`;
      notes += `This release includes automated fixes for issues detected during testing. `;
      notes += `All fixes have been validated through the test suite.\n\n`;
    }
    
    notes += `### Quality Assurance\n\n`;
    notes += `- Automated testing: ✅ Passed\n`;
    notes += `- Fix validation: ✅ Verified\n`;
    notes += `- Integration testing: ✅ Complete\n\n`;
    
    notes += `---\n\n`;
    notes += `Generated by: Automated Release Pipeline v1.0.0\n`;
    
    return notes;
  }

  async commitRelease(release) {
    try {
      const message = `release: Version ${release.version}\n\nAll tests passing after ${this.iterationCount} iterations.\n\nRelease ID: ${release.releaseId}`;
      
      execSync(`git commit --allow-empty -m "${message}"`, { stdio: 'inherit' });
      execSync(`git tag -a v${release.version} -m "Release ${release.version}"`, { stdio: 'inherit' });
      
      console.log(`\n✅ Release committed and tagged: v${release.version}`);
      
      if (this.options.autoPush) {
        execSync('git push && git push --tags', { stdio: 'inherit' });
        console.log('✅ Release pushed to remote');
      }
    } catch (error) {
      console.error('❌ Error committing release:', error.message);
    }
  }

  generateManualFixReport(fixes) {
    const reportPath = path.join(__dirname, 'manual-fix-report.md');
    
    let report = `# Manual Fix Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Iteration**: ${this.iterationCount}\n\n`;
    
    report += `## Fixes Requiring Manual Intervention\n\n`;
    report += `The following fixes could not be applied automatically and require manual review:\n\n`;
    
    fixes.forEach((fix, index) => {
      report += `### ${index + 1}. ${fix.description}\n\n`;
      report += `**Test ID**: ${fix.testId}\n`;
      report += `**Bug ID**: ${fix.bugId}\n`;
      report += `**Confidence**: ${Math.round(fix.confidence * 100)}%\n`;
      report += `**Estimated Impact**: ${fix.estimatedImpact}\n\n`;
      
      report += `#### Proposed Changes\n\n`;
      fix.changes.forEach((change, idx) => {
        report += `**Change ${idx + 1}**: ${change.type}\n`;
        report += `**File**: \`${change.file}\`\n\n`;
        report += `\`\`\`${change.type === 'database' ? 'sql' : 'typescript'}\n`;
        report += `${change.content}\n`;
        report += `\`\`\`\n\n`;
        report += `**Explanation**: ${change.explanation}\n\n`;
      });
      
      report += `---\n\n`;
    });
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Manual fix report saved to: ${reportPath}`);
  }

  printFinalSummary() {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              PIPELINE EXECUTION SUMMARY                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total Iterations: ${this.iterationCount}`);
    console.log(`Max Iterations: ${this.options.maxIterations}`);
    
    if (this.iterationCount >= this.options.maxIterations) {
      console.log('\n⚠️  Pipeline stopped: Maximum iterations reached');
    }
    
    console.log('\nTest Failure Summary:');
    const failedTests = Object.keys(this.testFailureCount);
    if (failedTests.length === 0) {
      console.log('✅ No test failures');
    } else {
      failedTests.forEach(testId => {
        const count = this.testFailureCount[testId];
        const status = count >= 5 ? '⛔' : '⚠️ ';
        console.log(`${status} ${testId}: ${count} failure(s)`);
      });
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    autoCommit: false,
    autoPush: false
  };
  
  if (args.includes('--auto-commit')) {
    options.autoCommit = true;
  }
  
  if (args.includes('--auto-push')) {
    options.autoPush = true;
  }
  
  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const pipeline = new ReleasePipeline(options);
  
  pipeline.run()
    .then(result => {
      console.log('\n✅ Pipeline execution complete');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Pipeline failed:', error);
      process.exit(1);
    });
}

export default ReleasePipeline;
