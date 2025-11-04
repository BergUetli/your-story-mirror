# Simple startup script without emojis (better compatibility)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Component Design Test Environment Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "playwright.config.ts")) {
    Write-Host "[ERROR] playwright.config.ts not found" -ForegroundColor Red
    Write-Host "        Please run this script from the project root directory" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Detect which PowerShell to use
$psCommand = "powershell"
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    $psCommand = "pwsh"
}
Write-Host "[INFO] Using: $psCommand" -ForegroundColor Gray

# Check if Ollama is installed
Write-Host ""
Write-Host "[1/4] Checking Ollama installation..." -NoNewline
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "      Install from: https://ollama.ai/download" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if Ollama is already running
Write-Host "[2/4] Checking if Ollama is running..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 2 -ErrorAction Stop
    Write-Host " Already running!" -ForegroundColor Green
    $ollamaRunning = $true
} catch {
    Write-Host " Not running" -ForegroundColor Yellow
    $ollamaRunning = $false
}

# Start Ollama if not running
if (-not $ollamaRunning) {
    Write-Host "      Starting Ollama in new window..."
    $ollamaCmd = "cd '$PWD'; Write-Host 'Ollama Service' -ForegroundColor Cyan; Write-Host '==============='; Write-Host ''; ollama serve"
    Start-Process $psCommand -ArgumentList "-NoExit", "-Command", $ollamaCmd
    
    Write-Host "      Waiting for Ollama to start" -NoNewline
    $maxAttempts = 15
    $attempt = 0
    $ollamaReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $ollamaReady) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 1 -ErrorAction Stop
            $ollamaReady = $true
        } catch {
            $attempt++
        }
    }
    
    if ($ollamaReady) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " TIMEOUT" -ForegroundColor Yellow
        Write-Host "      Ollama may still be starting. Check the new window." -ForegroundColor Yellow
    }
}

# Check if llama3.2 model is installed
Write-Host "[3/4] Checking llama3.2 model..." -NoNewline
$modelList = ollama list 2>&1 | Out-String
if ($modelList -match "llama3\.2") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "      Downloading llama3.2 model (this may take a few minutes)..." -ForegroundColor Yellow
    Write-Host ""
    ollama pull llama3.2
}

# Check if dev server is already running
Write-Host "[4/4] Checking if dev server is running..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction Stop
    Write-Host " Already running!" -ForegroundColor Green
    $devServerRunning = $true
} catch {
    Write-Host " Not running" -ForegroundColor Yellow
    $devServerRunning = $false
}

# Start dev server if not running
if (-not $devServerRunning) {
    Write-Host "      Starting dev server in new window..."
    $devCmd = "cd '$PWD'; Write-Host 'Dev Server' -ForegroundColor Cyan; Write-Host '=========='; Write-Host ''; npm run dev"
    Start-Process $psCommand -ArgumentList "-NoExit", "-Command", $devCmd
    
    Write-Host "      Waiting for dev server to start" -NoNewline
    $maxAttempts = 30
    $attempt = 0
    $devServerReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $devServerReady) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 1 -ErrorAction Stop
            $devServerReady = $true
        } catch {
            $attempt++
        }
    }
    
    if ($devServerReady) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " TIMEOUT" -ForegroundColor Yellow
        Write-Host "      Dev server may still be starting. Check the new window." -ForegroundColor Yellow
    }
}

# Final status
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Status Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check services one more time
Write-Host "Ollama:     " -NoNewline
try {
    Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 1 -ErrorAction Stop | Out-Null
    Write-Host "RUNNING" -ForegroundColor Green
} catch {
    Write-Host "NOT RESPONDING" -ForegroundColor Red
}

Write-Host "Dev Server: " -NoNewline
try {
    Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 1 -ErrorAction Stop | Out-Null
    Write-Host "RUNNING" -ForegroundColor Green
} catch {
    Write-Host "NOT RESPONDING" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verify services are running (see status above)"
Write-Host "2. Run tests with this command:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   npx playwright test component-design-analysis" -ForegroundColor White
Write-Host ""
Write-Host "Windows opened:"
Write-Host "  - Terminal with Ollama service (keep open)"
Write-Host "  - Terminal with dev server (keep open)"
Write-Host ""
