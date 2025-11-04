# Quick status checker without emojis

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Service Status Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Ollama
Write-Host "1. Ollama Service" -ForegroundColor Yellow
Write-Host "   Installation: " -NoNewline
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $version = ollama --version 2>&1
    Write-Host "OK ($version)" -ForegroundColor Green
} else {
    Write-Host "NOT INSTALLED" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Install from: https://ollama.ai/download" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "   Running:      " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "YES (port 11434)" -ForegroundColor Green
    $ollamaRunning = $true
} catch {
    Write-Host "NO" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Start with: ollama serve" -ForegroundColor Yellow
    $ollamaRunning = $false
}

if ($ollamaRunning) {
    Write-Host "   Model:        " -NoNewline
    $modelList = ollama list 2>&1 | Out-String
    if ($modelList -match "llama3\.2") {
        Write-Host "llama3.2 installed" -ForegroundColor Green
    } else {
        Write-Host "llama3.2 NOT FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Download with: ollama pull llama3.2" -ForegroundColor Yellow
    }
}

Write-Host ""

# Check dev server
Write-Host "2. Dev Server" -ForegroundColor Yellow
Write-Host "   Running:      " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "YES (http://localhost:8080)" -ForegroundColor Green
} catch {
    Write-Host "NO" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Start with: npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Check Playwright
Write-Host "3. Playwright Tests" -ForegroundColor Yellow
Write-Host "   Installation: " -NoNewline
if (Test-Path "node_modules\@playwright\test") {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "NOT INSTALLED" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Install with: npm install" -ForegroundColor Yellow
}

Write-Host "   Test file:    " -NoNewline
if (Test-Path "testing\e2e\component-design-analysis.spec.ts") {
    Write-Host "FOUND" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Pull latest code: git pull origin main" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

if (-not $ollamaRunning) {
    Write-Host "[!] Ollama is not running" -ForegroundColor Red
    Write-Host "    Run: ollama serve" -ForegroundColor Yellow
    Write-Host ""
    $allGood = $false
}

try {
    Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 1 -ErrorAction Stop | Out-Null
} catch {
    Write-Host "[!] Dev server is not running" -ForegroundColor Red
    Write-Host "    Run: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    $allGood = $false
}

if ($allGood) {
    Write-Host "[OK] All services are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to run tests:" -ForegroundColor Yellow
    Write-Host "  npx playwright test component-design-analysis" -ForegroundColor White
    Write-Host ""
}
