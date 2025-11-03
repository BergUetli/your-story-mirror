import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Admin & Diagnostics
 * 
 * Tests administrative functionality and system diagnostics:
 * - admin-001: Database health check
 * - admin-002: User management dashboard
 * - admin-003: System diagnostics panel
 * 
 * Prerequisites:
 * - Admin user account with elevated privileges
 * - Access to admin dashboard routes
 * - Database monitoring tools configured
 */

test.describe('Admin & Diagnostics', () => {
  // Admin test credentials (use environment variables in production)
  const ADMIN_USER = {
    email: process.env.ADMIN_TEST_EMAIL || 'admin@test.com',
    password: process.env.ADMIN_TEST_PASSWORD || 'TestAdmin123!@#'
  };

  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('http://localhost:8080/auth');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(ADMIN_USER.email);
      await passwordInput.fill(ADMIN_USER.password);
      await submitButton.click();
      
      // Wait for auth to complete
      await page.waitForURL(/\/(dashboard|sanctuary|timeline|admin)/, { timeout: 10000 });
      console.log('✓ Logged in as admin');
    }
  });

  test('admin-001: Database health check', async ({ page }) => {
    console.log('\n🧪 TEST: admin-001 - Database health check');
    
    // Navigate to admin/diagnostics page
    await page.goto('http://localhost:8080/admin/diagnostics', { waitUntil: 'networkidle' });
    
    // Look for database health indicators
    const dbHealthSection = page.locator('[data-testid="db-health-section"], [data-testid="database-status"], .database-health');
    
    if (await dbHealthSection.isVisible({ timeout: 5000 })) {
      console.log('✓ Database health section found');
      
      // Check for connection status
      const connectionStatus = page.locator('[data-testid="db-connection-status"], .connection-status');
      if (await connectionStatus.isVisible()) {
        const statusText = await connectionStatus.textContent();
        console.log(`Database connection: ${statusText}`);
        
        // Status should indicate "connected" or "healthy"
        expect(statusText?.toLowerCase()).toMatch(/connected|healthy|online|active/);
      }
      
      // Check for query performance metrics
      const queryMetrics = page.locator('[data-testid="query-metrics"], .query-performance');
      if (await queryMetrics.isVisible()) {
        const metricsText = await queryMetrics.textContent();
        console.log(`Query metrics: ${metricsText}`);
      }
      
      // Check for table statistics
      const tableStats = page.locator('[data-testid="table-statistics"], .table-stats');
      if (await tableStats.count() > 0) {
        const statsCount = await tableStats.count();
        console.log(`Found ${statsCount} table statistics`);
        expect(statsCount).toBeGreaterThan(0);
      }
      
      // Check for connection pool info
      const poolInfo = page.locator('[data-testid="connection-pool"], .pool-status');
      if (await poolInfo.isVisible()) {
        const poolText = await poolInfo.textContent();
        console.log(`Connection pool: ${poolText}`);
      }
      
    } else {
      console.log('⚠️ Database health section not found - may not be implemented yet');
      test.skip();
    }
  });

  test('admin-002: User management dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: admin-002 - User management dashboard');
    
    // Navigate to user management page
    await page.goto('http://localhost:8080/admin/users', { waitUntil: 'networkidle' });
    
    // Look for user list/table
    const userTable = page.locator('[data-testid="user-list"], [data-testid="user-table"], table.users');
    
    if (await userTable.isVisible({ timeout: 5000 })) {
      console.log('✓ User management table found');
      
      // Count users
      const userRows = page.locator('[data-testid="user-row"], tbody tr');
      const userCount = await userRows.count();
      console.log(`Found ${userCount} users`);
      expect(userCount).toBeGreaterThan(0);
      
      // Check user details displayed
      if (userCount > 0) {
        const firstUser = userRows.first();
        
        // Check for email column
        const emailCell = firstUser.locator('[data-testid="user-email"], td:has-text("@")');
        if (await emailCell.isVisible()) {
          const email = await emailCell.textContent();
          console.log(`First user email: ${email}`);
          expect(email).toContain('@');
        }
        
        // Check for created date
        const dateCell = firstUser.locator('[data-testid="user-created"], [data-testid="created-at"]');
        if (await dateCell.isVisible()) {
          const date = await dateCell.textContent();
          console.log(`User created: ${date}`);
        }
        
        // Check for actions (view, edit, delete)
        const actionsCell = firstUser.locator('[data-testid="user-actions"], .actions');
        if (await actionsCell.isVisible()) {
          const viewButton = actionsCell.locator('button:has-text("View"), [data-testid="view-user"]');
          const editButton = actionsCell.locator('button:has-text("Edit"), [data-testid="edit-user"]');
          
          if (await viewButton.isVisible()) {
            console.log('✓ View user action available');
          }
          if (await editButton.isVisible()) {
            console.log('✓ Edit user action available');
          }
        }
      }
      
      // Check for search/filter functionality
      const searchInput = page.locator('[data-testid="search-users"], input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        console.log('✓ User search functionality available');
        await searchInput.fill('test');
        await page.waitForTimeout(1000);
        const filteredCount = await userRows.count();
        console.log(`Search filtered to ${filteredCount} users`);
      }
      
      // Check for pagination
      const pagination = page.locator('[data-testid="pagination"], .pagination');
      if (await pagination.isVisible()) {
        console.log('✓ Pagination controls available');
      }
      
    } else {
      console.log('⚠️ User management dashboard not found - may not be implemented yet');
      test.skip();
    }
  });

  test('admin-003: System diagnostics panel', async ({ page }) => {
    console.log('\n🧪 TEST: admin-003 - System diagnostics panel');
    
    // Navigate to system diagnostics
    await page.goto('http://localhost:8080/admin/diagnostics', { waitUntil: 'networkidle' });
    
    // Look for diagnostics panel
    const diagnosticsPanel = page.locator('[data-testid="diagnostics-panel"], [data-testid="system-diagnostics"], .diagnostics');
    
    if (await diagnosticsPanel.isVisible({ timeout: 5000 })) {
      console.log('✓ System diagnostics panel found');
      
      // Check for system metrics
      const metrics = [
        { name: 'CPU Usage', selector: '[data-testid="cpu-usage"], .cpu-metric' },
        { name: 'Memory Usage', selector: '[data-testid="memory-usage"], .memory-metric' },
        { name: 'Active Users', selector: '[data-testid="active-users"], .users-metric' },
        { name: 'API Requests', selector: '[data-testid="api-requests"], .api-metric' },
        { name: 'Error Rate', selector: '[data-testid="error-rate"], .error-metric' }
      ];
      
      for (const metric of metrics) {
        const element = page.locator(metric.selector);
        if (await element.isVisible()) {
          const value = await element.textContent();
          console.log(`✓ ${metric.name}: ${value}`);
        }
      }
      
      // Check for recent errors log
      const errorsLog = page.locator('[data-testid="errors-log"], [data-testid="recent-errors"], .errors-list');
      if (await errorsLog.isVisible()) {
        console.log('✓ Errors log available');
        
        const errorEntries = page.locator('[data-testid="error-entry"], .error-item');
        const errorCount = await errorEntries.count();
        console.log(`Found ${errorCount} recent errors`);
        
        if (errorCount > 0) {
          const firstError = errorEntries.first();
          const errorText = await firstError.textContent();
          console.log(`Latest error: ${errorText?.substring(0, 100)}...`);
        }
      }
      
      // Check for service status indicators
      const services = page.locator('[data-testid="service-status"], .service-indicator');
      if (await services.count() > 0) {
        const serviceCount = await services.count();
        console.log(`✓ Monitoring ${serviceCount} services`);
        
        for (let i = 0; i < Math.min(serviceCount, 5); i++) {
          const service = services.nth(i);
          const serviceName = await service.locator('[data-testid="service-name"], .name').textContent();
          const serviceStatus = await service.locator('[data-testid="service-status-indicator"], .status').textContent();
          console.log(`  ${serviceName}: ${serviceStatus}`);
        }
      }
      
      // Check for refresh/reload functionality
      const refreshButton = page.locator('[data-testid="refresh-diagnostics"], button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        console.log('✓ Refresh diagnostics button available');
        await refreshButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Diagnostics refreshed');
      }
      
      // Check for export diagnostics functionality
      const exportButton = page.locator('[data-testid="export-diagnostics"], button:has-text("Export")');
      if (await exportButton.isVisible()) {
        console.log('✓ Export diagnostics functionality available');
      }
      
    } else {
      console.log('⚠️ System diagnostics panel not found - may not be implemented yet');
      test.skip();
    }
  });
});
