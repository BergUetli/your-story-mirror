/**
 * COMPONENT-SPECIFIC DESIGN ANALYSIS
 * 
 * This test analyzes EACH component/page individually and generates
 * specific CSS improvements for:
 * - Timeline (cards, layout, colors, spacing)
 * - Archive (list view, card view, typography)
 * - Sanctuary/Voice Agent (orb, animations, layout)
 * - Dashboard (metrics, cards, hierarchy)
 * - Memory components (cards, dialogs, forms)
 * - Navigation (sidebar, mobile menu)
 * 
 * Uses Ollama AI to compare against best design practices and generate
 * specific, actionable CSS improvements for each component.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Helper: Call Ollama AI (running on user's local machine)
async function callOllamaAI(prompt: string): Promise<string> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('❌ Error calling Ollama:', error);
    console.log('💡 Make sure Ollama is running: ollama serve');
    return 'ERROR: Could not connect to Ollama. Please ensure Ollama is running.';
  }
}

// Helper: Save suggestions to file
function saveSuggestions(componentName: string, content: string) {
  const outputDir = path.join(process.cwd(), 'testing', 'design-suggestions', 'components');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `${componentName}-improvements-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, content);
  console.log(`\n✅ Saved to: testing/design-suggestions/components/${filename}`);
  
  return filepath;
}

test.describe('Component Design Analysis - Ollama AI', () => {
  
  test('Timeline Component - Design Analysis', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for Ollama AI inference
    console.log('📅 ANALYZING: Timeline Component\n');
    
    await page.goto('http://localhost:8080/timeline');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot for reference
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'timeline-current.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Analyze timeline design
    const timelineAnalysis = await page.evaluate(() => {
      // Memory cards
      const memoryCards = Array.from(document.querySelectorAll('[class*="memory"], [class*="card"], [class*="timeline"]')).slice(0, 5);
      
      const cardStyles = memoryCards.map(card => {
        const computed = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return {
          width: `${rect.width.toFixed(0)}px`,
          height: `${rect.height.toFixed(0)}px`,
          background: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          margin: computed.margin,
          boxShadow: computed.boxShadow,
          border: computed.border,
        };
      });
      
      // Timeline layout
      const timelineContainer = document.querySelector('[class*="timeline"]') || document.querySelector('main');
      const containerStyle = timelineContainer ? window.getComputedStyle(timelineContainer) : null;
      
      // Typography
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 3);
      const headingStyles = headings.map(h => {
        const computed = window.getComputedStyle(h);
        return {
          tag: h.tagName.toLowerCase(),
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          color: computed.color,
          lineHeight: computed.lineHeight,
        };
      });
      
      return {
        cardCount: memoryCards.length,
        cardStyles: cardStyles,
        containerLayout: containerStyle ? {
          display: containerStyle.display,
          gap: containerStyle.gap,
          padding: containerStyle.padding,
          maxWidth: containerStyle.maxWidth,
        } : null,
        headings: headingStyles,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      };
    });
    
    console.log('📊 Timeline Analysis:');
    console.log(`   Memory cards found: ${timelineAnalysis.cardCount}`);
    console.log(`   Viewport: ${timelineAnalysis.viewport.width}x${timelineAnalysis.viewport.height}`);
    
    // Generate AI suggestions with Ollama
    const prompt = `You are a professional UI/UX designer analyzing a Timeline component for a memory/journal app.

CURRENT DESIGN:
- Memory cards: ${timelineAnalysis.cardCount} cards
- Card styles: ${JSON.stringify(timelineAnalysis.cardStyles[0], null, 2)}
- Container layout: ${JSON.stringify(timelineAnalysis.containerLayout, null, 2)}
- Typography: ${JSON.stringify(timelineAnalysis.headings, null, 2)}

REFERENCE: Best timeline designs from Apple Photos, Google Photos, Day One journal app

ANALYZE AND PROVIDE:
1. Assessment of current timeline design (pros and cons)
2. Specific CSS improvements for memory cards (colors, shadows, borders, spacing)
3. Layout improvements (grid, spacing, alignment)
4. Typography improvements (hierarchy, readability)
5. Visual enhancements (animations, hover states, focus states)
6. Mobile responsiveness improvements
7. Before/after CSS code examples

FOCUS ON:
- Card design that makes memories feel precious and important
- Subtle shadows and depth for visual hierarchy
- Comfortable spacing for easy scanning
- Clear date/time presentation
- Image/thumbnail treatment
- Emotional design that respects the content

Format as markdown with CSS code blocks. Be specific and actionable.`;

    console.log('\n🤖 Calling Ollama AI for Timeline suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Timeline Component - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: Timeline (/timeline)

## Current State Screenshot
![Timeline Current Design](./timeline-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(timelineAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update card styles in TimelineMemoryCard.tsx
- [ ] Adjust container layout in Timeline.tsx
- [ ] Test on mobile (375px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1440px width)
- [ ] Verify accessibility (contrast, focus states)
- [ ] Test with many cards (performance)
- [ ] Test with few cards (empty states)
`;
    
    saveSuggestions('timeline', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Archive Component - Design Analysis', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for Ollama AI inference
    console.log('📼 ANALYZING: Archive Component\n');
    
    await page.goto('http://localhost:8080/archive');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'archive-current.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    const archiveAnalysis = await page.evaluate(() => {
      // Recording items
      const recordings = Array.from(document.querySelectorAll('[class*="recording"], li, article')).slice(0, 5);
      
      const recordingStyles = recordings.map(rec => {
        const computed = window.getComputedStyle(rec);
        const rect = rec.getBoundingClientRect();
        return {
          width: `${rect.width.toFixed(0)}px`,
          height: `${rect.height.toFixed(0)}px`,
          background: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          border: computed.border,
          hover: computed.cursor === 'pointer',
        };
      });
      
      // Audio player
      const audioPlayer = document.querySelector('audio') || document.querySelector('[class*="player"]');
      const playerStyle = audioPlayer ? {
        display: window.getComputedStyle(audioPlayer).display,
        width: window.getComputedStyle(audioPlayer).width,
      } : null;
      
      return {
        recordingCount: recordings.length,
        recordingStyles: recordingStyles,
        hasAudioPlayer: !!audioPlayer,
        playerStyle: playerStyle,
      };
    });
    
    console.log('📊 Archive Analysis:');
    console.log(`   Recordings found: ${archiveAnalysis.recordingCount}`);
    console.log(`   Has audio player: ${archiveAnalysis.hasAudioPlayer}`);
    
    const prompt = `You are a professional UI/UX designer analyzing an Archive component for voice recordings in a memory app.

CURRENT DESIGN:
- Recordings: ${archiveAnalysis.recordingCount} items
- Recording item style: ${JSON.stringify(archiveAnalysis.recordingStyles[0], null, 2)}
- Has audio player: ${archiveAnalysis.hasAudioPlayer}

REFERENCE: Best archive/library designs from Spotify, Apple Music, Voice Memos app

ANALYZE AND PROVIDE:
1. Assessment of current archive layout
2. Recording list item improvements (visual hierarchy, metadata display)
3. Audio player design improvements (controls, progress, waveform?)
4. Search/filter UI improvements
5. Empty state design
6. Hover/active states
7. Mobile optimization

FOCUS ON:
- Easy scanning of many recordings
- Clear metadata (date, duration, title, transcript preview)
- Intuitive playback controls
- Visual feedback for current/playing state
- Accessibility (keyboard navigation, screen readers)

Format as markdown with CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Archive suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Archive Component - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: Archive (/archive)

## Current State Screenshot
![Archive Current Design](./archive-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(archiveAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update recording list styles in MemoryArchive.tsx
- [ ] Improve audio player UI
- [ ] Add hover states
- [ ] Implement better metadata display
- [ ] Test with 0 recordings (empty state)
- [ ] Test with 100+ recordings (performance)
- [ ] Mobile responsive testing
- [ ] Keyboard navigation testing
`;
    
    saveSuggestions('archive', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Sanctuary/Voice Agent - Design Analysis', async ({ page }) => {
    console.log('🎤 ANALYZING: Sanctuary/Voice Agent Component\n');
    
    await page.goto('http://localhost:8080/sanctuary');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'sanctuary-current.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    const sanctuaryAnalysis = await page.evaluate(() => {
      // Solin orb
      const orb = document.querySelector('.solin-orb') || document.querySelector('[class*="orb"]');
      const orbStyle = orb ? {
        width: window.getComputedStyle(orb).width,
        height: window.getComputedStyle(orb).height,
        borderRadius: window.getComputedStyle(orb).borderRadius,
        animation: window.getComputedStyle(orb).animation,
        cursor: window.getComputedStyle(orb).cursor,
      } : null;
      
      // Background/container
      const container = document.querySelector('main') || document.querySelector('[class*="sanctuary"]');
      const containerStyle = container ? {
        background: window.getComputedStyle(container).background,
        padding: window.getComputedStyle(container).padding,
        display: window.getComputedStyle(container).display,
        alignItems: window.getComputedStyle(container).alignItems,
        justifyContent: window.getComputedStyle(container).justifyContent,
      } : null;
      
      // Caption/status text
      const caption = document.querySelector('.solin-caption') || document.querySelector('[class*="caption"], [class*="status"]');
      const captionStyle = caption ? {
        fontSize: window.getComputedStyle(caption).fontSize,
        color: window.getComputedStyle(caption).color,
        textAlign: window.getComputedStyle(caption).textAlign,
      } : null;
      
      return {
        hasOrb: !!orb,
        orbStyle: orbStyle,
        containerStyle: containerStyle,
        captionStyle: captionStyle,
      };
    });
    
    console.log('📊 Sanctuary Analysis:');
    console.log(`   Has Solin orb: ${sanctuaryAnalysis.hasOrb}`);
    console.log(`   Orb size: ${sanctuaryAnalysis.orbStyle?.width}`);
    
    const prompt = `You are a professional UI/UX designer analyzing a Voice Agent interface (Sanctuary) for a memory app.

CURRENT DESIGN:
- Orb present: ${sanctuaryAnalysis.hasOrb}
- Orb style: ${JSON.stringify(sanctuaryAnalysis.orbStyle, null, 2)}
- Container: ${JSON.stringify(sanctuaryAnalysis.containerStyle, null, 2)}
- Caption: ${JSON.stringify(sanctuaryAnalysis.captionStyle, null, 2)}

REFERENCE: Best voice interfaces from Siri, Google Assistant, Amazon Alexa, Humane AI Pin

ANALYZE AND PROVIDE:
1. Assessment of current voice agent design
2. Orb improvements (size, shape, colors, shadows, animations)
3. Background/ambience improvements (gradients, colors, mood)
4. Status indicators (listening, speaking, thinking)
5. Caption/text improvements (typography, positioning, animations)
6. Interaction feedback (tap, hover, voice wave animations)
7. Accessibility (visual feedback for deaf users, clear states)

FOCUS ON:
- Emotional design that feels warm and welcoming
- Clear visual feedback for different states (idle, listening, speaking)
- Smooth, calming animations
- High contrast for accessibility
- Mobile-first design (thumb-friendly)
- Trust and safety cues

Format as markdown with CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Sanctuary suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Sanctuary/Voice Agent - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: Sanctuary (/sanctuary)

## Current State Screenshot
![Sanctuary Current Design](./sanctuary-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(sanctuaryAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update orb styles in src/index.css (.solin-orb)
- [ ] Improve animations
- [ ] Add better state indicators
- [ ] Test all states (idle, listening, speaking, error)
- [ ] Mobile touch target testing (min 44x44px)
- [ ] Accessibility testing (voice-over, keyboard)
- [ ] Performance testing (animation smoothness)
`;
    
    saveSuggestions('sanctuary', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Dashboard Component - Design Analysis', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for Ollama AI inference
    console.log('📊 ANALYZING: Dashboard Component\n');
    
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'dashboard-current.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    const dashboardAnalysis = await page.evaluate(() => {
      // Stat cards/metrics
      const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="metric"], [class*="stat"]')).slice(0, 6);
      
      const cardStyles = cards.map(card => {
        const computed = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return {
          width: `${rect.width.toFixed(0)}px`,
          height: `${rect.height.toFixed(0)}px`,
          background: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          boxShadow: computed.boxShadow,
        };
      });
      
      // Grid layout
      const container = document.querySelector('main') || document.querySelector('[class*="dashboard"]');
      const gridStyle = container ? {
        display: window.getComputedStyle(container).display,
        gridTemplateColumns: window.getComputedStyle(container).gridTemplateColumns,
        gap: window.getComputedStyle(container).gap,
      } : null;
      
      return {
        cardCount: cards.length,
        cardStyles: cardStyles,
        gridLayout: gridStyle,
      };
    });
    
    console.log('📊 Dashboard Analysis:');
    console.log(`   Cards/metrics found: ${dashboardAnalysis.cardCount}`);
    
    const prompt = `You are a professional UI/UX designer analyzing a Dashboard component for a memory/journal app.

CURRENT DESIGN:
- Metric cards: ${dashboardAnalysis.cardCount} cards
- Card style: ${JSON.stringify(dashboardAnalysis.cardStyles[0], null, 2)}
- Grid layout: ${JSON.stringify(dashboardAnalysis.gridLayout, null, 2)}

REFERENCE: Best dashboard designs from Notion, Linear, Height, Apple Health

ANALYZE AND PROVIDE:
1. Assessment of current dashboard layout
2. Card design improvements (hierarchy, icons, numbers, labels)
3. Grid layout improvements (responsive, spacing)
4. Color usage for different metrics
5. Data visualization improvements (charts, graphs, sparklines)
6. Empty state design
7. Loading state design

FOCUS ON:
- Clear hierarchy (most important metrics first)
- Scannable layout
- Use of color to communicate meaning
- Responsive grid (mobile, tablet, desktop)
- Accessible data presentation
- Actionable insights (not just numbers)

Format as markdown with CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Dashboard suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Dashboard Component - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: Dashboard (/dashboard)

## Current State Screenshot
![Dashboard Current Design](./dashboard-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(dashboardAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update card styles in Dashboard.tsx
- [ ] Improve grid layout
- [ ] Add responsive breakpoints
- [ ] Test with different data values
- [ ] Empty state design
- [ ] Loading state design
- [ ] Mobile layout testing
`;
    
    saveSuggestions('dashboard', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Navigation/Sidebar - Design Analysis', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for Ollama AI inference
    console.log('🧭 ANALYZING: Navigation/Sidebar Component\n');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'navigation-current.png');
    await page.screenshot({ path: screenshotPath });
    
    const navAnalysis = await page.evaluate(() => {
      // Sidebar
      const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('nav');
      const sidebarStyle = sidebar ? {
        width: window.getComputedStyle(sidebar).width,
        background: window.getComputedStyle(sidebar).background,
        padding: window.getComputedStyle(sidebar).padding,
        position: window.getComputedStyle(sidebar).position,
      } : null;
      
      // Nav items
      const navItems = Array.from(document.querySelectorAll('nav a, [class*="nav-item"]')).slice(0, 5);
      const navItemStyles = navItems.map(item => {
        const computed = window.getComputedStyle(item);
        return {
          fontSize: computed.fontSize,
          padding: computed.padding,
          color: computed.color,
          background: computed.backgroundColor,
          borderRadius: computed.borderRadius,
        };
      });
      
      return {
        hasSidebar: !!sidebar,
        sidebarStyle: sidebarStyle,
        navItemCount: navItems.length,
        navItemStyles: navItemStyles,
      };
    });
    
    console.log('📊 Navigation Analysis:');
    console.log(`   Has sidebar: ${navAnalysis.hasSidebar}`);
    console.log(`   Nav items: ${navAnalysis.navItemCount}`);
    
    const prompt = `You are a professional UI/UX designer analyzing a Navigation/Sidebar component for a memory app.

CURRENT DESIGN:
- Has sidebar: ${navAnalysis.hasSidebar}
- Sidebar style: ${JSON.stringify(navAnalysis.sidebarStyle, null, 2)}
- Nav items: ${navAnalysis.navItemCount}
- Nav item style: ${JSON.stringify(navAnalysis.navItemStyles[0], null, 2)}

REFERENCE: Best navigation from Linear, Notion, Figma, VS Code

ANALYZE AND PROVIDE:
1. Assessment of current navigation design
2. Sidebar improvements (width, colors, spacing)
3. Nav item improvements (active state, hover, icons, labels)
4. Mobile navigation improvements (hamburger menu, drawer)
5. Hierarchy (primary vs secondary items)
6. User profile section design
7. Collapsible sidebar design

FOCUS ON:
- Easy navigation between sections
- Clear active/current state
- Icon + label clarity
- Touch-friendly on mobile (min 44x44px)
- Keyboard navigation
- Smooth animations

Format as markdown with CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Navigation suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Navigation/Sidebar - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: Navigation/Sidebar

## Current State Screenshot
![Navigation Current Design](./navigation-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(navAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update sidebar styles
- [ ] Improve nav item states (active, hover)
- [ ] Mobile navigation testing
- [ ] Keyboard navigation testing
- [ ] Add icons to nav items
- [ ] Test collapsible sidebar
`;
    
    saveSuggestions('navigation', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Memory Card Component - Design Analysis', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for Ollama AI inference
    console.log('🎴 ANALYZING: Memory Card Component\n');
    
    await page.goto('http://localhost:8080/timeline');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'components', 'memory-card-current.png');
    await page.screenshot({ path: screenshotPath });
    
    const cardAnalysis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[class*="memory"]')).slice(0, 3);
      
      const cardDetails = cards.map(card => {
        const computed = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        
        // Find elements within card
        const title = card.querySelector('h1, h2, h3, h4, [class*="title"]');
        const date = card.querySelector('[class*="date"], time');
        const content = card.querySelector('p, [class*="content"], [class*="text"]');
        const image = card.querySelector('img');
        
        return {
          dimensions: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`,
          background: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          boxShadow: computed.boxShadow,
          border: computed.border,
          hasTitle: !!title,
          hasDate: !!date,
          hasContent: !!content,
          hasImage: !!image,
          titleStyle: title ? {
            fontSize: window.getComputedStyle(title).fontSize,
            fontWeight: window.getComputedStyle(title).fontWeight,
            color: window.getComputedStyle(title).color,
          } : null,
        };
      });
      
      return {
        cardCount: cards.length,
        cardDetails: cardDetails,
      };
    });
    
    console.log('📊 Memory Card Analysis:');
    console.log(`   Cards analyzed: ${cardAnalysis.cardCount}`);
    
    const prompt = `You are a professional UI/UX designer analyzing Memory Card components for a journal app.

CURRENT DESIGN:
- Sample card: ${JSON.stringify(cardAnalysis.cardDetails[0], null, 2)}

REFERENCE: Best card designs from Apple Photos, Day One, Journey app, Google Photos

ANALYZE AND PROVIDE:
1. Assessment of current card design
2. Visual hierarchy improvements (title, date, content, image)
3. Card dimensions and aspect ratio recommendations
4. Spacing improvements (padding, margins between elements)
5. Typography improvements (title, date, content)
6. Image treatment (size, border-radius, aspect ratio, placeholder)
7. Hover/active states
8. Shadow and depth recommendations
9. Color usage (background, borders, accents)
10. Mobile optimization

FOCUS ON:
- Cards feel precious (memories are important)
- Easy to scan in a list/grid
- Clear visual hierarchy
- Beautiful image treatment
- Readable text
- Comfortable white space
- Subtle depth (shadows)

Format as markdown with CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Memory Card suggestions...');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Memory Card Component - Design Improvements

Generated: ${new Date().toLocaleString()}
Component: TimelineMemoryCard

## Current State Screenshot
![Memory Card Current Design](./memory-card-current.png)

## Analysis Data
\`\`\`json
${JSON.stringify(cardAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Implementation Checklist
- [ ] Update TimelineMemoryCard.tsx styles
- [ ] Test with different content lengths
- [ ] Test with/without images
- [ ] Test hover states
- [ ] Mobile responsive testing
- [ ] Accessibility testing
`;
    
    saveSuggestions('memory-card', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
  });

  test('Complete Design System - Generate Comprehensive Guide', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes for comprehensive analysis
    console.log('🎨 GENERATING: Complete Design System Improvements\n');
    
    // Visit all pages to get comprehensive view
    const pages = [
      { url: '/', name: 'Home' },
      { url: '/timeline', name: 'Timeline' },
      { url: '/archive', name: 'Archive' },
      { url: '/sanctuary', name: 'Sanctuary' },
      { url: '/dashboard', name: 'Dashboard' },
    ];
    
    const siteAnalysis: any = {};
    
    for (const pageDef of pages) {
      await page.goto(`http://localhost:8080${pageDef.url}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const pageData = await page.evaluate(() => {
        // Colors
        const colors = new Set<string>();
        document.querySelectorAll('*').forEach(el => {
          const computed = window.getComputedStyle(el);
          [computed.backgroundColor, computed.color, computed.borderColor].forEach(color => {
            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
              colors.add(color);
            }
          });
        });
        
        // Fonts
        const fonts = new Set<string>();
        const fontSizes = new Set<string>();
        document.querySelectorAll('*').forEach(el => {
          const computed = window.getComputedStyle(el);
          fonts.add(computed.fontFamily.split(',')[0].trim());
          fontSizes.add(computed.fontSize);
        });
        
        // Spacing
        const spacings = new Set<string>();
        document.querySelectorAll('*').forEach(el => {
          const computed = window.getComputedStyle(el);
          [computed.padding, computed.margin].forEach(val => {
            if (val && val !== '0px') spacings.add(val);
          });
        });
        
        return {
          colors: colors.size,
          fonts: fonts.size,
          fontSizes: fontSizes.size,
          spacings: spacings.size,
        };
      });
      
      siteAnalysis[pageDef.name] = pageData;
    }
    
    console.log('📊 Complete Site Analysis:');
    Object.entries(siteAnalysis).forEach(([name, data]: [string, any]) => {
      console.log(`   ${name}: ${data.colors} colors, ${data.fontSizes} font sizes`);
    });
    
    const prompt = `You are a senior product designer creating a COMPLETE design system overhaul for a memory/journal app.

CURRENT STATE ACROSS ALL PAGES:
${JSON.stringify(siteAnalysis, null, 2)}

REFERENCE: Best design systems from:
- Apple Human Interface Guidelines
- Material Design 3
- Airbnb Design System
- Shopify Polaris
- IBM Carbon

CREATE A COMPREHENSIVE DESIGN SYSTEM WITH:

1. **Executive Summary**
   - Top 5 priorities for maximum impact
   - Timeline for implementation (Phase 1, 2, 3)

2. **Color System**
   - Primary, secondary, neutral palettes
   - Semantic colors (success, error, warning, info)
   - Dark mode considerations
   - CSS variables with HSL values
   - Accessibility (WCAG AAA compliance)

3. **Typography System**
   - Font family stack
   - Type scale (8-10 sizes)
   - Line heights
   - Font weights
   - Letter spacing
   - Responsive typography

4. **Spacing System**
   - 4px or 8px base unit
   - Complete scale (1-16)
   - Usage guidelines

5. **Component Library**
   - Buttons (primary, secondary, tertiary)
   - Cards (memory card, metric card)
   - Forms (inputs, textareas, selects)
   - Navigation (sidebar, mobile menu)
   - Modals and dialogs

6. **Layout System**
   - Grid system
   - Container widths
   - Responsive breakpoints
   - Spacing between sections

7. **Visual Style**
   - Border radius scale
   - Shadow system (elevation)
   - Animation timing functions
   - Transition durations

8. **Implementation Plan**
   - Week-by-week rollout plan
   - Testing strategy
   - Migration guide

Provide COMPLETE CSS code that can be copy-pasted into src/index.css.
Include before/after examples for each major change.

Format as comprehensive markdown with extensive CSS code blocks.`;

    console.log('\n🤖 Calling Ollama AI for Complete Design System...');
    console.log('   (This may take 2-3 minutes for comprehensive response)');
    const suggestions = await callOllamaAI(prompt);
    
    const fullContent = `# Complete Design System Overhaul

Generated: ${new Date().toLocaleString()}
Scope: Entire Application

## Site Analysis
\`\`\`json
${JSON.stringify(siteAnalysis, null, 2)}
\`\`\`

---

${suggestions}

---

## Next Steps

1. **Review This Document**
   - Read through all recommendations
   - Prioritize changes based on impact
   - Get stakeholder buy-in

2. **Create Feature Branch**
   \`\`\`bash
   git checkout -b design-system-overhaul
   \`\`\`

3. **Implement Foundation**
   - Add CSS variables to src/index.css
   - Test on one page first
   - Iterate and refine

4. **Roll Out**
   - Component by component
   - Page by page
   - Test thoroughly

5. **Document**
   - Create living style guide
   - Add Storybook components
   - Update component docs

## Files to Update
- [ ] src/index.css (CSS variables, base styles)
- [ ] src/components/ui/* (component library)
- [ ] tailwind.config.ts (design tokens)
- [ ] Each component file (apply new system)

## Testing Checklist
- [ ] Visual regression testing
- [ ] Accessibility testing (WCAG AAA)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Performance testing
`;
    
    saveSuggestions('complete-design-system', fullContent);
    
    console.log('\n💡 AI SUGGESTIONS (Summary):');
    console.log(suggestions.substring(0, 500) + '...\n');
    console.log('\n🎉 Complete design system guide generated!');
    console.log('   This is your roadmap for a full design overhaul.');
  });
});
