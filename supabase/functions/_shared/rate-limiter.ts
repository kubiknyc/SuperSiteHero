// File: /supabase/functions/_shared/rate-limiter.ts
// Server-side rate limiting using Supabase Database

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in seconds */
  windowSeconds: number
  /** Unique identifier for this rate limit (e.g., 'login', 'signup') */
  action: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of remaining requests in the window */
  remaining: number
  /** Timestamp when the rate limit resets */
  resetAt: Date
  /** Current request count */
  count: number
}

// ============================================================================
// Default Configurations
// ============================================================================

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    action: 'login',
    maxRequests: 5,
    windowSeconds: 15 * 60, // 15 minutes
  },
  signup: {
    action: 'signup',
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
  },
  password_reset: {
    action: 'password_reset',
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
  },
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

/**
 * Check rate limit using Supabase database
 * This uses a simple table-based approach for rate limiting
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)
  const key = `${config.action}:${identifier}`

  try {
    // Count recent attempts
    const { count, error: countError } = await supabase
      .from('rate_limit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart.toISOString())

    if (countError) {
      console.error('[RateLimiter] Count error:', countError)
      // Allow request on error to avoid blocking users
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
        count: 0,
      }
    }

    const currentCount = count ?? 0
    const remaining = Math.max(0, config.maxRequests - currentCount)
    const allowed = currentCount < config.maxRequests

    // Calculate reset time
    const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)

    return {
      allowed,
      remaining,
      resetAt,
      count: currentCount,
    }
  } catch (error) {
    console.error('[RateLimiter] Error:', error)
    // Allow request on error
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      count: 0,
    }
  }
}

/**
 * Record a rate limit attempt
 */
export async function recordAttempt(
  supabase: SupabaseClient,
  identifier: string,
  config: RateLimitConfig,
  metadata?: Record<string, unknown>
): Promise<void> {
  const key = `${config.action}:${identifier}`

  try {
    await supabase.from('rate_limit_entries').insert({
      key,
      action: config.action,
      identifier,
      metadata,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[RateLimiter] Failed to record attempt:', error)
  }
}

/**
 * Clean up expired rate limit entries
 * This should be called periodically by a cron job
 */
export async function cleanupExpiredEntries(
  supabase: SupabaseClient,
  maxAgeSeconds: number = 24 * 60 * 60 // 24 hours default
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeSeconds * 1000)

  try {
    const { count, error } = await supabase
      .from('rate_limit_entries')
      .delete()
      .lt('created_at', cutoff.toISOString())

    if (error) {
      console.error('[RateLimiter] Cleanup error:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('[RateLimiter] Cleanup error:', error)
    return 0
  }
}

// ============================================================================
// HTTP Response Helpers
// ============================================================================

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.count.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  }
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...getRateLimitHeaders(result),
      },
    }
  )
}

// ============================================================================
// IP Address Helpers
// ============================================================================

/**
 * Extract client IP from request headers
 */
export function getClientIP(req: Request): string {
  // Check various headers for the real IP
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
  ]

  for (const header of headers) {
    const value = req.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first
      const ip = value.split(',')[0].trim()
      if (ip) {return ip}
    }
  }

  return 'unknown'
}

/**
 * Create a rate limit identifier from IP and optional user ID
 */
export function createIdentifier(ip: string, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  return `ip:${ip}`
}
