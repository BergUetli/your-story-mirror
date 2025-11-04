# Windows Playwright Setup Guide

## ⚠️ If You're Getting "No tests found" Error

This usually means you haven't pulled the latest test files from GitHub yet.

### Step 1: Pull Latest Changes
```powershell
# Make sure you're in the project directory
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Pull latest changes from GitHub
git pull origin main
```

### Step 2: Verify the Test File Exists
```powershell
# Check if the test file is present
dir testing\e2e\component-design-analysis.spec.ts
```

**Expected output:**
```
11/04/2024  02:05 AM            32,533 component-design-analysis.spec.ts
```

If you don't see this file, the pull didn't work. Try:
```powershell
git fetch origin
git reset --hard origin/main
```

### Step 3: Verify Playwright Can Find the Tests
```powershell
# List all tests Playwright can find
npx playwright test --list | Select-String "component"
```

**Expected output:**
```
[chromium] › component-design-analysis.spec.ts:70:3 › Component Design Analysis - Ollama AI › Timeline Component - Design Analysis
[chromium] › component-design-analysis.spec.ts:208:3 › Component Design Analysis - Ollama AI › Archive Component - Design Analysis
... (more tests)
```

### Step 4: Run the Tests

**Option A: Run ALL component design tests**
```powershell
npx playwright test component-design-analysis
```

**Option B: Run a specific component test**
```powershell
# Timeline only
npx playwright test component-design-analysis -g "Timeline"

# Archive only
npx playwright test component-design-analysis -g "Archive"
```

**Option C: Use the full path (if above doesn't work)**
```powershell
npx playwright test testing/e2e/component-design-analysis.spec.ts
```

---

## 🔧 Prerequisites Before Running Tests

### 1. Ollama Must Be Running

**⚡ Quick Status Check:**
```powershell
.\check-ollama.ps1
```

This will verify:
- ✅ Ollama is installed
- ✅ Service is running on port 11434
- ✅ llama3.2 model is downloaded
- ✅ Inference is working

**If any checks fail:**

**Check if Ollama is installed:**
```powershell
ollama --version
```

**Start Ollama service:**
```powershell
# Terminal 1 - KEEP THIS OPEN
ollama serve
```

**In a NEW terminal, download the model:**
```powershell
ollama pull llama3.2
```

**Test Ollama is working:**
```powershell
ollama run llama3.2 "Say hello"
```

📚 **Need Help?** See `CHECK_OLLAMA_STATUS.md` for detailed troubleshooting

### 2. Dev Server Must Be Running

**In a separate terminal:**
```powershell
npm run dev
```

**Verify it's running:**
- Open browser to http://localhost:8080
- You should see your app

### 3. Playwright Browsers Installed

```powershell
# Install Playwright browsers
npx playwright install chromium

# Or install all browsers
npx playwright install
```

---

## 🎯 Running Tests - Complete Example

### Terminal 1: Start Ollama
```powershell
ollama serve
```

### Terminal 2: Start Dev Server
```powershell
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror
npm run dev
```

### Terminal 3: Run Tests
```powershell
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Run all component design tests
npx playwright test component-design-analysis

# Or run just Timeline component
npx playwright test component-design-analysis -g "Timeline"
```

---

## 📂 Where to Find Results

After tests complete, check:
```
testing\design-suggestions\components\
├── timeline-improvements-2024-11-04.md
├── archive-improvements-2024-11-04.md
├── sanctuary-improvements-2024-11-04.md
├── dashboard-improvements-2024-11-04.md
├── navigation-improvements-2024-11-04.md
├── memory-card-improvements-2024-11-04.md
└── complete-design-system-2024-11-04.md
```

Each file contains:
- Assessment of current design
- Specific CSS improvements with code examples
- Layout and spacing recommendations
- Typography improvements
- Visual enhancements (animations, hover states)
- Mobile responsiveness suggestions

---

## ❌ Troubleshooting

### Error: "No tests found"

**Cause:** Test file not present in your local copy

**Solution:**
```powershell
git pull origin main
git status  # Verify no conflicts
dir testing\e2e\component-design-analysis.spec.ts  # Verify file exists
```

### Error: "Cannot connect to Ollama"

**Cause:** Ollama service not running

**Solution:**
```powershell
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Test connection
Invoke-WebRequest -Uri "http://localhost:11434/api/generate" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"model":"llama3.2","prompt":"test","stream":false}'
```

### Error: "Timeout waiting for http://localhost:8080"

**Cause:** Dev server not running

**Solution:**
```powershell
# In a separate terminal
npm run dev

# Verify it's working
curl http://localhost:8080
```

### Error: "browserType.launch: Executable doesn't exist"

**Cause:** Playwright browsers not installed

**Solution:**
```powershell
npx playwright install chromium
```

### Tests Run But No Output Files Generated

**Cause:** Ollama not responding or wrong model

**Solution:**
```powershell
# Check Ollama models
ollama list

# Verify llama3.2 is there
# If not, download it:
ollama pull llama3.2

# Test Ollama
ollama run llama3.2 "Hello"
```

---

## 🚀 Quick Start (All Steps)

```powershell
# 1. Pull latest code
git pull origin main

# 2. Verify test file exists
dir testing\e2e\component-design-analysis.spec.ts

# 3. Install Playwright browsers (if not done)
npx playwright install chromium

# 4. Terminal 1: Start Ollama
ollama serve

# 5. Terminal 2: Start dev server
npm run dev

# 6. Terminal 3: Run tests
npx playwright test component-design-analysis
```

---

## 📊 Expected Test Duration

- **Timeline Component:** ~30-60 seconds
- **Archive Component:** ~30-60 seconds
- **Sanctuary Component:** ~30-60 seconds
- **Dashboard Component:** ~30-60 seconds
- **Navigation Component:** ~30-60 seconds
- **Memory Card Component:** ~30-60 seconds
- **Complete Design System:** ~60-90 seconds

**Total time for all tests:** ~5-8 minutes

---

## 💡 Pro Tips

### Run Tests in Parallel (Faster)
```powershell
# Edit playwright.config.ts
# Change: workers: 1
# To: workers: 2
```

### Run Only Specific Tests
```powershell
# Timeline and Archive only
npx playwright test component-design-analysis -g "Timeline|Archive"
```

### Skip Ollama, Use Rule-Based Suggestions
```powershell
# The tests have a fallback if Ollama fails
# Just run normally and it will generate basic suggestions
npx playwright test component-design-analysis
```

### View Test in Browser (Debug Mode)
```powershell
npx playwright test component-design-analysis --debug
```

### Generate HTML Report
```powershell
# After tests run
npx playwright show-report testing/playwright-report
```

---

## 📝 Next Steps After Tests Complete

1. **Review the generated markdown files** in `testing/design-suggestions/components/`
2. **Prioritize improvements** - Start with colors and typography
3. **Implement CSS changes** in your component files
4. **Test locally** - Make sure changes look good
5. **Commit and push** to GitHub for Lovable deployment
6. **Re-run tests** to see if Ollama notices improvements

---

## 🆘 Still Having Issues?

If you're still getting "No tests found":

1. **Show me your exact error:**
   ```powershell
   npx playwright test component-design-analysis 2>&1 | Out-File test-error.txt
   type test-error.txt
   ```

2. **Show me file structure:**
   ```powershell
   dir testing\e2e\*.spec.ts
   ```

3. **Show me Playwright config:**
   ```powershell
   type playwright.config.ts
   ```

4. **Try the absolute path:**
   ```powershell
   npx playwright test "$PWD\testing\e2e\component-design-analysis.spec.ts"
   ```
