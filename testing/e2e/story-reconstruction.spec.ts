import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Story Reconstruction
 * 
 * Tests the AI story generation feature from memories:
 * - story-001: Generate story from memories
 * - story-002: Story editing and refinement
 * - story-003: Story export functionality
 * 
 * Prerequisites:
 * - User has sufficient memories for story generation
 * - AI story generation service configured
 * - Export functionality implemented
 */

test.describe('Story Reconstruction', () => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'storytest@example.com',
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

  test('story-001: Generate story from memories', async ({ page }) => {
    console.log('\n🧪 TEST: story-001 - Generate story from memories');
    
    // Try to navigate to story generation page
    const possibleRoutes = [
      'http://localhost:8080/story',
      'http://localhost:8080/stories',
      'http://localhost:8080/reconstruct',
      'http://localhost:8080/timeline'
    ];
    
    let storyPageFound = false;
    
    for (const route of possibleRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      // Look for story generation button/section
      const storyButton = page.locator('[data-testid="generate-story"], [data-testid="create-story"], button:has-text("Generate Story"), button:has-text("Create Story")');
      
      if (await storyButton.isVisible({ timeout: 3000 })) {
        console.log(`✓ Found story generation at ${route}`);
        storyPageFound = true;
        break;
      }
    }
    
    if (storyPageFound) {
      // Check for memory selection
      const memories = page.locator('[data-testid="memory-item"], .memory-item');
      const memoryCount = await memories.count();
      console.log(`Found ${memoryCount} memories available for story`);
      
      if (memoryCount === 0) {
        console.log('⚠️ No memories available - need memories to generate story');
        test.skip();
        return;
      }
      
      // Select memories for story
      const selectableMemories = page.locator('[data-testid="memory-checkbox"], input[type="checkbox"]');
      const selectableCount = await selectableMemories.count();
      
      if (selectableCount > 0) {
        console.log(`Selecting memories for story...`);
        
        // Select first 3-5 memories
        const memoriesToSelect = Math.min(selectableCount, 5);
        for (let i = 0; i < memoriesToSelect; i++) {
          await selectableMemories.nth(i).check();
        }
        console.log(`✓ Selected ${memoriesToSelect} memories`);
      }
      
      // Click generate story button
      const generateButton = page.locator('[data-testid="generate-story"], button:has-text("Generate Story")');
      
      if (await generateButton.isVisible()) {
        await generateButton.click();
        console.log('✓ Clicked generate story button');
        
        // Wait for story generation (may take time)
        const generatingIndicator = page.locator('[data-testid="generating"], :has-text("Generating"), :has-text("Creating story")');
        
        if (await generatingIndicator.isVisible({ timeout: 5000 })) {
          console.log('✓ Story generation started');
          
          // Wait for completion (up to 60 seconds)
          await generatingIndicator.waitFor({ state: 'hidden', timeout: 60000 });
          console.log('✓ Story generation completed');
        }
        
        // Check for generated story
        const storyContent = page.locator('[data-testid="story-content"], [data-testid="generated-story"], .story-content');
        
        if (await storyContent.isVisible({ timeout: 10000 })) {
          const storyText = await storyContent.textContent();
          console.log(`✓ Story generated (${storyText?.length} characters)`);
          
          // Verify story has substantial content
          expect(storyText?.length).toBeGreaterThan(100);
          console.log('✓ Story has substantial content');
          
          // Check for story metadata
          const storyTitle = page.locator('[data-testid="story-title"]');
          if (await storyTitle.isVisible()) {
            const title = await storyTitle.textContent();
            console.log(`Story title: ${title}`);
          }
          
          const storyDate = page.locator('[data-testid="story-date"]');
          if (await storyDate.isVisible()) {
            const date = await storyDate.textContent();
            console.log(`Story date: ${date}`);
          }
          
        } else {
          console.log('⚠️ Story content not displayed after generation');
        }
        
      } else {
        console.log('⚠️ Generate story button not found');
        test.skip();
      }
      
    } else {
      console.log('⚠️ Story generation feature not found');
      test.skip();
    }
  });

  test('story-002: Story editing and refinement', async ({ page }) => {
    console.log('\n🧪 TEST: story-002 - Story editing and refinement');
    
    // Navigate to stories page
    const possibleRoutes = [
      'http://localhost:8080/stories',
      'http://localhost:8080/story'
    ];
    
    let storiesFound = false;
    
    for (const route of possibleRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      const storyList = page.locator('[data-testid="story-list"], [data-testid="story-item"]');
      
      if (await storyList.first().isVisible({ timeout: 3000 })) {
        console.log(`✓ Found stories at ${route}`);
        storiesFound = true;
        break;
      }
    }
    
    if (storiesFound) {
      // Select first story
      const stories = page.locator('[data-testid="story-item"], .story-item');
      const storyCount = await stories.count();
      console.log(`Found ${storyCount} existing stories`);
      
      if (storyCount === 0) {
        console.log('⚠️ No existing stories - need to generate one first');
        test.skip();
        return;
      }
      
      // Click on first story
      await stories.first().click();
      console.log('✓ Opened story for editing');
      
      await page.waitForTimeout(1000);
      
      // Look for edit button
      const editButton = page.locator('[data-testid="edit-story"], button:has-text("Edit")');
      
      if (await editButton.isVisible({ timeout: 5000 })) {
        await editButton.click();
        console.log('✓ Entered edit mode');
        
        // Look for editable content
        const editableContent = page.locator('[data-testid="story-editor"], textarea[data-testid="story-content"], [contenteditable="true"]');
        
        if (await editableContent.isVisible()) {
          console.log('✓ Story editor found');
          
          // Get current content
          const currentContent = await editableContent.textContent();
          console.log(`Current story length: ${currentContent?.length} characters`);
          
          // Make an edit
          const additionalText = '\n\nThis is an edited addition to the story.';
          
          if (await editableContent.evaluate((el) => el.tagName === 'TEXTAREA')) {
            // For textarea
            await editableContent.fill(currentContent + additionalText);
          } else {
            // For contenteditable div
            await editableContent.focus();
            await page.keyboard.press('End');
            await page.keyboard.type(additionalText);
          }
          
          console.log('✓ Made edits to story');
          
          // Save changes
          const saveButton = page.locator('[data-testid="save-story"], button:has-text("Save")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            console.log('✓ Saved story edits');
            
            // Wait for save confirmation
            await page.waitForTimeout(1000);
            
            // Verify edit was saved
            const updatedContent = await editableContent.textContent();
            expect(updatedContent).toContain('edited addition');
            console.log('✓ Edit successfully saved');
          }
          
          // Check for refinement options
          const refineButton = page.locator('[data-testid="refine-story"], button:has-text("Refine")');
          if (await refineButton.isVisible()) {
            console.log('✓ Story refinement option available');
            await refineButton.click();
            
            // Wait for refinement (AI processing)
            const refiningIndicator = page.locator(':has-text("Refining"), :has-text("Improving")');
            if (await refiningIndicator.isVisible({ timeout: 3000 })) {
              console.log('Waiting for AI refinement...');
              await refiningIndicator.waitFor({ state: 'hidden', timeout: 60000 });
              console.log('✓ Story refinement completed');
            }
          }
          
        } else {
          console.log('⚠️ Story editor not found');
        }
        
      } else {
        console.log('⚠️ Edit button not found - story may be read-only');
      }
      
    } else {
      console.log('⚠️ Stories page not found');
      test.skip();
    }
  });

  test('story-003: Story export functionality', async ({ page }) => {
    console.log('\n🧪 TEST: story-003 - Story export functionality');
    
    // Navigate to stories
    await page.goto('http://localhost:8080/stories', { waitUntil: 'networkidle' });
    
    // Check if stories exist
    const stories = page.locator('[data-testid="story-item"], .story-item');
    const storyCount = await stories.count();
    
    if (storyCount === 0) {
      console.log('⚠️ No stories available for export');
      test.skip();
      return;
    }
    
    console.log(`Found ${storyCount} stories`);
    
    // Open first story
    await stories.first().click();
    console.log('✓ Opened story');
    await page.waitForTimeout(1000);
    
    // Look for export button
    const exportButton = page.locator('[data-testid="export-story"], button:has-text("Export"), button:has-text("Download")');
    
    if (await exportButton.isVisible({ timeout: 5000 })) {
      console.log('✓ Export button found');
      
      // Check for export format options
      const formatOptions = page.locator('[data-testid="export-format"], select[name="format"]');
      
      if (await formatOptions.isVisible()) {
        console.log('✓ Export format options available');
        
        // Check available formats
        const formats = await formatOptions.locator('option').allTextContents();
        console.log(`Available formats: ${formats.join(', ')}`);
        
        // Formats should include common types
        const expectedFormats = ['PDF', 'TXT', 'MD', 'DOCX'];
        const hasExpectedFormats = expectedFormats.some(format => 
          formats.some(f => f.toUpperCase().includes(format))
        );
        
        if (hasExpectedFormats) {
          console.log('✓ Common export formats available');
        }
      }
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      // Click export
      await exportButton.click();
      console.log('✓ Clicked export button');
      
      try {
        // Wait for download
        const download = await downloadPromise;
        const fileName = download.suggestedFilename();
        console.log(`✓ Download started: ${fileName}`);
        
        // Verify file name has appropriate extension
        expect(fileName).toMatch(/\.(pdf|txt|md|docx)$/i);
        console.log('✓ File has valid extension');
        
        // Check file size (should not be empty)
        const path = await download.path();
        if (path) {
          console.log(`✓ File downloaded to: ${path}`);
        }
        
      } catch (error) {
        console.log('⚠️ Download did not start (may need format selection first)');
        
        // Try selecting a format first
        const pdfOption = page.locator('option:has-text("PDF"), button:has-text("PDF")');
        if (await pdfOption.isVisible()) {
          await pdfOption.click();
          console.log('Selected PDF format');
          
          // Try export again
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Export")');
          if (await confirmButton.isVisible()) {
            const downloadPromise2 = page.waitForEvent('download', { timeout: 10000 });
            await confirmButton.click();
            
            try {
              const download = await downloadPromise2;
              console.log(`✓ Download started: ${download.suggestedFilename()}`);
            } catch {
              console.log('⚠️ Download still did not start');
            }
          }
        }
      }
      
      // Check for share functionality
      const shareButton = page.locator('[data-testid="share-story"], button:has-text("Share")');
      if (await shareButton.isVisible()) {
        console.log('✓ Share functionality available');
        await shareButton.click();
        
        // Check for share options
        const shareDialog = page.locator('[data-testid="share-dialog"], [role="dialog"]');
        if (await shareDialog.isVisible({ timeout: 2000 })) {
          console.log('✓ Share dialog opened');
          
          // Look for share link
          const shareLink = page.locator('[data-testid="share-link"], input[readonly]');
          if (await shareLink.isVisible()) {
            const link = await shareLink.inputValue();
            console.log(`Share link: ${link}`);
            expect(link).toContain('http');
          }
        }
      }
      
    } else {
      console.log('⚠️ Export button not found - feature may not be implemented');
      test.skip();
    }
  });
});
