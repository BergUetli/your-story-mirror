@echo off
REM Quick launcher for component design tests
REM This checks prerequisites and runs tests automatically

echo.
echo ========================================
echo Component Design Testing - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "playwright.config.ts" (
    echo [ERROR] playwright.config.ts not found
    echo Please run this from the project root directory
    echo.
    pause
    exit /b 1
)

REM Check if test file exists
if not exist "testing\e2e\component-design-analysis.spec.ts" (
    echo [ERROR] Test file not found
    echo Running: git pull origin main
    echo.
    git pull origin main
    echo.
    if not exist "testing\e2e\component-design-analysis.spec.ts" (
        echo [ERROR] Still can't find test file after git pull
        echo Please check your git status
        pause
        exit /b 1
    )
)

echo [1/5] Checking Ollama...
where ollama >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama not found in PATH
    echo Please install from: https://ollama.ai
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    echo       Ollama is installed
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama service not responding
    echo Please start it in another terminal: ollama serve
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    echo       Ollama service is running
)

echo.
echo [2/5] Checking dev server...
curl -s http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Dev server not running at http://localhost:8080
    echo Please start it in another terminal: npm run dev
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    echo       Dev server is running
)

echo.
echo [3/5] Checking Playwright installation...
if not exist "node_modules\@playwright\test" (
    echo [INFO] Installing Playwright...
    call npm install
)
echo       Playwright is installed

echo.
echo [4/5] Checking Playwright browsers...
if not exist "%USERPROFILE%\AppData\Local\ms-playwright\chromium-*" (
    echo [INFO] Installing Chromium browser...
    call npx playwright install chromium
)
echo       Browsers are installed

echo.
echo [5/5] Running component design tests...
echo.
echo This will take 5-8 minutes. Please wait...
echo.

REM Run the tests
call npx playwright test component-design-analysis

echo.
echo ========================================
echo Tests Complete!
echo ========================================
echo.
echo Check results in: testing\design-suggestions\components\
echo.
echo Generated files:
dir /B testing\design-suggestions\components\*improvements*.md 2>nul
echo.

pause
