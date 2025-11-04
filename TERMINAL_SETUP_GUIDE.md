# Terminal Setup Guide for Component Design Tests

## 🖥️ Visual Terminal Layout

You need **4 separate terminal windows/tabs** running simultaneously:

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ TERMINAL 1: Ollama Service      │  │ TERMINAL 2: Dev Server          │
│─────────────────────────────────│  │─────────────────────────────────│
│ $ ollama serve                  │  │ $ npm run dev                   │
│                                 │  │                                 │
│ ✅ Keep this running!           │  │ ✅ Keep this running!           │
│                                 │  │                                 │
│ You'll see:                     │  │ You'll see:                     │
│ • "Listening on 127.0.0.1:11434"│  │ • "Local: http://localhost:8080"│
│ • Log messages when tests call  │  │ • "ready in Xms"                │
│                                 │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘

┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ TERMINAL 3: Status Checks       │  │ TERMINAL 4: Run Tests           │
│─────────────────────────────────│  │─────────────────────────────────│
│ $ .\check-ollama.ps1            │  │ $ npx playwright test           │
│ $ .\diagnose-playwright.ps1     │  │   component-design-analysis     │
│                                 │  │                                 │
│ Use for verification            │  │ Watch tests run here            │
│                                 │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 📋 Step-by-Step Setup

### Step 1: Open Terminal 1 - Start Ollama
```powershell
# Open a NEW PowerShell window
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Start Ollama (KEEP THIS RUNNING)
ollama serve
```

**Expected output:**
```
time=2024-11-04T... level=INFO source=routes.go:1124 msg="Listening on 127.0.0.1:11434 (version 0.x.x)"
time=2024-11-04T... level=INFO source=payload_common.go:112 msg="Extracting embedded files"
time=2024-11-04T... level=INFO source=payload_common.go:138 msg="Dynamic LLM libraries [cpu]"
```

✅ **Status:** This terminal will show activity when AI model is called
⚠️ **Important:** DO NOT CLOSE THIS WINDOW

---

### Step 2: Open Terminal 2 - Start Dev Server
```powershell
# Open ANOTHER NEW PowerShell window
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Start dev server (KEEP THIS RUNNING)
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

✅ **Status:** App is now accessible at http://localhost:8080
⚠️ **Important:** DO NOT CLOSE THIS WINDOW

---

### Step 3: Open Terminal 3 - Verify Setup
```powershell
# Open ANOTHER NEW PowerShell window
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Check Ollama is working
.\check-ollama.ps1
```

**Expected output:**
```
🔍 Ollama Status Check
=====================

1. Installation: ✅ ollama version is 0.x.x
2. Service Status: ✅ Running (port 11434 responding)
3. Process Check: ✅ Found running process (PID: xxxxx)

4. Installed Models:
   ✅ llama3.2 (required for design tests)
   📊 Size: 2.0 GB

5. API Test: ✅ API responding (1 models available)

6. Inference Test: (Testing with simple prompt...)
   ✅ Inference working (took 1.2s)
   📝 Response: OK

=====================================
✅ Ollama is ready for design tests!
=====================================
```

**If you see any ❌ red X marks:**
- Go back to Terminal 1 and ensure `ollama serve` is running
- Check Terminal 2 to ensure `npm run dev` is running
- See troubleshooting section below

---

### Step 4: Open Terminal 4 - Run Design Tests
```powershell
# Open ANOTHER NEW PowerShell window
cd C:\Users\Rishi\PROJECTS\SOLIN\your-story-mirror

# Run the component design tests
npx playwright test component-design-analysis
```

**Expected output:**
```
Running 7 tests using 1 worker
  ✓  1 Timeline Component - Design Analysis (45s)
  ✓  2 Archive Component - Design Analysis (42s)
  ✓  3 Sanctuary/Voice Agent - Design Analysis (38s)
  ✓  4 Dashboard Component - Design Analysis (35s)
  ✓  5 Navigation/Sidebar - Design Analysis (40s)
  ✓  6 Memory Card Component - Design Analysis (37s)
  ✓  7 Complete Design System - Generate Comprehensive Guide (55s)

  7 passed (5m 12s)

Results saved to:
  testing\design-suggestions\components\
```

---

## 🔍 What to Watch in Each Terminal

### Terminal 1 (Ollama) - During Tests
You'll see requests coming in:
```
[GIN] 2024/11/04 - 10:35:22 | 200 |  2.334567s |  127.0.0.1 | POST     "/api/generate"
[GIN] 2024/11/04 - 10:36:05 | 200 |  1.987654s |  127.0.0.1 | POST     "/api/generate"
```
✅ This is GOOD - it means tests are calling Ollama AI

### Terminal 2 (Dev Server) - During Tests
You'll see page navigation:
```
10:35:20 AM [vite] page reload timeline
10:35:45 AM [vite] page reload archive
```
✅ This is GOOD - Playwright is navigating your app

### Terminal 3 (Status) - Use for Troubleshooting
Keep this terminal available for checking status:
```powershell
# Anytime during tests, you can run:
.\check-ollama.ps1           # Check Ollama
.\diagnose-playwright.ps1     # Check Playwright
curl http://localhost:8080    # Check dev server
```

### Terminal 4 (Tests) - Watch Progress
You'll see:
- Which test is currently running
- How long each test takes
- Pass/fail status
- Location of output files

---

## ⚠️ Common Mistakes

### ❌ WRONG: Closing Terminal 1 or 2
```
Terminal 1: ollama serve
[User presses Ctrl+C or closes window]

