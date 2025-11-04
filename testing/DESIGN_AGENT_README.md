# 🎨 Design Agent - Automated Design System Audit

## What is the Design Agent?

The Design Agent uses **Playwright as an intelligent design assistant** that automatically audits your website for:

- ✅ Color consistency
- ✅ Typography consistency  
- ✅ Spacing patterns
- ✅ Accessibility (WCAG 2.1)
- ✅ Responsive design
- ✅ Animation performance
- ✅ Component styling
- ✅ Visual regression

Think of it as having an AI design reviewer that checks your site automatically!

---

## 🚀 Quick Start

### Run All Design Audits
```bash
npm run dev  # Start dev server in one terminal

# In another terminal:
npx playwright test design-agent.spec.ts
```

### Run Specific Audit
```bash
# Color audit only
npx playwright test design-agent.spec.ts -g "Color consistency"

# Typography audit only
npx playwright test design-agent.spec.ts -g "Typography consistency"

# Accessibility audit only
npx playwright test design-agent.spec.ts -g "Accessibility"

# Responsive design audit
npx playwright test design-agent.spec.ts -g "Responsive design"
```

### Run with UI (see visual feedback)
```bash
npx playwright test design-agent.spec.ts --headed
```

---

## 📊 What Each Audit Does

### 1. **Color Consistency Audit** 🎨
**What it checks:**
- Total unique colors used
- Most frequently used colors
- Consistency with design tokens

**Output Example:**
```
📊 Color usage analysis:
   Total unique colors found: 15
   ✅ Good color discipline! (< 20 colors)
   Top 5 colors:
     1. rgb(249, 249, 249) (used 45 times)
     2. rgb(59, 130, 246) (used 32 times)
```

**Why it matters:**
- Too many colors = inconsistent design
- Design systems should use 10-20 colors max

---

### 2. **Typography Consistency Audit** 📝
**What it checks:**
- Font families used
- Font sizes distribution
- Font weights usage
- Matches with design system (Montserrat)

**Output Example:**
```
📊 Typography analysis:
   Font families used: 2
     - Montserrat: 145 elements
   ✅ Using Montserrat (design system font)
   Top 5 font sizes:
     1. 16px (67 times)
     2. 14px (45 times)
```

**Why it matters:**
- Consistent typography = professional look
- Too many font sizes = visual noise

---

### 3. **Accessibility (WCAG) Audit** ♿
**What it checks:**
- Color contrast ratios (WCAG AA = 4.5:1)
- Alt text on images
- ARIA labels on buttons
- Keyboard navigation

**Output Example:**
```
📊 Accessibility analysis:
   Elements checked: 234
   Contrast issues found: 2
   ⚠️ Contrast issues detected:
     - button.text-muted: ratio 3.2:1 (needs 4.5:1)
   ✅ All images have alt text
```

**Why it matters:**
- Legal requirement (ADA compliance)
- 15% of users have accessibility needs
- Better SEO

---

### 4. **Responsive Design Audit** 📱
**What it checks:**
- Mobile (375px), Tablet (768px), Desktop (1440px)
- Horizontal scroll issues
- Touch target sizes (44x44px minimum)
- Content visibility

**Output Example:**
```
Testing Mobile (375x667):
  ✅ No horizontal scroll
  ✅ Main content visible
  ⚠️ 3 buttons below 44x44px tap target
```

**Why it matters:**
- 60%+ traffic is mobile
- Poor mobile UX = lost users

---

### 5. **Animation Performance Audit** ⚡
**What it checks:**
- GPU-accelerated animations (transform/opacity)
- Animation durations (should be < 1s)
- Performance-heavy animations

**Output Example:**
```
📊 Animation analysis:
   Animated elements: 23
   Using GPU-accelerated transforms: 18
   Other animations: 5
   ✅ Good use of GPU-accelerated animations
```

**Why it matters:**
- Non-optimized animations = janky scrolling
- GPU animations = 60fps smooth

---

### 6. **Spacing Consistency Audit** 📏
**What it checks:**
- Unique margin/padding values
- Usage of consistent spacing scale (4px/8px)
- Most common spacing values

**Output Example:**
```
📊 Spacing analysis:
   Unique margin values: 18
   Top 5 margins:
     1. 16px (45 times)
     2. 24px (32 times)
   ✅ Using consistent 4px/8px spacing scale
```

**Why it matters:**
- Consistent spacing = visual rhythm
- Random spacing = unprofessional

---

### 7. **Visual Regression Check** 📸
**What it does:**
- Takes full-page screenshots of key pages
- Saves to `testing/screenshots/`
- Use for manual comparison or with Percy/Chromatic

**Output:**
```
Capturing Home...
✅ Home screenshot saved
Capturing Sanctuary...
✅ Sanctuary screenshot saved
```

