/**
 * Safe Interactor
 *
 * Performs non-destructive UI interactions for autonomous smoke testing.
 * Avoids actions that could modify data or navigate away from the current page.
 */

import type { Page, Locator } from '@playwright/test';

export interface InteractionResult {
  success: boolean;
  action: string;
  selector: string;
  error?: string;
}

export interface SafeInteractorOptions {
  /** Timeout for individual interactions in milliseconds */
  interactionTimeout: number;
  /** Whether to log interactions */
  verbose: boolean;
  /** Maximum number of interactions per page */
  maxInteractions: number;
}

const DEFAULT_OPTIONS: SafeInteractorOptions = {
  interactionTimeout: 5000,
  verbose: false,
  maxInteractions: 20,
};

// Selectors for SAFE interactions (read-only, non-destructive)
const SAFE_SELECTORS = {
  // Navigation and tabs
  tabs: '[role="tab"]:not([aria-selected="true"])',
  accordions: '[data-state="closed"], [aria-expanded="false"]',

  // Dropdowns (we'll click then escape to close)
  dropdownTriggers: '[role="combobox"], [data-radix-collection-item], button[aria-haspopup="menu"]',

  // Tooltips and popovers
  tooltipTriggers: '[data-tooltip], [title]:not(svg):not(path)',

  // Expandable content
  collapsibles: '[data-collapsible], details:not([open]) summary',

  // Table interactions
  tableSortHeaders: 'th[aria-sort], th button',
  tableExpandRows: 'tr button[aria-expanded="false"]',

  // View toggles
  viewToggles: '[role="radio"]:not([aria-checked="true"]), button[data-view]',

  // Carousel/slider controls
  carouselControls: '[aria-label*="next"], [aria-label*="previous"], [aria-label*="slide"]',
};

// Selectors to AVOID (destructive or navigational)
const UNSAFE_PATTERNS = [
  // Form submissions
  'button[type="submit"]',
  'input[type="submit"]',
  'form button:not([type="button"])',

  // Delete/destructive actions
  '[data-testid*="delete"]',
  '[data-testid*="remove"]',
  '[aria-label*="delete"]',
  '[aria-label*="remove"]',
  'button:has-text("Delete")',
  'button:has-text("Remove")',

  // Navigation links
  'a[href]:not([href="#"]):not([href=""])',
  '[role="link"]',

  // Logout/auth actions
  '[data-testid*="logout"]',
  '[data-testid*="signout"]',
  'button:has-text("Logout")',
  'button:has-text("Sign out")',

  // Save/create actions
  'button:has-text("Save")',
  'button:has-text("Create")',
  'button:has-text("Submit")',
  'button:has-text("Confirm")',

  // Modal close buttons that might discard data
  '[data-testid="modal-close"]',

  // File inputs
  'input[type="file"]',
];

export class SafeInteractor {
  private page: Page;
  private options: SafeInteractorOptions;
  private interactionLog: InteractionResult[] = [];

  constructor(page: Page, options: Partial<SafeInteractorOptions> = {}) {
    this.page = page;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Perform safe interactions on the current page
   */
  async performSafeInteractions(): Promise<InteractionResult[]> {
    this.interactionLog = [];
    let interactionCount = 0;

    // Tab interactions
    interactionCount += await this.interactWithTabs();
    if (interactionCount >= this.options.maxInteractions) return this.interactionLog;

    // Accordion/expandable interactions
    interactionCount += await this.interactWithAccordions();
    if (interactionCount >= this.options.maxInteractions) return this.interactionLog;

    // Dropdown peek (open and close)
    interactionCount += await this.peekDropdowns();
    if (interactionCount >= this.options.maxInteractions) return this.interactionLog;

    // Tooltip hover
    interactionCount += await this.hoverTooltips();
    if (interactionCount >= this.options.maxInteractions) return this.interactionLog;

    // Table sort interactions
    interactionCount += await this.interactWithTableSorts();
    if (interactionCount >= this.options.maxInteractions) return this.interactionLog;

    // View toggle interactions
    interactionCount += await this.interactWithViewToggles();

    return this.interactionLog;
  }

  /**
   * Click on non-selected tabs
   */
  private async interactWithTabs(): Promise<number> {
    let count = 0;
    const tabs = this.page.locator(SAFE_SELECTORS.tabs);
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      const tab = tabs.nth(i);
      if (await this.isSafeToInteract(tab)) {
        const result = await this.safeClick(tab, 'tab');
        this.interactionLog.push(result);
        if (result.success) count++;
        // Small delay between tab clicks to allow content to load
        await this.page.waitForTimeout(300);
      }
    }

    return count;
  }

