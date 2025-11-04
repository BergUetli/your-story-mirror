# How to Check if Ollama is Running (Not Just Installed)

## Quick Check Commands

### Method 1: Test API Connection (Recommended)
```powershell
# This will show you if Ollama is responding
Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET
```

**If Ollama is running, you'll see:**
```
StatusCode        : 200
StatusDescription : OK
Content           : {"models":[...]}
```

**If Ollama is NOT running, you'll see:**
```
Invoke-WebRequest : Unable to connect to the remote server
```

---

### Method 2: Simple curl Test
```powershell
curl http://localhost:11434
```

**If running:** You'll see a response like `Ollama is running`

**If NOT running:** `curl: (7) Failed to connect to localhost port 11434`

---

### Method 3: Check Process
```powershell
# Check if Ollama process is running
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}
```

**If running, you'll see:**
```
Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
    xxx      xx   xxxxx      xxxxx       x.xx   xxxx   x ollama
```

**If NOT running:** No output (empty)

---

## How to Start Ollama

### Option 1: Command Line (Recommended for Testing)
```powershell
# Open a NEW terminal window and run:
ollama serve
```

**You should see:**
```
time=2024-11-04T... level=INFO source=... msg="Ollama server starting"
time=2024-11-04T... level=INFO source=... msg="Listening on 127.0.0.1:11434"
```

**⚠️ Keep this terminal window open!** Ollama runs in the foreground.

---

### Option 2: Background Service (Runs Automatically)

**Check if Ollama service is installed:**
```powershell
Get-Service | Where-Object {$_.DisplayName -like "*Ollama*"}
```

**If service exists, start it:**
```powershell
Start-Service OllamaService
```

**Check service status:**
```powershell
Get-Service OllamaService
```

**Expected output when running:**
```
Status   Name               DisplayName
------   ----               -----------
Running  OllamaService      Ollama Service
```

---

## Complete Startup Process

### Step-by-Step: Start Ollama for Testing

**Terminal 1: Start Ollama**
```powershell
ollama serve
```

**Terminal 2: Verify It's Running**
```powershell
# Test connection
curl http://localhost:11434

# Check what models are installed
ollama list
```

**Expected output from `ollama list`:**
```
NAME            ID              SIZE      MODIFIED
llama3.2:latest b3fb5d5e29d4    2.0 GB    2 hours ago
```

**If you don't see `llama3.2`, download it:**
```powershell
ollama pull llama3.2
```

**Terminal 3: Test with a Prompt**
```powershell
ollama run llama3.2 "Say hello in exactly 5 words"
```

**Expected output:**
```
Hello there, how are you?
```

---

## Visual Indicator - Ollama is Running

When Ollama is running correctly, you should see:

### In the terminal where you ran `ollama serve`:
```
time=2024-11-04T10:30:00.000-08:00 level=INFO source=server.go:123 msg="Ollama server starting"
time=2024-11-04T10:30:00.100-08:00 level=INFO source=server.go:456 msg="Listening on 127.0.0.1:11434"
time=2024-11-04T10:30:00.150-08:00 level=INFO source=server.go:789 msg="Ready to accept connections"
```

### When you make a request, you'll see:
```
time=2024-11-04T10:31:15.000-08:00 level=INFO source=handler.go:234 msg="GET /api/tags"
time=2024-11-04T10:31:20.000-08:00 level=INFO source=handler.go:567 msg="POST /api/generate"
```

---

## Troubleshooting

### "ollama: command not found"
**Problem:** Ollama is not installed or not in PATH

**Solution:**
```powershell
# Check installation
where.exe ollama

# If not found, install from:
# https://ollama.ai/download
```

### "Port 11434 already in use"
**Problem:** Another Ollama instance is already running (or another app is using that port)

**Solution 1: Find and stop the existing process**
```powershell
# Find process using port 11434
Get-NetTCPConnection -LocalPort 11434 | Select-Object OwningProcess

# Kill that process (replace XXXX with the process ID)
Stop-Process -Id XXXX -Force
```

**Solution 2: Check if Ollama is already running as a service**
```powershell
Get-Service | Where-Object {$_.DisplayName -like "*Ollama*"}
```

### "Cannot connect after running ollama serve"
**Problem:** Firewall blocking or Ollama crashed

**Solution:**
```powershell
# Check firewall
# Windows Defender Firewall -> Allow an app
# Make sure Ollama is allowed

# Try restarting
# Press Ctrl+C in the ollama serve terminal
# Then run again:
ollama serve
```

### Ollama Crashes Immediately
**Problem:** GPU/driver issues or corrupted installation

**Solution:**
```powershell
# Run in CPU-only mode
$env:OLLAMA_NUM_GPU=0
ollama serve

# Or reinstall Ollama
winget uninstall Ollama.Ollama
winget install Ollama.Ollama
```

---

## Quick Status Script

Save this as `check-ollama.ps1`:

```powershell
Write-Host "`n🔍 Ollama Status Check" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# 1. Check if installed
Write-Host "1. Installation: " -NoNewline
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $version = ollama --version 2>&1
    Write-Host "✅ $version" -ForegroundColor Green
} else {
    Write-Host "❌ Not installed" -ForegroundColor Red
    exit 1
}

# 2. Check if running
Write-Host "2. Service Status: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Running (port 11434 responding)" -ForegroundColor Green
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
    Write-Host "`n   Start with: ollama serve`n" -ForegroundColor Yellow
    exit 1
}

# 3. Check installed models
Write-Host "3. Installed Models:" -ForegroundColor Yellow
$models = ollama list 2>&1
if ($models -match "llama3.2") {
    Write-Host "   ✅ llama3.2 (required for tests)" -ForegroundColor Green
} else {
    Write-Host "   ❌ llama3.2 not found" -ForegroundColor Red
    Write-Host "   Install with: ollama pull llama3.2`n" -ForegroundColor Yellow
}

# 4. Test inference
Write-Host "`n4. Testing inference..." -ForegroundColor Yellow
$testPrompt = "Say OK"
Write-Host "   Prompt: '$testPrompt'" -ForegroundColor Gray

try {
    $result = ollama run llama3.2 $testPrompt --verbose=false 2>&1
    if ($result) {
        Write-Host "   ✅ Response: $result" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Inference test failed" -ForegroundColor Red
}

Write-Host "`n✅ Ollama is ready for design tests!`n" -ForegroundColor Green
```

**Run it:**
```powershell
.\check-ollama.ps1
```

---

## For Component Design Tests

Before running the design tests, ensure:

```powershell
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Verify it's working
.\check-ollama.ps1

# Terminal 3: Start dev server
npm run dev

# Terminal 4: Run design tests
npx playwright test component-design-analysis
```

---

## Summary

| Check | Command | Expected Result |
|-------|---------|----------------|
| **Is Ollama installed?** | `ollama --version` | Shows version number |
| **Is Ollama running?** | `curl http://localhost:11434` | Returns "Ollama is running" |
| **Is llama3.2 installed?** | `ollama list` | Shows llama3.2 in list |
| **Can Ollama generate?** | `ollama run llama3.2 "test"` | Returns a response |

**All checks must pass before running design tests!**
