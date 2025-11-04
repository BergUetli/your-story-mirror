# Playwright Diagnostic Script for Windows
# Run this to diagnose why tests aren't being found

Write-Host "🔍 Playwright Test Discovery Diagnostic" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Check current directory
Write-Host "1️⃣ Current Directory:" -ForegroundColor Yellow
Write-Host "   $PWD`n"

# 2. Check if test file exists
Write-Host "2️⃣ Checking for component-design-analysis.spec.ts:" -ForegroundColor Yellow
$testFile = "testing\e2e\component-design-analysis.spec.ts"
if (Test-Path $testFile) {
    $fileInfo = Get-Item $testFile
    Write-Host "   ✅ FOUND: $($fileInfo.FullName)" -ForegroundColor Green
    Write-Host "   📊 Size: $([math]::Round($fileInfo.Length/1KB, 2)) KB"
    Write-Host "   📅 Modified: $($fileInfo.LastWriteTime)`n"
} else {
    Write-Host "   ❌ NOT FOUND: $testFile" -ForegroundColor Red
    Write-Host "   💡 Solution: Run 'git pull origin main'`n"
    exit 1
}

# 3. Check playwright.config.ts
Write-Host "3️⃣ Checking Playwright Configuration:" -ForegroundColor Yellow
if (Test-Path "playwright.config.ts") {
    Write-Host "   ✅ playwright.config.ts exists" -ForegroundColor Green
    $configContent = Get-Content "playwright.config.ts" -Raw
    if ($configContent -match "testDir:\s*['""]\.\/testing\/e2e['""]") {
        Write-Host "   ✅ testDir is set to './testing/e2e'" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ testDir might not be configured correctly" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "   ❌ playwright.config.ts not found`n" -ForegroundColor Red
}

# 4. Check if node_modules/@playwright exists
Write-Host "4️⃣ Checking Playwright Installation:" -ForegroundColor Yellow
if (Test-Path "node_modules\@playwright\test") {
    Write-Host "   ✅ Playwright is installed`n" -ForegroundColor Green
} else {
    Write-Host "   ❌ Playwright not installed" -ForegroundColor Red
    Write-Host "   💡 Solution: Run 'npm install'`n"
}

# 5. List all test files Playwright can see
Write-Host "5️⃣ Test Files Playwright Can Find:" -ForegroundColor Yellow
Write-Host "   Running: npx playwright test --list | Select-String 'component'`n"
$playwrightTests = npx playwright test --list 2>&1 | Select-String "component" | Select-Object -First 5
if ($playwrightTests) {
    Write-Host "   ✅ Found component tests:" -ForegroundColor Green
    $playwrightTests | ForEach-Object {
        Write-Host "      $_" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "   ❌ No component tests found by Playwright" -ForegroundColor Red
    Write-Host "   💡 This is the problem!`n"
}

# 6. Test different command variations
Write-Host "6️⃣ Testing Different Command Variations:" -ForegroundColor Yellow

Write-Host "   Testing: npx playwright test component-design-analysis --list"
$test1 = npx playwright test component-design-analysis --list 2>&1 | Select-String "Component Design"
if ($test1) {
    Write-Host "   ✅ This command works!" -ForegroundColor Green
} else {
    Write-Host "   ❌ This command doesn't work" -ForegroundColor Red
}

Write-Host "`n   Testing: npx playwright test component-design-analysis.spec.ts --list"
$test2 = npx playwright test component-design-analysis.spec.ts --list 2>&1 | Select-String "Component Design"
if ($test2) {
    Write-Host "   ✅ This command works!" -ForegroundColor Green
} else {
    Write-Host "   ❌ This command doesn't work" -ForegroundColor Red
}

Write-Host "`n   Testing: npx playwright test testing/e2e/component-design-analysis.spec.ts --list"
$test3 = npx playwright test testing/e2e/component-design-analysis.spec.ts --list 2>&1 | Select-String "Component Design"
if ($test3) {
    Write-Host "   ✅ This command works!" -ForegroundColor Green
} else {
    Write-Host "   ❌ This command doesn't work" -ForegroundColor Red
}

Write-Host ""

# 7. Check Ollama
Write-Host "7️⃣ Checking Ollama Setup:" -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>&1
    Write-Host "   ✅ Ollama installed: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ollama not found in PATH" -ForegroundColor Red
    Write-Host "   💡 Install from: https://ollama.ai`n"
}

# Test Ollama connection
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "   ✅ Ollama service is running on port 11434" -ForegroundColor Green
    
    $models = ($response.Content | ConvertFrom-Json).models
    if ($models.name -contains "llama3.2") {
        Write-Host "   ✅ llama3.2 model is installed`n" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ llama3.2 model not found" -ForegroundColor Yellow
        Write-Host "   💡 Run: ollama pull llama3.2`n"
    }
} catch {
    Write-Host "   ⚠️ Ollama service not responding" -ForegroundColor Yellow
    Write-Host "   💡 Start it with: ollama serve`n"
}

# 8. Summary and recommendation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 SUMMARY & RECOMMENDED COMMAND:" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($test1) {
    Write-Host "✅ Use this command to run tests:" -ForegroundColor Green
    Write-Host "   npx playwright test component-design-analysis`n" -ForegroundColor White
} elseif ($test2) {
    Write-Host "✅ Use this command to run tests:" -ForegroundColor Green
    Write-Host "   npx playwright test component-design-analysis.spec.ts`n" -ForegroundColor White
} elseif ($test3) {
    Write-Host "✅ Use this command to run tests:" -ForegroundColor Green
    Write-Host "   npx playwright test testing/e2e/component-design-analysis.spec.ts`n" -ForegroundColor White
} else {
    Write-Host "❌ None of the commands work!" -ForegroundColor Red
    Write-Host "   Try these steps:" -ForegroundColor Yellow
    Write-Host "   1. git pull origin main"
    Write-Host "   2. npm install"
    Write-Host "   3. npx playwright install chromium"
    Write-Host "   4. Run this diagnostic script again`n"
}

Write-Host "Need help? Check WINDOWS_PLAYWRIGHT_SETUP.md" -ForegroundColor Cyan
