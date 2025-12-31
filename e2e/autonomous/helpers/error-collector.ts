/**
 * Error Collector
 *
 * Hooks into browser console and network events to detect errors
 * during autonomous smoke testing.
 */

import type { Page, ConsoleMessage, Response } from '@playwright/test';

export interface AllowlistConfig {
  consoleErrors: string[];
  networkErrors: string[];
}

export interface CollectedError {
  type: 'console' | 'uncaught' | 'network';
  message: string;
  url: string;
  timestamp: number;
  stack?: string;
  severity?: 'error' | 'warning';
}

export interface ErrorSummary {
  console: CollectedError[];
  uncaught: CollectedError[];
  network5xx: CollectedError[];
  totalCount: number;
}

export class ErrorCollector {
  private page: Page;
  private allowlist: AllowlistConfig;
  private errors: ErrorSummary;
  private attached: boolean = false;

  // Store bound handlers for cleanup
  private consoleHandler: ((msg: ConsoleMessage) => void) | null = null;
  private pageErrorHandler: ((error: Error) => void) | null = null;
  private responseHandler: ((response: Response) => void) | null = null;

  constructor(page: Page, allowlist: AllowlistConfig) {
    this.page = page;
    this.allowlist = allowlist;
    this.errors = this.createEmptyErrorSummary();
  }

  private createEmptyErrorSummary(): ErrorSummary {
    return {
      console: [],
      uncaught: [],
      network5xx: [],
      totalCount: 0,
    };
  }

  /**
   * Attach error listeners to the page
   */
  async attach(): Promise<void> {
    if (this.attached) {
      return;
    }

    // Console message handler
    this.consoleHandler = (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();

        // Check allowlist
        if (this.isAllowlisted(text, this.allowlist.consoleErrors)) {
          return;
        }

        this.errors.console.push({
          type: 'console',
          message: text,
          url: this.page.url(),
          timestamp: Date.now(),
          stack: msg.location()?.url,
          severity: 'error',
        });
        this.errors.totalCount++;
      }
    };

    // Uncaught exception handler
    this.pageErrorHandler = (error: Error) => {
      const message = error.message || String(error);

      // Check allowlist
      if (this.isAllowlisted(message, this.allowlist.consoleErrors)) {
        return;
      }

      this.errors.uncaught.push({
        type: 'uncaught',
        message,
        url: this.page.url(),
        timestamp: Date.now(),
        stack: error.stack,
        severity: 'error',
      });
      this.errors.totalCount++;
    };

    // Network response handler
    this.responseHandler = (response: Response) => {
      const status = response.status();
      const url = response.url();

      if (status >= 500 && status < 600) {
        // Check allowlist
        if (this.isAllowlisted(url, this.allowlist.networkErrors)) {
          return;
        }

        this.errors.network5xx.push({
          type: 'network',
          message: `HTTP ${status}: ${response.statusText()}`,
          url,
          timestamp: Date.now(),
          severity: 'error',
        });
        this.errors.totalCount++;
      }
    };

    // Attach handlers
    this.page.on('console', this.consoleHandler);
    this.page.on('pageerror', this.pageErrorHandler);
    this.page.on('response', this.responseHandler);

    this.attached = true;
  }

  /**
   * Detach error listeners from the page
   */
  async detach(): Promise<void> {
    if (!this.attached) {
      return;
    }

    if (this.consoleHandler) {
      this.page.off('console', this.consoleHandler);
    }
    if (this.pageErrorHandler) {
      this.page.off('pageerror', this.pageErrorHandler);
    }
    if (this.responseHandler) {
      this.page.off('response', this.responseHandler);
    }

    this.attached = false;
  }

  /**
   * Check if a message matches any allowlist pattern
   */
  private isAllowlisted(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      try {
        // Try as regex first
        const regex = new RegExp(pattern, 'i');
        return regex.test(text);
      } catch {
        // Fall back to simple string matching
        return text.toLowerCase().includes(pattern.toLowerCase());
      }
    });
  }

  /**
   * Check for critical errors and throw immediately
   */
  checkCriticalErrors(): void {
    // 5xx responses are critical
    if (this.errors.network5xx.length > 0) {
      const latest = this.errors.network5xx[this.errors.network5xx.length - 1];
      throw new Error(`Critical: 5xx response detected: ${latest.message} at ${latest.url}`);
    }

    // Uncaught exceptions are critical
    if (this.errors.uncaught.length > 0) {
      const latest = this.errors.uncaught[this.errors.uncaught.length - 1];
      throw new Error(`Critical: Uncaught exception: ${latest.message} at ${latest.url}`);
    }
  }

  /**
   * Get all collected errors
   */
  getErrors(): ErrorSummary {
    return {
      console: [...this.errors.console],
      uncaught: [...this.errors.uncaught],
      network5xx: [...this.errors.network5xx],
      totalCount: this.errors.totalCount,
    };
  }

  /**
   * Check if any errors have been collected
   */
  hasErrors(): boolean {
    return this.errors.totalCount > 0;
  }

  /**
   * Check if there are any critical errors (5xx or uncaught)
   */
  hasCriticalErrors(): boolean {
    return this.errors.network5xx.length > 0 || this.errors.uncaught.length > 0;
  }

  /**
   * Clear all collected errors
   */
  clearErrors(): void {
    this.errors = this.createEmptyErrorSummary();
  }

  /**
   * Get a formatted error report
   */
  getErrorReport(): string {
    if (!this.hasErrors()) {
      return 'No errors detected.';
    }

    const lines: string[] = [];
    lines.push(`Error Summary (${this.errors.totalCount} total):`);
    lines.push('');

    if (this.errors.network5xx.length > 0) {
      lines.push(`Network 5xx Errors (${this.errors.network5xx.length}):`);
      this.errors.network5xx.forEach(e => {
        lines.push(`  - ${e.message} at ${e.url}`);
      });
      lines.push('');
    }

    if (this.errors.uncaught.length > 0) {
      lines.push(`Uncaught Exceptions (${this.errors.uncaught.length}):`);
      this.errors.uncaught.forEach(e => {
        lines.push(`  - ${e.message}`);
        if (e.stack) {
          lines.push(`    Stack: ${e.stack.substring(0, 200)}...`);
        }
      });
      lines.push('');
    }

    if (this.errors.console.length > 0) {
      lines.push(`Console Errors (${this.errors.console.length}):`);
      this.errors.console.slice(0, 10).forEach(e => {
        lines.push(`  - ${e.message.substring(0, 100)}...`);
      });
      if (this.errors.console.length > 10) {
        lines.push(`  ... and ${this.errors.console.length - 10} more`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create an error collector with default allowlist
 */
export function createErrorCollector(
  page: Page,
  customAllowlist?: Partial<AllowlistConfig>
): ErrorCollector {
  const defaultAllowlist: AllowlistConfig = {
    consoleErrors: [
      'ResizeObserver loop',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection',
      'Failed to load resource.*favicon',
    ],
    networkErrors: [
      '/analytics',
      '/gtag',
      'googleapis.com',
    ],
  };

  const allowlist: AllowlistConfig = {
    consoleErrors: [
      ...defaultAllowlist.consoleErrors,
      ...(customAllowlist?.consoleErrors || []),
    ],
    networkErrors: [
      ...defaultAllowlist.networkErrors,
      ...(customAllowlist?.networkErrors || []),
    ],
  };

  return new ErrorCollector(page, allowlist);
}
