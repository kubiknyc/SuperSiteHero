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

// ============================================================================
// Sensitive Data Masking
// ============================================================================

/**
 * List of keys that should be masked in logs
 */
const SENSITIVE_KEYS = new Set([
  // Authentication
  'password',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'jwt',
  'session_token',
  'sessiontoken',
  'csrf',
  'csrf_token',

  // Personal Identifiable Information (PII)
  'ssn',
  'social_security',
  'tax_id',
  'ein',
  'dob',
  'date_of_birth',
  'credit_card',
  'card_number',
  'cvv',
  'cvc',
  'expiry',
  'bank_account',
  'routing_number',
  'iban',

  // Contact information
  'phone',
  'phone_number',
  'mobile',
  'email_address',

  // Credentials
  'private_key',
  'privatekey',
  'client_secret',
  'clientsecret',
  'encryption_key',
  'decryption_key',
])

/**
 * Patterns that indicate sensitive data in string values
 */
const SENSITIVE_PATTERNS = [
  // JWT tokens
  /^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/,
  // Bearer tokens
  /^Bearer\s+[A-Za-z0-9-_.]+/i,
  // API keys (common patterns)
  /^sk[-_][a-zA-Z0-9]{20,}$/,  // Stripe-style
  /^pk[-_][a-zA-Z0-9]{20,}$/,  // Public key style
  /^[a-f0-9]{32,}$/i,          // Hex API keys
  // Credit card numbers (basic patterns)
  /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/,
  // SSN patterns
  /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/,
]

/**
 * Mask a sensitive value
 */
function maskValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }

  const str = String(value)
  if (str.length <= 4) {
    return '***'
  }

  // Show first 2 and last 2 characters for context
  return `${str.slice(0, 2)}${'*'.repeat(Math.min(str.length - 4, 10))}${str.slice(-2)}`
}

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[-_\s]/g, '')
  return SENSITIVE_KEYS.has(normalizedKey) ||
         Array.from(SENSITIVE_KEYS).some(sk => normalizedKey.includes(sk.replace(/[-_]/g, '')))
}

/**
 * Check if a string value matches sensitive patterns
 */
function isSensitiveValue(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value))
}

/**
 * Recursively mask sensitive data in an object
 */
function maskSensitiveData(data: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Max depth reached]'
  }

  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    // Check if the string itself looks like sensitive data
    if (isSensitiveValue(data)) {
      return maskValue(data)
    }
    return data
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, depth + 1))
  }

  if (typeof data === 'object') {
    // Handle Error objects specially
    if (data instanceof Error) {
      return {
        name: data.name,
        message: maskSensitiveData(data.message, depth + 1),
        stack: isDevelopment ? data.stack : '[stack hidden in production]',
      }
    }

    const masked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        masked[key] = maskValue(value)
      } else {
        masked[key] = maskSensitiveData(value, depth + 1)
      }
    }
    return masked
  }

  return data
}

/**
 * Process arguments for logging, masking sensitive data
 */
function processArgs(args: unknown[]): unknown[] {
  return args.map(arg => maskSensitiveData(arg))
}

/**
 * Utility to create a safe loggable version of data
 * Use this to explicitly mask data before logging
 */
export function safeLog<T>(data: T): T {
  return maskSensitiveData(data) as T
}

export const logger = {
  /**
   * Log general information (development only)
   * Automatically masks sensitive data
   */
  log(...args: unknown[]): void {
    if (shouldLog) {
      console.log(...processArgs(args))
    }
  },

  /**
   * Log informational messages (development only)
   * Automatically masks sensitive data
   */
  info(...args: unknown[]): void {
    if (shouldLog) {
      console.info(...processArgs(args))
    }
  },

  /**
   * Log warnings (always shown in dev - important for debugging issues)
   * In production, warnings are suppressed to avoid console noise
   * Automatically masks sensitive data
   */
  warn(...args: unknown[]): void {
    if (isDevelopment) {
      console.warn(...processArgs(args))
    }
  },

  /**
   * Log errors (always shown - critical for error tracking)
   * Automatically masks sensitive data to prevent PII leakage
   */
  error(...args: unknown[]): void {
    console.error(...processArgs(args))
  },

  /**
   * Log debug information (development only)
   * Automatically masks sensitive data
   */
  debug(...args: unknown[]): void {
    if (shouldLog) {
      console.debug(...processArgs(args))
    }
  },

  /**
   * Log with a specific prefix/tag (development only)
   * Useful for categorizing logs by feature or module
   * Automatically masks sensitive data
   */
  tagged(tag: string, ...args: unknown[]): void {
    if (shouldLog) {
      console.log(`[${tag}]`, ...processArgs(args))
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
   * Automatically masks sensitive data
   */
  table(data: unknown): void {
    if (shouldLog) {
      console.table(maskSensitiveData(data))
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
   * Automatically masks sensitive data
   */
  assert(condition: boolean, ...args: unknown[]): void {
    if (shouldLog && !condition) {
      console.assert(condition, ...processArgs(args))
    }
  },
}
