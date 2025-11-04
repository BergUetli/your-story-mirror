/**
 * AI-POWERED DESIGN AGENT - Intelligent Style Improvement Suggestions
 * 
 * This agent uses FREE open-source AI to:
 * 1. Analyze your design (colors, layout, typography)
 * 2. Compare against design best practices
 * 3. Generate specific CSS improvement suggestions
 * 4. Provide before/after examples
 * 5. Create ready-to-use code snippets
 * 
 * Uses: OpenAI-compatible free models (Groq, Hugging Face, Ollama)
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Free AI model options (no API key needed for local Ollama)
const AI_MODELS = {
  // Option 1: Ollama (local, completely free)
  // Install: curl https://ollama.ai/install.sh | sh
  // Then: ollama pull llama3.2
  ollama: {
    enabled: false, // Set to true if you have Ollama installed
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
  },
  
  // Option 2: Groq (free API, fast)
  // Get free API key: https://console.groq.com
  groq: {
    enabled: false, // Set to true with GROQ_API_KEY in .env
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile',
    apiKey: process.env.GROQ_API_KEY || '',
  },
  
  // Option 3: Hugging Face Inference API (free tier)
  // Get free API key: https://huggingface.co/settings/tokens
  huggingface: {
    enabled: false, // Set to true with HF_API_KEY in .env
    baseUrl: 'https://api-inference.huggingface.co/models',
    model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
    apiKey: process.env.HF_API_KEY || '',
  },
};

interface DesignAnalysis {
  page: string;
  colors: string[];
  fonts: string[];
  layout: string;
  spacing: string[];
  issues: string[];
  suggestions: string[];
}

interface CSSImprovement {
  element: string;
  currentCSS: string;
  improvedCSS: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

// Helper: Call AI model
async function callAI(prompt: string): Promise<string> {
  // Try Ollama first (local, free)
  if (AI_MODELS.ollama.enabled) {
    try {
      const response = await fetch(`${AI_MODELS.ollama.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODELS.ollama.model,
          prompt: prompt,
          stream: false,
        }),
      });
      const data = await response.json();
      return data.response;
    } catch (e) {
      console.log('Ollama not available, trying alternatives...');
    }
  }
  
  // Try Groq (free API)
  if (AI_MODELS.groq.enabled && AI_MODELS.groq.apiKey) {
    try {
      const response = await fetch(`${AI_MODELS.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_MODELS.groq.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_MODELS.groq.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.log('Groq API error:', e);
    }
  }
  
  // Fallback: Rule-based analysis (no AI needed)
  return generateRuleBasedSuggestions(prompt);
}

// Fallback: Rule-based design suggestions (when AI not available)
function generateRuleBasedSuggestions(analysisData: string): string {
  const suggestions: string[] = [];
  
  // Parse the analysis data
  const hasLowContrast = analysisData.includes('contrast') || analysisData.includes('ratio');
  const hasManyColors = analysisData.includes('colors') && /\d+/.test(analysisData) && parseInt(analysisData.match(/\d+/)?.[0] || '0') > 15;
  const hasSmallText = analysisData.includes('font-size') && analysisData.includes('12px');
  const hasInconsistentSpacing = analysisData.includes('spacing') || analysisData.includes('margin');
  
  if (hasLowContrast) {
    suggestions.push(`
## Improve Color Contrast

**Issue:** Low contrast between text and background affects readability.

**Solution:**
\`\`\`css
/* Before */
.text-muted {
  color: #999;
  background: #fff;
}

