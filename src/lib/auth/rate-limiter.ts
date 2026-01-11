// File: /src/lib/auth/rate-limiter.ts
// Client-side rate limiting for authentication endpoints

import { logger } from '@/lib/utils/logger'

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_PREFIX = 'jobsight-rate-limit'

/** Rate limit configurations by action type */
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    captchaThreshold: 3, // Show CAPTCHA after 3 failures
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    captchaThreshold: 2,
  },
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    captchaThreshold: 2,
  },
  mfa_verify: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    captchaThreshold: 3,
  },
} as const

export type RateLimitAction = keyof typeof RATE_LIMIT_CONFIG

// ============================================================================
// Types
// ============================================================================

export interface RateLimitState {
  /** Number of attempts in current window */
  attempts: number
  /** Timestamp when the window started */
  windowStart: number
  /** Whether the user is currently locked out */
  isLocked: boolean
  /** Time remaining until lockout expires (ms) */
  lockoutRemaining: number
  /** Whether CAPTCHA should be shown */
  showCaptcha: boolean
  /** Remaining attempts before lockout */
  remainingAttempts: number
}

export interface RateLimitData {
  attempts: number
  windowStart: number
  lastAttempt: number
}

// ============================================================================
// Storage Helpers
// ============================================================================

function getStorageKey(action: RateLimitAction, identifier?: string): string {
  const suffix = identifier ? `:${identifier}` : ''
  return `${RATE_LIMIT_PREFIX}:${action}${suffix}`
}

function getRateLimitData(action: RateLimitAction, identifier?: string): RateLimitData | null {
  try {
    const key = getStorageKey(action, identifier)
    const stored = localStorage.getItem(key)
    if (!stored) {return null}

    const data = JSON.parse(stored) as RateLimitData
    const config = RATE_LIMIT_CONFIG[action]

    // Check if window has expired
    if (Date.now() - data.windowStart > config.windowMs) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch {
    return null
  }
}

function setRateLimitData(action: RateLimitAction, data: RateLimitData, identifier?: string): void {
  try {
    const key = getStorageKey(action, identifier)
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    logger.warn('[RateLimiter] Failed to store rate limit data:', error)
  }
}

function clearRateLimitData(action: RateLimitAction, identifier?: string): void {
  try {
    const key = getStorageKey(action, identifier)
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// Rate Limiter Functions
// ============================================================================

/**
 * Get current rate limit state for an action
 */
export function getRateLimitState(action: RateLimitAction, identifier?: string): RateLimitState {
  const config = RATE_LIMIT_CONFIG[action]
  const data = getRateLimitData(action, identifier)

  if (!data) {
    return {
      attempts: 0,
      windowStart: 0,
      isLocked: false,
      lockoutRemaining: 0,
      showCaptcha: false,
      remainingAttempts: config.maxAttempts,
    }
  }

  const now = Date.now()
  const windowEnd = data.windowStart + config.windowMs
  const isLocked = data.attempts >= config.maxAttempts
  const lockoutRemaining = isLocked ? Math.max(0, windowEnd - now) : 0
  const showCaptcha = data.attempts >= config.captchaThreshold

  return {
    attempts: data.attempts,
    windowStart: data.windowStart,
    isLocked,
    lockoutRemaining,
    showCaptcha,
    remainingAttempts: Math.max(0, config.maxAttempts - data.attempts),
  }
}

/**
 * Record an authentication attempt
 * Returns the updated rate limit state
 */
export function recordAttempt(action: RateLimitAction, identifier?: string): RateLimitState {
  const config = RATE_LIMIT_CONFIG[action]
  const now = Date.now()

  let data = getRateLimitData(action, identifier)

  if (!data) {
    // Start new window
    data = {
      attempts: 1,
      windowStart: now,
      lastAttempt: now,
    }
  } else {
    // Increment attempts
    data.attempts++
    data.lastAttempt = now
  }

  setRateLimitData(action, data, identifier)

  const isLocked = data.attempts >= config.maxAttempts

  if (isLocked) {
    logger.warn(`[RateLimiter] User locked out for ${action}`, {
      attempts: data.attempts,
      identifier: identifier?.slice(0, 5) + '...',
    })
  }

  return getRateLimitState(action, identifier)
}

/**
 * Check if an action is allowed (not rate limited)
 */
export function isActionAllowed(action: RateLimitAction, identifier?: string): boolean {
  const state = getRateLimitState(action, identifier)
  return !state.isLocked
}

/**
 * Reset rate limit after successful action (e.g., successful login)
 */
export function resetRateLimit(action: RateLimitAction, identifier?: string): void {
  clearRateLimitData(action, identifier)
  logger.debug(`[RateLimiter] Rate limit reset for ${action}`)
}

/**
 * Format remaining lockout time for display
 */
export function formatLockoutTime(ms: number): string {
  if (ms <= 0) {return ''}

  const seconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

export interface UseRateLimitOptions {
  /** The action being rate limited */
  action: RateLimitAction
  /** Optional identifier (e.g., email) */
  identifier?: string
  /** Callback when lockout expires */
  onLockoutExpired?: () => void
}

export interface UseRateLimitResult {
  /** Current rate limit state */
  state: RateLimitState
  /** Record an attempt (call after failed auth) */
  recordAttempt: () => RateLimitState
  /** Reset rate limit (call after successful auth) */
  reset: () => void
  /** Check if action is allowed */
  isAllowed: boolean
  /** Formatted lockout time remaining */
  formattedLockoutTime: string
}

/**
 * React hook for rate limiting
 */
export function useRateLimit(options: UseRateLimitOptions): UseRateLimitResult {
  const { action, identifier, onLockoutExpired } = options

  const [state, setState] = useState<RateLimitState>(() =>
    getRateLimitState(action, identifier)
  )

  // Update state periodically while locked out
  useEffect(() => {
    if (!state.isLocked) {return}

    const interval = setInterval(() => {
      const newState = getRateLimitState(action, identifier)
      setState(newState)

      if (!newState.isLocked) {
        onLockoutExpired?.()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [action, identifier, state.isLocked, onLockoutExpired])

  // Re-fetch state when identifier changes
  useEffect(() => {
    setState(getRateLimitState(action, identifier))
  }, [action, identifier])

  const handleRecordAttempt = useCallback(() => {
    const newState = recordAttempt(action, identifier)
    setState(newState)
    return newState
  }, [action, identifier])

  const handleReset = useCallback(() => {
    resetRateLimit(action, identifier)
    setState(getRateLimitState(action, identifier))
  }, [action, identifier])

  return {
    state,
    recordAttempt: handleRecordAttempt,
    reset: handleReset,
    isAllowed: !state.isLocked,
    formattedLockoutTime: formatLockoutTime(state.lockoutRemaining),
  }
}

// ============================================================================
// CAPTCHA Integration Types
// ============================================================================

export interface CaptchaResult {
  verified: boolean
  token?: string
}

/**
 * Placeholder for CAPTCHA verification
 * In production, integrate with hCaptcha, reCAPTCHA, or Turnstile
 */
export async function verifyCaptcha(_token: string): Promise<CaptchaResult> {
  // TODO: Implement actual CAPTCHA verification
  // This would call a Supabase Edge Function to verify the token
  logger.debug('[RateLimiter] CAPTCHA verification called')
  return { verified: true }
}