**Why it matters:**
- Catch unintended visual changes
- Before/after comparisons

---

### 8. **Component Audit (Solin Voice Agent)** 🎯
**What it checks:**
- Component exists and is visible
- Styling matches design specs
- Animations present
- Accessibility labels

**Output Example:**
```
✅ Solin orb found
   Width: 160px
   Height: 160px
   ✅ Orb is square (width = height)
   ✅ Orb has animations/transitions
   ✅ Has aria-label: "Start conversation with Solin"
```

---

## 🎯 How to Use Results

### ✅ Green checks = Good!
No action needed, design is consistent.

### ⚠️ Yellow warnings = Review
Not critical, but consider improving:
- Too many colors → consolidate to design tokens
- Missing ARIA labels → add for accessibility
- Small tap targets → increase to 44x44px

### ❌ Red errors = Fix
Critical issues that need attention:
- Contrast failures → must fix for accessibility
- Horizontal scroll → breaks mobile UX

---

## 🔧 Customizing the Design Agent

### Update Design Tokens
Edit `design-agent.spec.ts` line 20-40:

```typescript
const DESIGN_TOKENS = {
  colors: {
    primary: 'rgb(59, 130, 246)', // Your primary color
    // ... add your colors
  },
  typography: {
    fonts: ['Montserrat', 'sans-serif'], // Your fonts
    // ... add your sizes
  }
};
```

### Add New Audits
Create a new test in `design-agent.spec.ts`:

```typescript
test('Design Agent 9: Your custom audit', async ({ page }) => {
  console.log('🎯 DESIGN AGENT: Your audit name...');
  
  await page.goto('http://localhost:8080/');
  
  // Your audit logic using page.evaluate()
  const analysis = await page.evaluate(() => {
    // Browser context code
    return { result: 'your data' };
  });
  
  console.log('📊 Your analysis:', analysis);
});
```

---

## 📚 Advanced Usage

### Generate HTML Report
```bash
npx playwright test design-agent.spec.ts --reporter=html
```

View report:
```bash
npx playwright show-report
```

### Run on CI/CD
Add to GitHub Actions:

```yaml
- name: Run Design Agent
  run: |
    npm run dev &
    sleep 5
    npx playwright test design-agent.spec.ts
```

### Compare with Percy (Visual Regression Service)
```bash
npm install @percy/cli @percy/playwright
export PERCY_TOKEN=your_token
npx percy exec -- playwright test design-agent.spec.ts
```

---

## 🎨 Design Agent vs Manual Review

### Manual Design Review
- ❌ Time-consuming (hours)
- ❌ Subjective
- ❌ Easy to miss issues
- ❌ Not repeatable

### Design Agent (Automated)
- ✅ Fast (minutes)
- ✅ Objective (data-driven)
- ✅ Catches everything
- ✅ Run on every commit

---

## 🚨 Common Issues & Fixes

### Issue: "Too many unique colors (35)"
**Fix:** 
1. Review color usage
2. Replace random colors with design tokens
3. Use CSS variables from `index.css`

### Issue: "Contrast ratio 3.1:1 (needs 4.5:1)"
**Fix:**
1. Darken text or lighten background
2. Use contrast checker: https://webaim.org/resources/contrastchecker/
3. Update colors in design system

### Issue: "12 buttons below 44x44px tap target"
**Fix:**
```css
button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 24px;
}
```

---

## 📈 Best Practices

1. **Run before every commit**
   ```bash
   git add .
   npx playwright test design-agent.spec.ts
   git commit -m "Your changes"
   ```

2. **Fix issues in priority order:**
   - 🔴 Accessibility (legal requirement)
   - 🟡 Responsive design (60% of users)
   - 🟢 Consistency (polish)

3. **Track metrics over time:**
   - Unique colors: Goal < 20
   - Font sizes: Goal < 12
   - Contrast issues: Goal = 0
   - Animation count: Goal < 30

4. **Use with component library:**
   - Audit each component individually
   - Create visual regression tests
   - Document expected behavior

---

## 🎓 Learn More

**Playwright Documentation:**
https://playwright.dev/docs/intro

**WCAG Guidelines:**
https://www.w3.org/WAI/WCAG21/quickref/

**Design Systems:**
- https://designsystemsrepo.com/
- https://www.designsystems.com/

**Visual Regression:**
- Percy: https://percy.io/
- Chromatic: https://www.chromatic.com/

---

## 🤝 Contributing

Found a bug or have an idea for a new audit?

1. Add a new test in `design-agent.spec.ts`
2. Update this README
3. Submit a PR!

---

## 💡 Pro Tips

- Run design audits in CI/CD on every PR
- Set up Slack notifications for failures
- Create a "design health score" dashboard
- Use with Storybook for component audits
- Combine with Lighthouse for performance + design

---

**Happy designing!** 🎨✨
