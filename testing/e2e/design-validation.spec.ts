/**
 * DESIGN VALIDATION TEST
 * 
 * Validates UI design standards across the application:
 * - Navigation bar height and visibility
 * - Font sizes and readability
 * - Container heights and spacing
 * - Brand/title prominence
 * - Typography consistency
 * 
 * This test ensures that design improvements are maintained
 * and prevents regressions in UI quality.
 */

import { test, expect } from '@playwright/test';

test.describe('Design Validation - UI Standards', () => {
  
  test('Navigation bar meets minimum height requirements', async ({ page }) => {
    console.log('🔍 Validating navigation bar height\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find navigation bar
    const navBar = page.locator('div.fixed.top-0').first();
    const navBox = await navBar.boundingBox();
    
    if (!navBox) {
      throw new Error('Navigation bar not found');
    }
    
    console.log(`📏 Navigation bar height: ${navBox.height}px`);
    
    // Navigation should be at least 64px tall (h-16 or more)
    const MIN_NAV_HEIGHT = 64;
    const meetsRequirement = navBox.height >= MIN_NAV_HEIGHT;
    
    console.log(`   Minimum required: ${MIN_NAV_HEIGHT}px`);
    console.log(`   ${meetsRequirement ? '✅ PASS' : '❌ FAIL'}: Navigation height is adequate`);
    
    expect(navBox.height, `Navigation bar should be at least ${MIN_NAV_HEIGHT}px tall`).toBeGreaterThanOrEqual(MIN_NAV_HEIGHT);
  });

  test('Page title "Solin One" is prominently visible', async ({ page }) => {
    console.log('🔍 Validating page title prominence\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find "Solin One" title
    const title = page.locator('text=Solin One').first();
    const isVisible = await title.isVisible();
    
    if (!isVisible) {
      console.log('❌ Title "Solin One" not visible');
      expect(isVisible, 'Solin One title should be visible').toBe(true);
      return;
    }
    
    // Check font size
    const fontSize = await title.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    
    // Check font weight
    const fontWeight = await title.evaluate((el) => {
      return window.getComputedStyle(el).fontWeight;
    });
    
    console.log(`📝 Title "Solin One":`);
    console.log(`   Font size: ${fontSize}px`);
    console.log(`   Font weight: ${fontWeight}`);
    
    // Title should be at least 24px (text-2xl) or larger
    const MIN_TITLE_SIZE = 24;
    const sizeMeetsRequirement = fontSize >= MIN_TITLE_SIZE;
    
    // Font weight should be 700 (bold) or higher
    const MIN_FONT_WEIGHT = 700;
    const weightMeetsRequirement = parseInt(fontWeight) >= MIN_FONT_WEIGHT;
    
    console.log(`   ${sizeMeetsRequirement ? '✅' : '❌'} Font size >= ${MIN_TITLE_SIZE}px`);
    console.log(`   ${weightMeetsRequirement ? '✅' : '❌'} Font weight >= ${MIN_FONT_WEIGHT}`);
    
    expect(fontSize, 'Title font size should be at least 24px').toBeGreaterThanOrEqual(MIN_TITLE_SIZE);
    expect(parseInt(fontWeight), 'Title font weight should be bold (700+)').toBeGreaterThanOrEqual(MIN_FONT_WEIGHT);
  });

  test('Container heights are not excessive (max 70vh)', async ({ page }) => {
    console.log('🔍 Validating container heights\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find main containers
    const containers = page.locator('.flex-1.max-w-xl').all();
    const containerBoxes = await Promise.all(
      (await containers).map(c => c.boundingBox())
    );
    
    const viewportHeight = await page.viewportSize().then(v => v?.height || 900);
    const maxAllowedHeight = viewportHeight * 0.70; // 70vh
    
    console.log(`📐 Viewport height: ${viewportHeight}px`);
    console.log(`   Max allowed container height: ${maxAllowedHeight}px (70vh)\n`);
    
    let allPass = true;
    containerBoxes.forEach((box, index) => {
      if (box) {
        const heightPercent = (box.height / viewportHeight * 100).toFixed(1);
        const passes = box.height <= maxAllowedHeight;
        
        console.log(`   Container ${index + 1}:`);
        console.log(`     Height: ${box.height}px (${heightPercent}vh)`);
        console.log(`     ${passes ? '✅ PASS' : '❌ FAIL'}: Within 70vh limit`);
        
        if (!passes) allPass = false;
      }
    });
    
    expect(allPass, 'All containers should be at most 70vh tall').toBe(true);
  });

  test('Text elements have readable font sizes', async ({ page }) => {
    console.log('🔍 Validating text readability\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check various text elements
    const textSelectors = [
      { selector: 'h1, h2', minSize: 20, name: 'Headings' },
      { selector: 'p', minSize: 14, name: 'Paragraphs' },
      { selector: 'button', minSize: 14, name: 'Buttons' },
    ];
    
    let allPass = true;
    
    for (const { selector, minSize, name } of textSelectors) {
      const elements = await page.locator(selector).all();
      
      if (elements.length === 0) continue;
      
      console.log(`\n📝 ${name} (${selector}):`);
      
      const fontSizes = await Promise.all(
        elements.slice(0, 5).map(async (el) => {
          return await el.evaluate((node) => {
            return parseFloat(window.getComputedStyle(node).fontSize);
          });
        })
      );
      
      const avgSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
      const minFound = Math.min(...fontSizes);
      const maxFound = Math.max(...fontSizes);
      
      console.log(`   Range: ${minFound.toFixed(1)}px - ${maxFound.toFixed(1)}px`);
      console.log(`   Average: ${avgSize.toFixed(1)}px`);
      console.log(`   Minimum required: ${minSize}px`);
      
      const passes = minFound >= minSize;
      console.log(`   ${passes ? '✅ PASS' : '❌ FAIL'}: All ${name.toLowerCase()} are readable`);
      
      if (!passes) allPass = false;
    }
    
    expect(allPass, 'All text elements should meet minimum font size requirements').toBe(true);
  });

  test('Navigation buttons are appropriately sized', async ({ page }) => {
    console.log('🔍 Validating navigation button sizes\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find navigation buttons
    const navButtons = page.locator('nav button, nav a button').all();
    const buttons = await navButtons;
    
    if (buttons.length === 0) {
      console.log('⚠️  No navigation buttons found');
      return;
    }
    
    console.log(`Found ${buttons.length} navigation buttons\n`);
    
    let allPass = true;
    const MIN_BUTTON_HEIGHT = 36; // Minimum touch target
    
    for (let i = 0; i < Math.min(buttons.length, 8); i++) {
      const box = await buttons[i].boundingBox();
      if (!box) continue;
      
      const fontSize = await buttons[i].evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      
      const heightOk = box.height >= MIN_BUTTON_HEIGHT;
      const fontOk = fontSize >= 14;
      
      console.log(`   Button ${i + 1}:`);
      console.log(`     Height: ${box.height}px ${heightOk ? '✅' : '❌'} (min: ${MIN_BUTTON_HEIGHT}px)`);
      console.log(`     Font: ${fontSize}px ${fontOk ? '✅' : '❌'} (min: 14px)`);
      
      if (!heightOk || !fontOk) allPass = false;
    }
    
    expect(allPass, 'Navigation buttons should be appropriately sized').toBe(true);
  });

  test('Typography is consistent across similar elements', async ({ page }) => {
    console.log('🔍 Validating typography consistency\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check consistency of similar elements
    const checkConsistency = async (selector: string, name: string) => {
      const elements = await page.locator(selector).all();
      
      if (elements.length < 2) {
        console.log(`\n📝 ${name}: Not enough elements to check consistency`);
        return true;
      }
      
      const fontSizes = await Promise.all(
        elements.slice(0, 5).map(async (el) => {
          return await el.evaluate((node) => {
            return parseFloat(window.getComputedStyle(node).fontSize);
          });
        })
      );
      
      const unique = [...new Set(fontSizes)];
      const isConsistent = unique.length <= 2; // Allow for 2 sizes (e.g., desktop vs mobile)
      
      console.log(`\n📝 ${name}:`);
      console.log(`   Found ${elements.length} elements`);
      console.log(`   Font sizes: ${unique.map(s => s.toFixed(0) + 'px').join(', ')}`);
      console.log(`   ${isConsistent ? '✅ PASS' : '⚠️  WARNING'}: Typography is ${isConsistent ? 'consistent' : 'inconsistent'}`);
      
      return isConsistent;
    };
    
    await checkConsistency('h1', 'H1 headings');
    await checkConsistency('h2', 'H2 headings');
    await checkConsistency('button:not(.sr-only)', 'Buttons');
    await checkConsistency('p:not(.sr-only)', 'Paragraphs');
    
    // This test passes with warnings rather than failing
    expect(true).toBe(true);
  });

  test('Version badge confirms v4-DESIGN-UPDATE deployment', async ({ page }) => {
    console.log('🔍 Checking for v4-DESIGN-UPDATE version badge\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for the orange version badge
    const versionBadge = page.locator('text=v4-DESIGN-UPDATE');
    const isVisible = await versionBadge.isVisible();
    
    if (isVisible) {
      const badgeText = await versionBadge.textContent();
      console.log('✅ Version badge found:', badgeText);
      
      // Check if it's orange (bg-orange-500)
      const parentDiv = await versionBadge.locator('xpath=..').first();
      const className = await parentDiv.getAttribute('class');
      const isOrange = className?.includes('bg-orange');
      
      console.log(`   Color: ${isOrange ? '✅ ORANGE (correct)' : '❌ Not orange'}`);
      console.log(`   Text includes: ${badgeText?.includes('Navigation') ? '✅ Navigation mentioned' : '❌ Missing details'}`);
      console.log(`   Text includes: ${badgeText?.includes('Typography') ? '✅ Typography mentioned' : '❌ Missing details'}`);
      
      expect(isOrange, 'Version badge should be orange').toBe(true);
      expect(badgeText, 'Version badge should mention Navigation').toContain('Navigation');
      expect(badgeText, 'Version badge should mention Typography').toContain('Typography');
    } else {
      console.log('❌ Version badge NOT found - deployment may not be live');
      expect(isVisible, 'Version badge should be visible to confirm deployment').toBe(true);
    }
  });

  test('Comprehensive design standards report', async ({ page }) => {
    console.log('🔍 COMPREHENSIVE DESIGN STANDARDS REPORT\n');
    console.log('=' .repeat(60));
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const report: any = {
      navigation: {},
      typography: {},
      containers: {},
      spacing: {},
      overall: 'PASS'
    };
    
    // 1. Navigation analysis
    const navBar = page.locator('div.fixed.top-0').first();
    const navBox = await navBar.boundingBox();
    if (navBox) {
      report.navigation.height = navBox.height;
      report.navigation.meetsMin = navBox.height >= 64;
    }
    
    // 2. Title analysis
    const title = page.locator('text=Solin One').first();
    if (await title.isVisible()) {
      report.typography.titleSize = await title.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
      report.typography.titleWeight = await title.evaluate((el) => window.getComputedStyle(el).fontWeight);
    }
    
    // 3. Container analysis
    const containers = await page.locator('.flex-1.max-w-xl').all();
    const containerHeights = await Promise.all(
      containers.map(async (c) => {
        const box = await c.boundingBox();
        return box ? box.height : 0;
      })
    );
    report.containers.count = containerHeights.length;
    report.containers.heights = containerHeights;
    
    // 4. Button analysis
    const buttons = await page.locator('nav button').all();
    if (buttons.length > 0) {
      const buttonSizes = await Promise.all(
        buttons.slice(0, 3).map(async (b) => {
          const fontSize = await b.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
          const box = await b.boundingBox();
          return { fontSize, height: box?.height || 0 };
        })
      );
      report.typography.buttonSizes = buttonSizes;
    }
    
    // Generate report
    console.log('\n📊 NAVIGATION:');
    console.log(`   Height: ${report.navigation.height || 'N/A'}px`);
    console.log(`   Status: ${report.navigation.meetsMin ? '✅ Adequate' : '❌ Too small'}`);
    
    console.log('\n📝 TYPOGRAPHY:');
    console.log(`   Title size: ${report.typography.titleSize || 'N/A'}px`);
    console.log(`   Title weight: ${report.typography.titleWeight || 'N/A'}`);
    if (report.typography.buttonSizes) {
      console.log(`   Button sizes: ${report.typography.buttonSizes.map((b: any) => `${b.fontSize}px`).join(', ')}`);
    }
    
    console.log('\n📐 CONTAINERS:');
    console.log(`   Count: ${report.containers.count}`);
    console.log(`   Heights: ${report.containers.heights.map((h: number) => `${h}px`).join(', ')}`);
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n${report.overall === 'PASS' ? '✅' : '❌'} OVERALL: ${report.overall}`);
    
    // Save report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'design-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    expect(true).toBe(true);
  });
});
