/**
 * Enhanced Automated Release Pipeline v2.0
 * 
 * New Features:
 * 1. Rollback capability - agent can revert changes if tests fail
 * 2. Project objectives tracking - maintains core functionality
 * 3. Dependency planning - analyzes code dependencies before changes
 * 4. Individual fix releases - release fixes one at a time if needed
 * 5. Detailed test reports - human-readable reports after each run
 * 6. Agent decision tracking - documents why agent made decisions
 * 
 * Usage:
 *   node testing/enhanced-release-pipeline.js [--auto-commit] [--auto-push] [--individual-fixes]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import TestEngine from './test-engine.js';
import AIFixGenerator from './ai-fix-generator.js';
import AutonomousFixer from './autonomous-fixer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core project objectives - agent must maintain these
const PROJECT_OBJECTIVES = {
  primary: [
    {
      id: 'voice-agent',
      name: 'Solin Voice Agent',
      description: 'Users can have natural voice conversations with Solin',
      criticalTests: ['sanctuary-001', 'sanctuary-002', 'sanctuary-003'],
      mustMaintain: true
    },
    {
      id: 'memory-preservation',
      name: 'Memory Preservation',
      description: 'Users can save, retrieve, and search their memories',
      criticalTests: ['memory-001', 'memory-002', 'memory-003', 'memory-005'],
      mustMaintain: true
    },
    {
      id: 'timeline-display',
      name: 'Timeline Display',
      description: 'Users can view their life timeline chronologically',
      criticalTests: ['timeline-001', 'timeline-002', 'timeline-005'],
      mustMaintain: true
    },
    {
      id: 'archive-playback',
      name: 'Archive & Playback',
      description: 'Users can browse and play back voice recordings',
      criticalTests: ['archive-001', 'archive-003', 'archive-004'],
      mustMaintain: true
    }
  ],
  security: [
    {
      id: 'data-privacy',
      name: 'Data Privacy',
      description: 'Users can only access their own data',
      criticalTests: ['auth-003', 'auth-004', 'security-001'],
      mustMaintain: true
    },
    {
      id: 'authentication',
      name: 'Authentication',
      description: 'Secure user authentication and session management',
      criticalTests: ['auth-001', 'auth-002'],
      mustMaintain: true
    }
  ]
};

class EnhancedReleasePipeline {
  constructor(options = {}) {
    this.options = {
      autoCommit: options.autoCommit || false,
      autoPush: options.autoPush || false,
      individualFixes: options.individualFixes || false, // NEW: Release fixes one at a time
      maxIterations: options.maxIterations || 5,
      stopOnRepeatedFailure: options.stopOnRepeatedFailure || true,
      rollbackOnObjectiveFailure: true // NEW: Rollback if core objectives break
    };
    
    this.testEngine = new TestEngine();
    this.fixGenerator = new AIFixGenerator();
    this.fixer = new AutonomousFixer();
    this.iterationCount = 0;
    this.testFailureCount = {};
    this.releaseHistory = this.loadReleaseHistory();
    this.stateSnapshots = []; // NEW: Track state for rollback
    this.agentDecisions = []; // NEW: Track agent decisions
    this.testReports = []; // NEW: Human-readable test reports
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
      failedReleases: 0,
      rollbacks: 0
    };
  }

  saveReleaseHistory() {
    const historyPath = path.join(__dirname, 'release-history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.releaseHistory, null, 2));
  }

  /**
   * Create a state snapshot for rollback
   */
  createStateSnapshot(label) {
    const snapshot = {
      label,
      timestamp: new Date().toISOString(),
      iteration: this.iterationCount,
      gitCommit: this.getCurrentGitCommit(),
      testResults: null, // Will be filled after test
      filesChanged: this.fixer.changesApplied.map(c => c.path || c.file)
    };
    
    this.stateSnapshots.push(snapshot);
    console.log(`📸 Created state snapshot: ${label}`);
    
    return snapshot;
  }

  getCurrentGitCommit() {
    try {
      const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      return commit;
    } catch (error) {
      return null;
    }
  }

  /**
   * Rollback to a previous state
   */
  async rollbackToSnapshot(snapshot) {
    console.log(`\n🔄 ROLLING BACK TO: ${snapshot.label}`);
    console.log(`   Timestamp: ${snapshot.timestamp}`);
    console.log(`   Git commit: ${snapshot.gitCommit?.substring(0, 8)}`);
    
    const decision = {
      type: 'rollback',
      reason: 'Tests failed or core objectives compromised',
      snapshot: snapshot.label,
      timestamp: new Date().toISOString()
    };
    this.agentDecisions.push(decision);
    
    // Rollback file changes using autonomous fixer
    const rollbackResult = this.fixer.rollback();
    
    // Optionally rollback git commit
    if (snapshot.gitCommit && this.options.autoCommit) {
      try {
        execSync(`git reset --hard ${snapshot.gitCommit}`, { stdio: 'inherit' });
        console.log('✅ Git commit rolled back');
      } catch (error) {
        console.error('❌ Git rollback failed:', error.message);
      }
    }
    
    this.releaseHistory.rollbacks++;
    this.saveReleaseHistory();
    
    console.log(`\n✅ Rollback complete: ${rollbackResult.filesRestored} files restored`);
    
    return {
      success: true,
      filesRestored: rollbackResult.filesRestored,
      snapshot
    };
  }

  /**
   * Generate human-readable test report
   */
  generateTestReport(testResult, iteration) {
    const report = {
      iteration,
      timestamp: new Date().toISOString(),
      runId: testResult.summary.runId,
      summary: {
        total: testResult.summary.totalTests,
        passed: testResult.summary.passed,
        failed: testResult.summary.failed,
        passRate: Math.round((testResult.summary.passed / testResult.summary.totalTests) * 100)
      },
      failures: [],
      objectivesStatus: this.checkObjectives(testResult),
      recommendations: []
    };

    // Detail each failure
    if (testResult.bugs) {
      for (const bug of testResult.bugs) {
        report.failures.push({
          testId: bug.testId,
          testName: bug.testName,
          error: bug.error,
          attempts: bug.failedAttempts,
          affectsObjective: this.getAffectedObjective(bug.testId),
          severity: bug.severity
        });
      }
    }

    // Generate recommendations
    if (report.failures.length > 0) {
      report.recommendations.push('Agent will attempt to fix failures automatically');
      
      const criticalFailures = report.failures.filter(f => f.affectsObjective);
      if (criticalFailures.length > 0) {
        report.recommendations.push(`⚠️  ${criticalFailures.length} failures affect core objectives`);
        report.recommendations.push('Agent will rollback if fixes compromise objectives');
      }
    }

    // Save report
    const reportPath = path.join(__dirname, 'test-reports', `report-${Date.now()}.json`);
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Save human-readable version
    const readablePath = reportPath.replace('.json', '.md');
    fs.writeFileSync(readablePath, this.formatReportAsMarkdown(report));
    
    this.testReports.push(report);
    
    console.log(`\n📄 Test report saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${readablePath}`);
    
    return report;
  }

  formatReportAsMarkdown(report) {
    let md = `# Test Report - Iteration ${report.iteration}\n\n`;
    md += `**Timestamp**: ${report.timestamp}  \n`;
    md += `**Run ID**: ${report.runId}  \n\n`;
    
    md += `## Summary\n\n`;
    md += `- **Total Tests**: ${report.summary.total}\n`;
    md += `- **Passed**: ${report.summary.passed} ✅\n`;
    md += `- **Failed**: ${report.summary.failed} ❌\n`;
    md += `- **Pass Rate**: ${report.summary.passRate}%\n\n`;
    
    if (report.failures.length > 0) {
      md += `## Failures\n\n`;
      for (const failure of report.failures) {
        md += `### ${failure.testId}: ${failure.testName}\n\n`;
        md += `- **Error**: ${failure.error}\n`;
        md += `- **Attempts**: ${failure.attempts}\n`;
        md += `- **Severity**: ${failure.severity}\n`;
        if (failure.affectsObjective) {
          md += `- **⚠️  Affects Objective**: ${failure.affectsObjective.name}\n`;
        }
        md += `\n`;
      }
    }
    
    md += `## Core Objectives Status\n\n`;
    for (const [category, status] of Object.entries(report.objectivesStatus)) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Objectives\n\n`;
      for (const obj of status) {
        const icon = obj.passing ? '✅' : '❌';
        md += `${icon} **${obj.name}**: ${obj.passing ? 'PASSING' : 'FAILING'} (${obj.passedTests}/${obj.totalTests} tests)\n`;
      }
      md += `\n`;
    }
    
    if (report.recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      for (const rec of report.recommendations) {
        md += `- ${rec}\n`;
      }
    }
    
    return md;
  }

  /**
   * Check if core objectives are maintained
   */
  checkObjectives(testResult) {
    const status = {
      primary: [],
      security: []
    };

    for (const [category, objectives] of Object.entries(PROJECT_OBJECTIVES)) {
      for (const objective of objectives) {
        const criticalTests = objective.criticalTests;
        const testsPassed = criticalTests.filter(testId => {
          const test = testResult.tests?.find(t => t.testId === testId);
          return test && test.status === 'passed';
        });

        const objectiveStatus = {
          id: objective.id,
          name: objective.name,
          description: objective.description,
          totalTests: criticalTests.length,
          passedTests: testsPassed.length,
          passing: testsPassed.length === criticalTests.length,
          mustMaintain: objective.mustMaintain
        };

        status[category].push(objectiveStatus);
      }
    }

    return status;
  }

  getAffectedObjective(testId) {
    for (const [category, objectives] of Object.entries(PROJECT_OBJECTIVES)) {
      for (const objective of objectives) {
        if (objective.criticalTests.includes(testId)) {
          return {
            id: objective.id,
            name: objective.name,
            category,
            mustMaintain: objective.mustMaintain
          };
        }
      }
    }
    return null;
  }

  /**
   * Analyze dependencies before applying fix
   */
  analyzeDependencies(fix) {
    console.log(`\n🔍 Analyzing dependencies for fix: ${fix.fixId}`);
    
    const dependencies = {
      affectedFiles: [],
      relatedTests: [],
      potentialImpact: 'low',
      risks: [],
      recommendations: []
    };

    // Identify affected files
    for (const change of fix.changes) {
      if (change.file) {
        dependencies.affectedFiles.push(change.file);
        
        // Check if file is critical
        if (change.file.includes('ModernVoiceAgent') || 
            change.file.includes('conversationRecording') ||
            change.file.includes('memoryService')) {
          dependencies.potentialImpact = 'high';
          dependencies.risks.push(`Modifying critical file: ${change.file}`);
        }
        
        // Check if it's a database change
        if (change.file.includes('migration') || change.type === 'database') {
          dependencies.potentialImpact = 'high';
          dependencies.risks.push('Database schema changes - affects all users');
        }
      }
    }

    // Find related tests
    const testMappings = {
      'ModernVoiceAgent': ['sanctuary-001', 'sanctuary-002', 'sanctuary-003'],
      'conversationRecording': ['voice-001', 'voice-002', 'voice-003'],
      'memoryService': ['memory-001', 'memory-002', 'memory-003'],
      'Timeline': ['timeline-001', 'timeline-002', 'timeline-003'],
      'Archive': ['archive-001', 'archive-002', 'archive-003']
    };

    for (const file of dependencies.affectedFiles) {
      for (const [component, tests] of Object.entries(testMappings)) {
        if (file.includes(component)) {
          dependencies.relatedTests.push(...tests);
        }
      }
    }

    dependencies.relatedTests = [...new Set(dependencies.relatedTests)];

    // Generate recommendations
    if (dependencies.potentialImpact === 'high') {
      dependencies.recommendations.push('Create snapshot before applying');
      dependencies.recommendations.push('Run related tests after application');
      dependencies.recommendations.push('Prepare rollback if objectives compromised');
    }

    if (dependencies.relatedTests.length > 0) {
      dependencies.recommendations.push(`Verify ${dependencies.relatedTests.length} related tests still pass`);
    }

    console.log(`   Files affected: ${dependencies.affectedFiles.length}`);
    console.log(`   Related tests: ${dependencies.relatedTests.length}`);
    console.log(`   Impact: ${dependencies.potentialImpact}`);
    console.log(`   Risks: ${dependencies.risks.length}`);

    const decision = {
      type: 'dependency-analysis',
      fixId: fix.fixId,
      result: dependencies,
      timestamp: new Date().toISOString()
    };
    this.agentDecisions.push(decision);

    return dependencies;
  }

  /**
   * Apply fix with dependency awareness
   */
  async applyFixWithDependencyCheck(fix) {
    // Analyze dependencies first
    const deps = this.analyzeDependencies(fix);

    // Create snapshot before applying
    const snapshot = this.createStateSnapshot(`before-fix-${fix.fixId}`);

    // Apply the fix
    console.log(`\n🔨 Applying fix with dependency awareness...`);
    const result = await this.fixGenerator.applyFix(fix);

    // Store snapshot with result
    snapshot.fixApplied = fix.fixId;
    snapshot.dependencies = deps;

    return {
      ...result,
      dependencies: deps,
      snapshot
    };
  }

  /**
   * Release individual fixes one at a time
   */
  async releaseIndividualFixes(fixes) {
    console.log(`\n📦 INDIVIDUAL FIX RELEASE MODE`);
    console.log(`   Processing ${fixes.length} fixes separately\n`);

    const results = {
      released: [],
      failed: [],
      skipped: []
    };

    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      console.log(`\n${'='.repeat(70)}`);
      console.log(`FIX ${i + 1}/${fixes.length}: ${fix.fixId}`);
      console.log(`Description: ${fix.description}`);
      console.log('='.repeat(70));

      // Apply fix with dependency check
      const applyResult = await this.applyFixWithDependencyCheck(fix);

      if (!applyResult.applied) {
        console.log(`❌ Fix failed to apply: ${applyResult.reason}`);
        results.failed.push({ fix, reason: applyResult.reason });
        continue;
      }

      // Commit this fix individually
      if (this.options.autoCommit) {
        const commitMsg = `fix: ${fix.description} (${fix.testId})

Bug: ${fix.bugId}
Confidence: ${Math.round(fix.confidence * 100)}%
Impact: ${applyResult.dependencies.potentialImpact}

Generated by: Individual Fix Release Pipeline`;

        this.fixer.gitCommit(commitMsg);
      }

      // Run tests to verify this fix
      console.log(`\n🧪 Testing fix ${fix.fixId}...`);
      const testResult = await this.testEngine.run();

      // Check if objectives still maintained
      const objectivesStatus = this.checkObjectives(testResult);
      const objectivesFailing = this.anyObjectiveFailing(objectivesStatus);

      if (objectivesFailing) {
        console.log(`\n⚠️  FIX BROKE CORE OBJECTIVES - ROLLING BACK`);
        await this.rollbackToSnapshot(applyResult.snapshot);
        results.failed.push({ 
          fix, 
          reason: 'Broke core objectives',
          objectives: objectivesFailing
        });
        continue;
      }

      // Check if original test passes
      const originalTest = testResult.tests?.find(t => t.testId === fix.testId);
      if (originalTest && originalTest.status === 'passed') {
        console.log(`\n✅ Fix successful! Test ${fix.testId} now passing`);
        results.released.push({ 
          fix, 
          testResult,
          releaseCommit: this.getCurrentGitCommit()
        });
        
        // Clear backups after successful fix
        this.fixer.clearBackups();
      } else {
        console.log(`\n❌ Fix didn't resolve the issue - ROLLING BACK`);
        await this.rollbackToSnapshot(applyResult.snapshot);
        results.failed.push({ 
          fix, 
          reason: 'Test still failing after fix'
        });
      }
    }

    console.log(`\n\n📊 INDIVIDUAL FIX RELEASE SUMMARY:`);
    console.log(`   ✅ Released: ${results.released.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️  Skipped: ${results.skipped.length}`);

    return results;
  }

  anyObjectiveFailing(objectivesStatus) {
    const failing = [];
    
    for (const [category, objectives] of Object.entries(objectivesStatus)) {
      for (const obj of objectives) {
        if (obj.mustMaintain && !obj.passing) {
          failing.push({
            category,
            ...obj
          });
        }
      }
    }
    
    return failing.length > 0 ? failing : null;
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║      ENHANCED RELEASE PIPELINE v2.0                      ║');
    console.log('║      With Rollback, Objectives & Dependencies            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('Configuration:');
    console.log(`  Auto Commit: ${this.options.autoCommit ? '✅' : '❌'}`);
    console.log(`  Auto Push: ${this.options.autoPush ? '✅' : '❌'}`);
    console.log(`  Individual Fixes: ${this.options.individualFixes ? '✅' : '❌'}`);
    console.log(`  Max Iterations: ${this.options.maxIterations}`);
    console.log(`  Rollback on Objective Failure: ${this.options.rollbackOnObjectiveFailure ? '✅' : '❌'}\n');

    console.log('Core Objectives Being Maintained:');
    for (const [category, objectives] of Object.entries(PROJECT_OBJECTIVES)) {
      console.log(`  ${category.toUpperCase()}:`);
      for (const obj of objectives) {
        console.log(`    - ${obj.name}`);
      }
    }
    console.log('');

    let continueLoop = true;
    
    while (continueLoop && this.iterationCount < this.options.maxIterations) {
      this.iterationCount++;
      
      console.log('\n' + '='.repeat(70));
      console.log(`ITERATION ${this.iterationCount}/${this.options.maxIterations}`);
      console.log('='.repeat(70) + '\n');
      
      // Create snapshot at iteration start
      const iterationSnapshot = this.createStateSnapshot(`iteration-${this.iterationCount}-start`);
      
      // Step 1: Run tests
      console.log('STEP 1: Running test suite...\n');
      const testResult = await this.testEngine.run();
      
      // Store test results in snapshot
      iterationSnapshot.testResults = testResult.summary;
      
      // Step 2: Generate test report
      console.log('\nSTEP 2: Generating test report...\n');
      const report = this.generateTestReport(testResult, this.iterationCount);
      
      // Step 3: Check objectives
      console.log('\nSTEP 3: Checking core objectives...\n');
      const objectivesStatus = this.checkObjectives(testResult);
      const failingObjectives = this.anyObjectiveFailing(objectivesStatus);
      
      if (failingObjectives) {
        console.log('⚠️  WARNING: Core objectives are failing!');
        for (const obj of failingObjectives) {
          console.log(`   ❌ ${obj.name} (${obj.passedTests}/${obj.totalTests} tests)`);
        }
      } else {
        console.log('✅ All core objectives maintained');
      }
      
      if (testResult.passed) {
        console.log('\n✅ ALL TESTS PASSED! Creating release...\n');
        await this.createRelease(testResult, report);
        continueLoop = false;
        break;
      }
      
      // Step 4: Check for repeated failures
      console.log('\nSTEP 4: Analyzing test failures...\n');
      const repeatedFailures = this.checkRepeatedFailures(testResult.bugs);
      
      if (this.options.stopOnRepeatedFailure && repeatedFailures.length > 0) {
        console.log('\n⛔ STOPPING: Tests have repeatedly failed:');
        repeatedFailures.forEach(bug => {
          console.log(`   - ${bug.testId}: Failed ${this.testFailureCount[bug.testId]} times`);
        });
        continueLoop = false;
        break;
      }
      
      // Step 5: Generate fixes
      console.log('\nSTEP 5: Generating fixes for failures...\n');
      const fixes = await this.generateFixesForFailures(testResult.bugs);
      
      if (fixes.length === 0) {
        console.log('\n❌ Could not generate any fixes. Manual intervention required.');
        continueLoop = false;
        break;
      }
      
      // Step 6: Apply fixes (individual or batch)
      if (this.options.individualFixes) {
        console.log('\nSTEP 6: Releasing fixes individually...\n');
        const releaseResults = await this.releaseIndividualFixes(fixes);
        
        if (releaseResults.released.length === 0) {
          console.log('\n❌ No fixes were successfully released.');
          continueLoop = false;
          break;
        }
      } else {
        console.log('\nSTEP 6: Applying fixes in batch...\n');
        const applyResult = await this.applyFixesBatch(fixes);
        
        if (applyResult.applied.length === 0) {
          console.log('\n⚠️  No fixes could be applied.');
          continueLoop = false;
          break;
        }
        
        // Step 7: Commit changes
        if (this.options.autoCommit && applyResult.applied.length > 0) {
          console.log('\nSTEP 7: Committing changes...\n');
          await this.commitChanges(applyResult.applied, testResult);
        }
      }
      
      console.log('\nPreparing for next test iteration...\n');
      await this.sleep(2000);
    }
    
    // Final summary
    this.printFinalSummary();
    
    // Save agent decisions
    this.saveAgentDecisions();
    
    return {
      success: !continueLoop,
      iterations: this.iterationCount,
      decisions: this.agentDecisions,
      reports: this.testReports,
      snapshots: this.stateSnapshots
    };
  }

  checkRepeatedFailures(bugs) {
    const repeated = [];
    
    for (const bug of bugs) {
      if (!this.testFailureCount[bug.testId]) {
        this.testFailureCount[bug.testId] = 0;
      }
      
      this.testFailureCount[bug.testId]++;
      
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
    
    const snapshot = this.createStateSnapshot('before-batch-fixes');
    const result = await this.fixGenerator.batchApplyFixes(fixes);
    
    snapshot.batchApplied = fixes.map(f => f.fixId);
    
    return result;
  }

  async commitChanges(appliedFixes, testResult) {
    const message = this.generateCommitMessage(appliedFixes, testResult);
    const result = this.fixer.gitCommit(message);
    
    if (result.success) {
      console.log('✅ Changes committed successfully');
      if (this.options.autoPush) {
        console.log('\nPushing to remote...');
        this.fixer.executeCommand('git push');
      }
    }
    
    return result.success;
  }

  generateCommitMessage(fixes, testResult) {
    const count = fixes.length;
    let message = `fix: Automated fixes for ${count} test failure(s) (iteration ${this.iterationCount})`;
    message += '\n\nApplied fixes:\n';
    fixes.forEach(fix => {
      message += `- ${fix.description} (${fix.testId})\n`;
    });
    return message;
  }

  async createRelease(testResult, report) {
    const release = {
      releaseId: `release-${Date.now()}`,
      version: this.generateVersion(),
      createdAt: new Date().toISOString(),
      iterations: this.iterationCount,
      testResults: testResult.summary,
      report,
      allTestsPassed: true,
      objectivesStatus: this.checkObjectives(testResult)
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
    console.log(`Iterations: ${this.iterationCount}`);
    
    if (this.options.autoCommit) {
      await this.commitRelease(release);
    }
  }

  generateVersion() {
    const lastRelease = this.releaseHistory.releases[this.releaseHistory.releases.length - 1];
    if (!lastRelease) return '1.0.0';
    
    const [major, minor, patch] = lastRelease.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async commitRelease(release) {
    const message = `release: Version ${release.version}\n\nAll tests passing after ${this.iterationCount} iterations.\n\nRelease ID: ${release.releaseId}`;
    
    this.fixer.executeCommand(`git commit --allow-empty -m "${message}"`);
    this.fixer.executeCommand(`git tag -a v${release.version} -m "Release ${release.version}"`);
    
    if (this.options.autoPush) {
      this.fixer.executeCommand('git push && git push --tags');
    }
  }

  saveAgentDecisions() {
    const decisionsPath = path.join(__dirname, 'agent-decisions.json');
    fs.writeFileSync(decisionsPath, JSON.stringify({
      runId: `run-${Date.now()}`,
      iterations: this.iterationCount,
      decisions: this.agentDecisions,
      snapshots: this.stateSnapshots.map(s => ({
        label: s.label,
        timestamp: s.timestamp,
        iteration: s.iteration
      }))
    }, null, 2));
    
    console.log(`\n📋 Agent decisions saved to: ${decisionsPath}`);
  }

  printFinalSummary() {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              PIPELINE EXECUTION SUMMARY                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total Iterations: ${this.iterationCount}`);
    console.log(`State Snapshots Created: ${this.stateSnapshots.length}`);
    console.log(`Agent Decisions Made: ${this.agentDecisions.length}`);
    console.log(`Test Reports Generated: ${this.testReports.length}`);
    console.log(`Rollbacks Performed: ${this.releaseHistory.rollbacks}`);
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
    autoPush: false,
    individualFixes: false
  };
  
  if (args.includes('--auto-commit')) options.autoCommit = true;
  if (args.includes('--auto-push')) options.autoPush = true;
  if (args.includes('--individual-fixes')) options.individualFixes = true;
  
  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const pipeline = new EnhancedReleasePipeline(options);
  
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

export default EnhancedReleasePipeline;
