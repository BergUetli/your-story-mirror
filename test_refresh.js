import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  const logs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push(`[${type.toUpperCase()}] ${text}`);
  });
  
  try {
    console.log('🔍 Testing Archive refresh functionality...');
    
    // Navigate to archive
    await page.goto('https://8083-iupfq84snszyjv46ge7jb-02b9cc79.sandbox.novita.ai/archive', {
      waitUntil: 'networkidle'
    });
    
    // Wait for initial load
    await page.waitForSelector('button:has-text("Refresh")', { timeout: 10000 });
    await page.waitForTimeout(2000); // Let initial load complete
    
    console.log('✅ Page loaded, clicking refresh...');
    
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Wait for refresh to complete
    await page.waitForTimeout(5000);
    
    console.log('\n📋 Console logs during refresh:');
    // Show only logs related to recordings
    const relevantLogs = logs.filter(log => 
      log.includes('recordings') || 
      log.includes('Demo') || 
      log.includes('Guest') || 
      log.includes('Total') ||
      log.includes('Archive loaded') ||
      log.includes('isRefresh')
    );
    
    relevantLogs.forEach(log => console.log(log));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
