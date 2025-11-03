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
    await page.goto('http://localhost:5173/auth');
    // Assume we have test credentials or use existing session
    
    // Navigate to timeline
    await page.goto('http://localhost:5173/timeline');
    await page.waitForLoadState('networkidle');
  });

  test('timeline-001: Memory labels display correctly', async ({ page }) => {
    // Wait for memories to load
    await page.waitForSelector('[data-testid="memory-item"]', { timeout: 10000 });
    
    // Get all memory items
    const memoryItems = page.locator('[data-testid="memory-item"]');
    const count = await memoryItems.count();
    
    expect(count).toBeGreaterThan(0); // Should have at least one memory
    
    // Check first memory has visible label
    const firstMemory = memoryItems.first();
    const label = firstMemory.locator('[data-testid="memory-label"]');
    
    // THIS TEST WILL FAIL if labels aren't showing
    await expect(label).toBeVisible();
    
    // Verify label has text content
    const labelText = await label.textContent();
    expect(labelText).toBeTruthy();
    expect(labelText.trim().length).toBeGreaterThan(0);
    
    // Check that label is readable (not cut off)
    const labelBox = await label.boundingBox();
    expect(labelBox).toBeTruthy();
    expect(labelBox!.width).toBeGreaterThan(50); // Should have reasonable width
    
    // Verify label doesn't overflow container
    const isOverflowing = await label.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    
    expect(isOverflowing).toBe(false); // Labels shouldn't be cut off
  });

  test('timeline-002: Timeline scales to fit all memories', async ({ page }) => {
    // Check viewport height
    const viewportHeight = page.viewportSize()?.height || 1080;
    
    // Get timeline container
    const timeline = page.locator('[data-testid="timeline-container"]');
    await expect(timeline).toBeVisible();
    
    // Get all memory items
    const memoryItems = page.locator('[data-testid="memory-item"]');
    const memoryCount = await memoryItems.count();
    
    // Calculate expected height
    // Each memory should take roughly 100-150px
    const expectedMinHeight = memoryCount * 100;
    
    // Get actual timeline height
    const timelineBox = await timeline.boundingBox();
    expect(timelineBox).toBeTruthy();
    
    const actualHeight = timelineBox!.height;
    
    // THIS TEST WILL FAIL if timeline doesn't scale
    // Timeline should be tall enough to fit all memories
    expect(actualHeight).toBeGreaterThan(expectedMinHeight * 0.8); // 80% tolerance
    
    // Check if timeline is scrollable or all items visible
    const isScrollable = await timeline.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    
    if (isScrollable) {
      // If scrollable, verify we can scroll to bottom
      await timeline.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      
      // Verify last memory is now visible
      const lastMemory = memoryItems.last();
      await expect(lastMemory).toBeInViewport({ ratio: 0.5 });
    } else {
      // If not scrollable, all memories should be visible
      // Check that first and last are both visible
      await expect(memoryItems.first()).toBeVisible();
      await expect(memoryItems.last()).toBeVisible();
    }
  });

  test('timeline-003: Timeline handles many memories without breaking', async ({ page }) => {
    // Get all memory items
    const memoryItems = page.locator('[data-testid="memory-item"]');
    const count = await memoryItems.count();
    
    console.log(`Testing with ${count} memories`);
    
    // Timeline should handle at least 20 memories
    if (count >= 20) {
      // Scroll through entire timeline
      const timeline = page.locator('[data-testid="timeline-container"]');
      
      // Scroll to different positions
      for (let i = 0; i < 5; i++) {
        const scrollPosition = (i / 4) * 1.0; // 0%, 25%, 50%, 75%, 100%
        await timeline.evaluate((el, pos) => {
          el.scrollTo(0, el.scrollHeight * pos);
        }, scrollPosition);
        
        await page.waitForTimeout(500);
        
        // Verify timeline still renders correctly
        const visibleMemories = page.locator('[data-testid="memory-item"]:visible');
        const visibleCount = await visibleMemories.count();
        
        expect(visibleCount).toBeGreaterThan(0); // Should always see some memories
      }
      
      // Check for layout issues
      const hasLayoutBreak = await page.locator('.timeline-error, .layout-error').count();
      expect(hasLayoutBreak).toBe(0);
      
      // Verify all memory labels are still accessible
      await timeline.evaluate((el) => el.scrollTo(0, 0));
      
      // Click on a memory in the middle
      const middleIndex = Math.floor(count / 2);
      const middleMemory = memoryItems.nth(middleIndex);
      
      // Scroll to it
      await middleMemory.scrollIntoViewIfNeeded();
      
      // Verify it's clickable
      await expect(middleMemory).toBeVisible();
      await middleMemory.click();
      
      // Should show memory details
      const details = page.locator('[data-testid="memory-details"]');
      await expect(details).toBeVisible({ timeout: 3000 });
    } else {
      console.log('⚠️  Not enough memories to test scaling (need 20+, have ' + count + ')');
      test.skip();
    }
  });

  test('timeline-004: Memory labels stay readable at different zoom levels', async ({ page }) => {
    // Get first memory item
    const firstMemory = page.locator('[data-testid="memory-item"]').first();
    const label = firstMemory.locator('[data-testid="memory-label"]');
    
    // Test at different zoom levels
    const zoomLevels = [0.75, 1.0, 1.25];
    
    for (const zoom of zoomLevels) {
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
      
      // Text should not be cut off
      const isTextCutOff = await label.evaluate((el) => {
        return el.scrollWidth > el.clientWidth + 2; // 2px tolerance
      });
      
      expect(isTextCutOff).toBe(false);
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });

  test('timeline-005: Timeline date separators display correctly', async ({ page }) => {
    // Check for date separators
    const dateSeparators = page.locator('[data-testid="date-separator"]');
    const separatorCount = await dateSeparators.count();
    
    // Should have at least one date separator
    expect(separatorCount).toBeGreaterThan(0);
    
    // Check first separator
    const firstSeparator = dateSeparators.first();
    await expect(firstSeparator).toBeVisible();
    
    // Verify separator has date text
    const dateText = await firstSeparator.textContent();
    expect(dateText).toMatch(/\d{4}/); // Should contain a year
    
    // Verify separator is positioned correctly (not overlapping memories)
    const separatorBox = await firstSeparator.boundingBox();
    const firstMemory = page.locator('[data-testid="memory-item"]').first();
    const memoryBox = await firstMemory.boundingBox();
    
    expect(separatorBox).toBeTruthy();
    expect(memoryBox).toBeTruthy();
    
    // Separator should be above first memory
    expect(separatorBox!.y).toBeLessThan(memoryBox!.y);
  });
});
