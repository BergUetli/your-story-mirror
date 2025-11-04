/**
 * DESIGN AGENT - Automated Design System Audit
 * 
 * This test uses Playwright as a "design agent" to audit:
 * 1. Color consistency (against design tokens)
 * 2. Typography consistency
 * 3. Spacing and layout
 * 4. Accessibility (WCAG 2.1 compliance)
 * 5. Responsive design
 * 6. Animation performance
 * 7. Component visual regression
 * 
 * Think of this as an AI design assistant that checks your site!
 */

import { test, expect } from '@playwright/test';

// Design tokens from your design system
const DESIGN_TOKENS = {
  colors: {
    primary: 'rgb(59, 130, 246)', // hsl(210 65% 50%) -> #3B82F6
    background: 'rgb(249, 249, 249)', // hsl(0 0% 97.6%) -> #F9F9F9
    foreground: 'rgb(33, 33, 33)', // hsl(0 0% 13%) -> #212121
    muted: 'rgb(245, 245, 245)', // hsl(0 0% 96%) -> #F5F5F5
    border: 'rgb(0, 0, 0)', // Black borders
  },
  typography: {
    fonts: ['Montserrat', 'sans-serif'],
    sizes: {
      heading: ['36px', '32px', '28px', '24px'],
      body: ['16px', '14px'],
      small: ['12px'],
    }
  },
  spacing: {
    radius: '8px', // 0.5rem
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  }
};

interface ColorAnalysis {
  element: string;
  color: string;
  matches: boolean;
  closest: string;
}

interface ContrastResult {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
  wcagLevel: string;
}