/* After - Improved contrast */
.text-muted {
  color: #666; /* Darker for better contrast */
  background: #fff;
}
\`\`\`

**Impact:** High - Improves accessibility and readability
    `);
  }
  
  if (hasManyColors) {
    suggestions.push(`
## Consolidate Color Palette

**Issue:** Too many unique colors create visual noise.

**Solution:**
\`\`\`css
/* Define a cohesive color system */
:root {
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-primary-light: #60A5FA;
  
  --color-neutral-50: #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-900: #111827;
  
  --color-accent: #22D3EE;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
}

/* Use variables instead of arbitrary colors */
.button-primary {
  background: var(--color-primary);
  color: white;
}
\`\`\`

**Impact:** High - Creates visual consistency
    `);
  }
  
  if (hasSmallText) {
    suggestions.push(`
## Improve Typography Scale

**Issue:** Some text is too small for comfortable reading.

**Solution:**
\`\`\`css
/* Before */
.small-text {
  font-size: 12px;
}

/* After - Minimum 14px for body text */
.small-text {
  font-size: 14px;
  line-height: 1.5; /* Improved line height */
}

/* Create a clear type scale */
:root {
  --text-xs: 0.75rem;   /* 12px - use sparingly */
  --text-sm: 0.875rem;  /* 14px - minimum for body */
  --text-base: 1rem;    /* 16px - base body text */
  --text-lg: 1.125rem;  /* 18px */
  --text-xl: 1.25rem;   /* 20px */
  --text-2xl: 1.5rem;   /* 24px */
  --text-3xl: 1.875rem; /* 30px */
}
\`\`\`

**Impact:** Medium - Improves readability
    `);
  }
  
  if (hasInconsistentSpacing) {
    suggestions.push(`
## Establish Consistent Spacing System

**Issue:** Inconsistent margins and padding create visual chaos.

**Solution:**
\`\`\`css
/* Create an 8px-based spacing system */
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}

/* Use consistent spacing */
.card {
  padding: var(--space-6);
  margin-bottom: var(--space-4);
}

.section {
  padding: var(--space-12) var(--space-6);
}
\`\`\`

**Impact:** High - Creates visual rhythm
    `);
  }
  
  // Always add general improvements
  suggestions.push(`
## Enhance Visual Hierarchy

**Solution:**
\`\`\`css
/* Clear hierarchy with size, weight, and color */
h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-4);
  line-height: 1.2;
}

h2 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin-bottom: var(--space-3);
  line-height: 1.3;
}

p {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-neutral-700);
  line-height: 1.6;
  margin-bottom: var(--space-4);
}
\`\`\`

**Impact:** High - Guides user attention
  `);
  
  suggestions.push(`
## Add Micro-interactions

**Solution:**
\`\`\`css
/* Smooth transitions for better UX */
button, a, .interactive {
  transition: all 0.2s ease-out;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

button:active {
  transform: translateY(0);
}

/* Focus states for accessibility */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
\`\`\`

**Impact:** Medium - Improves interactivity
  `);
  
  return suggestions.join('\n\n---\n\n');
}

test.describe('AI-Powered Design Agent - Style Improvement Suggestions', () => {
  
  test('AI Agent 1: Analyze and improve color palette', async ({ page }) => {
    console.log('🎨 AI DESIGN AGENT: Analyzing color palette...\n');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Extract color usage
    const colorAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const colors = new Set<string>();
      const colorUsage: { [key: string]: number } = {};
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        [computed.backgroundColor, computed.color, computed.borderColor].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colors.add(color);
            colorUsage[color] = (colorUsage[color] || 0) + 1;
          }
        });
      });
      
      return {
        uniqueColors: colors.size,
        topColors: Object.entries(colorUsage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([color, count]) => ({ color, count })),
      };
    });
    
    console.log(`📊 Color Analysis:`);
    console.log(`   Total unique colors: ${colorAnalysis.uniqueColors}`);
    console.log(`   Top 5 colors:`);
    colorAnalysis.topColors.slice(0, 5).forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.color} (used ${c.count} times)`);
    });
    
    // Generate AI suggestions
    const prompt = `
You are a professional web designer. Analyze this color usage data and provide specific CSS improvements:

Colors found: ${colorAnalysis.uniqueColors}
Most used colors: ${JSON.stringify(colorAnalysis.topColors.slice(0, 5))}

Provide:
1. Assessment of color consistency
2. Specific CSS code to improve the color system
3. Before/after examples
4. Explain why each change improves the design

