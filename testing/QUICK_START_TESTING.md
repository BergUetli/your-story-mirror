# Quick Start: Running E2E Tests

## ⚡ TL;DR - Run Tests Now

```bash
# 1. Install Playwright (first time only)
npx playwright install

# 2. Start dev server (in separate terminal)
npm run dev

# 3. Run all tests
npm run test:e2e

# 4. Run with UI (recommended)
npm run test:e2e:ui
```

## 🎯 Run Specific Test Groups

### Test Critical Bugs (Your Reported Issues)
```bash
# Test audio recording bug (voice-002)
npm run test:e2e:voice

# Test timeline bugs (timeline-001, timeline-002)
npm run test:e2e:timeline
```

### Test Individual Features
```bash
# Authentication & Security
npm run test:e2e authentication
npm run test:e2e security

# Voice Agent (Sanctuary)
npm run test:e2e sanctuary

# Memory Management
npm run test:e2e memory-management

# Archive & Recordings
npm run test:e2e archive

# Performance
npm run test:e2e performance

# Story Generation
npm run test:e2e story-reconstruction

# Admin Tools
npm run test:e2e admin-diagnostics

# Edge Functions
npm run test:e2e edge-functions

# Identity/Face Training
npm run test:e2e identity-training

# Dashboard & Settings
npm run test:e2e dashboard-settings

# Onboarding
npm run test:e2e onboarding
```

### Run Single Test
```bash
# Run specific test by ID
npm run test:e2e -- --grep "voice-002"
npm run test:e2e -- --grep "timeline-001"
npm run test:e2e -- --grep "auth-003"
```

## 🔍 Debugging Tests

### UI Mode (Best for Development)
```bash
npm run test:e2e:ui
```
- Interactive test runner
- Time travel debugging
- Watch mode
- Click to run individual tests

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```
- Watch tests execute in real browser
- See what Playwright sees
- Good for visual debugging

### Debug Mode (Step Through)
```bash
npm run test:e2e:debug
```
- Pauses on first test
- Playwright Inspector opens
- Step through test execution
- Inspect selectors

### With Specific Browser
```bash
# Chrome
npm run test:e2e -- --project=chromium

# Firefox
npm run test:e2e -- --project=firefox

# Safari
npm run test:e2e -- --project=webkit
```

## 📊 Test Reports

### Generate HTML Report
```bash
npm run test:e2e
npx playwright show-report
```

### View Last Run
```bash
npx playwright show-report
```

## 🐛 Expected Test Results

### ❌ Tests That Will FAIL (Known Bugs)

1. **voice-002: Enhanced mode captures BOTH user and AI audio**
   ```
   Error: Expected "2 channels" but got "1 channel"
   ```
   **Why**: Audio recording only captures one side (your reported bug)

2. **timeline-001: Memory labels display correctly**
   ```
   Error: Label element not visible
   ```
   **Why**: Memory labels not showing (your reported bug)

3. **timeline-002: Timeline scales to fit all memories**
   ```
   Error: Timeline height too small for memory count
   ```
   **Why**: Timeline doesn't scale (your reported bug)

### ✅ Tests That Should PASS

- Authentication (auth-001 through auth-006)
- Onboarding (onboard-001 through onboard-005)
- Most sanctuary tests
- Archive tests (if recordings exist)
- Memory management tests (if memories exist)
- Security tests
- Settings tests

## ⚙️ Configuration

### Environment Variables

Create `.env.test` file:
```env
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestUser123!@#

# Admin credentials
ADMIN_TEST_EMAIL=admin@test.com
ADMIN_TEST_PASSWORD=TestAdmin123!@#

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Playwright Config

Already configured in `playwright.config.ts`:
- Base URL: `http://localhost:8080`
- Screenshots: On failure
- Videos: On failure
- Traces: On retry
- Retry: 2 times
- Timeout: 30 seconds

## 🚨 Common Issues & Solutions

### Issue: "Error: page.goto: net::ERR_CONNECTION_REFUSED"
**Solution**: Start dev server first
```bash
npm run dev
```

### Issue: "Error: browserType.launch: Executable doesn't exist"
**Solution**: Install Playwright browsers
```bash
npx playwright install
```

### Issue: Tests timeout
**Solution**: Increase timeout in test
```typescript
test.setTimeout(60000); // 60 seconds
```

### Issue: Element not found
**Solution**: Check if feature exists
```bash
# Run with console logs
npm run test:e2e:headed
```

### Issue: Test fails on CI but passes locally
**Solution**: Check environment variables
```bash
# Verify .env file exists
cat .env

# Run with same env as CI
NODE_ENV=test npm run test:e2e
```

## 📝 Test Data Requirements

Some tests require existing data:

### Memory Tests
- Need at least 1 memory in database
- Test user must have memories

### Archive Tests
- Need at least 1 recording
- Test user must have recordings

### Timeline Tests
- Need multiple memories for scaling test
- Ideally 10+ memories

### Performance Tests
- Need 100+ memories for full test
- Can run with fewer but results scaled

## 🎯 Test Selection Strategy

### Quick Smoke Test (2 minutes)
```bash
npm run test:e2e authentication
npm run test:e2e memory-management
```

### Bug Verification (5 minutes)
```bash
npm run test:e2e:voice
npm run test:e2e:timeline
```

### Full Test Suite (15-30 minutes)
```bash
npm run test:e2e
```

### Pre-Deployment (30-45 minutes)
```bash
npm run test:e2e
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

## 📚 Additional Commands

### Update Snapshots
```bash
npm run test:e2e -- --update-snapshots
```

### Run Tests in Parallel
```bash
npm run test:e2e -- --workers=4
```

### Run Tests Sequentially
```bash
npm run test:e2e -- --workers=1
```

### Filter by Tag
```bash
npm run test:e2e -- --grep "@smoke"
npm run test:e2e -- --grep "@critical"
```

### Exclude Tests
```bash
npm run test:e2e -- --grep-invert "@slow"
```

## 🎓 Learning Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Debugging Guide](https://playwright.dev/docs/debug)

## 💡 Pro Tips

1. **Use UI Mode** for development - it's the best way to write/debug tests
2. **Run specific tests** during development - faster feedback
3. **Check console logs** in tests - they show what's happening
4. **Take screenshots** on failure - helps debug issues
5. **Use headed mode** to see browser behavior
6. **Add data-testid** attributes to make tests more reliable

## 🆘 Getting Help

If tests fail:
1. Check console output for error messages
2. Look for screenshots in `test-results/`
3. Run in headed mode to see what's happening
4. Check if dev server is running
5. Verify test data exists

---

**Ready to test?** Start with: `npm run test:e2e:ui`
