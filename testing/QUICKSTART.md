# 🚀 Testing Framework - Quick Start Guide

## Overview

This autonomous testing framework runs comprehensive tests, automatically generates fixes for failures, and manages releases—all without manual intervention.

---

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Environment variables** set in `.env`:
   ```
   VITE_SUPABASE_URL=https://gulydhhzwlltkxbfnclu.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
   ```
3. **Project dependencies** installed: `npm install`

---

## 🎯 Quick Commands

### Run All Tests

```bash
npm test
```

or

```bash
./testing/run-tests.sh
```

### Run Specific Test Group

```bash
npm run test:auth      # Authentication tests
npm run test:memory    # Memory management tests
npm run test:voice     # Voice recording tests
```

or

```bash
./testing/run-tests.sh --group=memory
```

### Run Single Test

```bash
./testing/run-tests.sh --test=memory-001
```

### Run Automated Release Pipeline

```bash
# Dry run (no commits)
npm run test:pipeline

# With automatic commits and push
npm run test:pipeline:auto
```

---

## 🔄 Autonomous Mode (Recommended)

This is the "set it and forget it" mode that handles everything automatically:

```bash
./testing/run-tests.sh --pipeline --auto
```

**What it does:**

1. ✅ Runs all tests
2. 🐛 Detects failures and creates bug reports
3. 🤖 Generates fixes using AI/rule-based analysis
4. 🔨 Applies fixes in batch
5. 💾 Commits changes with descriptive messages
6. 🔄 Re-runs tests to verify fixes
7. 🚀 Creates release when all tests pass
8. ⛔ Stops if test fails 5+ times (needs human)

**Safety Features:**
- Max 5 iterations before stopping
- Won't apply low-confidence fixes automatically
- Creates manual fix guides when needed
- Full audit trail in git history

---

## 📊 Understanding Test Results

### Success Output

```
╔═══════════════════════════════════════════════════════════╗
║                    TEST RUN SUMMARY                       ║
╚═══════════════════════════════════════════════════════════╝

Total Tests: 34
✅ Passed: 34 (100%)
❌ Failed: 0 (0%)
⏭️  Skipped: 0 (0%)
```

### Failure Output

```
❌ FAILED TESTS:
   - memory-001: Save Memory via Voice Conversation
     Error: foreign key constraint "memories_user_id_fkey" violated
     Attempts: 5
```

---

## 🐛 When Tests Fail

### Automatic Handling

The system automatically:
1. Creates detailed bug report in `testing/bug-tracker.json`
2. Analyzes error patterns
3. Generates fixes in `testing/fix-queue.json`
4. Applies high-confidence fixes
5. Re-runs tests

### Manual Intervention Needed

If you see `⚠️  Manual review required`:

1. **Check bug tracker:**
   ```bash
   cat testing/bug-tracker.json | jq '.bugs[] | select(.status=="open")'
   ```

2. **Review fix proposals:**
   ```bash
   cat testing/fix-queue.json | jq '.fixes[]'
   ```

3. **Read manual fix guide:**
   ```bash
   cat testing/manual-fix-report.md
   ```

4. **Apply fixes and re-test:**
   ```bash
   npm test
   ```

---

## 📁 Generated Files

After running tests, you'll find:

| File | Purpose |
|------|---------|
| `test-results.json` | Latest test execution results |
| `bug-tracker.json` | All detected bugs with status |
| `fix-queue.json` | Pending fixes to apply |
| `fix-history.json` | History of applied fixes |
| `release-history.json` | All releases created |
| `manual-fix-report.md` | Guide for manual fixes |
| `logs/*.log` | Detailed execution logs |

---

## 🎯 Common Scenarios

### Scenario 1: Before Deploying

```bash
# Run full test suite
npm test

# If all pass, safe to deploy
if [ $? -eq 0 ]; then
  npm run build
  # Deploy
fi
```

### Scenario 2: After Code Changes

```bash
# Make changes to code
git add .
git commit -m "feat: new feature"

# Validate with tests
npm test

# If pass, push
git push
```

### Scenario 3: Daily CI/CD

Add to `.github/workflows/test.yml`:

