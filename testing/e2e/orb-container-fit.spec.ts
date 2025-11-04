/**
 * ORB CONTAINER FIT TEST
 * 
 * Tests that the Solin orb stays within its container at all zoom levels
 * and viewport sizes. This test addresses the specific issue where the orb
 * was overflowing its container due to viewport-based sizing.
 */

import { test, expect } from '@playwright/test';

test.describe('Solin Orb Container Fit', () => {
  
  test('Orb fits within container at default zoom (100%)', async ({ page }) => {
    console.log('🔍 Testing orb container fit at 100% zoom\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get container and orb dimensions
    const containerBox = await page.locator('.flex-1.max-w-xl').first().boundingBox();
    const orbBox = await page.locator('.pulsing-border-wrapper').boundingBox();
    
    if (!containerBox || !orbBox) {
      throw new Error('Could not find container or orb');
    }
    
    console.log('📦 Container dimensions:', containerBox);
    console.log('⚪ Orb dimensions:', orbBox);
    
    // Check if orb fits within container horizontally
    const leftOverflow = containerBox.x - orbBox.x;
    const rightOverflow = (orbBox.x + orbBox.width) - (containerBox.x + containerBox.width);
    
    console.log(`\n📏 Overflow check:`);
    console.log(`   Left edge: ${leftOverflow > 0 ? '✅ ' + leftOverflow + 'px inside' : '❌ ' + Math.abs(leftOverflow) + 'px OVERFLOW'}`);
    console.log(`   Right edge: ${rightOverflow < 0 ? '✅ ' + Math.abs(rightOverflow) + 'px inside' : '❌ ' + rightOverflow + 'px OVERFLOW'}`);
    
    // Assertions
    expect(leftOverflow, 'Orb should not overflow left edge').toBeGreaterThanOrEqual(-10); // Allow 10px for shadows
    expect(rightOverflow, 'Orb should not overflow right edge').toBeLessThanOrEqual(10); // Allow 10px for shadows
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'testing/screenshots/orb-fit-100zoom.png', fullPage: false });
    console.log('\n📸 Screenshot saved: testing/screenshots/orb-fit-100zoom.png');
  });

  test('Orb fits within container at 150% zoom', async ({ page, context }) => {
    console.log('🔍 Testing orb container fit at 150% zoom\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    
    // Simulate 150% zoom by scaling viewport
    await page.evaluate(() => {
      document.body.style.zoom = '1.5';
    });
    
    await page.waitForTimeout(2000);
    
    const containerBox = await page.locator('.flex-1.max-w-xl').first().boundingBox();
    const orbBox = await page.locator('.pulsing-border-wrapper').boundingBox();
    
    if (!containerBox || !orbBox) {
      throw new Error('Could not find container or orb');
    }
    
    console.log('📦 Container dimensions (150% zoom):', containerBox);
    console.log('⚪ Orb dimensions (150% zoom):', orbBox);
    
    const leftOverflow = containerBox.x - orbBox.x;
    const rightOverflow = (orbBox.x + orbBox.width) - (containerBox.x + containerBox.width);
    
    console.log(`\n📏 Overflow check at 150% zoom:`);
    console.log(`   Left edge: ${leftOverflow > 0 ? '✅ ' + leftOverflow + 'px inside' : '❌ ' + Math.abs(leftOverflow) + 'px OVERFLOW'}`);
    console.log(`   Right edge: ${rightOverflow < 0 ? '✅ ' + Math.abs(rightOverflow) + 'px inside' : '❌ ' + rightOverflow + 'px OVERFLOW'}`);
    
    expect(leftOverflow, 'Orb should not overflow left edge at 150% zoom').toBeGreaterThanOrEqual(-10);
    expect(rightOverflow, 'Orb should not overflow right edge at 150% zoom').toBeLessThanOrEqual(10);
    
    await page.screenshot({ path: 'testing/screenshots/orb-fit-150zoom.png', fullPage: false });
    console.log('\n📸 Screenshot saved: testing/screenshots/orb-fit-150zoom.png');
  });

  test('Orb fits within container at 50% zoom', async ({ page }) => {
    console.log('🔍 Testing orb container fit at 50% zoom\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    
    // Simulate 50% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '0.5';
    });
    
    await page.waitForTimeout(2000);
    
    const containerBox = await page.locator('.flex-1.max-w-xl').first().boundingBox();
    const orbBox = await page.locator('.pulsing-border-wrapper').boundingBox();
    
    if (!containerBox || !orbBox) {
      throw new Error('Could not find container or orb');
    }
    
    console.log('📦 Container dimensions (50% zoom):', containerBox);
    console.log('⚪ Orb dimensions (50% zoom):', orbBox);
    
    const leftOverflow = containerBox.x - orbBox.x;
    const rightOverflow = (orbBox.x + orbBox.width) - (containerBox.x + containerBox.width);
    
    console.log(`\n📏 Overflow check at 50% zoom:`);
    console.log(`   Left edge: ${leftOverflow > 0 ? '✅ ' + leftOverflow + 'px inside' : '❌ ' + Math.abs(leftOverflow) + 'px OVERFLOW'}`);
    console.log(`   Right edge: ${rightOverflow < 0 ? '✅ ' + Math.abs(rightOverflow) + 'px inside' : '❌ ' + rightOverflow + 'px OVERFLOW'}`);
    
    expect(leftOverflow, 'Orb should not overflow left edge at 50% zoom').toBeGreaterThanOrEqual(-10);
    expect(rightOverflow, 'Orb should not overflow right edge at 50% zoom').toBeLessThanOrEqual(10);
    
    await page.screenshot({ path: 'testing/screenshots/orb-fit-50zoom.png', fullPage: false });
    console.log('\n📸 Screenshot saved: testing/screenshots/orb-fit-50zoom.png');
  });

  test('Orb maintains aspect ratio at all sizes', async ({ page }) => {
    console.log('🔍 Testing orb maintains circular aspect ratio\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const orbBox = await page.locator('.pulsing-border-wrapper').boundingBox();
    
    if (!orbBox) {
      throw new Error('Could not find orb');
    }
    
    console.log('⚪ Orb dimensions:', orbBox);
    
    const aspectRatio = orbBox.width / orbBox.height;
    const isCircular = Math.abs(aspectRatio - 1.0) < 0.05; // Allow 5% tolerance
    
    console.log(`\n📐 Aspect ratio check:`);
    console.log(`   Width: ${orbBox.width.toFixed(2)}px`);
    console.log(`   Height: ${orbBox.height.toFixed(2)}px`);
    console.log(`   Ratio: ${aspectRatio.toFixed(3)} ${isCircular ? '✅ CIRCULAR' : '❌ NOT CIRCULAR'}`);
    
    expect(isCircular, 'Orb should maintain 1:1 aspect ratio (circular)').toBe(true);
  });

  test('Version badge confirms v3-ZOOM-FIX deployment', async ({ page }) => {
    console.log('🔍 Checking for v3-ZOOM-FIX version badge\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for the purple version badge
    const versionBadge = page.locator('text=v3-ZOOM-FIX');
    const isVisible = await versionBadge.isVisible();
    
    if (isVisible) {
      const badgeText = await versionBadge.textContent();
      console.log('✅ Version badge found:', badgeText);
      
      // Check if it's purple (bg-purple-600)
      const parentDiv = await versionBadge.locator('xpath=..').first();
      const className = await parentDiv.getAttribute('class');
      const isPurple = className?.includes('bg-purple');
      
      console.log(`   Color: ${isPurple ? '✅ PURPLE (correct)' : '❌ Not purple'}`);
      console.log(`   Text includes: ${badgeText?.includes('85% Container Width') ? '✅ Container width mentioned' : '❌ Missing details'}`);
      
      expect(isPurple, 'Version badge should be purple').toBe(true);
      expect(badgeText, 'Version badge should mention container width').toContain('85% Container Width');
    } else {
      console.log('❌ Version badge NOT found - deployment may not be live');
      expect(isVisible, 'Version badge should be visible to confirm deployment').toBe(true);
    }
  });

  test('Comprehensive zoom level test (50% to 200%)', async ({ page }) => {
    console.log('🔍 Testing orb container fit across all zoom levels\n');
    
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const results: any[] = [];
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    
    for (const zoom of zoomLevels) {
      console.log(`\n📏 Testing at ${(zoom * 100)}% zoom...`);
      
      await page.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoom);
      
      await page.waitForTimeout(500);
      
      const containerBox = await page.locator('.flex-1.max-w-xl').first().boundingBox();
      const orbBox = await page.locator('.pulsing-border-wrapper').boundingBox();
      
      if (containerBox && orbBox) {
        const leftOverflow = containerBox.x - orbBox.x;
        const rightOverflow = (orbBox.x + orbBox.width) - (containerBox.x + containerBox.width);
        const fits = leftOverflow >= -10 && rightOverflow <= 10;
        
        const result = {
          zoom: `${(zoom * 100)}%`,
          fits,
          leftOverflow: leftOverflow.toFixed(2),
          rightOverflow: rightOverflow.toFixed(2),
          containerWidth: containerBox.width.toFixed(2),
          orbWidth: orbBox.width.toFixed(2)
        };
        
        results.push(result);
        
        console.log(`   Container: ${result.containerWidth}px | Orb: ${result.orbWidth}px`);
        console.log(`   ${fits ? '✅ FITS' : '❌ OVERFLOW'} (L: ${result.leftOverflow}px, R: ${result.rightOverflow}px)`);
      }
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY OF ALL ZOOM LEVELS:');
    console.log('┌──────────┬──────────┬─────────────┬──────────┬──────────────┐');
    console.log('│   Zoom   │   Fits   │ Container   │   Orb    │   Overflow   │');
    console.log('├──────────┼──────────┼─────────────┼──────────┼──────────────┤');
    results.forEach(r => {
      console.log(`│ ${r.zoom.padEnd(8)} │ ${(r.fits ? '✅ YES' : '❌ NO ').padEnd(8)} │ ${r.containerWidth.padEnd(11)} │ ${r.orbWidth.padEnd(8)} │ L:${r.leftOverflow.padStart(6)} R:${r.rightOverflow.padStart(6)} │`);
    });
    console.log('└──────────┴──────────┴─────────────┴──────────┴──────────────┘');
    
    // All should fit
    const allFit = results.every(r => r.fits);
    console.log(`\n${allFit ? '✅ PASS: Orb fits at ALL zoom levels!' : '❌ FAIL: Orb overflows at some zoom levels'}`);
    
    expect(allFit, 'Orb should fit within container at all zoom levels (50% to 200%)').toBe(true);
  });
});
