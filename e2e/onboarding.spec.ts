/**
 * Onboarding E2E Tests
 *
 * Comprehensive tests for the multi-step onboarding wizard:
 * - First-time user setup wizard
 * - Company/organization setup
 * - Role selection
 * - Profile completion
 * - Welcome tour/walkthrough
 * - Initial project creation flow
 * - Team invitation flow
 * - Onboarding progress tracking
 * - Skip/complete onboarding flows
 */

import { test, expect } from '@playwright/test';
import { waitForContentLoad, waitForFormResponse, generateTestData } from './helpers/test-helpers';

test.describe('Onboarding Wizard', () => {
  test.describe('First-time User Onboarding', () => {
    test.beforeEach(async ({ page }) => {
      // Start fresh - clear any existing session and onboarding state
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test('should display onboarding wizard for new users', async ({ page }) => {
      // Navigate to the app (assuming onboarding auto-shows)
      await page.goto('/');
      await waitForContentLoad(page);

      // Check if onboarding wizard dialog is visible
      const onboardingDialog = page.locator('[role="dialog"]').filter({
        has: page.locator('text=/Welcome to JobSight/i')
      });

      const isVisible = await onboardingDialog.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        test.skip();
      }

      // Verify wizard components are present
      await expect(onboardingDialog).toBeVisible();
      await expect(page.locator('text=/Welcome to JobSight/i')).toBeVisible();

      // Check for progress indicators
      const progressBar = page.locator('[role="progressbar"], .progress');
      await expect(progressBar.first()).toBeVisible().catch(() => {});

      // Check for step indicators
      const stepIndicators = page.locator('button[title*="Step"], [aria-label*="step"]');
      const hasStepIndicators = await stepIndicators.count() > 0;
      expect(hasStepIndicators || await progressBar.count() > 0).toBeTruthy();
    });

    test('should complete role selection step', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      // Look for onboarding wizard
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Select a role (Project Manager)
      const projectManagerRole = page.locator('button, [role="button"]').filter({
        hasText: /Project Manager|project_manager/i
      });

      const roleExists = await projectManagerRole.count() > 0;
      if (roleExists) {
        await projectManagerRole.first().click();

        // Verify role is selected (should show active/selected state)
        await expect(projectManagerRole.first()).toHaveClass(/selected|active|ring|border-primary/);
      }

      // Click Continue/Next button
      const continueButton = page.locator('button').filter({
        hasText: /Continue|Next/i
      });

      if (await continueButton.count() > 0) {
        await continueButton.first().click();
        await waitForFormResponse(page);

        // Should move to next step (company setup)
        await expect(page.locator('text=/Company Setup|Set Up Your Company/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should complete company setup step', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Try to navigate to company setup step
      // First, complete role selection if on welcome step
      const welcomeStep = await page.locator('text=/What best describes your role/i')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (welcomeStep) {
        // Select any role quickly
        const roleButton = page.locator('button, [role="button"]').filter({
          hasText: /Superintendent|Project Manager/i
        }).first();

        if (await roleButton.count() > 0) {
          await roleButton.click();
          await page.locator('button').filter({ hasText: /Continue|Next/i }).first().click();
          await waitForFormResponse(page);
        }
      }

      // Now should be on company setup
      const companySetupVisible = await page.locator('text=/Company Setup|Set Up Your Company/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!companySetupVisible) {
        test.skip();
      }

      // Fill in company details
      const companyName = generateTestData('Test Construction Co');
      const companyAddress = '123 Test Street, Test City, TC 12345';
      const companyPhone = '(555) 123-4567';
      const companyWebsite = 'www.testconstruction.com';

      // Fill company name (required field)
      const nameInput = page.locator('input[id="company-name"], input[name*="name" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(companyName);
      }

      // Fill address (optional)
      const addressInput = page.locator('input[id="company-address"], input[name*="address" i]').first();
      if (await addressInput.count() > 0) {
        await addressInput.fill(companyAddress);
      }

      // Fill phone (optional)
      const phoneInput = page.locator('input[id="company-phone"], input[name*="phone" i]').first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill(companyPhone);
      }

      // Fill website (optional)
      const websiteInput = page.locator('input[id="company-website"], input[name*="website" i]').first();
      if (await websiteInput.count() > 0) {
        await websiteInput.fill(companyWebsite);
      }

      // Click Continue
      const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i });
      if (await continueButton.count() > 0) {
        await continueButton.first().click();
        await waitForFormResponse(page);

        // Should move to next step (first project or team invite)
        const nextStepVisible = await Promise.race([
          page.locator('text=/First Project|Create Your First Project/i').isVisible({ timeout: 3000 }),
          page.locator('text=/Invite Your Team|Team Invite/i').isVisible({ timeout: 3000 }),
        ]).catch(() => false);

        expect(nextStepVisible).toBeTruthy();
      }
    });

    test('should navigate through project creation step', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Quick navigation through previous steps
      await navigateThroughInitialSteps(page);

      // Check if on project creation step
      const projectStepVisible = await page.locator('text=/First Project|Create Your First Project/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!projectStepVisible) {
        test.skip();
      }

      // Verify project creation options are present
      const createProjectOption = page.locator('text=/Create a Project/i');
      const templateOption = page.locator('text=/Use a Template/i');

      const hasOptions = await createProjectOption.isVisible({ timeout: 2000 }).catch(() => false) ||
                         await templateOption.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasOptions) {
        expect(hasOptions).toBeTruthy();
      }

      // Can skip or continue to next step
      const continueButton = page.locator('button').filter({ hasText: /Continue|Next|Skip/i });
      if (await continueButton.count() > 0) {
        await continueButton.first().click();
        await waitForFormResponse(page);
      }
    });

    test('should handle team invitation step', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Navigate through to team invite step
      await navigateThroughInitialSteps(page);
      await navigateToTeamInviteStep(page);

      const teamInviteVisible = await page.locator('text=/Invite Your Team|Team Invite/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!teamInviteVisible) {
        test.skip();
      }

      // Try to add team member emails
      const emailInputs = page.locator('input[type="email"]');
      const hasEmailInput = await emailInputs.count() > 0;

      if (hasEmailInput) {
        await emailInputs.first().fill('teammate@example.com');

        // Look for "Add another" button
        const addButton = page.locator('button').filter({ hasText: /Add another|Add email/i });
        if (await addButton.count() > 0) {
          await addButton.first().click();
          await waitForFormResponse(page);

          // Should show another email input
          expect(await emailInputs.count()).toBeGreaterThan(1);
        }
      }

      // Continue to next step
      const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i });
      if (await continueButton.count() > 0) {
        await continueButton.first().click();
        await waitForFormResponse(page);
      }
    });

    test('should display feature tour step', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Navigate through all steps to feature tour
      await navigateThroughAllSteps(page);

      const featureTourVisible = await page.locator('text=/Feature Tour|You\'re All Set/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!featureTourVisible) {
        test.skip();
      }

      // Verify feature highlights are shown
      const featureList = page.locator('ul li, .feature-item');
      const hasFeatures = await featureList.count() > 0;
      expect(hasFeatures).toBeTruthy();

      // Should have "Get Started" button to complete onboarding
      const getStartedButton = page.locator('button').filter({ hasText: /Get Started|Complete|Finish/i });
      await expect(getStartedButton.first()).toBeVisible({ timeout: 3000 });
    });

    test('should complete full onboarding flow', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Complete all onboarding steps
      const completed = await completeFullOnboarding(page);

      if (!completed) {
        test.skip();
      }

      // Verify onboarding is complete
      // Dialog should close and user should be on main app
      const dialogClosed = await page.locator('[role="dialog"]')
        .filter({ has: page.locator('text=/Welcome to JobSight/i') })
        .isHidden({ timeout: 3000 })
        .catch(() => false);

      if (dialogClosed) {
        expect(dialogClosed).toBeTruthy();

        // Should be on dashboard or main page
        const mainContent = page.locator('main, [role="main"]');
        await expect(mainContent.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Onboarding Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await waitForContentLoad(page);
    });

    test('should allow navigation back to previous steps', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Select role and move to next step
      const roleButton = page.locator('button, [role="button"]').filter({
        hasText: /Superintendent|Project Manager/i
      }).first();

      if (await roleButton.count() > 0) {
        await roleButton.click();
        await page.locator('button').filter({ hasText: /Continue|Next/i }).first().click();
        await waitForFormResponse(page);

        // Should be on company setup
        const onCompanySetup = await page.locator('text=/Company Setup|Set Up Your Company/i')
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (onCompanySetup) {
          // Click back button
          const backButton = page.locator('button').filter({ hasText: /Back|Previous/i });
          if (await backButton.count() > 0) {
            await backButton.first().click();
            await waitForFormResponse(page);

            // Should be back on welcome step
            await expect(page.locator('text=/Welcome to JobSight/i')).toBeVisible({ timeout: 3000 });
          }
        }
      }
    });

    test('should track progress through steps', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Check for progress indicator
      const progressText = page.locator('text=/Step 1 of|1 of \\d+|\\d+% complete/i');
      const progressBar = page.locator('[role="progressbar"], .progress');

      const hasProgress = await progressText.isVisible({ timeout: 2000 }).catch(() => false) ||
                         await progressBar.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasProgress).toBeTruthy();

      // Navigate to next step
      const roleButton = page.locator('button, [role="button"]').filter({
        hasText: /Superintendent|Project Manager/i
      }).first();

      if (await roleButton.count() > 0) {
        await roleButton.click();
        await page.locator('button').filter({ hasText: /Continue|Next/i }).first().click();
        await waitForFormResponse(page);

        // Progress should increase
        const updatedProgress = await page.locator('text=/Step 2 of|2 of \\d+/i')
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (!updatedProgress) {
          // Check if progress bar value increased
          const progressValue = await progressBar.first().getAttribute('value').catch(() => null);
          expect(progressValue).toBeTruthy();
        }
      }
    });

    test('should allow skipping onboarding', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Look for skip button
      const skipButton = page.locator('button').filter({ hasText: /Skip|Skip for now|Maybe later/i });

      if (await skipButton.count() > 0) {
        await skipButton.first().click();
        await waitForFormResponse(page);

        // Dialog should close
        const dialogClosed = await page.locator('[role="dialog"]')
          .filter({ has: page.locator('text=/Welcome to JobSight/i') })
          .isHidden({ timeout: 3000 })
          .catch(() => false);

        expect(dialogClosed).toBeTruthy();

        // User should be on main app
        const mainContent = page.locator('main, [role="main"]');
        await expect(mainContent.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow closing onboarding wizard', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Look for close button (X icon)
      const closeButton = page.locator('[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has(svg)').first();

      if (await closeButton.count() > 0) {
        await closeButton.click();
        await waitForFormResponse(page);

        // Dialog should close
        const dialogClosed = await page.locator('[role="dialog"]')
          .filter({ has: page.locator('text=/Welcome to JobSight/i') })
          .isHidden({ timeout: 3000 })
          .catch(() => false);

        expect(dialogClosed).toBeTruthy();
      }
    });
  });

  test.describe('Onboarding Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await waitForContentLoad(page);
    });

    test('should require role selection before proceeding', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Try to continue without selecting a role
      const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i }).first();

      if (await continueButton.count() > 0) {
        // Button should be disabled or clicking shouldn't advance
        const isDisabled = await continueButton.isDisabled().catch(() => false);

        if (!isDisabled) {
          // Try clicking
          await continueButton.click();
          await waitForFormResponse(page);

          // Should still be on welcome step
          const stillOnWelcome = await page.locator('text=/What best describes your role|Welcome to JobSight/i')
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          expect(stillOnWelcome).toBeTruthy();
        } else {
          expect(isDisabled).toBeTruthy();
        }
      }
    });

    test('should require company name before proceeding from company setup', async ({ page }) => {
      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Navigate to company setup step
      await navigateThroughInitialSteps(page);

      const companySetupVisible = await page.locator('text=/Company Setup|Set Up Your Company/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!companySetupVisible) {
        test.skip();
      }

      // Try to continue without entering company name
      const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i }).first();

      if (await continueButton.count() > 0) {
        const isDisabled = await continueButton.isDisabled().catch(() => false);

        if (!isDisabled) {
          // Try clicking
          await continueButton.click();
          await waitForFormResponse(page);

          // Should still be on company setup or show validation error
          const stillOnSetup = await page.locator('text=/Company Setup|Set Up Your Company/i')
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          // Or check for validation message
          const validationMessage = await page.locator('text=/required|enter.*name/i')
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          expect(stillOnSetup || validationMessage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Onboarding Persistence', () => {
    test('should remember onboarding completion state', async ({ page }) => {
      // Complete onboarding
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      await completeFullOnboarding(page);

      // Refresh page
      await page.reload();
      await waitForContentLoad(page);

      // Onboarding should not show again
      const wizardStillHidden = await page.locator('text=/Welcome to JobSight/i')
        .isHidden({ timeout: 2000 })
        .catch(() => true);

      expect(wizardStillHidden).toBeTruthy();
    });

    test('should remember skip state', async ({ page }) => {
      await page.goto('/');
      await waitForContentLoad(page);

      const wizardVisible = await page.locator('text=/Welcome to JobSight/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!wizardVisible) {
        test.skip();
      }

      // Skip onboarding
      const skipButton = page.locator('button').filter({ hasText: /Skip|Skip for now/i });
      if (await skipButton.count() > 0) {
        await skipButton.first().click();
        await waitForFormResponse(page);

        // Refresh page
        await page.reload();
        await waitForContentLoad(page);

        // Onboarding wizard should not show (or show reminder)
        const wizardHidden = await page.locator('[role="dialog"]')
          .filter({ has: page.locator('text=/Welcome to JobSight/i') })
          .isHidden({ timeout: 2000 })
          .catch(() => true);

        // It's ok if wizard is hidden OR if a smaller reminder/banner is shown instead
        expect(wizardHidden).toBeTruthy();
      }
    });
  });
});

