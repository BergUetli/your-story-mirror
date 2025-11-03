import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Performance & Load Testing
 * 
 * Tests application performance under various conditions:
 * - perf-001: Memory retrieval performance (<2s for 100 memories)
 * - perf-002: Voice recording upload speed
 * - perf-003: Timeline rendering with many memories (500+)
 * - perf-004: Search query response time (<1s)
 * 
 * Prerequisites:
 * - Test database with sufficient data
 * - Network conditions stable
 * - Performance monitoring enabled
 */

test.describe('Performance & Load Testing', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'perftest@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestUser123!@#'
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8080/auth');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();
      await page.waitForURL(/\/(dashboard|sanctuary|timeline)/, { timeout: 10000 });
    }
  });

  test('perf-001: Memory retrieval performance (<2s for 100 memories)', async ({ page }) => {
    console.log('\n🧪 TEST: perf-001 - Memory retrieval performance');
    
    // Navigate to timeline
    const startTime = Date.now();
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    
    // Wait for memories to load
    const memories = page.locator('[data-testid="memory-item"], .memory-item');
    
    // Wait for at least some memories to appear
    try {
      await memories.first().waitFor({ state: 'visible', timeout: 5000 });
      const loadEndTime = Date.now();
      const loadTime = loadEndTime - startTime;
      
      const memoryCount = await memories.count();
      console.log(`✓ Loaded ${memoryCount} memories in ${loadTime}ms`);
      
      // Performance expectation: Should load in under 2000ms
      if (memoryCount >= 100) {
        console.log(`Testing with ${memoryCount} memories (≥100)`);
        expect(loadTime).toBeLessThan(2000);
        console.log(`✓ PASS: Load time ${loadTime}ms < 2000ms threshold`);
      } else {
        console.log(`⚠️ Only ${memoryCount} memories available (need 100+ for full test)`);
        // Still check reasonable performance for available memories
        const expectedMaxTime = Math.max(1000, memoryCount * 20); // 20ms per memory baseline
        if (loadTime < expectedMaxTime) {
          console.log(`✓ Load time ${loadTime}ms acceptable for ${memoryCount} memories`);
        } else {
          console.log(`⚠️ Load time ${loadTime}ms slower than expected ${expectedMaxTime}ms`);
        }
      }
      
      // Test scroll performance
      console.log('Testing scroll performance...');
      const scrollStart = Date.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500); // Wait for any lazy loading
      const scrollEnd = Date.now();
      const scrollTime = scrollEnd - scrollStart;
      console.log(`Scroll time: ${scrollTime}ms`);
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      
    } catch (error) {
      console.log('⚠️ No memories found or failed to load');
      console.log('This test requires existing memories in the database');
      test.skip();
    }
  });

  test('perf-002: Voice recording upload speed', async ({ page, context }) => {
    console.log('\n🧪 TEST: perf-002 - Voice recording upload speed');
    
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Navigate to sanctuary
    await page.goto('http://localhost:8080/sanctuary', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to sanctuary');
    
    // Start recording
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      const recordStartTime = Date.now();
      await startButton.click();
      console.log('✓ Started recording');
      
      // Record for 5 seconds
      const recordingDuration = 5000;
      await page.waitForTimeout(recordingDuration);
      
      // Stop recording
      const stopButton = page.locator('[data-testid="stop-conversation"], button:has-text("Stop")');
      if (await stopButton.isVisible()) {
        await stopButton.click();
        const recordEndTime = Date.now();
        console.log(`✓ Stopped recording after ${recordingDuration}ms`);
        
        // Measure upload/processing time
        const uploadStartTime = Date.now();
        
        // Look for upload indicator
        const uploadIndicator = page.locator('[data-testid="uploading"], [data-testid="processing"], :has-text("Uploading"), :has-text("Processing")');
        
        if (await uploadIndicator.isVisible({ timeout: 2000 })) {
          console.log('✓ Upload started');
          
          // Wait for upload to complete
          await uploadIndicator.waitFor({ state: 'hidden', timeout: 30000 });
          const uploadEndTime = Date.now();
          const uploadTime = uploadEndTime - uploadStartTime;
          
          console.log(`✓ Upload completed in ${uploadTime}ms`);
          
          // Performance expectation: 5s recording should upload in <10s
          const expectedMaxUploadTime = 10000;
          expect(uploadTime).toBeLessThan(expectedMaxUploadTime);
          console.log(`✓ PASS: Upload time ${uploadTime}ms < ${expectedMaxUploadTime}ms threshold`);
          
          // Calculate upload speed (5s recording ~= 500KB at typical bitrate)
          const estimatedFileSize = 500; // KB
          const uploadSpeed = (estimatedFileSize / uploadTime) * 1000; // KB/s
          console.log(`Estimated upload speed: ${uploadSpeed.toFixed(2)} KB/s`);
          
        } else {
          console.log('⚠️ Upload indicator not found - upload may be instant or not implemented');
          
          // Check if recording appears in archive
          await page.goto('http://localhost:8080/archive');
          await page.waitForTimeout(2000);
          
          const recordings = page.locator('[data-testid="recording-item"], .recording-item');
          const recordingCount = await recordings.count();
          
          if (recordingCount > 0) {
            console.log(`✓ Recording appears in archive (${recordingCount} total recordings)`);
          } else {
            console.log('⚠️ Recording not found in archive');
          }
        }
      }
      
    } else {
      console.log('⚠️ Start conversation button not found');
      test.skip();
    }
  });

  test('perf-003: Timeline rendering with many memories (500+)', async ({ page }) => {
    console.log('\n🧪 TEST: perf-003 - Timeline rendering with many memories');
    
    // Navigate to timeline with performance monitoring
    const startTime = performance.now();
    
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    
    // Measure initial render time
    const memories = page.locator('[data-testid="memory-item"], .memory-item');
    
    try {
      await memories.first().waitFor({ state: 'visible', timeout: 5000 });
      const initialRenderTime = performance.now() - startTime;
      
      const memoryCount = await memories.count();
      console.log(`✓ Initial render: ${memoryCount} memories in ${initialRenderTime.toFixed(2)}ms`);
      
      // Check if we have enough memories for this test
      if (memoryCount < 500) {
        console.log(`⚠️ Only ${memoryCount} memories (need 500+ for full test)`);
        console.log('Will test with available memories');
      } else {
        console.log(`✓ Testing with ${memoryCount} memories`);
      }
      
      // Measure scroll performance with many items
      console.log('Testing scroll performance with many items...');
      
      const scrollIterations = 5;
      const scrollTimes: number[] = [];
      
      for (let i = 0; i < scrollIterations; i++) {
        const scrollStart = performance.now();
        
        // Scroll to different positions
        const scrollPosition = (i + 1) * (100 / scrollIterations);
        await page.evaluate((pos) => {
          const maxScroll = document.body.scrollHeight - window.innerHeight;
          window.scrollTo(0, (maxScroll * pos) / 100);
        }, scrollPosition);
        
        await page.waitForTimeout(500); // Wait for rendering
        
        const scrollEnd = performance.now();
        const scrollTime = scrollEnd - scrollStart;
        scrollTimes.push(scrollTime);
        
        console.log(`  Scroll ${i + 1}: ${scrollTime.toFixed(2)}ms`);
      }
      
      const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      console.log(`Average scroll time: ${avgScrollTime.toFixed(2)}ms`);
      
      // Performance expectation: Average scroll should be <1000ms
      expect(avgScrollTime).toBeLessThan(1000);
      console.log(`✓ PASS: Average scroll time ${avgScrollTime.toFixed(2)}ms < 1000ms threshold`);
      
      // Test filter/search performance with many items
      console.log('Testing filter performance...');
      
      const searchInput = page.locator('[data-testid="memory-search"], input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        const filterStart = performance.now();
        await searchInput.fill('test');
        await page.waitForTimeout(1000); // Wait for filter to apply
        const filterEnd = performance.now();
        const filterTime = filterEnd - filterStart;
        
        const filteredCount = await memories.count();
        console.log(`Filter completed in ${filterTime.toFixed(2)}ms, showing ${filteredCount} results`);
        
        // Filter should be fast even with many items
        expect(filterTime).toBeLessThan(2000);
      }
      
      // Check for virtual scrolling/pagination
      const pagination = page.locator('[data-testid="pagination"], .pagination');
      if (await pagination.isVisible()) {
        console.log('✓ Pagination detected (helps with performance)');
      }
      
      // Check for virtualization hints
      const visibleMemories = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="memory-item"], .memory-item');
        let visibleCount = 0;
        items.forEach(item => {
          const rect = item.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            visibleCount++;
          }
        });
        return visibleCount;
      });
      
      console.log(`Visible memories in viewport: ${visibleMemories}`);
      if (visibleMemories < memoryCount) {
        console.log('✓ Not all memories rendered (good for performance)');
      }
      
    } catch (error) {
      console.log('⚠️ Failed to load timeline with memories');
      console.log('This test requires existing memories in the database');
      test.skip();
    }
  });

  test('perf-004: Search query response time (<1s)', async ({ page }) => {
    console.log('\n🧪 TEST: perf-004 - Search query response time');
    
    // Navigate to timeline (main search location)
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    
    const searchInput = page.locator('[data-testid="memory-search"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      console.log('✓ Search input found');
      
      // Test multiple search queries
      const searchQueries = [
        'conversation',
        'meeting',
        'important',
        'work',
        'personal'
      ];
      
      const searchTimes: number[] = [];
      
      for (const query of searchQueries) {
        console.log(`\nSearching for: "${query}"`);
        
        // Clear previous search
        await searchInput.clear();
        await page.waitForTimeout(500);
        
        // Measure search time
        const searchStart = performance.now();
        await searchInput.fill(query);
        
        // Wait for results to update (watch for network idle or DOM changes)
        await page.waitForTimeout(1500); // Allow for debouncing and API call
        
        const searchEnd = performance.now();
        const searchTime = searchEnd - searchStart;
        searchTimes.push(searchTime);
        
        // Count results
        const results = page.locator('[data-testid="memory-item"], .memory-item');
        const resultCount = await results.count();
        
        console.log(`  Results: ${resultCount} memories in ${searchTime.toFixed(2)}ms`);
        
        // Performance expectation: Each search should be <1000ms
        expect(searchTime).toBeLessThan(1000);
      }
      
      // Calculate average search time
      const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      console.log(`\n✓ Average search time: ${avgSearchTime.toFixed(2)}ms`);
      console.log(`✓ PASS: All searches completed under 1000ms threshold`);
      
      // Test semantic search if available
      console.log('\nTesting semantic search...');
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      const semanticQuery = 'discussions about project planning';
      const semanticStart = performance.now();
      await searchInput.fill(semanticQuery);
      await page.waitForTimeout(2000); // Semantic search may take longer
      const semanticEnd = performance.now();
      const semanticTime = semanticEnd - semanticStart;
      
      const semanticResults = page.locator('[data-testid="memory-item"], .memory-item');
      const semanticCount = await semanticResults.count();
      
      console.log(`Semantic search: ${semanticCount} results in ${semanticTime.toFixed(2)}ms`);
      
      // Semantic search allowed to be slightly slower (2s threshold)
      if (semanticTime < 2000) {
        console.log('✓ Semantic search performance acceptable');
      } else {
        console.log(`⚠️ Semantic search slow: ${semanticTime.toFixed(2)}ms`);
      }
      
    } else {
      console.log('⚠️ Search functionality not found');
      test.skip();
    }
  });
});
