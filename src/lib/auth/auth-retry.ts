// File: /src/lib/auth/auth-retry.ts
// Retry logic for transient authentication failures with exponential backoff

import { AuthError } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
  /** Jitter factor (0-1) to add randomness to delays */
  jitterFactor: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_AUTH_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitterFactor: 0.2,
}

/**
 * Error codes/patterns that indicate transient failures worth retrying
 */
const TRANSIENT_ERROR_PATTERNS = [
  // Network errors
  'NETWORK_ERROR',
  'network',
  'fetch failed',
  'Failed to fetch',
  'NetworkError',
  'ERR_NETWORK',
  'ERR_CONNECTION',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  // Rate limiting
  'rate limit',
  'too many requests',
  '429',
  // Temporary server errors
  '502',
  '503',
  '504',
  'Bad Gateway',
  'Service Unavailable',
  'Gateway Timeout',
  // Supabase-specific transient errors
  'JWT expired',
  'refresh_token',
  'token_expired',
  'session_not_found',
] as const

/**
 * Error codes that should NOT be retried (permanent failures)
 */
const PERMANENT_ERROR_PATTERNS = [
  // Auth failures - user must take action
  'Invalid login credentials',
  'Invalid email or password',
  'Email not confirmed',
  'invalid_credentials',
  'user_not_found',
  'invalid_grant',
  // Account issues
  'User banned',
  'User deleted',
  'account_locked',
  // Validation errors
  'validation_failed',
  'invalid_request',
  // Permission errors
  '401',
  '403',
  'unauthorized',
  'forbidden',
] as const

/**
 * Result of a retry attempt
 */
export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalTimeMs: number
}

/**
 * Check if an error is transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false

  const errorMessage = getErrorMessage(error).toLowerCase()
  const errorCode = getErrorCode(error)?.toLowerCase() ?? ''

  // First check if it's a permanent error that should NOT be retried
  for (const pattern of PERMANENT_ERROR_PATTERNS) {
    const lowerPattern = pattern.toLowerCase()
    if (errorMessage.includes(lowerPattern) || errorCode.includes(lowerPattern)) {
      logger.debug('[AuthRetry] Permanent error detected, will not retry:', pattern)
      return false
    }
  }

  // Check if it matches transient error patterns
  for (const pattern of TRANSIENT_ERROR_PATTERNS) {
    const lowerPattern = pattern.toLowerCase()
    if (errorMessage.includes(lowerPattern) || errorCode.includes(lowerPattern)) {
      logger.debug('[AuthRetry] Transient error detected:', pattern)
      return true
    }
  }

  // Check for network-related errors
  if (error instanceof TypeError && errorMessage.includes('network')) {
    return true
  }

  // Check for Supabase AuthError specific properties
  if (error instanceof AuthError) {
    const status = (error as AuthError & { status?: number }).status
    // 5xx errors and 429 are transient
    if (status && (status >= 500 || status === 429)) {
      return true
    }
  }

  // Check for HTTP status in error object
  const status = getErrorStatus(error)
  if (status && (status >= 500 || status === 429)) {
    return true
  }

  return false
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.error_description === 'string') return obj.error_description
  }
  return String(error)
}

/**
 * Extract error code from various error types
 */
function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.code === 'string') return obj.code
    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.name === 'string') return obj.name
  }
  return null
}

/**
 * Extract HTTP status from error
 */
function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.status === 'number') return obj.status
    if (typeof obj.statusCode === 'number') return obj.statusCode
  }
  return null
}

/**
 * Calculate delay for retry attempt with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_AUTH_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random()

  return Math.floor(cappedDelay + jitter)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic for transient failures
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @param context - Context string for logging
 * @returns Result containing success status, data/error, and timing info
 */
export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'auth operation'
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_AUTH_RETRY_CONFIG, ...config }
  const startTime = Date.now()
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const data = await fn()
      const totalTimeMs = Date.now() - startTime

      if (attempt > 0) {
        logger.log(`[AuthRetry] ${context} succeeded after ${attempt} retries (${totalTimeMs}ms)`)
      }

      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalTimeMs,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      if (!isTransientError(error)) {
        logger.debug(`[AuthRetry] ${context} failed with non-transient error, not retrying:`, lastError.message)
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        }
      }

      // Check if we have retries left
      if (attempt >= mergedConfig.maxRetries) {
        logger.warn(`[AuthRetry] ${context} failed after ${attempt + 1} attempts:`, lastError.message)
        break
      }

      // Calculate delay and wait before retry
      const delay = calculateRetryDelay(attempt, mergedConfig)
      logger.log(
        `[AuthRetry] ${context} failed (attempt ${attempt + 1}/${mergedConfig.maxRetries + 1}), ` +
        `retrying in ${delay}ms: ${lastError.message}`
      )

      await sleep(delay)
    }
  }

  return {
    success: false,
    error: lastError ?? new Error('Unknown error'),
    attempts: mergedConfig.maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  }
}

/**
 * Wrapper that throws on failure (for use in contexts expecting exceptions)
 */
export async function withAuthRetryThrow<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'auth operation'
): Promise<T> {
  const result = await withAuthRetry(fn, config, context)

  if (!result.success) {
    throw result.error
  }

  return result.data!
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Wait for the browser to come online
 * @param timeoutMs Maximum time to wait
 * @returns true if online, false if timed out
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise(resolve => {
    if (isOnline()) {
      resolve(true)
      return
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('online', onOnline)
      resolve(false)
    }, timeoutMs)

    const onOnline = () => {
      clearTimeout(timeout)
      window.removeEventListener('online', onOnline)
      resolve(true)
    }

    window.addEventListener('online', onOnline)
  })
}
