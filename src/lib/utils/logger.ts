/**
 * Conditional logging utility
 *
 * Logs only appear in development mode to prevent exposing
 * internal architecture and debugging info in production.
 *
 * Note: Vite's terser config also strips console.log in production builds,
 * but this utility provides an additional layer of safety and consistency.
 */

const isDevelopment = import.meta.env.MODE === 'development'

export const logger = {
  /**
   * Log general information (development only)
   */
  log(...args: unknown[]): void {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log informational messages (development only)
   */
  info(...args: unknown[]): void {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * Log warnings (always shown - important for debugging issues)
   */
  warn(...args: unknown[]): void {
    console.warn(...args)
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
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  /**
   * Log with a specific prefix/tag (development only)
   */
  tagged(tag: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.log(`[${tag}]`, ...args)
    }
  },
}
