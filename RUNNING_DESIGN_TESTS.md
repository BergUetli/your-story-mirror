# Running Design Analysis Tests

## 🚨 Getting "No tests found" Error?

**First, run the diagnostic script:**
```powershell
# Pull latest changes
git pull origin main

# Run diagnostic (this will tell you exactly what's wrong)
.\diagnose-playwright.ps1
```

The diagnostic will:
- ✅ Check if test files exist
- ✅ Validate Playwright configuration
- ✅ Test different command variations
- ✅ Check Ollama setup
- ✅ Tell you the exact command to use

**For detailed Windows setup, see:** `WINDOWS_PLAYWRIGHT_SETUP.md`

---

## Quick Start

Since your `playwright.config.ts` is already configured to look in `./testing/e2e`, you can run tests using just the filename:

### Run ALL Component Design Tests
```powershell
npx playwright test component-design-analysis
```

### Run Specific Component Tests
```powershell
# Timeline Component
npx playwright test component-design-analysis -g "Timeline Component"

# Archive Component
npx playwright test component-design-analysis -g "Archive Component"

# Sanctuary/Voice Agent
npx playwright test component-design-analysis -g "Sanctuary"

# Dashboard Component
npx playwright test component-design-analysis -g "Dashboard Component"

# Navigation/Sidebar
npx playwright test component-design-analysis -g "Navigation"

# Memory Card Component
npx playwright test component-design-analysis -g "Memory Card"

# Complete Design System
npx playwright test component-design-analysis -g "Complete Design System"
```

### Alternative: Use Full Path (if above doesn't work)
```powershell
npx playwright test testing/e2e/component-design-analysis.spec.ts
```

## Before Running Tests

### 1. Ensure Ollama is Running
```powershell
# Check if Ollama is running
ollama list

# If not running, start it
ollama serve

# In a new terminal, ensure llama3.2 model is downloaded
ollama pull llama3.2
```

### 2. Ensure Dev Server is Running
```powershell
# The tests need your app running at http://localhost:8080
npm run dev
```

### 3. Ensure Authentication State Exists
```powershell
# You've already done this with global-setup
# Just verify the file exists
dir .auth\user.json
```

## What Each Test Does

### Timeline Component Test
- **Navigates to:** `/timeline`
- **Analyzes:** Memory cards, grid layout, typography, date formatting
- **Compares to:** Apple Photos, Google Photos, Day One
- **Outputs:** `testing/design-suggestions/components/timeline-improvements-[date].md`
- **Focus:** Making memories feel precious and important

### Archive Component Test
- **Navigates to:** `/archive`
- **Analyzes:** Recording list, audio player, organization
- **Compares to:** Spotify, Apple Music, Voice Memos
- **Outputs:** `testing/design-suggestions/components/archive-improvements-[date].md`
- **Focus:** Professional audio library design

### Sanctuary/Voice Agent Test
- **Navigates to:** `/sanctuary`
- **Analyzes:** Solin orb, animations, voice states, UI controls
- **Compares to:** Siri, Google Assistant, Alexa
- **Outputs:** `testing/design-suggestions/components/sanctuary-improvements-[date].md`
- **Focus:** Premium voice assistant experience

### Dashboard Component Test
- **Navigates to:** `/dashboard`
- **Analyzes:** Metrics cards, data visualization, grid layout
- **Compares to:** Notion, Linear, Apple Health
- **Outputs:** `testing/design-suggestions/components/dashboard-improvements-[date].md`
- **Focus:** Clean, informative dashboard design

### Navigation/Sidebar Test
- **Navigates to:** Multiple pages to test navigation
- **Analyzes:** Sidebar, nav items, mobile menu, active states
- **Compares to:** Linear, Notion, Figma, VS Code
- **Outputs:** `testing/design-suggestions/components/navigation-improvements-[date].md`
- **Focus:** Intuitive navigation experience

### Memory Card Component Test
- **Navigates to:** `/timeline` (to see individual cards)
- **Analyzes:** Card design, hover states, image treatment, spacing
- **Compares to:** Apple Photos, Google Photos, Pinterest
- **Outputs:** `testing/design-suggestions/components/memory-card-improvements-[date].md`
- **Focus:** Beautiful, respectful memory presentation

### Complete Design System Test
- **Navigates to:** All pages (Dashboard, Timeline, Archive, Sanctuary)
- **Analyzes:** Overall color palette, typography scale, spacing system
- **Outputs:** `testing/design-suggestions/components/complete-design-system-[date].md`
- **Focus:** Cohesive design system with implementation roadmap

## Expected Output

Each test creates a markdown file in `testing/design-suggestions/components/` with:
- ✅ Assessment of current design
- 🎨 Specific CSS improvements with code examples
- 📐 Layout and spacing recommendations
- 🎯 Typography improvements
- ✨ Visual enhancements (animations, hover states)
- 📱 Mobile responsiveness suggestions
- 🔄 Before/after comparisons

## Troubleshooting

### "Error: No tests found"
**Solution:** Use the filename without path:
```powershell
npx playwright test component-design-analysis
```

### "Cannot connect to Ollama"
**Solution:** Start Ollama service:
```powershell
ollama serve
```

### "Timeout waiting for http://localhost:8080"
**Solution:** Start dev server in a separate terminal:
```powershell
npm run dev
```

### "storageState file not found: .auth/user.json"
**Solution:** Run global setup:
```powershell
npx playwright test --project=setup
```

### Tests Run But Generate Empty Output
**Solution:** Check Ollama logs:
```powershell
# See what Ollama is receiving
ollama list
ollama run llama3.2 "Test prompt"
```

## After Tests Complete

1. **Review Generated Markdown Files:**
   - Located in `testing/design-suggestions/components/`
   - Each file has specific CSS improvements for that component
   - Includes before/after code examples

2. **Implement Suggestions:**
   - Start with highest priority items (colors, typography)
   - Test changes locally before deploying
   - Can run tests again after changes to compare

3. **Re-run Tests After Changes:**
   - See if Ollama notices improvements
   - Generate new suggestions for iteration

## Notes

- Tests run **sequentially** (not in parallel) for consistency
- Each test takes screenshots for visual reference
- Screenshots saved in `testing/screenshots/`
- Ollama uses **llama3.2** model by default
- If Ollama fails, tests will generate rule-based suggestions as fallback