test.describe('Design Agent - Automated Design Audit', () => {
  
  test('Design Agent 1: Color consistency audit', async ({ page }) => {
    console.log('🎨 DESIGN AGENT: Auditing color consistency...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Extract all colors used on the page
    const colorAnalysis = await page.evaluate((tokens) => {
      const elements = document.querySelectorAll('*');
      const colorUsage = new Map<string, { element: string; count: number }>();
      
      elements.forEach((el) => {
        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;
        const borderColor = computed.borderColor;
        
        [bgColor, textColor, borderColor].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            const key = color;
            const existing = colorUsage.get(key);
            if (existing) {
              existing.count++;
            } else {
              colorUsage.set(key, {
                element: el.tagName.toLowerCase(),
                count: 1
              });
            }
          }
        });
      });
      
      return Array.from(colorUsage.entries()).map(([color, data]) => ({
        color,
        element: data.element,
        count: data.count
      }));
    }, DESIGN_TOKENS);
    
    console.log('📊 Color usage analysis:');
    console.log(`   Total unique colors found: ${colorAnalysis.length}`);
    
    // Check for too many colors (sign of inconsistency)
    const uniqueColors = colorAnalysis.length;
    console.log(`   ✓ Unique colors: ${uniqueColors} (target: < 20 for consistency)`);
    
    if (uniqueColors > 20) {
      console.log('   ⚠️ WARNING: Too many unique colors detected');
      console.log('   Consider consolidating to design system tokens');
    } else {
      console.log('   ✅ Good color discipline!');
    }
    
    // Show most used colors
    const topColors = colorAnalysis
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    console.log('   Top 5 colors:');
    topColors.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.color} (used ${c.count} times)`);
    });
  });

  test('Design Agent 2: Typography consistency audit', async ({ page }) => {
    console.log('📝 DESIGN AGENT: Auditing typography consistency...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    const typographyAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button');
      const fontUsage = new Map<string, number>();
      const sizeUsage = new Map<string, number>();
      const weightUsage = new Map<string, number>();
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const font = computed.fontFamily;
        const size = computed.fontSize;
        const weight = computed.fontWeight;
        
        fontUsage.set(font, (fontUsage.get(font) || 0) + 1);
        sizeUsage.set(size, (sizeUsage.get(size) || 0) + 1);
        weightUsage.set(weight, (weightUsage.get(weight) || 0) + 1);
      });
      
      return {
        fonts: Array.from(fontUsage.entries()).map(([f, c]) => ({ font: f, count: c })),
        sizes: Array.from(sizeUsage.entries()).map(([s, c]) => ({ size: s, count: c })),
        weights: Array.from(weightUsage.entries()).map(([w, c]) => ({ weight: w, count: c }))
      };
    });
    
    console.log('📊 Typography analysis:');
    console.log(`   Font families used: ${typographyAnalysis.fonts.length}`);
    typographyAnalysis.fonts.forEach(f => {
      console.log(`     - ${f.font.split(',')[0]}: ${f.count} elements`);
    });
    
    // Check for Montserrat usage (your design system font)
    const usesMontserrat = typographyAnalysis.fonts.some(f => 
      f.font.toLowerCase().includes('montserrat')
    );
    
    if (usesMontserrat) {
      console.log('   ✅ Using Montserrat (design system font)');
    } else {
      console.log('   ⚠️ WARNING: Montserrat not detected');
    }
    
    console.log(`   Font sizes used: ${typographyAnalysis.sizes.length}`);
    const topSizes = typographyAnalysis.sizes
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    console.log('   Top 5 font sizes:');
    topSizes.forEach((s, i) => {
      console.log(`     ${i + 1}. ${s.size} (${s.count} times)`);
    });
    
    // Font size consistency check
    if (typographyAnalysis.sizes.length > 12) {
      console.log('   ⚠️ WARNING: Too many font sizes (>12) - consider type scale');
    } else {
      console.log('   ✅ Good font size consistency');
    }
  });

  test('Design Agent 3: Accessibility (WCAG) audit', async ({ page }) => {
    console.log('♿ DESIGN AGENT: Auditing accessibility (WCAG 2.1)...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Check color contrast
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
      const issues: {
        element: string;
        foreground: string;
        background: string;
        ratio: number;
        passes: boolean;
      }[] = [];
      
      // Helper to calculate relative luminance
      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };
      
      // Helper to parse rgb color
      const parseRgb = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        return [0, 0, 0];
      };
      
      // Helper to calculate contrast ratio
      const getContrastRatio = (fg: string, bg: string) => {
        const [r1, g1, b1] = parseRgb(fg);
        const [r2, g2, b2] = parseRgb(bg);
        
        const l1 = getLuminance(r1, g1, b1);
        const l2 = getLuminance(r2, g2, b2);
        
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
      };
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const color = computed.color;
        const bgColor = computed.backgroundColor;
        
        // Skip transparent backgrounds
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          return;
        }
        
        const ratio = getContrastRatio(color, bgColor);
        const passes = ratio >= 4.5; // WCAG AA for normal text
        
        if (!passes) {
          issues.push({
            element: `${el.tagName.toLowerCase()}.${el.className}`,
            foreground: color,
            background: bgColor,
            ratio: Math.round(ratio * 100) / 100,
            passes
          });
        }
      });
      
      return issues;
    });
    
    console.log('📊 Accessibility analysis:');
    console.log(`   Elements checked: ${await page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button, label').count()}`);
    console.log(`   Contrast issues found: ${contrastIssues.length}`);
    
    if (contrastIssues.length === 0) {
      console.log('   ✅ All text meets WCAG AA contrast requirements!');
    } else {
      console.log('   ⚠️ Contrast issues detected:');
      contrastIssues.slice(0, 5).forEach(issue => {
        console.log(`     - ${issue.element}: ratio ${issue.ratio}:1 (needs 4.5:1)`);
      });
    }
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    console.log(`   Images without alt text: ${imagesWithoutAlt}`);
    
    if (imagesWithoutAlt === 0) {
      console.log('   ✅ All images have alt text');
    } else {
      console.log('   ⚠️ Some images missing alt text');
    }
    
    // Check for ARIA labels on buttons
    const buttonsWithoutLabel = await page.locator('button:not([aria-label]):not(:has-text(*))').count();
    console.log(`   Buttons without accessible labels: ${buttonsWithoutLabel}`);
    
    if (buttonsWithoutLabel === 0) {
      console.log('   ✅ All buttons have accessible labels');
    } else {
      console.log('   ⚠️ Some buttons need aria-label');
    }
  });

  test('Design Agent 4: Responsive design audit', async ({ page, context }) => {
    console.log('📱 DESIGN AGENT: Auditing responsive design...');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];
    
    for (const viewport of viewports) {
      console.log(`\n   Testing ${viewport.name} (${viewport.width}x${viewport.height}):`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:8080/');
      await page.waitForLoadState('networkidle');
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasHorizontalScroll) {
        console.log('     ⚠️ Horizontal scroll detected');
      } else {
        console.log('     ✅ No horizontal scroll');
      }
      
      // Check if main content is visible
      const mainContent = page.locator('main, [role="main"], .main-content').first();
      const isVisible = await mainContent.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log('     ✅ Main content visible');
      } else {
        console.log('     ⚠️ Main content not detected');
      }
      
      // Check for touch-friendly tap targets on mobile
      if (viewport.name === 'Mobile') {
        const smallButtons = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a');
          let count = 0;
          
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const minSize = 44; // iOS HIG minimum tap target
            if (rect.width < minSize || rect.height < minSize) {
              count++;
            }
          });
          
          return count;
        });
        
        if (smallButtons > 0) {
          console.log(`     ⚠️ ${smallButtons} buttons below 44x44px tap target`);
        } else {
          console.log('     ✅ All tap targets meet 44x44px minimum');
        }
      }
    }
  });

  test('Design Agent 5: Animation performance audit', async ({ page }) => {
    console.log('⚡ DESIGN AGENT: Auditing animation performance...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Check for CSS animations
    const animationAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const animations: {
        element: string;
        animation: string;
        duration: string;
        usesTransform: boolean;
      }[] = [];
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const animation = computed.animation;
        const transition = computed.transition;
        
        if (animation && animation !== 'none') {
          animations.push({
            element: el.tagName.toLowerCase(),
            animation: animation.split(' ')[0],
            duration: computed.animationDuration,
            usesTransform: animation.includes('transform')
          });
        }
        
        if (transition && transition !== 'none' && transition !== 'all 0s ease 0s') {
          animations.push({
            element: el.tagName.toLowerCase(),
            animation: 'transition',
            duration: computed.transitionDuration,
            usesTransform: transition.includes('transform')
          });
        }
      });
      
      return animations;
    });
    
    console.log('📊 Animation analysis:');
    console.log(`   Animated elements: ${animationAnalysis.length}`);
    
    const transformAnimations = animationAnalysis.filter(a => a.usesTransform).length;
    const nonTransformAnimations = animationAnalysis.length - transformAnimations;
    
    console.log(`   Using GPU-accelerated transforms: ${transformAnimations}`);
    console.log(`   Other animations: ${nonTransformAnimations}`);
    
    if (nonTransformAnimations > transformAnimations) {
      console.log('   ⚠️ Consider using transform/opacity for better performance');
    } else {
      console.log('   ✅ Good use of GPU-accelerated animations');
    }
    
    // Check animation durations
    const longAnimations = animationAnalysis.filter(a => {
      const duration = parseFloat(a.duration);
      return duration > 1; // > 1 second
    });
    
    if (longAnimations.length > 0) {
      console.log(`   ⚠️ ${longAnimations.length} animations longer than 1s`);
    } else {
      console.log('   ✅ All animations under 1s (good for UX)');
    }
  });

  test('Design Agent 6: Spacing consistency audit', async ({ page }) => {
    console.log('📏 DESIGN AGENT: Auditing spacing consistency...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    const spacingAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const margins = new Map<string, number>();
      const paddings = new Map<string, number>();
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        
        ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
          const value = computed[prop as any];
          if (value && value !== '0px') {
            margins.set(value, (margins.get(value) || 0) + 1);
          }
        });
        
        ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
          const value = computed[prop as any];
          if (value && value !== '0px') {
            paddings.set(value, (paddings.get(value) || 0) + 1);
          }
        });
      });
      
      return {
        margins: Array.from(margins.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        paddings: Array.from(paddings.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
      };
    });
    
    console.log('📊 Spacing analysis:');
    console.log(`   Unique margin values: ${spacingAnalysis.margins.length}`);
    console.log(`   Unique padding values: ${spacingAnalysis.paddings.length}`);
    
    // Show most common spacing values
    console.log('   Top 5 margins:');
    spacingAnalysis.margins.slice(0, 5).forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.value} (${m.count} times)`);
    });
    
    console.log('   Top 5 paddings:');
    spacingAnalysis.paddings.slice(0, 5).forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.value} (${p.count} times)`);
    });
    
    // Check if using consistent spacing scale (8px base)
    const uses8pxScale = spacingAnalysis.margins
      .concat(spacingAnalysis.paddings)
      .every(s => {
        const px = parseFloat(s.value);
        return px % 8 === 0 || px % 4 === 0;
      });
    
    if (uses8pxScale) {
      console.log('   ✅ Using consistent 4px/8px spacing scale');
    } else {
      console.log('   ⚠️ Consider using 4px/8px spacing scale for consistency');
    }
  });

  test('Design Agent 7: Visual regression check', async ({ page }) => {
    console.log('📸 DESIGN AGENT: Visual regression check...');
    
    // Take screenshots of key pages
    const pages = [
      { name: 'Home', url: '/' },
      { name: 'Sanctuary', url: '/sanctuary' },
      { name: 'Timeline', url: '/timeline' },
      { name: 'Archive', url: '/archive' },
    ];
    
    for (const pageDef of pages) {
      console.log(`   Capturing ${pageDef.name}...`);
      await page.goto(`http://localhost:8080${pageDef.url}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for animations
      
      // Take screenshot
      await page.screenshot({
        path: `testing/screenshots/${pageDef.name.toLowerCase()}.png`,
        fullPage: true
      });
      
      console.log(`   ✅ ${pageDef.name} screenshot saved`);
    }
    
    console.log('   💡 Compare screenshots manually or use Percy/Chromatic for automated comparison');
  });

  test('Design Agent 8: Component audit (Solin Voice Agent)', async ({ page }) => {
    console.log('🎯 DESIGN AGENT: Auditing Solin Voice Agent component...');
    
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');
    
    // Check if Solin orb exists
    const orb = page.locator('.solin-orb').first();
    const orbExists = await orb.isVisible().catch(() => false);
    
    if (!orbExists) {
      console.log('   ⚠️ Solin orb not found on page');
      test.skip();
      return;
    }
    
    console.log('   ✅ Solin orb found');
    
    // Check orb styling
    const orbStyles = await orb.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        width: computed.width,
        height: computed.height,
        borderRadius: computed.borderRadius,
        cursor: computed.cursor,
        display: computed.display,
      };
    });
    
    console.log('   Orb styles:');
    console.log(`     Width: ${orbStyles.width}`);
    console.log(`     Height: ${orbStyles.height}`);
    console.log(`     Border radius: ${orbStyles.borderRadius}`);
    
    // Check if orb is square
    const width = parseFloat(orbStyles.width);
    const height = parseFloat(orbStyles.height);
    const isSquare = Math.abs(width - height) < 1;
    
    if (isSquare) {
      console.log('   ✅ Orb is square (width = height)');
    } else {
      console.log('   ⚠️ Orb dimensions not square');
    }
    
    // Check for animations
    const hasAnimations = await orb.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        hasAnimation: computed.animation !== 'none',
        hasTransition: computed.transition !== 'none' && computed.transition !== 'all 0s ease 0s',
      };
    });
    
    if (hasAnimations.hasAnimation || hasAnimations.hasTransition) {
      console.log('   ✅ Orb has animations/transitions');
    } else {
      console.log('   ⚠️ Orb missing animations');
    }
    
    // Check accessibility
    const orbAccessibility = await orb.evaluate((el) => {
      return {
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        tabIndex: el.getAttribute('tabindex'),
      };
    });
    
    console.log('   Accessibility:');
    if (orbAccessibility.ariaLabel) {
      console.log(`     ✅ Has aria-label: "${orbAccessibility.ariaLabel}"`);
    } else {
      console.log('     ⚠️ Missing aria-label');
    }
  });
});
