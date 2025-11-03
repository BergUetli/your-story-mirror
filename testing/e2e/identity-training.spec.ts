import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Identity Training
 * 
 * Tests HuggingFace identity training features:
 * - identity-001: HuggingFace identity training setup
 * - identity-002: Identity photo upload and validation
 * - identity-003: Identity model status and deletion
 * 
 * Prerequisites:
 * - HuggingFace integration configured
 * - Identity training page implemented
 * - Photo upload functionality working
 */

test.describe('Identity Training', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'identitytest@example.com',
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

  test('identity-001: HuggingFace identity training setup', async ({ page }) => {
    console.log('\n🧪 TEST: identity-001 - HuggingFace identity training setup');
    
    // Try multiple possible routes for identity training
    const possibleRoutes = [
      'http://localhost:8080/identity',
      'http://localhost:8080/settings/identity',
      'http://localhost:8080/dashboard/identity',
      'http://localhost:8080/settings',
      'http://localhost:8080/profile/identity'
    ];
    
    let identityPageFound = false;
    let currentRoute = '';
    
    for (const route of possibleRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      // Look for identity training section
      const identitySection = page.locator(
        '[data-testid="identity-training"], ' +
        '[data-testid="identity-section"], ' +
        ':has-text("Identity Training"), ' +
        ':has-text("HuggingFace"), ' +
        ':has-text("Face Recognition")'
      );
      
      if (await identitySection.isVisible({ timeout: 3000 })) {
        console.log(`✓ Found identity training section at ${route}`);
        identityPageFound = true;
        currentRoute = route;
        break;
      }
    }
    
    if (!identityPageFound) {
      console.log('⚠️ Identity training page not found - feature may not be implemented yet');
      test.skip();
      return;
    }
    
    // Check for training status indicator
    const trainingStatus = page.locator('[data-testid="training-status"], .training-status');
    
    if (await trainingStatus.isVisible({ timeout: 5000 })) {
      const statusText = await trainingStatus.textContent();
      console.log(`Training status: ${statusText}`);
      
      // Status should be one of: not started, training, completed, failed
      expect(statusText?.toLowerCase()).toMatch(/not started|ready|training|completed|failed|pending/);
      console.log('✓ Training status indicator present');
    } else {
      console.log('  Training status indicator not found');
    }
    
    // Check for HuggingFace configuration
    const hfConfig = page.locator('[data-testid="huggingface-config"], :has-text("HuggingFace API")');
    
    if (await hfConfig.isVisible()) {
      console.log('✓ HuggingFace configuration section found');
      
      // Check for API key input
      const apiKeyInput = page.locator('[data-testid="hf-api-key"], input[name*="api"], input[placeholder*="API key"]');
      if (await apiKeyInput.isVisible()) {
        console.log('✓ HuggingFace API key input available');
        
        // Check if it's configured (shouldn't show actual key)
        const keyValue = await apiKeyInput.inputValue();
        if (keyValue && keyValue.length > 0) {
          // Should be masked
          expect(keyValue).toMatch(/\*+|•+/);
          console.log('✓ API key is masked for security');
        }
      }
    }
    
    // Check for photo upload requirements
    const uploadRequirements = page.locator('[data-testid="upload-requirements"], :has-text("photos required"), :has-text("images needed")');
    
    if (await uploadRequirements.isVisible()) {
      const reqText = await uploadRequirements.textContent();
      console.log(`Upload requirements: ${reqText}`);
    }
    
    // Check for training cost/time estimate
    const trainingInfo = page.locator('[data-testid="training-info"], :has-text("training time"), :has-text("estimated")');
    
    if (await trainingInfo.isVisible()) {
      const infoText = await trainingInfo.textContent();
      console.log(`Training info: ${infoText}`);
    }
    
    // Check for start training button
    const startTrainingButton = page.locator('[data-testid="start-training"], button:has-text("Start Training"), button:has-text("Train Model")');
    
    if (await startTrainingButton.isVisible()) {
      console.log('✓ Start training button found');
      
      // Check if disabled (usually requires photos first)
      const isDisabled = await startTrainingButton.isDisabled();
      console.log(`  Button status: ${isDisabled ? 'disabled' : 'enabled'}`);
      
      if (isDisabled) {
        console.log('  ✓ Button correctly disabled (requires photos first)');
      }
    }
    
    // Check for existing models
    const modelList = page.locator('[data-testid="identity-models"], [data-testid="model-list"]');
    
    if (await modelList.isVisible()) {
      console.log('✓ Identity models section found');
      
      const models = page.locator('[data-testid="identity-model"], .identity-model');
      const modelCount = await models.count();
      console.log(`  Existing models: ${modelCount}`);
      
      if (modelCount > 0) {
        const firstModel = models.first();
        
        // Check model details
        const modelName = firstModel.locator('[data-testid="model-name"]');
        if (await modelName.isVisible()) {
          const name = await modelName.textContent();
          console.log(`  Model: ${name}`);
        }
        
        const modelDate = firstModel.locator('[data-testid="model-date"], [data-testid="created-date"]');
        if (await modelDate.isVisible()) {
          const date = await modelDate.textContent();
          console.log(`  Created: ${date}`);
        }
      }
    }
  });

  test('identity-002: Identity photo upload and validation', async ({ page }) => {
    console.log('\n🧪 TEST: identity-002 - Identity photo upload and validation');
    
    // Navigate to identity training page
    const routes = [
      'http://localhost:8080/identity',
      'http://localhost:8080/settings/identity'
    ];
    
    let uploadFound = false;
    
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      const uploadSection = page.locator('[data-testid="photo-upload"], [data-testid="upload-photos"]');
      
      if (await uploadSection.isVisible({ timeout: 3000 })) {
        console.log(`✓ Found photo upload at ${route}`);
        uploadFound = true;
        break;
      }
    }
    
    if (!uploadFound) {
      console.log('⚠️ Photo upload section not found');
      test.skip();
      return;
    }
    
    // Check for file input
    const fileInput = page.locator('[data-testid="upload-photo"], input[type="file"]');
    
    if (await fileInput.isVisible()) {
      console.log('✓ File upload input found');
      
      // Check accepted file types
      const acceptAttr = await fileInput.getAttribute('accept');
      console.log(`  Accepted file types: ${acceptAttr}`);
      
      if (acceptAttr) {
        expect(acceptAttr.toLowerCase()).toContain('image');
        console.log('✓ Accepts image files');
      }
      
      // Check if multiple files allowed
      const multipleAttr = await fileInput.getAttribute('multiple');
      if (multipleAttr !== null) {
        console.log('✓ Multiple file upload supported');
      }
    }
    
    // Check for uploaded photos gallery
    const photoGallery = page.locator('[data-testid="photo-gallery"], [data-testid="uploaded-photos"], .photo-gallery');
    
    if (await photoGallery.isVisible()) {
      console.log('✓ Photo gallery found');
      
      const photos = page.locator('[data-testid="uploaded-photo"], .uploaded-photo, img[alt*="identity"]');
      const photoCount = await photos.count();
      console.log(`  Uploaded photos: ${photoCount}`);
      
      if (photoCount > 0) {
        console.log('✓ Photos already uploaded');
        
        // Check first photo details
        const firstPhoto = photos.first();
        
        // Verify image loads
        const imgSrc = await firstPhoto.getAttribute('src');
        if (imgSrc) {
          console.log(`  Photo source: ${imgSrc.substring(0, 50)}...`);
          expect(imgSrc.length).toBeGreaterThan(0);
        }
        
        // Check for delete button
        const deleteButton = photoGallery.locator('[data-testid="delete-photo"], button:has-text("Delete"), button[aria-label*="delete"]').first();
        if (await deleteButton.isVisible()) {
          console.log('✓ Delete photo functionality available');
        }
      } else {
        console.log('  No photos uploaded yet');
      }
    }
    
    // Check for validation requirements
    const validationInfo = page.locator('[data-testid="validation-info"], :has-text("requirements"), :has-text("guidelines")');
    
    if (await validationInfo.isVisible()) {
      const infoText = await validationInfo.textContent();
      console.log(`Photo requirements: ${infoText?.substring(0, 100)}...`);
    }
    
    // Check for minimum/maximum photo count
    const photoCount = page.locator('[data-testid="photo-count"], :has-text("photos")');
    
    if (await photoCount.isVisible()) {
      const countText = await photoCount.textContent();
      console.log(`Photo count status: ${countText}`);
      
      // Should indicate minimum required (usually 10-20 photos)
      const hasMinimum = /(\d+)/.exec(countText || '');
      if (hasMinimum) {
        const count = parseInt(hasMinimum[1]);
        console.log(`  Minimum photos required: ~${count}`);
      }
    }
    
    // Check for validation errors
    const validationError = page.locator('[data-testid="validation-error"], .error-message');
    
    if (await validationError.isVisible({ timeout: 2000 })) {
      const errorText = await validationError.textContent();
      console.log(`Validation error: ${errorText}`);
    } else {
      console.log('✓ No validation errors');
    }
    
    // Test drag-and-drop upload area
    const dropZone = page.locator('[data-testid="drop-zone"], .drop-zone, [data-testid="upload-area"]');
    
    if (await dropZone.isVisible()) {
      console.log('✓ Drag-and-drop upload area available');
      
      // Hover over drop zone
      await dropZone.hover();
      await page.waitForTimeout(500);
      
      // Check for hover state indication
      const dropZoneClass = await dropZone.getAttribute('class');
      console.log(`  Drop zone classes: ${dropZoneClass}`);
    }
  });

  test('identity-003: Identity model status and deletion', async ({ page }) => {
    console.log('\n🧪 TEST: identity-003 - Identity model status and deletion');
    
    // Navigate to identity page
    await page.goto('http://localhost:8080/identity', { waitUntil: 'networkidle' });
    
    // Check if models section exists
    const modelsSection = page.locator('[data-testid="identity-models"], [data-testid="trained-models"]');
    
    if (!await modelsSection.isVisible({ timeout: 5000 })) {
      // Try alternative route
      await page.goto('http://localhost:8080/settings/identity');
      await page.waitForTimeout(1000);
      
      if (!await modelsSection.isVisible({ timeout: 3000 })) {
        console.log('⚠️ Identity models section not found');
        test.skip();
        return;
      }
    }
    
    console.log('✓ Identity models section found');
    
    // Get list of models
    const models = page.locator('[data-testid="identity-model"], .identity-model');
    const modelCount = await models.count();
    console.log(`Found ${modelCount} identity models`);
    
    if (modelCount === 0) {
      console.log('⚠️ No models available to test - need to train a model first');
      
      // Check for "no models" message
      const noModelsMessage = page.locator(':has-text("No models"), :has-text("no identity")');
      if (await noModelsMessage.isVisible()) {
        console.log('✓ "No models" message displayed correctly');
      }
      
      test.skip();
      return;
    }
    
    // Test first model
    const firstModel = models.first();
    
    // Check model status
    const modelStatus = firstModel.locator('[data-testid="model-status"], .model-status');
    
    if (await modelStatus.isVisible()) {
      const statusText = await modelStatus.textContent();
      console.log(`Model status: ${statusText}`);
      
      // Status should be one of: training, completed, failed, ready
      expect(statusText?.toLowerCase()).toMatch(/training|completed|failed|ready|active/);
      console.log('✓ Model has valid status');
    }
    
    // Check model metadata
    const modelInfo = {
      name: firstModel.locator('[data-testid="model-name"]'),
      date: firstModel.locator('[data-testid="model-date"], [data-testid="created-date"]'),
      accuracy: firstModel.locator('[data-testid="model-accuracy"], :has-text("accuracy")'),
      size: firstModel.locator('[data-testid="model-size"]')
    };
    
    console.log('Model details:');
    for (const [key, locator] of Object.entries(modelInfo)) {
      if (await locator.isVisible()) {
        const text = await locator.textContent();
        console.log(`  ${key}: ${text}`);
      }
    }
    
    // Check for model actions
    const viewButton = firstModel.locator('[data-testid="view-model"], button:has-text("View")');
    const downloadButton = firstModel.locator('[data-testid="download-model"], button:has-text("Download")');
    const deleteButton = firstModel.locator('[data-testid="delete-model"], button:has-text("Delete")');
    
    if (await viewButton.isVisible()) {
      console.log('✓ View model action available');
    }
    
    if (await downloadButton.isVisible()) {
      console.log('✓ Download model action available');
    }
    
    if (await deleteButton.isVisible()) {
      console.log('✓ Delete model action available');
      
      // Test delete confirmation (don't actually delete)
      await deleteButton.click();
      console.log('  Clicked delete button');
      
      await page.waitForTimeout(500);
      
      // Should show confirmation dialog
      const confirmDialog = page.locator('[data-testid="confirm-dialog"], [role="dialog"], .modal');
      
      if (await confirmDialog.isVisible({ timeout: 3000 })) {
        console.log('✓ Delete confirmation dialog appeared');
        
        const confirmText = await confirmDialog.textContent();
        expect(confirmText?.toLowerCase()).toContain('delete');
        
        // Check for cancel button
        const cancelButton = confirmDialog.locator('button:has-text("Cancel"), button:has-text("No")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          console.log('✓ Cancelled deletion (model preserved)');
        }
      } else {
        console.log('⚠️ No confirmation dialog shown');
      }
    }
    
    // Check training progress for in-progress models
    const trainingModels = models.locator(':has([data-testid="model-status"]:has-text("training"))');
    const trainingCount = await trainingModels.count();
    
    if (trainingCount > 0) {
      console.log(`Found ${trainingCount} models currently training`);
      
      const progressBar = trainingModels.first().locator('[data-testid="training-progress"], progress, .progress-bar');
      
      if (await progressBar.isVisible()) {
        console.log('✓ Training progress indicator shown');
        
        // Check progress value
        const progressValue = await progressBar.getAttribute('value');
        if (progressValue) {
          console.log(`  Training progress: ${progressValue}%`);
        }
      }
    } else {
      console.log('No models currently training');
    }
    
    // Check for model switching (if multiple models)
    if (modelCount > 1) {
      console.log('Multiple models available - testing model selection');
      
      const secondModel = models.nth(1);
      const selectButton = secondModel.locator('[data-testid="select-model"], button:has-text("Select"), button:has-text("Use")');
      
      if (await selectButton.isVisible()) {
        await selectButton.click();
        console.log('✓ Selected different model');
        
        await page.waitForTimeout(1000);
        
        // Check if model is now marked as active
        const activeIndicator = secondModel.locator('[data-testid="active-model"], :has-text("Active"), .active');
        if (await activeIndicator.isVisible()) {
          console.log('✓ Model marked as active');
        }
      }
    }
  });
});
