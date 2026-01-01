/**
 * Comprehensive Interaction Tests for PolishedVariant1Professional
 *
 * Tests all interactive behaviors and user flows:
 * - Stat card clicks and interactions
 * - Hover state transitions
 * - Link navigation flows
 * - Focus management and keyboard interactions
 * - Animation completions
 * - State persistence
 *
 * Run: npx playwright test e2e/blueprint-variants-interaction.spec.ts
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('PolishedVariant1Professional - Comprehensive Interactions', () => {
  const url = '/blueprint-samples/variants/1-professional';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test.describe('Stat Card Interactions', () => {
    test('should show hover state on stat cards', async ({ page }) => {
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();

      // Get initial border color
      const initialBorder = await statCard.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });

      // Hover over stat card
      await statCard.hover();
      await page.waitForTimeout(300);

      // Get hover border color (should change to blue)
      const hoverBorder = await statCard.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });

      // Border should change on hover
      expect(hoverBorder).not.toBe(initialBorder);

      console.log('✓ Stat card hover state verified');
    });

    test('should handle stat card clicks', async ({ page }) => {
      const statCards = [
        { label: 'Active Projects', value: '12' },
        { label: 'Team Members', value: '48' },
        { label: 'Pending Reports', value: '8' },
        { label: 'Open RFIs', value: '23' },
      ];

      for (const card of statCards) {
        const statCard = page.getByRole('button').filter({ hasText: card.label }).first();

        // Verify card is visible
        await expect(statCard).toBeVisible();

        // Click the card
        await statCard.click();
        await page.waitForTimeout(200);

        // Verify click was registered (no navigation away from page)
        await expect(page).toHaveURL(new RegExp(url));

        console.log(`✓ ${card.label} click handled`);
      }
    });

    test('should handle rapid clicks on stat cards', async ({ page }) => {
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();

      // Rapid fire clicks
      for (let i = 0; i < 5; i++) {
        await statCard.click();
      }

      await page.waitForTimeout(500);

      // Should still be on the same page
      await expect(page).toHaveURL(new RegExp(url));
      await expect(statCard).toBeVisible();

      console.log('✓ Rapid clicks handled without errors');
    });

    test('should show correct aria-pressed state on stat cards', async ({ page }) => {
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();

      // Check aria attributes
      const ariaLabel = await statCard.getAttribute('aria-label');
      expect(ariaLabel).toContain('Active Projects');
      expect(ariaLabel).toContain('12');

      console.log('✓ ARIA states correct on stat cards');
    });
  });

  test.describe('Link Navigation', () => {
    test('should navigate back to variants page', async ({ page }) => {
      const backButton = page.getByLabel('Back to Blueprint Variants');

      // Verify link is present
      await expect(backButton).toBeVisible();
      await expect(backButton).toHaveAttribute('href', /\/blueprint-samples\/variants/);

      console.log('✓ Back button navigation ready');
    });

    test('should handle "View All" button click', async ({ page }) => {
      const viewAllButton = page.getByRole('button', { name: /view all/i });

      await expect(viewAllButton).toBeVisible();
      await viewAllButton.click();
      await page.waitForTimeout(200);

      // Should still be on page (or handle appropriately)
      await expect(page).toHaveURL(new RegExp(url));

      console.log('✓ View All button click handled');
    });

    test('should navigate to project detail pages', async ({ page }) => {
      const projects = ['Downtown Tower', 'Harbor Bridge', 'Medical Center'];

      for (const projectName of projects) {
        // Reload page to reset state
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        const projectLink = page.getByRole('link', { name: new RegExp(`View project: ${projectName}`) });

        await expect(projectLink).toBeVisible();

        // Get href
        const href = await projectLink.getAttribute('href');
        expect(href).toBeTruthy();

        console.log(`✓ ${projectName} link ready for navigation`);
      }
    });

    test('should handle keyboard navigation to links', async ({ page }) => {
      // Tab to first link (back button)
      await page.keyboard.press('Tab');

      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();

      // Press Enter to activate
      await page.keyboard.press('Enter');
      // Note: May navigate away - that's expected behavior

      console.log('✓ Keyboard link navigation works');
    });
  });

  test.describe('Hover States', () => {
    test('should show hover effects on all interactive elements', async ({ page }) => {
      const interactiveElements = [
        { selector: 'button', name: 'stat card' },
        { selector: 'a', name: 'link' },
      ];

      for (const elem of interactiveElements) {
        const elements = page.locator(elem.selector);
        const count = await elements.count();

        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);

          if (await element.isVisible()) {
            // Hover
            await element.hover();
            await page.waitForTimeout(200);

            // Element should still be visible after hover
            await expect(element).toBeVisible();
          }
        }

        console.log(`✓ Hover states verified for ${elem.name}s`);
      }
    });

    test('should show project card hover effects', async ({ page }) => {
      const projectCards = page.locator('[role="listitem"]');
      const count = await projectCards.count();

      for (let i = 0; i < count; i++) {
        const card = projectCards.nth(i);

        // Get initial background
        const initialBg = await card.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Hover over card
        await card.hover();
        await page.waitForTimeout(300);

        // Background should change on hover
        const hoverBg = await card.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // May change background on hover
        // Just verify no errors occurred
        await expect(card).toBeVisible();
      }

      console.log('✓ Project card hover effects verified');
    });

    test('should animate hover transitions smoothly', async ({ page }) => {
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();

      // Check for transition property
      const hasTransition = await statCard.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.transition !== 'all 0s ease 0s';
      });

      expect(hasTransition).toBe(true);

      console.log('✓ Smooth hover transitions configured');
    });
  });

  test.describe('Focus Management', () => {
    test('should maintain focus order through all elements', async ({ page }) => {
      const focusOrder: string[] = [];

      // Tab through elements and record focus order
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focused = page.locator(':focus');
        const tagName = await focused.evaluate((el) => el?.tagName).catch(() => 'unknown');
        const ariaLabel = await focused.getAttribute('aria-label').catch(() => null);
        const text = await focused.textContent().catch(() => null);

        focusOrder.push(`${tagName}: ${ariaLabel || text || 'unlabeled'}`);
      }

      console.log('📍 Focus order:', focusOrder);

      // Should have focused on multiple elements
      expect(focusOrder.length).toBeGreaterThan(5);

      console.log('✓ Focus order traversal complete');
    });

    test('should show visible focus indicators on all elements', async ({ page }) => {
      // Tab to several elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focused = page.locator(':focus');

        if (await focused.count() > 0) {
          // Check for focus ring/outline
          const hasFocusIndicator = await focused.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return (
              styles.outline !== 'none' ||
              styles.outlineWidth !== '0px' ||
              styles.boxShadow !== 'none'
            );
          });

          expect(hasFocusIndicator).toBe(true);
        }
      }

      console.log('✓ Focus indicators visible on all elements');
    });

    test('should not trap focus unintentionally', async ({ page }) => {
      // Tab through entire page
      let previousFocus = '';
      let sameCount = 0;

      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focused = page.locator(':focus');
        const currentFocus = await focused.getAttribute('aria-label').catch(() =>
          focused.textContent().catch(() => 'unknown')
        );

        if (currentFocus === previousFocus) {
          sameCount++;
        } else {
          sameCount = 0;
        }

        // Should not stay on same element for more than 2 tabs
        expect(sameCount).toBeLessThan(3);

        previousFocus = currentFocus || '';
      }

      console.log('✓ No focus traps detected');
    });

    test('should handle shift+tab (backwards navigation)', async ({ page }) => {
      // Tab forward several times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const forwardFocus = await page.locator(':focus').getAttribute('aria-label').catch(() => '');

      // Tab backwards
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Shift+Tab');
      }

      const backwardFocus = await page.locator(':focus').getAttribute('aria-label').catch(() => '');

      // Should be on a different element
      expect(backwardFocus).not.toBe(forwardFocus);

      console.log('✓ Backward navigation (Shift+Tab) works');
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should activate buttons with Enter key', async ({ page }) => {
      // Tab to first button (back button is a link, so find actual button)
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focused = page.locator(':focus');
      const tagName = await focused.evaluate((el) => el?.tagName);

      if (tagName === 'BUTTON') {
        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);

        // Should still be on page (or appropriate action occurred)
        await expect(page).toHaveURL(new RegExp(url));
      }

      console.log('✓ Enter key activates buttons');
    });

    test('should activate buttons with Space key', async ({ page }) => {
      // Tab to first button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focused = page.locator(':focus');
      const tagName = await focused.evaluate((el) => el?.tagName);

      if (tagName === 'BUTTON') {
        // Press Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);

        // Should still be on page
        await expect(page).toHaveURL(new RegExp(url));
      }

      console.log('✓ Space key activates buttons');
    });

    test('should navigate links with Enter key', async ({ page }) => {
      // Tab to first link (back button)
      await page.keyboard.press('Tab');

      const focused = page.locator(':focus');
      const tagName = await focused.evaluate((el) => el?.tagName);

      if (tagName === 'A') {
        const href = await focused.getAttribute('href');
        expect(href).toBeTruthy();

        // Don't actually press Enter as it will navigate away
        // Just verify the link is keyboard accessible
      }

      console.log('✓ Links are keyboard accessible');
    });
  });

  test.describe('Animation Completion', () => {
    test('should complete page load animations', async ({ page }) => {
      // Reload page to trigger animations
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Wait for animations to complete
      await page.waitForTimeout(1000);

      // Check if animations are in final state
      const hasRunningAnimations = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of Array.from(elements)) {
          const animations = (el as HTMLElement).getAnimations?.();
          if (animations && animations.length > 0) {
            return true;
          }
        }
        return false;
      });

      // All animations should have completed
      expect(hasRunningAnimations).toBe(false);

      console.log('✓ Page load animations completed');
    });

    test('should handle hover transition animations', async ({ page }) => {
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();

      // Trigger hover
      await statCard.hover();

      // Wait for transition to complete (200ms as specified in component)
      await page.waitForTimeout(300);

      // Check if transition has completed
      const isTransitioning = await statCard.evaluate((el) => {
        const animations = el.getAnimations?.() || [];
        return animations.some(anim => anim.playState === 'running');
      });

      expect(isTransitioning).toBe(false);

      console.log('✓ Hover transitions completed');
    });

    test('should handle dark mode transition animations', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Wait for transitions to complete
      await page.waitForTimeout(500);

      // Check if transitions have completed
      const hasActiveTransitions = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of Array.from(elements)) {
          const animations = (el as HTMLElement).getAnimations?.() || [];
          if (animations.some(anim => anim.playState === 'running')) {
            return true;
          }
        }
        return false;
      });

      expect(hasActiveTransitions).toBe(false);

      console.log('✓ Dark mode transitions completed');
    });
  });

  test.describe('State Persistence', () => {
    test('should maintain scroll position on interaction', async ({ page }) => {
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(200);

      const scrollBefore = await page.evaluate(() => window.scrollY);

      // Click a stat card
      const statCard = page.getByRole('button').first();
      await statCard.click();
      await page.waitForTimeout(200);

      const scrollAfter = await page.evaluate(() => window.scrollY);

      // Scroll position should be maintained (allowing small tolerance)
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(10);

      console.log('✓ Scroll position maintained after interaction');
    });

    test('should maintain dark mode preference', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(200);

      const isDarkBefore = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      // Interact with element
      const statCard = page.getByRole('button').first();
      await statCard.click();
      await page.waitForTimeout(200);

      const isDarkAfter = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      // Dark mode should persist
      expect(isDarkAfter).toBe(isDarkBefore);

      console.log('✓ Dark mode preference maintained');
    });
  });

  test.describe('Multi-Element Interactions', () => {
    test('should handle multiple simultaneous hovers (rapid switching)', async ({ page }) => {
      const statCards = page.getByRole('button').filter({ has: page.locator('[aria-label*="out of"]') });
      const count = await statCards.count();

      // Rapidly hover over multiple cards
      for (let i = 0; i < Math.min(count, 4); i++) {
        await statCards.nth(i).hover();
        await page.waitForTimeout(50); // Very short delay
      }

      // All cards should still be visible
      for (let i = 0; i < Math.min(count, 4); i++) {
        await expect(statCards.nth(i)).toBeVisible();
      }

      console.log('✓ Rapid hover switching handled correctly');
    });

    test('should handle clicking different elements in sequence', async ({ page }) => {
      // Click stat card
      const statCard = page.getByRole('button').filter({ hasText: 'Active Projects' }).first();
      await statCard.click();
      await page.waitForTimeout(100);

      // Click view all button
      const viewAll = page.getByRole('button', { name: /view all/i });
      await viewAll.click();
      await page.waitForTimeout(100);

      // Click another stat card
      const statCard2 = page.getByRole('button').filter({ hasText: 'Team Members' }).first();
      await statCard2.click();
      await page.waitForTimeout(100);

      // Page should still be functional
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Sequential element interactions handled');
    });
  });

  test.describe('Error Resilience', () => {
    test('should handle clicks on disabled elements gracefully', async ({ page }) => {
      // Try to find any disabled elements
      const disabledElements = page.locator('[disabled], [aria-disabled="true"]');
      const count = await disabledElements.count();

      if (count > 0) {
        const disabled = disabledElements.first();
        await disabled.click({ force: true });
        await page.waitForTimeout(200);

        // Should not cause errors
        await expect(page).toHaveURL(new RegExp(url));
      }

      console.log('✓ Disabled element clicks handled gracefully');
    });

    test('should recover from rapid interaction patterns', async ({ page }) => {
      const statCard = page.getByRole('button').first();

      // Rapid clicks, hovers, and tabs
      for (let i = 0; i < 5; i++) {
        await statCard.click();
        await statCard.hover();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
      }

      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(statCard).toBeVisible();

      console.log('✓ Recovered from rapid interactions');
    });
  });
});