```yaml
name: Automated Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

### Scenario 4: Autonomous Fix & Release

```bash
# Let it handle everything
./testing/run-tests.sh --pipeline --auto

# System will:
# - Fix failures automatically
# - Commit fixes
# - Re-test until all pass
# - Create release
# - Push to remote
```

---

## 🔍 Debugging Failed Tests

### View Detailed Test Results

```bash
cat testing/test-results.json | jq '.'
```

### Filter Failed Tests

```bash
cat testing/test-results.json | jq '.tests[] | select(.status=="failed")'
```

### Check Specific Test

```bash
cat testing/test-results.json | jq '.tests[] | select(.testId=="memory-001")'
```

### View Bug Details

```bash
cat testing/bug-tracker.json | jq '.bugs[] | select(.testId=="memory-001")'
```

---

## 📈 Monitoring Progress

### Track Release History

```bash
cat testing/release-history.json | jq '.releases[]'
```

### View Fix Success Rate

```bash
cat testing/fix-history.json | jq '{
  total: .totalFixes,
  successful: .successfulFixes,
  failed: .failedFixes,
  rate: (.successfulFixes / .totalFixes * 100)
}'
```

### Check Latest Log

```bash
tail -f testing/logs/test-run-*.log
```

---

## 🛡️ Safety & Best Practices

### Before Running Autonomous Mode

1. ✅ Ensure git repo is clean
2. ✅ Have a backup branch
3. ✅ Review recent changes
4. ✅ Test in staging first

### During Execution

- Monitor logs: `tail -f testing/logs/*.log`
- Watch git commits: `git log --oneline`
- Check test results: `cat testing/test-results.json`

### After Execution

- Review applied fixes: `git diff HEAD~3`
- Verify all tests passed
- Check release notes in `testing/releases/`
- Deploy with confidence ✅

---

## 🚨 Emergency Stop

If the pipeline is running and you need to stop:

```bash
# Find the process
ps aux | grep "test-engine\|release-pipeline"

# Kill it
kill -9 <PID>
```

Or simply press `Ctrl+C` in the terminal.

---

## 💡 Tips & Tricks

### Run Only Critical Tests

```bash
./testing/run-tests.sh --group=auth
./testing/run-tests.sh --group=memory
./testing/run-tests.sh --group=voice
```

### Generate Fixes Without Applying

```bash
node testing/test-engine.js
# Review fixes in fix-queue.json
# Apply manually if needed
```

### Skip Specific Tests Temporarily

Edit `test-suite.json` and add:
```json
"skip": true
```

### Increase Retry Limit

Edit `test-suite.json`:
```json
"configuration": {
  "maxRetries": 10
}
```

---

## 📞 Getting Help

### Test Framework Issues

1. Check logs: `cat testing/logs/*.log`
2. Review test results: `cat testing/test-results.json`
3. Check environment: `env | grep VITE`
4. Verify dependencies: `npm list`

### Test Failures

1. Read error message in test output
2. Check bug tracker: `testing/bug-tracker.json`
3. Review fix proposals: `testing/fix-queue.json`
4. Read manual fix guide: `testing/manual-fix-report.md`

### Still Stuck?

- Read full documentation: `testing/README.md`
- Check GitHub issues
- Review project README for known issues

---

## ✅ Success Checklist

Before considering testing framework ready:

- [x] Environment variables configured
- [x] All dependencies installed
- [x] Can run `npm test` successfully
- [x] Test results generated in `testing/test-results.json`
- [x] Autonomous mode tested (dry run)
- [x] Fix generation working
- [x] Release pipeline tested

---

## 🎓 Next Steps

1. **Run your first test:**
   ```bash
   npm test
   ```

2. **Explore test groups:**
   ```bash
   npm run test:memory
   ```

3. **Try autonomous mode:**
   ```bash
   ./testing/run-tests.sh --pipeline
   ```

4. **Enable auto-commit (when ready):**
   ```bash
   ./testing/run-tests.sh --pipeline --auto
   ```

5. **Integrate with CI/CD** (GitHub Actions, GitLab CI, etc.)

---

**You're all set! The testing framework is ready to use. 🚀**

Start with `npm test` and let the system handle the rest!