Terminal 4: npx playwright test component-design-analysis
Error: Cannot connect to Ollama ❌
```

**✅ CORRECT:** Keep Terminal 1 and 2 open the entire time

---

### ❌ WRONG: Running everything in one terminal
```
$ ollama serve &
$ npm run dev &
$ npx playwright test component-design-analysis
[Everything fails due to conflicts]
```

**✅ CORRECT:** Use separate terminals (see layout above)

---

### ❌ WRONG: Forgetting to pull latest code
```
$ npx playwright test component-design-analysis
Error: No tests found ❌
```

**✅ CORRECT:** Always run `git pull origin main` first

---

## 🎯 Quick Checklist Before Running Tests

Use this checklist in Terminal 3:

```powershell
# 1. Check Ollama
.\check-ollama.ps1

# 2. Check dev server
curl http://localhost:8080

# 3. Check test file exists
dir testing\e2e\component-design-analysis.spec.ts

# 4. List tests Playwright can find
npx playwright test --list | Select-String "component"

# ✅ If all checks pass, run tests in Terminal 4
```

---

## 📱 Alternative: Use Windows Terminal with Tabs

If you have **Windows Terminal** installed, you can use tabs instead of windows:

```powershell
# Open Windows Terminal
wt

# Split panes
Ctrl+Shift+2   # Horizontal split
Ctrl+Shift+3   # Vertical split

# Navigate between panes
Alt+Arrow Keys
```

**Layout suggestion:**
```
┌─────────────────┬─────────────────┐
│  Ollama serve   │  npm run dev    │
├─────────────────┴─────────────────┤
│  Run tests / checks                │
└───────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Terminal 1 shows "port already in use"
**Problem:** Ollama is already running

**Solution:**
```powershell
# Find the process
Get-NetTCPConnection -LocalPort 11434

# Or just use the existing instance
# (Check with: curl http://localhost:11434)
```

### Terminal 2 shows "port 8080 in use"
**Problem:** Dev server already running

**Solution:**
```powershell
# Find and kill the process
Get-Process -Name node | Stop-Process -Force

# Or change the port in vite.config
```

### Tests fail with "timeout waiting for http://localhost:8080"
**Problem:** Terminal 2 not running

**Solution:**
```powershell
# In Terminal 2:
npm run dev

# Wait for "ready in Xms" message
# Then retry tests in Terminal 4
```

### Tests generate empty output files
**Problem:** Ollama not responding

**Solution:**
```powershell
# In Terminal 3:
.\check-ollama.ps1

# If inference test fails, restart Ollama:
# Terminal 1: Press Ctrl+C
# Then: ollama serve
```

---

## 📊 Expected Timeline

| Time | Terminal 1 (Ollama) | Terminal 2 (Dev) | Terminal 4 (Tests) |
|------|---------------------|------------------|-------------------|
| 0:00 | `ollama serve` | - | - |
| 0:05 | Running ✅ | `npm run dev` | - |
| 0:10 | Running ✅ | Running ✅ | `.\check-ollama.ps1` |
| 0:15 | Running ✅ | Running ✅ | All checks pass ✅ |
| 0:20 | Running ✅ | Running ✅ | `npx playwright test...` |
| 0:25 | Processing requests | Serving pages | Timeline test running |
| 1:00 | Processing requests | Serving pages | Archive test running |
| 5:30 | Processing requests | Serving pages | All tests complete ✅ |

---

## 🎉 Success Indicators

**You know everything is working when:**

✅ **Terminal 1:** Shows "Listening on 127.0.0.1:11434" and periodic POST requests
✅ **Terminal 2:** Shows "Local: http://localhost:8080" and page reloads
✅ **Terminal 3:** `.\check-ollama.ps1` shows all green checkmarks
✅ **Terminal 4:** Tests pass and create markdown files in `testing/design-suggestions/components/`

---

## 💡 Pro Tip: Save Your Layout

### Create a startup script:

**`start-all.ps1`:**
```powershell
# Start Ollama in new window
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD'; ollama serve"

# Wait a bit
Start-Sleep -Seconds 3

# Start dev server in new window
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

# Wait a bit
Start-Sleep -Seconds 5

# Run status check
.\check-ollama.ps1

Write-Host "`nAll services started! Now run tests in this window:"
Write-Host "npx playwright test component-design-analysis" -ForegroundColor Green
```

**Usage:**
```powershell
.\start-all.ps1
```

This opens both Terminal 1 and 2 automatically!

---

## 📚 Related Documentation

- `CHECK_OLLAMA_STATUS.md` - Detailed Ollama troubleshooting
- `WINDOWS_PLAYWRIGHT_SETUP.md` - Complete Windows setup guide
- `COMPONENT_DESIGN_TESTING_README.md` - Main testing guide
- `check-ollama.ps1` - Automated Ollama checker
- `diagnose-playwright.ps1` - Automated Playwright checker
