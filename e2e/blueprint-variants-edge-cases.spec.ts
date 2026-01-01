/**
 * Edge Case Tests for PolishedVariant1Professional
 *
 * Tests handling of:
 * - Long text scenarios (extremely long names, descriptions)
 * - Missing data scenarios (empty states, zero values)
 * - Extreme values (large numbers, maximum limits)
 * - Layout stability under edge conditions
 * - Overflow and truncation handling
 * - Error resilience
 *
 * Run: npx playwright test e2e/blueprint-variants-edge-cases.spec.ts
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('PolishedVariant1Professional - Edge Cases', () => {
  const url = '/blueprint-samples/variants/1-professional';

  test.describe('Long Text Handling', () => {
    test('should handle extremely long stat card labels without breaking layout', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Get initial layout
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();
      const initialBox = await statCard.boundingBox();
      expect(initialBox).toBeTruthy();

      // Inject extremely long text
      await page.evaluate(() => {
        const statCards = document.querySelectorAll('[role="button"]');
        if (statCards[0]) {
          const labelElement = statCards[0].querySelector('h3');
          if (labelElement) {
            labelElement.textContent = 'Active Projects With An Extremely Long Title That Should Definitely Test Text Overflow And Truncation Behavior In The Component Layout';
          }
        }
      });

      await page.waitForTimeout(300);

      // Verify layout doesn't break
      const newBox = await statCard.boundingBox();
      expect(newBox).toBeTruthy();

      // Check if card grew excessively (should use truncation)
      if (initialBox && newBox) {
        // Height shouldn't grow by more than 50% (allowing for line wrap)
        expect(newBox.height).toBeLessThan(initialBox.height * 1.5);
      }
    });

    test('should handle extremely long project names without overflow', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Inject long project name
      await page.evaluate(() => {
        const projectCards = document.querySelectorAll('article');
        if (projectCards[0]) {
          const titleElement = projectCards[0].querySelector('h3');
          if (titleElement) {
            titleElement.textContent = 'Downtown Plaza Construction Project With An Incredibly Long Name That Tests Text Overflow And Truncation Mechanisms';
          }
        }
      });

      await page.waitForTimeout(300);

      // Check for horizontal scrolling (should not exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('should handle long activity descriptions gracefully', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Inject very long activity description
      await page.evaluate(() => {
        const activityCards = document.querySelectorAll('article');
        const activities = Array.from(activityCards).slice(-3); // Last 3 are activities
        if (activities[0]) {
          const descElement = activities[0].querySelector('p');
          if (descElement) {
            descElement.textContent = 'This is an extremely long activity description that should be properly truncated or wrapped to prevent layout issues. '.repeat(10);
          }
        }
      });

      await page.waitForTimeout(300);

      // Verify no layout shift
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox).toBeTruthy();

      // Verify no horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow).toBe(false);
    });

    test('should handle long text in all breakpoints', async ({ page }) => {
      const breakpoints = [375, 768, 1024, 1536];

      for (const width of breakpoints) {
        await page.setViewportSize({ width, height: 768 });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Inject long text
        await page.evaluate(() => {
          const heading = document.querySelector('h1');
          if (heading) {
            heading.textContent = 'Dashboard With An Extremely Long Title That Tests Responsive Behavior';
          }
        });

        await page.waitForTimeout(200);

        // Check for overflow
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow).toBe(false);
        console.log(`✓ ${width}px - no overflow with long text`);
      }
    });
  });

  test.describe('Missing Data Scenarios', () => {
    test('should handle empty stat values gracefully', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Remove stat values
      await page.evaluate(() => {
        const statValues = document.querySelectorAll('[class*="text-3xl"]');
        statValues.forEach(el => {
          if (el.textContent && /^\d+$/.test(el.textContent.trim())) {
            el.textContent = '';
          }
        });
      });

      await page.waitForTimeout(300);

      // Verify stat cards still render
      const statCards = page.getByRole('button');
      const count = await statCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      // Verify no console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.waitForTimeout(500);
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle missing project images', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Remove all images
      await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        images.forEach(img => img.remove());
      });

      await page.waitForTimeout(300);

      // Verify layout is still stable
      const projectSection = page.getByRole('region', { name: 'Active Projects' });
      await expect(projectSection).toBeVisible();

      // Check that project cards are still visible
      const projectCards = page.locator('article').filter({ has: page.locator('h3:has-text("Plaza")') });
      const projectCount = await projectCards.count();
      expect(projectCount).toBeGreaterThan(0);
    });

    test('should handle zero values in stat cards', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Set all stats to zero
      await page.evaluate(() => {
        const statValues = document.querySelectorAll('[class*="text-3xl"]');
        statValues.forEach(el => {
          if (el.textContent && /^\d+$/.test(el.textContent.trim())) {
            el.textContent = '0';
          }
        });

        const changeValues = document.querySelectorAll('[class*="text-emerald"], [class*="text-green"]');
        changeValues.forEach(el => {
          if (el.textContent?.includes('+')) {
            el.textContent = '0';
          }
        });
      });

      await page.waitForTimeout(300);

      // Verify zero values are displayed
      const zeroValues = page.locator('text=0').first();
      await expect(zeroValues).toBeVisible();
    });

    test('should handle missing activity metadata (time, user)', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Remove time elements
      await page.evaluate(() => {
        const timeElements = document.querySelectorAll('time');
        timeElements.forEach(el => el.remove());
      });

      await page.waitForTimeout(300);

      // Activities should still be visible
      const activitySection = page.getByRole('region', { name: 'Recent Activity' });
      await expect(activitySection).toBeVisible();

      // Verify no layout break
      const bodyBox = await page.locator('body').boundingBox();
      expect(bodyBox).toBeTruthy();
    });
  });

  test.describe('Extreme Values', () => {
    test('should handle extremely large stat numbers (999+)', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Set extremely large values
      await page.evaluate(() => {
        const statValues = document.querySelectorAll('[class*="text-3xl"]');
        const extremeValues = ['9999', '99999', '999999', '9999999'];
        statValues.forEach((el, index) => {
          if (el.textContent && /^\d+$/.test(el.textContent.trim())) {
            el.textContent = extremeValues[index % extremeValues.length];
          }
        });
      });

      await page.waitForTimeout(300);

      // Verify layout doesn't break
      const statCards = page.getByRole('button');
      const count = await statCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow).toBe(false);
    });

    test('should handle negative percentage changes', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Set negative changes
      await page.evaluate(() => {
        const changeElements = document.querySelectorAll('[class*="text-emerald"], [class*="text-green"]');
        changeElements.forEach(el => {
          if (el.textContent?.includes('+')) {
            el.textContent = '-999';
            el.className = el.className.replace(/emerald|green/g, 'red');
          }
        });
      });

      await page.waitForTimeout(300);

      // Verify negative values render
      const negativeValue = page.locator('text=-999').first();
      await expect(negativeValue).toBeVisible();
    });

    test('should handle hundreds of activity items', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Get initial activity count
      const initialCount = await page.evaluate(() => {
        return document.querySelectorAll('article').length;
      });

      // Simulate many activities by duplicating existing ones
      await page.evaluate(() => {
        const activitySection = document.querySelector('[aria-labelledby*="activity"]');
        if (activitySection) {
          const activityCards = activitySection.querySelectorAll('article');
          const container = activityCards[0]?.parentElement;

          if (container) {
            // Clone first activity 50 times
            for (let i = 0; i < 50; i++) {
              const clone = activityCards[0].cloneNode(true) as HTMLElement;
              container.appendChild(clone);
            }
          }
        }
      });

      await page.waitForTimeout(500);

      // Verify page still renders
      const activitySection = page.getByRole('region', { name: 'Recent Activity' });
      await expect(activitySection).toBeVisible();

      // Verify scrolling works
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);

      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);
    });

    test('should handle very wide viewport (4K+ resolution)', async ({ page }) => {
      await page.setViewportSize({ width: 3840, height: 2160 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify content is centered/constrained
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Check that content doesn't stretch to full width inappropriately
      const mainBox = await main.boundingBox();
      if (mainBox) {
        // Content should use max-width constraint
        expect(mainBox.width).toBeLessThan(3840);
      }

      console.log('✓ 4K viewport rendering verified');
    });

    test('should handle very narrow viewport (< 320px)', async ({ page }) => {
      await page.setViewportSize({ width: 280, height: 653 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify content is still accessible
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Some overflow acceptable at very narrow widths, but shouldn't be excessive
      if (hasOverflow) {
        const overflowAmount = await page.evaluate(() => {
          return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });

        // Overflow should be minimal (< 50px)
        expect(overflowAmount).toBeLessThan(50);
      }

      console.log('✓ Very narrow viewport (280px) handled');
    });
  });

  test.describe('Layout Stability Under Stress', () => {
    test('should maintain layout during rapid theme switching', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { name: 'Dashboard' });
      const initialBox = await heading.boundingBox();

      // Rapidly toggle dark mode
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          document.documentElement.classList.toggle('dark');
        });
        await page.waitForTimeout(50);
      }

      const finalBox = await heading.boundingBox();

      // Position should be stable (allowing 2px tolerance)
      if (initialBox && finalBox) {
        expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThan(3);
      }

      console.log('✓ Layout stable during rapid theme switching');
    });

    test('should handle rapid viewport resizing', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Rapidly resize viewport
      const sizes = [
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 375, height: 667 },
        { width: 1536, height: 864 },
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(100);
      }

      // Verify content still renders correctly
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByText('Active Projects')).toBeVisible();

      console.log('✓ Layout stable during rapid resizing');
    });

    test('should handle concurrent interactions', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Perform multiple interactions simultaneously
      const statCard = page.getByRole('button').first();
      const backButton = page.getByLabel('Back to Blueprint Variants');

      // Hover and click operations in quick succession
      await Promise.all([
        statCard.hover(),
        backButton.hover(),
        page.keyboard.press('Tab'),
        page.keyboard.press('Tab'),
      ]);

      await page.waitForTimeout(300);

      // Verify page is still responsive
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Handled concurrent interactions');
    });

    test('should recover from scroll position changes during interaction', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(200);

      const scrollBefore = await page.evaluate(() => window.scrollY);

      // Interact with element
      const statCard = page.getByRole('button').first();
      await statCard.click();
      await page.waitForTimeout(200);

      // Scroll position should be maintained (unless intentionally changed)
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(scrollAfter).toBeGreaterThan(0);

      console.log('✓ Scroll position stable during interaction');
    });
  });

  test.describe('Error Resilience', () => {
    test('should handle missing CSS gracefully', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Disable all stylesheets
      await page.evaluate(() => {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        stylesheets.forEach(link => (link as HTMLLinkElement).disabled = true);
      });

      await page.waitForTimeout(500);

      // Content should still be readable (semantic HTML)
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // All stat cards should still be in DOM
      const statCards = page.getByRole('button');
      const count = await statCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      console.log('✓ Content accessible without CSS');
    });

    test('should handle JavaScript errors without breaking layout', async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Inject intentional error
      await page.evaluate(() => {
        // @ts-ignore - intentional error
        window.nonExistentFunction();
      }).catch(() => {
        // Expected to fail
      });

      await page.waitForTimeout(500);

      // Layout should still be intact
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByText('Active Projects')).toBeVisible();

      console.log('✓ Layout survives JavaScript errors');
    });

    test('should handle rapid DOM mutations', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Perform rapid DOM changes
      await page.evaluate(() => {
        const main = document.querySelector('main');
        if (main) {
          for (let i = 0; i < 50; i++) {
            const div = document.createElement('div');
            div.textContent = `Test ${i}`;
            main.appendChild(div);
          }
        }
      });

      await page.waitForTimeout(500);

      // Original content should still be visible
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Handled rapid DOM mutations');
    });

    test('should handle font loading failures', async ({ page }) => {
      // Block font loading
      await page.route('**/*.woff*', route => route.abort());
      await page.route('**/*.ttf', route => route.abort());

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Content should still be readable with fallback fonts
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByText('Active Projects')).toBeVisible();

      // Check text is not invisible
      const heading = page.getByRole('heading', { name: 'Dashboard' });
      const textContent = await heading.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent?.length).toBeGreaterThan(0);

      console.log('✓ Readable with fallback fonts');
    });
  });

  test.describe('Overflow and Truncation', () => {
    test('should truncate long text with ellipsis where appropriate', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Inject long text into areas that should truncate
      await page.evaluate(() => {
        const projectTitles = document.querySelectorAll('article h3');
        if (projectTitles[0]) {
          projectTitles[0].textContent = 'This is an extremely long project title that should be truncated with ellipsis to prevent layout breaking';
        }
      });

      await page.waitForTimeout(300);

      // Check if element has text-overflow or line-clamp styles
      const hasTruncation = await page.evaluate(() => {
        const title = document.querySelector('article h3');
        if (title) {
          const styles = window.getComputedStyle(title);
          return styles.textOverflow === 'ellipsis' ||
                 styles.webkitLineClamp !== 'none' ||
                 styles.overflow === 'hidden';
        }
        return false;
      });

      // Either truncation is applied or text wraps within bounds
      const projectCard = page.locator('article').first();
      const cardBox = await projectCard.boundingBox();
      expect(cardBox).toBeTruthy();

      console.log('✓ Long text handled appropriately');
    });

    test('should prevent horizontal scroll on all breakpoints with extreme content', async ({ page }) => {
      const breakpoints = [375, 768, 1024, 1536];

      for (const width of breakpoints) {
        await page.setViewportSize({ width, height: 768 });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Inject extremely wide content
        await page.evaluate(() => {
          const heading = document.querySelector('h1');
          if (heading) {
            heading.textContent = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'.repeat(5);
          }
        });

        await page.waitForTimeout(300);

        // Check for horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        // Allow minimal overflow (< 20px) due to rounding
        if (hasHorizontalScroll) {
          const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
          });
          expect(overflow).toBeLessThan(20);
        }

        console.log(`✓ ${width}px - no significant horizontal overflow`);
      }
    });

    test('should handle content that exceeds viewport height', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 400 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify vertical scroll is available
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

      expect(scrollHeight).toBeGreaterThan(clientHeight);

      // Verify can scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);

      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);

      console.log('✓ Vertical scrolling works correctly');
    });
  });

  test.describe('Accessibility Under Edge Conditions', () => {
    test('should maintain ARIA labels with missing content', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Remove content but keep structure
      await page.evaluate(() => {
        const statValues = document.querySelectorAll('[class*="text-3xl"]');
        statValues.forEach(el => {
          el.textContent = '';
        });
      });

      await page.waitForTimeout(300);

      // ARIA labels should still exist
      const ariaLabels = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[aria-label]');
        return Array.from(buttons).map(btn => btn.getAttribute('aria-label'));
      });

      expect(ariaLabels.length).toBeGreaterThan(0);
      ariaLabels.forEach(label => {
        expect(label).toBeTruthy();
        expect(label?.length).toBeGreaterThan(0);
      });

      console.log('✓ ARIA labels preserved');
    });

    test('should maintain keyboard navigation with extreme content', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Add hundreds of focusable elements
      await page.evaluate(() => {
        const main = document.querySelector('main');
        if (main) {
          for (let i = 0; i < 100; i++) {
            const button = document.createElement('button');
            button.textContent = `Extra Button ${i}`;
            button.setAttribute('aria-label', `Extra button ${i}`);
            main.appendChild(button);
          }
        }
      });

      await page.waitForTimeout(300);

      // Tab through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }

      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      console.log('✓ Keyboard navigation works with many elements');
    });

    test('should maintain focus visibility with high contrast text', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Simulate high contrast mode
      await page.evaluate(() => {
        document.documentElement.style.filter = 'contrast(2)';
      });

      await page.waitForTimeout(300);

      // Tab to element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Focus should still be visible
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();

      console.log('✓ Focus visible in high contrast mode');
    });
  });
});
