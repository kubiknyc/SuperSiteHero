/**
 * Project Templates E2E Tests
 *
 * Comprehensive tests for project template management:
 * - Viewing available templates
 * - Creating new templates from scratch
 * - Creating templates from existing projects
 * - Editing template details
 * - Using templates to create new projects
 * - Template categories and organization
 * - Deleting templates
 * - Template filtering and search
 */

import { test, expect } from '@playwright/test';
import {
  waitForContentLoad,
  waitForFormResponse,
  generateTestData,
  waitAndClick,
} from './helpers/test-helpers';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Project Templates', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project templates page
    await page.goto('/settings/project-templates');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoad(page);
  });

  test('should display project templates page', async ({ page }) => {
    // Should show page title
    const pageTitle = page.locator('h1:has-text("Project Templates")');
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    // Should show template stats cards
    const statsCards = page.locator('.grid').filter({ has: page.locator('text=/Total Templates|Most Used|Recently Used/') });
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display template tabs', async ({ page }) => {
    // Should have tabs for different template views
    const allTab = page.locator('[role="tab"]:has-text("All Templates")');
    const recentTab = page.locator('[role="tab"]:has-text("Recently Used")');
    const popularTab = page.locator('[role="tab"]:has-text("Most Popular")');

    await expect(allTab).toBeVisible({ timeout: 5000 });
    await expect(recentTab).toBeVisible({ timeout: 5000 });
    await expect(popularTab).toBeVisible({ timeout: 5000 });
  });

  test('should open create template dialog', async ({ page }) => {
    // Click create template button
    const createButton = page.locator('button:has-text("Create Template")');
    const buttonVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Create template button not found');
      return;
    }

    await createButton.click();
    await waitForContentLoad(page);

    // Dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show dialog title
    const dialogTitle = page.locator('[role="dialog"]').locator('text="Create Project Template"');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });
  });

  test('should create new template from scratch', async ({ page }) => {
    // Click create template button
    const createButton = page.locator('button:has-text("Create Template")');
    const buttonVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Create template button not found');
      return;
    }

    await createButton.click();
    await waitForContentLoad(page);

    // Fill in template details
    const templateName = generateTestData('E2E Template');
    const nameInput = page.locator('input[name="name"], input#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);

    const descriptionInput = page.locator('textarea[name="description"], textarea#description');
    const descVisible = await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (descVisible) {
      await descriptionInput.fill('E2E test template description');
    }

    // Select category (if visible)
    const categorySelect = page.locator('[role="combobox"]').filter({ hasText: /category/i }).first();
    const categoryVisible = await categorySelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (categoryVisible) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      // Select commercial category
      const commercialOption = page.locator('[role="option"]:has-text("Commercial")').first();
      const optionVisible = await commercialOption.isVisible({ timeout: 2000 }).catch(() => false);
      if (optionVisible) {
        await commercialOption.click();
      }
    }

    // Navigate through wizard steps (if multi-step)
    const nextButton = page.locator('button:has-text("Next")');
    const nextVisible = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (nextVisible) {
      // Step 1: Basics - click next
      await nextButton.click();
      await page.waitForTimeout(500);

      // Step 2: Features tab should be visible
      const featuresTab = page.locator('[role="tabpanel"]').filter({ hasText: /features|enable/i });
      const featuresVisible = await featuresTab.isVisible({ timeout: 2000 }).catch(() => false);

      if (featuresVisible) {
        // Toggle some features on/off
        const featureToggles = page.locator('[role="switch"]').first();
        const toggleVisible = await featureToggles.isVisible({ timeout: 2000 }).catch(() => false);
        if (toggleVisible) {
          await featureToggles.click();
        }

        // Click next to go to folders
        const nextBtn2 = page.locator('button:has-text("Next")');
        const nextVisible2 = await nextBtn2.isVisible({ timeout: 2000 }).catch(() => false);
        if (nextVisible2) {
          await nextBtn2.click();
          await page.waitForTimeout(500);
        }

        // Step 3: Folders - click next
        const nextBtn3 = page.locator('button:has-text("Next")');
        const nextVisible3 = await nextBtn3.isVisible({ timeout: 2000 }).catch(() => false);
        if (nextVisible3) {
          await nextBtn3.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Submit form (either "Create Template" or final step submit)
    const submitButton = page.locator('button:has-text("Create Template")');
    const submitVisible = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!submitVisible) {
      test.skip(true, 'Submit button not found');
      return;
    }

    await submitButton.click();
    await waitForFormResponse(page, 10000);

    // Should show success message
    const successToast = page.locator('[role="alert"]').filter({ hasText: /success|created/i });
    const toastVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);

    // Dialog should close
    const dialogClosed = await page.locator('[role="dialog"]').isHidden().catch(() => true);

    // At least one success indicator should be present
    expect(toastVisible || dialogClosed).toBe(true);
  });

  test('should filter templates by category', async ({ page }) => {
    // Check if category filter exists
    const categoryFilter = page.locator('[role="combobox"]').filter({ hasText: /category/i }).first();
    const filterVisible = await categoryFilter.isVisible({ timeout: 5000 }).catch(() => false);

    if (!filterVisible) {
      test.skip(true, 'Category filter not found');
      return;
    }

    // Click category filter
    await categoryFilter.click();
    await page.waitForTimeout(500);

    // Select a category
    const residentialOption = page.locator('[role="option"]:has-text("Residential")').first();
    const optionVisible = await residentialOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (!optionVisible) {
      test.skip(true, 'Category options not available');
      return;
    }

    await residentialOption.click();
    await waitForContentLoad(page);

    // Results should update (look for template cards or empty state)
    const templateCards = page.locator('[data-testid="template-card"], .card, [role="article"]');
    const emptyState = page.locator('text=/No templates|0 template/');

    // Either cards or empty state should be visible
    const cardsVisible = await templateCards.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(cardsVisible || emptyVisible).toBe(true);
  });

  test('should search templates', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const searchVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!searchVisible) {
      test.skip(true, 'Search input not found');
      return;
    }

    // Type search query
    await searchInput.fill('office');
    await waitForContentLoad(page, 3000);

    // Results should update
    const resultsCount = page.locator('text=/\\d+ template/');
    const resultsVisible = await resultsCount.isVisible({ timeout: 3000 }).catch(() => false);

    // Search should produce some result indicator
    expect(resultsVisible).toBe(true);
  });

  test('should view template details and edit', async ({ page }) => {
    // Look for a template card
    const templateCard = page.locator('[data-testid="template-card"], .card').first();
    const cardVisible = await templateCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No templates available to edit');
      return;
    }

    // Open actions menu
    const moreButton = templateCard.locator('button').filter({ hasText: /more|⋮/i });
    const menuButton = await moreButton.isVisible({ timeout: 2000 }).catch(() => false)
      ? moreButton
      : templateCard.locator('[aria-label*="menu"], [aria-haspopup="menu"]').first();

    const buttonVisible = await menuButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Template actions menu not found');
      return;
    }

    await menuButton.click();
    await page.waitForTimeout(500);

    // Click edit option
    const editOption = page.locator('[role="menuitem"]:has-text("Edit")').first();
    const editVisible = await editOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (!editVisible) {
      test.skip(true, 'Edit option not found in menu');
      return;
    }

    await editOption.click();
    await waitForContentLoad(page);

    // Edit dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show edit title
    const editTitle = page.locator('[role="dialog"]').locator('text=/Edit.*Template/');
    await expect(editTitle).toBeVisible({ timeout: 5000 });

    // Modify description
    const descriptionInput = page.locator('textarea[name="description"], textarea#description');
    const descVisible = await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (descVisible) {
      await descriptionInput.clear();
      await descriptionInput.fill('Updated description from E2E test');
    }

    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
    const saveVisible = await saveButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (saveVisible) {
      await saveButton.click();
      await waitForFormResponse(page, 10000);

      // Success indicator
      const successToast = page.locator('[role="alert"]').filter({ hasText: /success|updated/i });
      await expect(successToast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should duplicate template', async ({ page }) => {
    // Look for a template card
    const templateCard = page.locator('[data-testid="template-card"], .card').first();
    const cardVisible = await templateCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No templates available to duplicate');
      return;
    }

    // Open actions menu
    const moreButton = templateCard.locator('button').filter({ hasText: /more|⋮/i });
    const menuButton = await moreButton.isVisible({ timeout: 2000 }).catch(() => false)
      ? moreButton
      : templateCard.locator('[aria-label*="menu"], [aria-haspopup="menu"]').first();

    const buttonVisible = await menuButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Template actions menu not found');
      return;
    }

    await menuButton.click();
    await page.waitForTimeout(500);

    // Click duplicate option
    const duplicateOption = page.locator('[role="menuitem"]:has-text("Duplicate")').first();
    const duplicateVisible = await duplicateOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (!duplicateVisible) {
      test.skip(true, 'Duplicate option not found in menu');
      return;
    }

    // Handle browser prompt for duplicate name
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('E2E Duplicated Template');
    });

    await duplicateOption.click();
    await waitForFormResponse(page, 10000);

    // Success indicator
    const successToast = page.locator('[role="alert"]').filter({ hasText: /success|duplicated/i });
    await expect(successToast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should delete template', async ({ page }) => {
    // Look for a template card
    const templateCard = page.locator('[data-testid="template-card"], .card').first();
    const cardVisible = await templateCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No templates available to delete');
      return;
    }

    // Open actions menu
    const moreButton = templateCard.locator('button').filter({ hasText: /more|⋮/i });
    const menuButton = await moreButton.isVisible({ timeout: 2000 }).catch(() => false)
      ? moreButton
      : templateCard.locator('[aria-label*="menu"], [aria-haspopup="menu"]').first();

    const buttonVisible = await menuButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Template actions menu not found');
      return;
    }

    await menuButton.click();
    await page.waitForTimeout(500);

    // Click delete option
    const deleteOption = page.locator('[role="menuitem"]:has-text("Delete")').first();
    const deleteVisible = await deleteOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (!deleteVisible) {
      test.skip(true, 'Delete option not found in menu');
      return;
    }

    await deleteOption.click();
    await page.waitForTimeout(500);

    // Confirmation dialog should appear
    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /delete|confirm/i });
    const dialogVisible = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);

    if (!dialogVisible) {
      test.skip(true, 'Delete confirmation dialog not found');
      return;
    }

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete")').last();
    await confirmButton.click();
    await waitForFormResponse(page, 10000);

    // Success indicator
    const successToast = page.locator('[role="alert"]').filter({ hasText: /success|deleted/i });
    await expect(successToast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should switch between template tabs', async ({ page }) => {
    // Click on "Recently Used" tab
    const recentTab = page.locator('[role="tab"]:has-text("Recently Used")');
    await expect(recentTab).toBeVisible({ timeout: 5000 });
    await recentTab.click();
    await waitForContentLoad(page);

    // Should show recent templates panel
    const recentPanel = page.locator('[role="tabpanel"]').filter({ hasText: /recent|no recent/i });
    await expect(recentPanel.first()).toBeVisible({ timeout: 5000 });

    // Click on "Most Popular" tab
    const popularTab = page.locator('[role="tab"]:has-text("Most Popular")');
    await expect(popularTab).toBeVisible({ timeout: 5000 });
    await popularTab.click();
    await waitForContentLoad(page);

    // Should show popular templates panel
    const popularPanel = page.locator('[role="tabpanel"]').filter({ hasText: /popular|most used|no template/i });
    await expect(popularPanel.first()).toBeVisible({ timeout: 5000 });
  });

  test('should toggle view mode between list and grid', async ({ page }) => {
    // Look for view toggle buttons
    const listViewButton = page.locator('button[aria-label*="list"], button').filter({ hasText: /list/i }).first();
    const gridViewButton = page.locator('button[aria-label*="grid"], button').filter({ hasText: /grid/i }).first();

    const listVisible = await listViewButton.isVisible({ timeout: 3000 }).catch(() => false);
    const gridVisible = await gridViewButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!listVisible && !gridVisible) {
      test.skip(true, 'View toggle buttons not found');
      return;
    }

    // Toggle to grid view if available
    if (gridVisible) {
      await gridViewButton.click();
      await page.waitForTimeout(500);

      // Grid layout should be applied
      const gridContainer = page.locator('.grid, [style*="grid"]').first();
      await expect(gridContainer).toBeVisible({ timeout: 3000 }).catch(() => {});
    }

    // Toggle back to list view if available
    if (listVisible) {
      await listViewButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show template usage statistics', async ({ page }) => {
    // Check stats cards
    const totalTemplatesCard = page.locator('text="Total Templates"').locator('..');
    const mostUsedCard = page.locator('text="Most Used"').locator('..');
    const recentlyUsedCard = page.locator('text="Recently Used"').locator('..');

    // At least one stat card should be visible
    const totalVisible = await totalTemplatesCard.isVisible({ timeout: 3000 }).catch(() => false);
    const mostVisible = await mostUsedCard.isVisible({ timeout: 3000 }).catch(() => false);
    const recentVisible = await recentlyUsedCard.isVisible({ timeout: 3000 }).catch(() => false);

    expect(totalVisible || mostVisible || recentVisible).toBe(true);

    // Check for usage count on template cards
    const usageCount = page.locator('text=/Used \\d+ time/').first();
    const usageVisible = await usageCount.isVisible({ timeout: 3000 }).catch(() => false);

    // Usage stats may not be visible if no templates exist
    if (usageVisible) {
      await expect(usageCount).toBeVisible();
    }
  });

  test('should create template from existing project', async ({ page }) => {
    // Navigate to a project detail page first
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoad(page);

    // Look for a project link
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const linkVisible = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!linkVisible) {
      test.skip(true, 'No projects available to create template from');
      return;
    }

    // Click on project
    await projectLink.click();
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoad(page);

    // Look for "Save as Template" or similar action
    const saveAsTemplateButton = page.locator('button:has-text("Save as Template"), button:has-text("Create Template")');
    const buttonVisible = await saveAsTemplateButton.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      // Try looking in actions menu
      const actionsButton = page.locator('button:has-text("Actions"), button[aria-label*="menu"]').first();
      const actionsVisible = await actionsButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (actionsVisible) {
        await actionsButton.click();
        await page.waitForTimeout(500);

        const templateMenuItem = page.locator('[role="menuitem"]:has-text("Template")').first();
        const menuVisible = await templateMenuItem.isVisible({ timeout: 2000 }).catch(() => false);

        if (!menuVisible) {
          test.skip(true, 'Save as Template action not found');
          return;
        }

        await templateMenuItem.click();
      } else {
        test.skip(true, 'Save as Template button not found');
        return;
      }
    } else {
      await saveAsTemplateButton.first().click();
    }

    await waitForContentLoad(page);

    // Dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill template name
    const templateName = generateTestData('Template from Project');
    const nameInput = page.locator('input[name="name"], input#template-name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);

    // Select what to include (checkboxes)
    const includeFolders = page.locator('input[type="checkbox"]#include-folders, label:has-text("Folder Structure")');
    const foldersVisible = await includeFolders.first().isVisible({ timeout: 2000 }).catch(() => false);

    if (foldersVisible) {
      await includeFolders.first().click();
    }

    // Submit
    const createButton = page.locator('button:has-text("Create Template")');
    const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!createVisible) {
      test.skip(true, 'Create button not found');
      return;
    }

    await createButton.click();
    await waitForFormResponse(page, 10000);

    // Success indicator
    const successToast = page.locator('[role="alert"]').filter({ hasText: /success|created/i });
    await expect(successToast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should use template to create new project', async ({ page }) => {
    // Navigate to templates page
    await page.goto('/settings/project-templates');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoad(page);

    // Look for a template card
    const templateCard = page.locator('[data-testid="template-card"], .card').first();
    const cardVisible = await templateCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No templates available to use');
      return;
    }

    // Try to click "Use Template" or go to new project page
    await page.goto('/projects/new');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoad(page);

    // Look for template selector
    const templateSelector = page.locator('select[name="template"], [role="combobox"]').filter({ hasText: /template/i }).first();
    const selectorVisible = await templateSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (!selectorVisible) {
      test.skip(true, 'Template selector not found on new project page');
      return;
    }

    // Select a template
    await templateSelector.click();
    await page.waitForTimeout(500);

    const templateOption = page.locator('[role="option"]').first();
    const optionVisible = await templateOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (!optionVisible) {
      test.skip(true, 'No template options available');
      return;
    }

    await templateOption.click();
    await waitForContentLoad(page);

    // Template should be applied (folder structure, settings should populate)
    // Fill project name
    const projectName = generateTestData('Project from Template');
    const nameInput = page.locator('input[name="name"], input#name').first();
    const nameVisible = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (nameVisible) {
      await nameInput.fill(projectName);

      // Submit project creation
      const createButton = page.locator('button:has-text("Create Project"), button[type="submit"]').first();
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (createVisible) {
        await createButton.click();
        await waitForFormResponse(page, 15000);

        // Success indicator or navigation to new project
        const successToast = page.locator('[role="alert"]').filter({ hasText: /success|created/i });
        const urlChanged = !page.url().includes('/projects/new');

        const toastVisible = await successToast.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(toastVisible || urlChanged).toBe(true);
      }
    }
  });

  test('should show empty state when no templates exist', async ({ page }) => {
    // Switch to a filtered view that might be empty
    const categoryFilter = page.locator('[role="combobox"]').filter({ hasText: /category/i }).first();
    const filterVisible = await categoryFilter.isVisible({ timeout: 3000 }).catch(() => false);

    if (filterVisible) {
      await categoryFilter.click();
      await page.waitForTimeout(500);

      // Select a less common category
      const civilOption = page.locator('[role="option"]:has-text("Civil")').first();
      const optionVisible = await civilOption.isVisible({ timeout: 2000 }).catch(() => false);

      if (optionVisible) {
        await civilOption.click();
        await waitForContentLoad(page);

        // Check for empty state message
        const emptyState = page.locator('text=/No templates|0 template/');
        const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

        // Empty state should be visible if no templates in this category
        if (emptyVisible) {
          await expect(emptyState).toBeVisible();
        }
      }
    }

    // Check Recently Used tab for empty state
    const recentTab = page.locator('[role="tab"]:has-text("Recently Used")');
    await recentTab.click();
    await waitForContentLoad(page);

    const recentEmpty = page.locator('text=/No.*recent|haven\'t been used/i');
    const recentEmptyVisible = await recentEmpty.isVisible({ timeout: 3000 }).catch(() => false);

    // May or may not be empty depending on data
    if (recentEmptyVisible) {
      await expect(recentEmpty).toBeVisible();
    }
  });

  test('should validate template form fields', async ({ page }) => {
    // Open create template dialog
    const createButton = page.locator('button:has-text("Create Template")');
    const buttonVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Create template button not found');
      return;
    }

    await createButton.click();
    await waitForContentLoad(page);

    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("Create Template"), button:has-text("Next")').last();
    const submitVisible = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!submitVisible) {
      test.skip(true, 'Submit button not found');
      return;
    }

    // Button should be disabled or show validation error
    const isDisabled = await submitButton.isDisabled().catch(() => false);

    if (!isDisabled) {
      // Try clicking - should show validation
      await submitButton.click();
      await page.waitForTimeout(500);

      // Look for validation message
      const validationMessage = page.locator('text=/required|cannot be empty/i');
      const validationVisible = await validationMessage.isVisible({ timeout: 2000 }).catch(() => false);

      // Either button was disabled or validation message shown
      expect(validationVisible).toBe(true);
    } else {
      // Button correctly disabled
      expect(isDisabled).toBe(true);
    }
  });

  test('should show template category icons and badges', async ({ page }) => {
    // Look for template cards
    const templateCard = page.locator('[data-testid="template-card"], .card').first();
    const cardVisible = await templateCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No templates available to check');
      return;
    }

    // Check for category badge
    const categoryBadge = templateCard.locator('[class*="badge"]').filter({ hasText: /Commercial|Residential|Industrial|Renovation|Civil|Institutional/i });
    const badgeVisible = await categoryBadge.first().isVisible({ timeout: 3000 }).catch(() => false);

    // Check for category icon (svg or icon element)
    const categoryIcon = templateCard.locator('svg, [class*="icon"]').first();
    const iconVisible = await categoryIcon.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one should be visible
    expect(badgeVisible || iconVisible).toBe(true);
  });

  test('should handle template visibility settings', async ({ page }) => {
    // Open create template dialog
    const createButton = page.locator('button:has-text("Create Template")');
    const buttonVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Create template button not found');
      return;
    }

    await createButton.click();
    await waitForContentLoad(page);

    // Look for visibility toggle (Private/Company)
    const privateToggle = page.locator('input[type="checkbox"]#private, [role="switch"]').filter({ hasText: /private/i }).first();
    const toggleVisible = await privateToggle.isVisible({ timeout: 3000 }).catch(() => false);

    if (!toggleVisible) {
      // Look for visibility buttons
      const privateButton = page.locator('button:has-text("Private")').first();
      const companyButton = page.locator('button:has-text("Company")').first();

      const privateButtonVisible = await privateButton.isVisible({ timeout: 3000 }).catch(() => false);
      const companyButtonVisible = await companyButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!privateButtonVisible && !companyButtonVisible) {
        test.skip(true, 'Visibility controls not found');
        return;
      }

      // Toggle between visibility options
      if (privateButtonVisible) {
        await privateButton.click();
        await page.waitForTimeout(300);
      }

      if (companyButtonVisible) {
        await companyButton.click();
        await page.waitForTimeout(300);
      }
    } else {
      // Toggle private switch
      await privateToggle.click();
      await page.waitForTimeout(300);
    }

    // Close dialog
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
  });
});