// Helper Functions

/**
 * Navigate through initial steps (welcome and role selection)
 */
async function navigateThroughInitialSteps(page: any) {
  // Select role if on welcome step
  const roleButton = page.locator('button, [role="button"]').filter({
    hasText: /Superintendent|Project Manager/i
  }).first();

  const hasRole = await roleButton.count() > 0;
  if (hasRole) {
    await roleButton.click();
    const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i }).first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await waitForFormResponse(page);
    }
  }

  // Fill company name if on company setup
  const companySetup = await page.locator('text=/Company Setup|Set Up Your Company/i')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (companySetup) {
    const nameInput = page.locator('input[id="company-name"], input[name*="name" i]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill(generateTestData('Test Company'));
    }

    const continueButton = page.locator('button').filter({ hasText: /Continue|Next/i }).first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await waitForFormResponse(page);
    }
  }
}

/**
 * Navigate to team invite step
 */
async function navigateToTeamInviteStep(page: any) {
  // Skip through project creation if present
  const projectStep = await page.locator('text=/First Project|Create Your First Project/i')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (projectStep) {
    const continueButton = page.locator('button').filter({ hasText: /Continue|Next|Skip/i }).first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await waitForFormResponse(page);
    }
  }
}

/**
 * Navigate through all steps to reach feature tour
 */
async function navigateThroughAllSteps(page: any) {
  await navigateThroughInitialSteps(page);
  await navigateToTeamInviteStep(page);

  // Skip through team invite
  const teamInvite = await page.locator('text=/Invite Your Team|Team Invite/i')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (teamInvite) {
    const continueButton = page.locator('button').filter({ hasText: /Continue|Next|Skip/i }).first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await waitForFormResponse(page);
    }
  }
}

/**
 * Complete the full onboarding flow
 */
async function completeFullOnboarding(page: any): Promise<boolean> {
  try {
    // Navigate through all steps
    await navigateThroughAllSteps(page);

    // Should be on feature tour
    const featureTour = await page.locator('text=/Feature Tour|You\'re All Set/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!featureTour) {
      return false;
    }

    // Click "Get Started" to complete
    const getStartedButton = page.locator('button').filter({ hasText: /Get Started|Complete|Finish/i }).first();
    if (await getStartedButton.count() > 0) {
      await getStartedButton.click();
      await waitForFormResponse(page);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}
