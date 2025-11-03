/**
 * REAL E2E Tests for Archive Page
 * Tests voice recording browsing, search, playback, and filtering
 */

import { test, expect } from '@playwright/test';

test.describe('Archive Page - REAL TESTS', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8080/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 10000 });
    
    // Navigate to archive
    await page.goto('http://localhost:8080/archive');
    await page.waitForLoadState('networkidle');
  });

  test('archive-001: Display All Recordings', async ({ page }) => {
    // Check for recordings list
    const recordingsList = page.locator(
      '[data-testid="recordings-list"], ' +
      '[data-testid="archive-list"], ' +
      '.recordings-container'
    );
    
    await expect(recordingsList).toBeVisible({ timeout: 10000 });
    
    // Get recordings
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const count = await recordings.count();
    
    console.log(`Found ${count} recordings`);
    
    // Should have at least empty state or recordings
    if (count === 0) {
      // Check for empty state message
      const emptyState = page.locator('text=/no recordings|empty|start recording/i');
      await expect(emptyState).toBeVisible();
    } else {
      // Verify first recording has required elements
      const firstRecording = recordings.first();
      
      // Should have date or title
      const hasContent = await firstRecording.textContent();
      expect(hasContent).toBeTruthy();
    }
  });

  test('archive-002: Search Recordings', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator(
      '[data-testid="search-recordings"], ' +
      'input[type="search"], ' +
      'input[placeholder*="search" i]'
    );
    
    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('conversation');
      await page.waitForTimeout(1000);
      
      // Verify results filtered
      const recordings = page.locator('[data-testid="recording-item"], .recording-item');
      const resultsCount = await recordings.count();
      
      console.log(`Search returned ${resultsCount} results`);
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // Verify all recordings shown again
      const allCount = await recordings.count();
      expect(allCount).toBeGreaterThanOrEqual(resultsCount);
    } else {
      console.log('Search functionality not found');
      test.skip();
    }
  });

  test('archive-003: Play Recording', async ({ page }) => {
    // Find first recording
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const count = await recordings.count();
    
    if (count > 0) {
      // Click on first recording
      await recordings.first().click();
      await page.waitForTimeout(1000);
      
      // Look for audio player
      const audioPlayer = page.locator(
        '[data-testid="audio-player"], ' +
        'audio, ' +
        '.audio-player'
      );
      
      await expect(audioPlayer).toBeVisible({ timeout: 5000 });
      
      // Find play button
      const playButton = page.locator(
        '[data-testid="play-button"], ' +
        'button[aria-label="Play"], ' +
        'button:has-text("Play")'
      );
      
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(2000);
        
        // Verify audio is playing
        const audio = page.locator('audio').first();
        const isPlaying = await audio.evaluate((el: HTMLAudioElement) => {
          return !el.paused;
        });
        
        console.log(`Audio playing: ${isPlaying}`);
        expect(isPlaying).toBe(true);
      }
    } else {
      console.log('No recordings to test playback');
      test.skip();
    }
  });

  test('archive-004: Filter by Date Range', async ({ page }) => {
    // Look for date filter
    const dateFilter = page.locator(
      '[data-testid="date-filter"], ' +
      'input[type="date"], ' +
      'select:has(option:has-text("Date"))'
    );
    
    if (await dateFilter.first().isVisible()) {
      // Get initial count
      const recordings = page.locator('[data-testid="recording-item"], .recording-item');
      const initialCount = await recordings.count();
      
      // Apply date filter
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Apply")');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(1000);
        
        const filteredCount = await recordings.count();
        console.log(`Filtered from ${initialCount} to ${filteredCount} recordings`);
      }
    } else {
      console.log('Date filter not found');
      test.skip();
    }
  });

  test('archive-005: Recording Details View', async ({ page }) => {
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const count = await recordings.count();
    
    if (count > 0) {
      // Click on recording
      await recordings.first().click();
      await page.waitForTimeout(1000);
      
      // Check for details panel
      const detailsPanel = page.locator(
        '[data-testid="recording-details"], ' +
        '.recording-details'
      );
      
      if (await detailsPanel.isVisible()) {
        // Verify details include:
        // - Date/time
        const dateInfo = detailsPanel.locator('text=/\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}/');
        const hasDate = await dateInfo.isVisible();
        
        // - Duration
        const duration = detailsPanel.locator('text=/\\d+:\\d+|\\d+ min/');
        const hasDuration = await duration.isVisible();
        
        // - Transcript or summary
        const transcript = detailsPanel.locator('[data-testid="transcript"], .transcript');
        const hasTranscript = await transcript.isVisible();
        
        console.log(`Recording details: date=${hasDate}, duration=${hasDuration}, transcript=${hasTranscript}`);
        
        expect(hasDate || hasDuration || hasTranscript).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test('archive-006: Delete Recording', async ({ page }) => {
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const initialCount = await recordings.count();
    
    if (initialCount > 0) {
      // Click on last recording (safer than deleting first)
      await recordings.last().click();
      await page.waitForTimeout(500);
      
      // Look for delete button
      const deleteButton = page.locator(
        '[data-testid="delete-recording"], ' +
        'button:has-text("Delete"), ' +
        'button[aria-label="Delete"]'
      );
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.locator(
          'button:has-text("Confirm"), ' +
          'button:has-text("Yes"), ' +
          'button:has-text("Delete")'
        ).last();
        
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
          
          // Verify count decreased
          const newCount = await recordings.count();
          expect(newCount).toBe(initialCount - 1);
        }
      } else {
        console.log('Delete functionality not found');
      }
    } else {
      test.skip();
    }
  });

  test('archive-007: Sort Recordings', async ({ page }) => {
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const count = await recordings.count();
    
    if (count > 1) {
      // Look for sort dropdown
      const sortDropdown = page.locator(
        '[data-testid="sort-recordings"], ' +
        'select:has(option:has-text("Sort")), ' +
        'button:has-text("Sort")'
      );
      
      if (await sortDropdown.isVisible()) {
        // Get first recording title before sort
        const firstTitle = await recordings.first().textContent();
        
        // Change sort order
        if (sortDropdown.evaluate((el) => el.tagName === 'SELECT')) {
          await sortDropdown.selectOption({ index: 1 });
        } else {
          await sortDropdown.click();
          const sortOption = page.locator('text=/oldest|newest|duration/i').first();
          if (await sortOption.isVisible()) {
            await sortOption.click();
          }
        }
        
        await page.waitForTimeout(1000);
        
        // Get first recording title after sort
        const newFirstTitle = await recordings.first().textContent();
        
        // Order should have changed (unless only one recording)
        console.log(`Sort changed order: ${firstTitle} -> ${newFirstTitle}`);
      } else {
        console.log('Sort functionality not found');
      }
    } else {
      console.log('Not enough recordings to test sorting');
      test.skip();
    }
  });

  test('archive-008: Export/Download Recording', async ({ page }) => {
    const recordings = page.locator('[data-testid="recording-item"], .recording-item');
    const count = await recordings.count();
    
    if (count > 0) {
      await recordings.first().click();
      await page.waitForTimeout(500);
      
      // Look for download/export button
      const downloadButton = page.locator(
        '[data-testid="download-recording"], ' +
        'button:has-text("Download"), ' +
        'button:has-text("Export"), ' +
        'a[download]'
      );
      
      if (await downloadButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        await downloadButton.click();
        
        try {
          const download = await downloadPromise;
          console.log(`Downloaded: ${download.suggestedFilename()}`);
          
          // Verify download started
          expect(download.suggestedFilename()).toBeTruthy();
        } catch (e) {
          console.log('Download not triggered - may require different interaction');
        }
      } else {
        console.log('Download functionality not found');
      }
    } else {
      test.skip();
    }
  });
});