Format as markdown with code blocks.
    `;
    
    console.log('\n🤖 Generating AI suggestions...\n');
    const suggestions = await callAI(prompt);
    
    console.log('💡 AI SUGGESTIONS:\n');
    console.log(suggestions);
    
    // Save suggestions to file
    const outputDir = path.join(process.cwd(), 'testing', 'design-suggestions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `color-improvements-${timestamp}.md`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      `# Color Palette Improvements\n\nGenerated: ${new Date().toLocaleString()}\n\n${suggestions}`
    );
    
    console.log(`\n✅ Suggestions saved to: testing/design-suggestions/${filename}`);
  });

  test('AI Agent 2: Analyze and improve typography', async ({ page }) => {
    console.log('📝 AI DESIGN AGENT: Analyzing typography...\n');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Extract typography info
    const typographyAnalysis = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const paragraphs = document.querySelectorAll('p');
      
      const getFontInfo = (el: Element) => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          fontFamily: computed.fontFamily.split(',')[0].trim(),
        };
      };
      
      return {
        headings: Array.from(headings).map(h => ({
          tag: h.tagName.toLowerCase(),
          ...getFontInfo(h),
        })),
        body: Array.from(paragraphs).slice(0, 5).map(p => getFontInfo(p)),
      };
    });
    
    console.log(`📊 Typography Analysis:`);
    console.log(`   Headings found: ${typographyAnalysis.headings.length}`);
    console.log(`   Sample heading styles:`);
    typographyAnalysis.headings.slice(0, 3).forEach(h => {
      console.log(`     ${h.tag}: ${h.fontSize}, weight ${h.fontWeight}, ${h.fontFamily}`);
    });
    
    const prompt = `
You are a professional web designer specializing in typography. Analyze this typography system:

Headings: ${JSON.stringify(typographyAnalysis.headings.slice(0, 5))}
Body text: ${JSON.stringify(typographyAnalysis.body.slice(0, 3))}

Provide:
1. Assessment of type hierarchy
2. Specific CSS improvements for better readability
3. Recommended font sizes and line heights
4. Before/after examples

Format as markdown with CSS code blocks.
    `;
    
    console.log('\n🤖 Generating AI suggestions...\n');
    const suggestions = await callAI(prompt);
    
    console.log('💡 AI SUGGESTIONS:\n');
    console.log(suggestions);
    
    // Save suggestions
    const outputDir = path.join(process.cwd(), 'testing', 'design-suggestions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `typography-improvements-${timestamp}.md`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      `# Typography Improvements\n\nGenerated: ${new Date().toLocaleString()}\n\n${suggestions}`
    );
    
    console.log(`\n✅ Suggestions saved to: testing/design-suggestions/${filename}`);
  });

  test('AI Agent 3: Analyze and improve layout', async ({ page }) => {
    console.log('📐 AI DESIGN AGENT: Analyzing layout and spacing...\n');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Extract layout info
    const layoutAnalysis = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, main, header, footer');
      const containers = document.querySelectorAll('.container, [class*="container"]');
      
      const getLayoutInfo = (el: Element) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: el.className,
          width: `${rect.width.toFixed(0)}px`,
          padding: computed.padding,
          margin: computed.margin,
          display: computed.display,
          flexDirection: computed.flexDirection,
          gridTemplate: computed.gridTemplateColumns,
        };
      };
      
      return {
        sections: Array.from(sections).slice(0, 5).map(getLayoutInfo),
        containers: Array.from(containers).slice(0, 3).map(getLayoutInfo),
      };
    });
    
    console.log(`📊 Layout Analysis:`);
    console.log(`   Sections found: ${layoutAnalysis.sections.length}`);
    console.log(`   Containers found: ${layoutAnalysis.containers.length}`);
    
    const prompt = `
You are a professional web designer specializing in layout and spacing. Analyze this layout:

Sections: ${JSON.stringify(layoutAnalysis.sections)}
Containers: ${JSON.stringify(layoutAnalysis.containers)}

Provide:
1. Assessment of layout structure
2. Specific CSS improvements for better visual hierarchy
3. Spacing recommendations (margins, padding)
4. Responsive layout suggestions
5. Before/after examples

Format as markdown with CSS code blocks.
    `;
    
    console.log('\n🤖 Generating AI suggestions...\n');
    const suggestions = await callAI(prompt);
    
    console.log('💡 AI SUGGESTIONS:\n');
    console.log(suggestions);
    
    // Save suggestions
    const outputDir = path.join(process.cwd(), 'testing', 'design-suggestions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `layout-improvements-${timestamp}.md`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      `# Layout & Spacing Improvements\n\nGenerated: ${new Date().toLocaleString()}\n\n${suggestions}`
    );
    
    console.log(`\n✅ Suggestions saved to: testing/design-suggestions/${filename}`);
  });

  test('AI Agent 4: Generate complete style improvement guide', async ({ page }) => {
    console.log('🎯 AI DESIGN AGENT: Generating complete style guide...\n');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual reference
    const screenshotPath = path.join(process.cwd(), 'testing', 'design-suggestions', 'current-design.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Comprehensive analysis
    const fullAnalysis = await page.evaluate(() => {
      // Colors
      const colors = new Set<string>();
      document.querySelectorAll('*').forEach(el => {
        const computed = window.getComputedStyle(el);
        [computed.backgroundColor, computed.color].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colors.add(color);
          }
        });
      });
      
      // Typography
      const fonts = new Set<string>();
      const fontSizes = new Set<string>();
      document.querySelectorAll('*').forEach(el => {
        const computed = window.getComputedStyle(el);
        fonts.add(computed.fontFamily.split(',')[0].trim());
        fontSizes.add(computed.fontSize);
      });
      
      // Spacing
      const margins = new Set<string>();
      const paddings = new Set<string>();
      document.querySelectorAll('*').forEach(el => {
        const computed = window.getComputedStyle(el);
        if (computed.marginTop !== '0px') margins.add(computed.marginTop);
        if (computed.paddingTop !== '0px') paddings.add(computed.paddingTop);
      });
      
      return {
        uniqueColors: colors.size,
        uniqueFonts: fonts.size,
        uniqueFontSizes: fontSizes.size,
        uniqueMargins: margins.size,
        uniquePaddings: paddings.size,
      };
    });
    
    console.log(`📊 Complete Design Analysis:`);
    console.log(`   Unique colors: ${fullAnalysis.uniqueColors}`);
    console.log(`   Unique fonts: ${fullAnalysis.uniqueFonts}`);
    console.log(`   Unique font sizes: ${fullAnalysis.uniqueFontSizes}`);
    console.log(`   Unique margins: ${fullAnalysis.uniqueMargins}`);
    console.log(`   Unique paddings: ${fullAnalysis.uniquePaddings}`);
    
    const prompt = `
You are a professional web designer creating a complete style improvement guide.

Current design metrics:
- Colors: ${fullAnalysis.uniqueColors} unique values
- Fonts: ${fullAnalysis.uniqueFonts} families
- Font sizes: ${fullAnalysis.uniqueFontSizes} different sizes
- Margins: ${fullAnalysis.uniqueMargins} unique values
- Paddings: ${fullAnalysis.uniquePaddings} unique values

Create a comprehensive CSS improvement guide with:
1. Executive summary (top 3 priorities)
2. Color system improvements (with CSS variables)
3. Typography improvements (type scale)
4. Spacing system improvements (8px grid)
5. Component-specific improvements
6. Before/after code examples for each
7. Implementation priority (high/medium/low)

Format as markdown with clear sections and CSS code blocks.
    `;
    
    console.log('\n🤖 Generating comprehensive style guide...\n');
    const guide = await callAI(prompt);
    
    console.log('💡 COMPLETE STYLE IMPROVEMENT GUIDE:\n');
    console.log(guide);
    
    // Save comprehensive guide
    const outputDir = path.join(process.cwd(), 'testing', 'design-suggestions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `COMPLETE-STYLE-GUIDE-${timestamp}.md`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      `# Complete Style Improvement Guide\n\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `## Current Design Metrics\n\n` +
      `- Unique colors: ${fullAnalysis.uniqueColors}\n` +
      `- Unique fonts: ${fullAnalysis.uniqueFonts}\n` +
      `- Unique font sizes: ${fullAnalysis.uniqueFontSizes}\n` +
      `- Unique margins: ${fullAnalysis.uniqueMargins}\n` +
      `- Unique paddings: ${fullAnalysis.uniquePaddings}\n\n` +
      `## Screenshot\n\n` +
      `![Current Design](./current-design.png)\n\n` +
      `---\n\n${guide}`
    );
    
    console.log(`\n✅ Complete guide saved to: testing/design-suggestions/${filename}`);
    console.log(`\n📄 Open the file to see:`);
    console.log(`   - Prioritized improvements`);
    console.log(`   - Ready-to-use CSS code`);
    console.log(`   - Before/after examples`);
    console.log(`   - Implementation steps`);
  });
});