  /**
   * Expand closed accordions
   */
  private async interactWithAccordions(): Promise<number> {
    let count = 0;
    const accordions = this.page.locator(SAFE_SELECTORS.accordions);
    const accordionCount = await accordions.count();

    for (let i = 0; i < Math.min(accordionCount, 3); i++) {
      const accordion = accordions.nth(i);
      if (await this.isSafeToInteract(accordion)) {
        const result = await this.safeClick(accordion, 'accordion');
        this.interactionLog.push(result);
        if (result.success) count++;
        await this.page.waitForTimeout(200);
      }
    }

    return count;
  }

  /**
   * Open and immediately close dropdowns to verify they work
   */
  private async peekDropdowns(): Promise<number> {
    let count = 0;
    const dropdowns = this.page.locator(SAFE_SELECTORS.dropdownTriggers);
    const dropdownCount = await dropdowns.count();

    for (let i = 0; i < Math.min(dropdownCount, 2); i++) {
      const dropdown = dropdowns.nth(i);
      if (await this.isSafeToInteract(dropdown)) {
        const result = await this.peekDropdown(dropdown);
        this.interactionLog.push(result);
        if (result.success) count++;
      }
    }

    return count;
  }

  /**
   * Hover over tooltip triggers
   */
  private async hoverTooltips(): Promise<number> {
    let count = 0;
    const tooltips = this.page.locator(SAFE_SELECTORS.tooltipTriggers);
    const tooltipCount = await tooltips.count();

    for (let i = 0; i < Math.min(tooltipCount, 3); i++) {
      const tooltip = tooltips.nth(i);
      if (await this.isSafeToInteract(tooltip)) {
        const result = await this.safeHover(tooltip, 'tooltip');
        this.interactionLog.push(result);
        if (result.success) count++;
      }
    }

    return count;
  }

  /**
   * Click table sort headers
   */
  private async interactWithTableSorts(): Promise<number> {
    let count = 0;
    const sortHeaders = this.page.locator(SAFE_SELECTORS.tableSortHeaders);
    const headerCount = await sortHeaders.count();

    for (let i = 0; i < Math.min(headerCount, 2); i++) {
      const header = sortHeaders.nth(i);
      if (await this.isSafeToInteract(header)) {
        const result = await this.safeClick(header, 'table-sort');
        this.interactionLog.push(result);
        if (result.success) count++;
        await this.page.waitForTimeout(300);
      }
    }

    return count;
  }

  /**
   * Click view toggle buttons (list/grid, etc.)
   */
  private async interactWithViewToggles(): Promise<number> {
    let count = 0;
    const toggles = this.page.locator(SAFE_SELECTORS.viewToggles);
    const toggleCount = await toggles.count();

    for (let i = 0; i < Math.min(toggleCount, 2); i++) {
      const toggle = toggles.nth(i);
      if (await this.isSafeToInteract(toggle)) {
        const result = await this.safeClick(toggle, 'view-toggle');
        this.interactionLog.push(result);
        if (result.success) count++;
        await this.page.waitForTimeout(200);
      }
    }

    return count;
  }

