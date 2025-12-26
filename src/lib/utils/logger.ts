/**
 * Conditional logging utility
 *
 * Logs only appear in development mode to prevent exposing
 * internal architecture and debugging info in production.
 *
 * Note: Vite's terser config also strips console.log in production builds,
 * but this utility provides an additional layer of safety and consistency.
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/utils/logger';
 *
 * logger.log('General information');
 * logger.info('Informational message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * logger.debug('Debug information');
 * logger.tagged('API', 'Request sent', data);
 * logger.group('Feature Name', () => {
 *   logger.log('Grouped log 1');
 *   logger.log('Grouped log 2');
 * });
 * ```
 */

const isDevelopment = import.meta.env.MODE === 'development'
const isTest = import.meta.env.MODE === 'test'

// In test mode, suppress all logging unless explicitly enabled
const shouldLog = isDevelopment && !isTest

export const logger = {
  /**
   * Log general information (development only)
   */
  log(...args: unknown[]): void {
    if (shouldLog) {
      console.log(...args)
    }
  },

  /**
   * Log informational messages (development only)
   */
  info(...args: unknown[]): void {
    if (shouldLog) {
      console.info(...args)
    }
  },

  /**
   * Log warnings (always shown in dev - important for debugging issues)
   * In production, warnings are suppressed to avoid console noise
   */
  warn(...args: unknown[]): void {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  /**
   * Log errors (always shown - critical for error tracking)
   */
  error(...args: unknown[]): void {
    console.error(...args)
  },

  /**
   * Log debug information (development only)
   */
  debug(...args: unknown[]): void {
    if (shouldLog) {
      console.debug(...args)
    }
  },

  /**
   * Log with a specific prefix/tag (development only)
   * Useful for categorizing logs by feature or module
   */
  tagged(tag: string, ...args: unknown[]): void {
    if (shouldLog) {
      console.log(`[${tag}]`, ...args)
    }
  },

  /**
   * Create a grouped log section (development only)
   * Helps organize related log messages
   */
  group(label: string, callback: () => void): void {
    if (shouldLog) {
      console.group(label)
      try {
        callback()
      } finally {
        console.groupEnd()
      }
    }
  },

  /**
   * Log a table (development only)
   * Useful for displaying arrays or objects in a readable format
   */
  table(data: unknown): void {
    if (shouldLog) {
      console.table(data)
    }
  },

  /**
   * Start a timer (development only)
   */
  time(label: string): void {
    if (shouldLog) {
      console.time(label)
    }
  },

  /**
   * End a timer and log the elapsed time (development only)
   */
  timeEnd(label: string): void {
    if (shouldLog) {
      console.timeEnd(label)
    }
  },

  /**
   * Conditional logging - only logs if condition is true
   */
  assert(condition: boolean, ...args: unknown[]): void {
    if (shouldLog && !condition) {
      console.assert(condition, ...args)
    }
  },
}
