#!/usr/bin/env pwsh
# Automated startup script for component design testing
# This opens Ollama and dev server in separate windows

Write-Host "`n🚀 Starting Component Design Test Environment" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "playwright.config.ts")) {
    Write-Host "❌ Error: playwright.config.ts not found" -ForegroundColor Red
    Write-Host "   Please run this script from the project root directory`n" -ForegroundColor Yellow
    exit 1
}

# Detect which PowerShell to use for new windows
$psCommand = "powershell"
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    $psCommand = "pwsh"
}

# Check if Ollama is installed
Write-Host "1️⃣ Checking Ollama installation..." -NoNewline
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "`n   Ollama not found. Install from: https://ollama.ai/download`n" -ForegroundColor Yellow
    exit 1
}

# Check if Ollama is already running
Write-Host "2️⃣ Checking if Ollama is already running..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 2 -ErrorAction Stop
    Write-Host " ✅ Already running!" -ForegroundColor Green
    $ollamaRunning = $true
} catch {
    Write-Host " Not running" -ForegroundColor Yellow
    $ollamaRunning = $false
}

# Start Ollama if not running
if (-not $ollamaRunning) {
    Write-Host "   Starting Ollama in new window..."
    Start-Process $psCommand -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '🤖 Ollama Service' -ForegroundColor Cyan; Write-Host '=================' -ForegroundColor Cyan; Write-Host ''; ollama serve"
    
    # Wait for Ollama to start
    Write-Host "   Waiting for Ollama to start" -NoNewline
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
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️ Timeout" -ForegroundColor Yellow
        Write-Host "   Ollama may still be starting. Check the new terminal window.`n"
    }
}

# Check if llama3.2 model is installed
Write-Host "3️⃣ Checking llama3.2 model..." -NoNewline
$modelList = ollama list 2>&1 | Out-String
if ($modelList -match "llama3\.2") {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "`n   llama3.2 model not found" -ForegroundColor Yellow
    Write-Host "   Downloading now (this may take a few minutes)...`n" -ForegroundColor Yellow
    ollama pull llama3.2
}

# Check if dev server is already running
Write-Host "4️⃣ Checking if dev server is already running..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction Stop
    Write-Host " ✅ Already running!" -ForegroundColor Green
    $devServerRunning = $true
} catch {
    Write-Host " Not running" -ForegroundColor Yellow
    $devServerRunning = $false
}

# Start dev server if not running
if (-not $devServerRunning) {
    Write-Host "   Starting dev server in new window..."
    Start-Process $psCommand -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '⚡ Dev Server' -ForegroundColor Cyan; Write-Host '=============' -ForegroundColor Cyan; Write-Host ''; npm run dev"
    
    # Wait for dev server to start
    Write-Host "   Waiting for dev server to start" -NoNewline
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
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️ Timeout" -ForegroundColor Yellow
        Write-Host "   Dev server may still be starting. Check the new terminal window.`n"
    }
}

# Run status check
Write-Host "`n5️⃣ Running comprehensive status check...`n"
Start-Sleep -Seconds 2

if (Test-Path ".\check-ollama.ps1") {
    & .\check-ollama.ps1
} else {
    Write-Host "⚠️ check-ollama.ps1 not found, skipping detailed check`n" -ForegroundColor Yellow
}

# Final instructions
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "✅ Environment Ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "`nWindows opened:" -ForegroundColor Yellow
Write-Host "  📂 Terminal 1: Ollama Service (keep open)"
Write-Host "  📂 Terminal 2: Dev Server (keep open)"
Write-Host "  📂 Terminal 3: This window (for running tests)"
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Verify both services are running in their windows"
Write-Host "  2. Run tests with: " -NoNewline
Write-Host "npx playwright test component-design-analysis" -ForegroundColor White
Write-Host "`nFor detailed instructions, see TERMINAL_SETUP_GUIDE.md`n"