  /**
   * Check if an element is safe to interact with
   */
  private async isSafeToInteract(locator: Locator): Promise<boolean> {
    try {
      // Check if visible and enabled
      const isVisible = await locator.isVisible({ timeout: 1000 }).catch(() => false);
      if (!isVisible) return false;

      const isEnabled = await locator.isEnabled({ timeout: 1000 }).catch(() => false);
      if (!isEnabled) return false;

      // Check against unsafe patterns
      for (const pattern of UNSAFE_PATTERNS) {
        const matches = await locator.evaluate((el, pat) => {
          try {
            return el.matches(pat) || el.closest(pat) !== null;
          } catch {
            return false;
          }
        }, pattern).catch(() => false);

        if (matches) {
          this.log(`Skipping unsafe element: ${pattern}`);
          return false;
        }
      }

      // Check for dangerous text content
      const text = await locator.textContent().catch(() => '') || '';
      const dangerousTexts = ['delete', 'remove', 'logout', 'sign out', 'save', 'submit', 'confirm'];
      if (dangerousTexts.some(dt => text.toLowerCase().includes(dt))) {
        this.log(`Skipping element with dangerous text: ${text.substring(0, 50)}`);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Perform a safe click
   */
  private async safeClick(locator: Locator, action: string): Promise<InteractionResult> {
    const selector = await this.getSelector(locator);

    try {
      await locator.click({ timeout: this.options.interactionTimeout });
      this.log(`✓ Clicked ${action}: ${selector}`);
      return { success: true, action: `click-${action}`, selector };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`✗ Failed to click ${action}: ${selector} - ${errorMessage}`);
      return { success: false, action: `click-${action}`, selector, error: errorMessage };
    }
  }

  /**
   * Perform a safe hover
   */
  private async safeHover(locator: Locator, action: string): Promise<InteractionResult> {
    const selector = await this.getSelector(locator);

    try {
      await locator.hover({ timeout: this.options.interactionTimeout });
      await this.page.waitForTimeout(500); // Wait for tooltip to appear
      this.log(`✓ Hovered ${action}: ${selector}`);
      return { success: true, action: `hover-${action}`, selector };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`✗ Failed to hover ${action}: ${selector} - ${errorMessage}`);
      return { success: false, action: `hover-${action}`, selector, error: errorMessage };
    }
  }

  /**
   * Open a dropdown and immediately close it
   */
  private async peekDropdown(locator: Locator): Promise<InteractionResult> {
    const selector = await this.getSelector(locator);

    try {
      // Click to open
      await locator.click({ timeout: this.options.interactionTimeout });
      await this.page.waitForTimeout(300);

      // Press Escape to close
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(100);

      this.log(`✓ Peeked dropdown: ${selector}`);
      return { success: true, action: 'peek-dropdown', selector };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Try to close any open dropdown
      await this.page.keyboard.press('Escape').catch(() => {});
      this.log(`✗ Failed to peek dropdown: ${selector} - ${errorMessage}`);
      return { success: false, action: 'peek-dropdown', selector, error: errorMessage };
    }
  }

  /**
   * Get a readable selector for logging
   */
  private async getSelector(locator: Locator): Promise<string> {
    try {
      const testId = await locator.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;

      const id = await locator.getAttribute('id');
      if (id) return `#${id}`;

      const className = await locator.getAttribute('class');
      if (className) {
        const firstClass = className.split(' ')[0];
        return `.${firstClass}`;
      }

      const tag = await locator.evaluate(el => el.tagName.toLowerCase());
      return tag;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`  [SafeInteractor] ${message}`);
    }
  }

  /**
   * Get the interaction log
   */
  getInteractionLog(): InteractionResult[] {
    return [...this.interactionLog];
  }

  /**
   * Get a summary of interactions
   */
  getSummary(): { total: number; successful: number; failed: number } {
    const successful = this.interactionLog.filter(r => r.success).length;
    return {
      total: this.interactionLog.length,
      successful,
      failed: this.interactionLog.length - successful,
    };
  }
}

/**
 * Create a safe interactor for a page
 */
export function createSafeInteractor(
  page: Page,
  options?: Partial<SafeInteractorOptions>
): SafeInteractor {
  return new SafeInteractor(page, options);
}

/**
 * Quick function to perform safe interactions on a page
 */
export async function performSafeInteractions(
  page: Page,
  options?: Partial<SafeInteractorOptions>
): Promise<InteractionResult[]> {
  const interactor = createSafeInteractor(page, options);
  return interactor.performSafeInteractions();
}
