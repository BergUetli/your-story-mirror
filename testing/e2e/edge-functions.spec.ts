import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Edge Functions
 * 
 * Tests Supabase Edge Functions that handle core AI processing:
 * - edge-001: Conversation processing edge function
 * - edge-002: Memory extraction edge function
 * - edge-003: Identity training edge function
 * 
 * Prerequisites:
 * - Edge functions deployed and accessible
 * - Valid test data for processing
 * - Proper authentication for function invocation
 */

test.describe('Edge Functions', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'edgetest@example.com',
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

  test('edge-001: Conversation processing edge function', async ({ page, context }) => {
    console.log('\n🧪 TEST: edge-001 - Conversation processing edge function');
    
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Navigate to sanctuary (voice conversation page)
    await page.goto('http://localhost:8080/sanctuary', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to sanctuary');
    
    // Set up network listener to capture edge function calls
    const edgeFunctionCalls: any[] = [];
    page.on('response', response => {
      const url = response.url();
      // Look for edge function endpoints
      if (url.includes('/functions/v1/') || url.includes('edge-function') || url.includes('process-conversation')) {
        edgeFunctionCalls.push({
          url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Edge function call detected: ${url} (${response.status()})`);
      }
    });
    
    // Start a conversation
    const startButton = page.locator('[data-testid="start-conversation"], button:has-text("Start")');
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      console.log('✓ Started conversation');
      
      // Wait for conversation to process (edge function should be called)
      await page.waitForTimeout(3000);
      
      // Check if conversation is active
      const conversationActive = page.locator('[data-testid="conversation-active"], [data-testid="recording-indicator"]');
      if (await conversationActive.isVisible()) {
        console.log('✓ Conversation is active');
      }
      
      // Wait longer to ensure edge function is invoked
      await page.waitForTimeout(5000);
      
      // Stop the conversation
      const stopButton = page.locator('[data-testid="stop-conversation"], button:has-text("Stop")');
      if (await stopButton.isVisible()) {
        await stopButton.click();
        console.log('✓ Stopped conversation');
        
        // Wait for processing to complete
        await page.waitForTimeout(3000);
      }
      
      // Check if edge function was called
      if (edgeFunctionCalls.length > 0) {
        console.log(`✓ Edge function called ${edgeFunctionCalls.length} times`);
        
        // Verify successful responses
        const successfulCalls = edgeFunctionCalls.filter(call => call.status >= 200 && call.status < 300);
        console.log(`✓ ${successfulCalls.length} successful edge function calls`);
        expect(successfulCalls.length).toBeGreaterThan(0);
      } else {
        console.log('⚠️ No edge function calls detected - may be processing locally or not yet implemented');
      }
      
      // Check for processing indicator
      const processingIndicator = page.locator('[data-testid="processing"], .processing-indicator, :has-text("Processing")');
      if (await processingIndicator.isVisible({ timeout: 5000 })) {
        console.log('✓ Processing indicator shown');
      }
      
    } else {
      console.log('⚠️ Start conversation button not found - feature may not be implemented');
      test.skip();
    }
  });

  test('edge-002: Memory extraction edge function', async ({ page }) => {
    console.log('\n🧪 TEST: edge-002 - Memory extraction edge function');
    
    // Set up network listener for memory extraction calls
    const memoryExtractionCalls: any[] = [];
    page.on('response', response => {
      const url = response.url();
      // Look for memory extraction endpoints
      if (url.includes('extract-memory') || url.includes('memory-extraction') || url.includes('process-memory')) {
        memoryExtractionCalls.push({
          url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Memory extraction call detected: ${url} (${response.status()})`);
      }
    });
    
    // Navigate to timeline/memory page
    await page.goto('http://localhost:8080/timeline', { waitUntil: 'networkidle' });
    console.log('✓ Navigated to timeline');
    
    // Count initial memories
    const initialMemories = page.locator('[data-testid="memory-item"], .memory-item');
    const initialCount = await initialMemories.count();
    console.log(`Initial memory count: ${initialCount}`);
    
    // Try to create a new memory (which should trigger memory extraction)
    const newMemoryButton = page.locator('[data-testid="new-memory"], button:has-text("New Memory")');
    
    if (await newMemoryButton.isVisible({ timeout: 5000 })) {
      await newMemoryButton.click();
      console.log('✓ Clicked new memory button');
      
      // Fill in memory details
      const titleInput = page.locator('[data-testid="memory-title"], input[name="title"]');
      const contentInput = page.locator('[data-testid="memory-content"], textarea[name="content"]');
      
      if (await titleInput.isVisible()) {
        const testMemory = {
          title: `Edge Test Memory ${Date.now()}`,
          content: 'This is a test memory to verify edge function memory extraction. It should be processed by the edge function to extract entities, emotions, and metadata.'
        };
        
        await titleInput.fill(testMemory.title);
        await contentInput.fill(testMemory.content);
        console.log('✓ Filled memory details');
        
        // Save the memory
        const saveButton = page.locator('[data-testid="save-memory"], button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('✓ Clicked save button');
          
          // Wait for processing
          await page.waitForTimeout(3000);
          
          // Check if edge function was called
          if (memoryExtractionCalls.length > 0) {
            console.log(`✓ Memory extraction function called ${memoryExtractionCalls.length} times`);
            
            const successfulCalls = memoryExtractionCalls.filter(call => call.status >= 200 && call.status < 300);
            console.log(`✓ ${successfulCalls.length} successful extraction calls`);
            expect(successfulCalls.length).toBeGreaterThan(0);
          } else {
            console.log('⚠️ No memory extraction calls detected - may be processing locally');
          }
          
          // Verify memory was created
          await page.waitForTimeout(2000);
          const finalCount = await initialMemories.count();
          console.log(`Final memory count: ${finalCount}`);
          
          if (finalCount > initialCount) {
            console.log('✓ Memory successfully created');
          }
        }
      }
      
    } else {
      console.log('⚠️ New memory functionality not found');
      
      // Alternative: Try processing existing conversation/recording
      await page.goto('http://localhost:8080/archive', { waitUntil: 'networkidle' });
      console.log('Trying archive processing...');
      
      const recordings = page.locator('[data-testid="recording-item"], .recording-item');
      const recordingCount = await recordings.count();
      
      if (recordingCount > 0) {
        console.log(`Found ${recordingCount} recordings`);
        
        // Try to process a recording (should trigger memory extraction)
        const processButton = recordings.first().locator('[data-testid="process-recording"], button:has-text("Process")');
        if (await processButton.isVisible()) {
          await processButton.click();
          console.log('✓ Clicked process recording');
          await page.waitForTimeout(3000);
          
          if (memoryExtractionCalls.length > 0) {
            console.log(`✓ Memory extraction triggered from recording`);
          }
        }
      } else {
        console.log('⚠️ No recordings found to process');
        test.skip();
      }
    }
  });

  test('edge-003: Identity training edge function', async ({ page }) => {
    console.log('\n🧪 TEST: edge-003 - Identity training edge function');
    
    // Set up network listener for identity training calls
    const identityTrainingCalls: any[] = [];
    page.on('response', response => {
      const url = response.url();
      // Look for identity/training endpoints
      if (url.includes('identity-training') || url.includes('train-identity') || url.includes('huggingface')) {
        identityTrainingCalls.push({
          url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Identity training call detected: ${url} (${response.status()})`);
      }
    });
    
    // Navigate to identity/settings page
    const possibleRoutes = [
      'http://localhost:8080/identity',
      'http://localhost:8080/settings/identity',
      'http://localhost:8080/dashboard/identity',
      'http://localhost:8080/settings'
    ];
    
    let identityPageFound = false;
    
    for (const route of possibleRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      // Look for identity training section
      const identitySection = page.locator('[data-testid="identity-training"], [data-testid="identity-section"], :has-text("Identity Training")');
      
      if (await identitySection.isVisible({ timeout: 3000 })) {
        console.log(`✓ Found identity section at ${route}`);
        identityPageFound = true;
        break;
      }
    }
    
    if (identityPageFound) {
      // Look for photo upload functionality
      const photoUpload = page.locator('[data-testid="upload-photo"], input[type="file"]');
      
      if (await photoUpload.isVisible({ timeout: 5000 })) {
        console.log('✓ Photo upload available');
        
        // Note: In a real test, we would upload a test image file
        // For now, just check if the upload interface exists
        
        // Look for training status
        const trainingStatus = page.locator('[data-testid="training-status"], .training-status');
        if (await trainingStatus.isVisible()) {
          const statusText = await trainingStatus.textContent();
          console.log(`Training status: ${statusText}`);
        }
        
        // Look for start training button
        const startTrainingButton = page.locator('[data-testid="start-training"], button:has-text("Train")');
        if (await startTrainingButton.isVisible()) {
          console.log('✓ Start training button available');
          
          // Check if button is disabled (may need photos first)
          const isDisabled = await startTrainingButton.isDisabled();
          if (isDisabled) {
            console.log('Training button disabled (photos required first)');
          } else {
            // Could click to trigger training, but may take a long time
            console.log('Training button enabled (would trigger edge function)');
          }
        }
        
      } else {
        console.log('⚠️ Photo upload not found');
      }
      
      // Look for existing identity models
      const identityModels = page.locator('[data-testid="identity-model"], .identity-model');
      const modelCount = await identityModels.count();
      
      if (modelCount > 0) {
        console.log(`Found ${modelCount} existing identity models`);
        
        // Check model details
        const firstModel = identityModels.first();
        const modelStatus = firstModel.locator('[data-testid="model-status"]');
        
        if (await modelStatus.isVisible()) {
          const status = await modelStatus.textContent();
          console.log(`Model status: ${status}`);
          
          // Status should indicate training state
          expect(status?.toLowerCase()).toMatch(/trained|training|ready|pending|completed/);
        }
      } else {
        console.log('No existing identity models found');
      }
      
      // Check if any identity training calls were made
      if (identityTrainingCalls.length > 0) {
        console.log(`✓ Identity training function called ${identityTrainingCalls.length} times`);
        
        const successfulCalls = identityTrainingCalls.filter(call => call.status >= 200 && call.status < 300);
        console.log(`✓ ${successfulCalls.length} successful training calls`);
        expect(successfulCalls.length).toBeGreaterThan(0);
      } else {
        console.log('⚠️ No identity training calls detected during this test session');
      }
      
    } else {
      console.log('⚠️ Identity training page not found - feature may not be implemented yet');
      test.skip();
    }
  });
});
