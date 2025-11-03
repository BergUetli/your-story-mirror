/**
 * REAL E2E Tests for Timeline
 * These tests will catch the actual bugs:
 * - Memory labels not displaying properly
 * - Timeline doesn't scale to fit more memories
 */

import { test, expect } from '@playwright/test';

test.describe('Timeline Display - REAL TESTS', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:8080/auth');
    // Assume we have test credentials or use existing session
    
    // Navigate to timeline
    await page.goto('http://localhost:8080/timeline');
    await page.waitForLoadState('networkidle');
  });

  test('timeline-001: Memory labels display correctly', async ({ page }) => {
    console.log('🧪 TEST: timeline-001 - Memory labels display');
    
    // Wait for timeline to load - look for actual structure (headings with memory titles)
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Find memory headings (react-chrono renders memories as h1 elements)
    const memoryHeadings = page.locator('h1').filter({
      hasNotText: /^Timeline$|^\d+ Memor(y|ies)$|^Birth$/
    });
    
    const count = await memoryHeadings.count();
    console.log(`Found ${count} memory labels`);
    
    expect(count).toBeGreaterThan(0); // Should have at least one memory
    
    // Check first memory label
    const firstLabel = memoryHeadings.first();
    
    // THIS TEST WILL FAIL if labels aren't showing
    await expect(firstLabel).toBeVisible();
    console.log('✓ First memory label is visible');
    
    // Verify label has text content
    const labelText = await firstLabel.textContent();
    expect(labelText).toBeTruthy();
    expect(labelText!.trim().length).toBeGreaterThan(0);
    console.log(`✓ Label text: "${labelText?.substring(0, 50)}..."`);
    
    // Check that label is readable (not cut off)
    const labelBox = await firstLabel.boundingBox();
    expect(labelBox).toBeTruthy();
    expect(labelBox!.width).toBeGreaterThan(50); // Should have reasonable width
    console.log(`✓ Label width: ${labelBox!.width}px`);
    
    // Verify label doesn't overflow container (check for truncation)
    const isOverflowing = await firstLabel.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    
    if (isOverflowing) {
      console.log('⚠️ Label is truncated/cut off');
    } else {
      console.log('✓ Label is not cut off');
    }
    
    expect(isOverflowing).toBe(false); // Labels shouldn't be cut off
  });

  test('timeline-002: Timeline scales to fit all memories', async ({ page }) => {
    console.log('🧪 TEST: timeline-002 - Timeline scaling');
    
    // Check viewport height
    const viewportHeight = page.viewportSize()?.height || 1080;
    console.log(`Viewport height: ${viewportHeight}px`);
    
    // Get timeline container (the scrollable area)
    const timeline = page.locator('.react-chrono-timeline, [class*="timeline"]').first();
    await expect(timeline).toBeVisible();
    
    // Get all memory headings to count memories
    const memoryHeadings = page.locator('h1').filter({
      hasNotText: /^Timeline$|^\d+ Memor(y|ies)$|^Birth$/
    });
    const memoryCount = await memoryHeadings.count();
    console.log(`Found ${memoryCount} memories`);
    
    // Calculate expected height - each year group takes ~200-300px
    const yearGroups = await page.locator('li[role="listitem"]').count();
    const expectedMinHeight = yearGroups * 150;
    console.log(`Expected min height for ${yearGroups} year groups: ${expectedMinHeight}px`);
    
    // Get actual timeline height
    const timelineBox = await timeline.boundingBox();
    expect(timelineBox).toBeTruthy();
    
    const actualHeight = timelineBox!.height;
    console.log(`Actual timeline height: ${actualHeight}px`);
    
    // THIS TEST WILL FAIL if timeline doesn't scale
    // Timeline should be tall enough to fit content (with 50% tolerance)
    if (actualHeight < expectedMinHeight * 0.5) {
      console.log(`❌ Timeline too short: ${actualHeight}px < ${expectedMinHeight * 0.5}px`);
      expect(actualHeight).toBeGreaterThan(expectedMinHeight * 0.5);
    } else {
      console.log('✓ Timeline height adequate');
    }
    
    // Check if all memories are visible by checking first and last
    const firstMemory = memoryHeadings.first();
    const lastMemory = memoryHeadings.last();
    
    const firstVisible = await firstMemory.isVisible();
    const lastVisible = await lastMemory.isVisible();
    
    console.log(`First memory visible: ${firstVisible}`);
    console.log(`Last memory visible: ${lastVisible}`);
    
    if (!lastVisible && memoryCount > 3) {
      // If last memory isn't visible with more than 3 memories, timeline should be scrollable
      const isScrollable = await timeline.evaluate((el) => {
        return el.scrollHeight > el.clientHeight;
      });
      console.log(`Timeline scrollable: ${isScrollable}`);
      expect(isScrollable).toBe(true);
    }
  });

  test('timeline-003: Timeline handles many memories without breaking', async ({ page }) => {
    console.log('🧪 TEST: timeline-003 - Many memories handling');
    
    // Get all memory headings
    const memoryHeadings = page.locator('h1').filter({
      hasNotText: /^Timeline$|^\d+ Memor(y|ies)$|^Birth$/
    });
    const count = await memoryHeadings.count();
    
    console.log(`Testing with ${count} memories`);
    
    // Timeline should handle at least 5 memories for basic test
    if (count >= 5) {
      // Get timeline container
      const timeline = page.locator('.react-chrono-timeline, [class*="timeline"]').first();
      
      // Scroll through timeline
      for (let i = 0; i < 3; i++) {
        const scrollPosition = (i / 2) * 1.0; // 0%, 50%, 100%
        await timeline.evaluate((el, pos) => {
          el.scrollTo(0, el.scrollHeight * pos);
        }, scrollPosition);
        
        await page.waitForTimeout(500);
        
        // Verify some memories are visible
        const visibleCount = await memoryHeadings.count();
        expect(visibleCount).toBeGreaterThan(0);
        console.log(`Position ${Math.round(scrollPosition * 100)}%: ${visibleCount} memories in DOM`);
      }
      
      // Check for layout errors
      const hasLayoutBreak = await page.locator('.timeline-error, .layout-error').count();
      expect(hasLayoutBreak).toBe(0);
      console.log('✓ No layout errors found');
      
    } else {
      console.log(`⚠️ Not enough memories (need 5+, have ${count})`);
      test.skip();
    }
  });

  test('timeline-004: Memory labels stay readable at different zoom levels', async ({ page }) => {
    console.log('🧪 TEST: timeline-004 - Zoom level readability');
    
    // Get first memory heading
    const memoryHeadings = page.locator('h1').filter({
      hasNotText: /^Timeline$|^\d+ Memor(y|ies)$|^Birth$/
    });
    const label = memoryHeadings.first();
    await expect(label).toBeVisible();
    
    // Test at different zoom levels
    const zoomLevels = [0.75, 1.0, 1.25];
    
    for (const zoom of zoomLevels) {
      console.log(`Testing at ${zoom * 100}% zoom...`);
      
      // Set zoom level
      await page.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoom);
      
      await page.waitForTimeout(500);
      
      // Verify label is still visible and readable
      await expect(label).toBeVisible();
      
      const labelBox = await label.boundingBox();
      expect(labelBox).toBeTruthy();
      
      // Label should have reasonable size at any zoom
      expect(labelBox!.width).toBeGreaterThan(30);
      expect(labelBox!.height).toBeGreaterThan(10);
      console.log(`✓ Label size at ${zoom * 100}%: ${labelBox!.width.toFixed(0)}x${labelBox!.height.toFixed(0)}px`);
      
      // Text should not be cut off
      const isTextCutOff = await label.evaluate((el) => {
        return el.scrollWidth > el.clientWidth + 2; // 2px tolerance
      });
      
      if (isTextCutOff) {
        console.log(`⚠️ Text cut off at ${zoom * 100}% zoom`);
      }
      expect(isTextCutOff).toBe(false);
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });

  test('timeline-005: Timeline date separators display correctly', async ({ page }) => {
    console.log('🧪 TEST: timeline-005 - Date separators');
    
    // In react-chrono, year labels are the date separators
    // Look for year titles (e.g. "1981", "2002", "2020")
    const yearSeparators = page.locator('li[role="listitem"]').locator('div').filter({
      hasText: /^\d{4}$/
    });
    const separatorCount = await yearSeparators.count();
    
    console.log(`Found ${separatorCount} year separators`);
    expect(separatorCount).toBeGreaterThan(0);
    
    // Check first separator
    const firstSeparator = yearSeparators.first();
    await expect(firstSeparator).toBeVisible();
    
    // Verify separator has year text
    const dateText = await firstSeparator.textContent();
    expect(dateText).toMatch(/^\d{4}$/); // Should be exactly a 4-digit year
    console.log(`✓ First year separator: ${dateText}`);
    
    // Verify multiple year separators exist if there are memories across years
    const memoryHeadings = page.locator('h1').filter({
      hasNotText: /^Timeline$|^\d+ Memor(y|ies)$|^Birth$/
    });
    const memoryCount = await memoryHeadings.count();
    
    if (memoryCount >= 2 && separatorCount >= 2) {
      console.log(`✓ Multiple year separators (${separatorCount}) for ${memoryCount} memories`);
    }
  });
});
