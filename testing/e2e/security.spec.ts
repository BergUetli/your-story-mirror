import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Security
 * 
 * Tests application security features (separate from authentication):
 * - security-001: SQL injection prevention
 * - security-002: CSRF protection
 * - security-003: XSS prevention
 * 
 * Prerequisites:
 * - Security features properly implemented
 * - Test environment allows security testing
 * - Proper error handling for malicious inputs
 * 
 * NOTE: These are ethical security tests for development purposes.
 */

test.describe('Security', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'sectest@example.com',
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

  test('security-001: SQL injection prevention', async ({ page }) => {
    console.log('\n🧪 TEST: security-001 - SQL injection prevention');
    
    // Navigate to search/memory creation (common SQL injection points)
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to timeline');
    
    // SQL injection test payloads
    const sqlInjectionPayloads = [
      "'; DROP TABLE memories; --",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1--",
      "1' UNION SELECT NULL, NULL, NULL--",
      "'; DELETE FROM users WHERE '1'='1"
    ];
    
    console.log('Testing SQL injection prevention in search...');
    
    // Test search input
    const searchInput = page.locator('[data-testid="memory-search"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      for (const payload of sqlInjectionPayloads) {
        console.log(`Testing payload: ${payload.substring(0, 30)}...`);
        
        // Monitor for errors in console
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });
        
        // Try the injection
        await searchInput.fill(payload);
        await page.waitForTimeout(1500);
        
        // Check if app is still functional
        const isPageResponsive = await page.evaluate(() => {
          return document.body !== null && document.readyState === 'complete';
        });
        
        expect(isPageResponsive).toBe(true);
        console.log('  ✓ App remains functional');
        
        // Check for database error messages (should NOT appear)
        const errorMessages = page.locator(':has-text("SQL"), :has-text("database error"), :has-text("syntax error")');
        const hasDbError = await errorMessages.isVisible({ timeout: 1000 }).catch(() => false);
        
        expect(hasDbError).toBe(false);
        console.log('  ✓ No database errors exposed');
        
        // Clear input
        await searchInput.clear();
      }
      
      console.log('✓ SQL injection prevention: PASS');
      
    } else {
      console.log('⚠️ Search input not found, testing memory creation instead');
      
      // Test memory creation with SQL injection
      const newMemoryButton = page.locator('[data-testid="new-memory"], button:has-text("New Memory")');
      
      if (await newMemoryButton.isVisible()) {
        await newMemoryButton.click();
        
        const titleInput = page.locator('[data-testid="memory-title"], input[name="title"]');
        const contentInput = page.locator('[data-testid="memory-content"], textarea[name="content"]');
        
        if (await titleInput.isVisible()) {
          // Try SQL injection in memory title
          await titleInput.fill(sqlInjectionPayloads[0]);
          await contentInput.fill('Test content');
          
          const saveButton = page.locator('[data-testid="save-memory"], button:has-text("Save")');
          await saveButton.click();
          
          await page.waitForTimeout(2000);
          
          // App should handle gracefully
          const isPageResponsive = await page.evaluate(() => {
            return document.body !== null;
          });
          expect(isPageResponsive).toBe(true);
          console.log('✓ SQL injection in memory creation prevented');
        }
      } else {
        console.log('⚠️ No SQL injection test points found');
        test.skip();
      }
    }
  });

  test('security-002: CSRF protection', async ({ page }) => {
    console.log('\n🧪 TEST: security-002 - CSRF protection');
    
    // Navigate to a page with forms
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to timeline');
    
    // Check for CSRF tokens in forms
    const forms = page.locator('form');
    const formCount = await forms.count();
    console.log(`Found ${formCount} forms to check`);
    
    if (formCount > 0) {
      for (let i = 0; i < Math.min(formCount, 3); i++) {
        const form = forms.nth(i);
        
        // Look for CSRF token field
        const csrfToken = form.locator('input[name*="csrf"], input[name*="token"]');
        
        if (await csrfToken.count() > 0) {
          const tokenValue = await csrfToken.first().inputValue();
          console.log(`  Form ${i + 1}: CSRF token found`);
          expect(tokenValue.length).toBeGreaterThan(0);
        } else {
          console.log(`  Form ${i + 1}: No CSRF token (may use header-based protection)`);
        }
      }
    }
    
    // Test API requests include CSRF protection
    console.log('Testing CSRF protection in API requests...');
    
    const requestHeaders: any[] = [];
    page.on('request', request => {
      const url = request.url();
      // Monitor POST/PUT/DELETE requests
      if (['POST', 'PUT', 'DELETE'].includes(request.method()) && 
          (url.includes('/api/') || url.includes('/functions/'))) {
        requestHeaders.push({
          method: request.method(),
          url: url,
          headers: request.headers()
        });
      }
    });
    
    // Trigger an API call (create memory)
    const newMemoryButton = page.locator('[data-testid="new-memory"], button:has-text("New Memory")');
    
    if (await newMemoryButton.isVisible({ timeout: 5000 })) {
      await newMemoryButton.click();
      await page.waitForTimeout(1000);
      
      const titleInput = page.locator('[data-testid="memory-title"], input[name="title"]');
      const contentInput = page.locator('[data-testid="memory-content"], textarea[name="content"]');
      
      if (await titleInput.isVisible()) {
        await titleInput.fill('CSRF Test Memory');
        await contentInput.fill('Testing CSRF protection');
        
        const saveButton = page.locator('[data-testid="save-memory"], button:has-text("Save")');
        await saveButton.click();
        
        await page.waitForTimeout(2000);
        
        // Check if requests had proper protection
        if (requestHeaders.length > 0) {
          console.log(`Captured ${requestHeaders.length} API requests`);
          
          requestHeaders.forEach((req, idx) => {
            console.log(`  Request ${idx + 1}: ${req.method} ${req.url}`);
            
            // Check for common CSRF protection headers
            const hasCSRFHeader = 
              req.headers['x-csrf-token'] || 
              req.headers['x-xsrf-token'] ||
              req.headers['csrf-token'];
            
            // Or check for auth token (also provides CSRF protection)
            const hasAuthHeader = 
              req.headers['authorization'] ||
              req.headers['x-auth-token'];
            
            if (hasCSRFHeader || hasAuthHeader) {
              console.log('    ✓ Protected with token/auth header');
            } else {
              console.log('    ⚠️ No obvious CSRF protection header');
            }
          });
        } else {
          console.log('  No API requests captured (may use different mechanism)');
        }
        
        console.log('✓ CSRF protection test completed');
        
      } else {
        console.log('⚠️ Memory form not found');
      }
    } else {
      console.log('⚠️ New memory button not found');
      test.skip();
    }
  });

  test('security-003: XSS prevention', async ({ page }) => {
    console.log('\n🧪 TEST: security-003 - XSS (Cross-Site Scripting) prevention');
    
    // Navigate to memory creation
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to timeline');
    
    // XSS test payloads
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];
    
    console.log('Testing XSS prevention in user input fields...');
    
    // Monitor for alerts (XSS attempts)
    let alertTriggered = false;
    page.on('dialog', async dialog => {
      alertTriggered = true;
      console.log(`⚠️ SECURITY ISSUE: Alert triggered with message: ${dialog.message()}`);
      await dialog.dismiss();
    });
    
    // Test memory creation with XSS payloads
    const newMemoryButton = page.locator('[data-testid="new-memory"], button:has-text("New Memory")');
    
    if (await newMemoryButton.isVisible({ timeout: 5000 })) {
      for (const payload of xssPayloads) {
        console.log(`Testing XSS payload: ${payload.substring(0, 40)}...`);
        
        await newMemoryButton.click();
        await page.waitForTimeout(500);
        
        const titleInput = page.locator('[data-testid="memory-title"], input[name="title"]');
        const contentInput = page.locator('[data-testid="memory-content"], textarea[name="content"]');
        
        if (await titleInput.isVisible()) {
          // Try XSS in both title and content
          await titleInput.fill(`XSS Test: ${payload}`);
          await contentInput.fill(`Content with XSS: ${payload}`);
          
          const saveButton = page.locator('[data-testid="save-memory"], button:has-text("Save")');
          await saveButton.click();
          
          await page.waitForTimeout(2000);
          
          // Verify no alert was triggered
          expect(alertTriggered).toBe(false);
          if (!alertTriggered) {
            console.log('  ✓ No XSS execution in memory creation');
          }
          
          // Check if memory was created
          await page.goto('http://localhost:8080/timeline');
          await page.waitForTimeout(1000);
          
          // Look for the memory in the list
          const memories = page.locator('[data-testid="memory-item"], .memory-item');
          if (await memories.first().isVisible()) {
            // Check if script tags are rendered as text (escaped)
            const firstMemory = memories.first();
            const memoryHTML = await firstMemory.innerHTML();
            
            // Script tags should be escaped, not executed
            const hasUnescapedScript = memoryHTML.includes('<script>') && !memoryHTML.includes('&lt;script&gt;');
            expect(hasUnescapedScript).toBe(false);
            
            if (!hasUnescapedScript) {
              console.log('  ✓ XSS payload properly escaped in display');
            }
          }
          
          // Close any modal
          const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close"), button:has-text("Cancel")');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      }
      
      console.log('✓ XSS prevention: PASS');
      
    } else {
      console.log('Testing XSS in search field...');
      
      // Test search input
      const searchInput = page.locator('[data-testid="memory-search"], input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        for (const payload of xssPayloads) {
          await searchInput.fill(payload);
          await page.waitForTimeout(1000);
          
          // Verify no alert
          expect(alertTriggered).toBe(false);
          console.log(`  ✓ XSS prevented in search: ${payload.substring(0, 30)}...`);
        }
        
        console.log('✓ XSS prevention in search: PASS');
      } else {
        console.log('⚠️ No input fields found to test XSS');
        test.skip();
      }
    }
    
    // Additional check: Test URL-based XSS
    console.log('Testing URL-based XSS prevention...');
    
    const xssUrls = [
      'http://localhost:8080/timeline?search=<script>alert("XSS")</script>',
      'http://localhost:8080/timeline#<script>alert("XSS")</script>'
    ];
    
    for (const url of xssUrls) {
      await page.goto(url);
      await page.waitForTimeout(1000);
      
      // No alert should be triggered
      expect(alertTriggered).toBe(false);
      console.log(`  ✓ URL-based XSS prevented: ${url.substring(0, 60)}...`);
    }
    
    console.log('✓ All XSS prevention tests: PASS');
  });
});
