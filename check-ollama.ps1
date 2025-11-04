#!/usr/bin/env pwsh
# Quick Ollama status checker
# Run this before starting design tests

Write-Host "`n🔍 Ollama Status Check" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# 1. Check if installed
Write-Host "1. Installation: " -NoNewline
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $version = ollama --version 2>&1
    Write-Host "✅ $version" -ForegroundColor Green
} else {
    Write-Host "❌ Not installed" -ForegroundColor Red
    Write-Host "`n   Install from: https://ollama.ai/download`n" -ForegroundColor Yellow
    exit 1
}

# 2. Check if running
Write-Host "2. Service Status: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Running (port 11434 responding)" -ForegroundColor Green
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
    Write-Host "`n   💡 Start Ollama in a new terminal:" -ForegroundColor Yellow
    Write-Host "      ollama serve`n" -ForegroundColor White
    exit 1
}

# 3. Check for running process
Write-Host "3. Process Check: " -NoNewline
$ollamaProcess = Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}
if ($ollamaProcess) {
    Write-Host "✅ Found running process (PID: $($ollamaProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️ No ollama process found" -ForegroundColor Yellow
}

# 4. Check installed models
Write-Host "`n4. Installed Models:" -ForegroundColor Cyan
try {
    $modelOutput = ollama list 2>&1 | Out-String
    
    if ($modelOutput -match "llama3\.2") {
        Write-Host "   ✅ llama3.2 (required for design tests)" -ForegroundColor Green
        
        # Extract model size
        if ($modelOutput -match "llama3\.2.*?(\d+\.?\d*\s*[GM]B)") {
            Write-Host "   📊 Size: $($matches[1])" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ llama3.2 not found" -ForegroundColor Red
        Write-Host "`n   💡 Download the model:" -ForegroundColor Yellow
        Write-Host "      ollama pull llama3.2`n" -ForegroundColor White
        
        Write-Host "   Available models:" -ForegroundColor Gray
        Write-Host "   $modelOutput" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   ❌ Could not list models" -ForegroundColor Red
}

# 5. Test API endpoint
Write-Host "`n5. API Test: " -NoNewline
try {
    $apiTest = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 -ErrorAction Stop
    $apiData = $apiTest.Content | ConvertFrom-Json
    Write-Host "✅ API responding ($($apiData.models.Count) models available)" -ForegroundColor Green
} catch {
    Write-Host "❌ API not responding" -ForegroundColor Red
}

# 6. Test inference (quick test)
Write-Host "`n6. Inference Test: " -NoNewline
Write-Host "(Testing with simple prompt...)" -ForegroundColor Gray

try {
    $testStart = Get-Date
    $testResult = ollama run llama3.2 "Say 'OK' and nothing else" 2>&1 | Out-String
    $testEnd = Get-Date
    $duration = ($testEnd - $testStart).TotalSeconds
    
    if ($testResult -match "OK|ok") {
        Write-Host "   ✅ Inference working (took $([math]::Round($duration, 1))s)" -ForegroundColor Green
        Write-Host "   📝 Response: $($testResult.Trim())" -ForegroundColor DarkGray
    } else {
        Write-Host "   ⚠️ Got response but unexpected content" -ForegroundColor Yellow
        Write-Host "   📝 Response: $($testResult.Trim())" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   ❌ Inference test failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Ollama is ready for design tests!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure dev server is running: " -NoNewline; Write-Host "npm run dev" -ForegroundColor White
Write-Host "  2. Run design tests: " -NoNewline; Write-Host "npx playwright test component-design-analysis" -ForegroundColor White
Write-Host ""
