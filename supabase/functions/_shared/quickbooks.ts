/**
 * Shared QuickBooks utilities for Edge Functions
 */

// =============================================
// RETRY CONFIGURATION & ERROR HANDLING
// =============================================

/**
 * Error types for QuickBooks API
 */
export type QBErrorType =
  | 'network'      // Network/connection errors - retryable
  | 'rate_limit'   // Rate limiting (429) - retryable with backoff
  | 'server'       // Server errors (5xx) - retryable
  | 'auth'         // Authentication errors (401) - needs token refresh
  | 'validation'   // Validation errors (400) - not retryable
  | 'not_found'    // Resource not found (404) - not retryable
  | 'conflict'     // Stale data conflict - needs fresh SyncToken
  | 'unknown'      // Unknown errors

/**
 * QuickBooks API Error with additional context
 */
export class QBApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: QBErrorType,
    public readonly statusCode?: number,
    public readonly qbErrorCode?: string,
    public readonly isRetryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message)
    this.name = 'QBApiError'
  }
}

/**
 * Retry configuration for API requests
 */
export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableErrors: QBErrorType[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: ['network', 'rate_limit', 'server'],
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)
  // Add jitter (random 0-25% of delay)
  const jitter = exponentialDelay * Math.random() * 0.25
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs)
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Classify error based on HTTP status and response
 */
export function classifyQBError(
  statusCode: number,
  errorData?: { Fault?: { Error?: Array<{ code?: string; Message?: string }> } }
): { errorType: QBErrorType; isRetryable: boolean; retryAfterMs?: number } {
  const qbError = errorData?.Fault?.Error?.[0]
  const qbErrorCode = qbError?.code

  // Network/timeout errors (no status code)
  if (!statusCode) {
    return { errorType: 'network', isRetryable: true }
  }

  // Rate limiting
  if (statusCode === 429) {
    return { errorType: 'rate_limit', isRetryable: true, retryAfterMs: 60000 }
  }

  // Authentication errors
  if (statusCode === 401) {
    return { errorType: 'auth', isRetryable: false }
  }

  // Not found
  if (statusCode === 404) {
    return { errorType: 'not_found', isRetryable: false }
  }

  // Stale object (SyncToken conflict)
  if (statusCode === 400 && qbErrorCode === '5010') {
    return { errorType: 'conflict', isRetryable: false }
  }

  // Other validation errors
  if (statusCode === 400 || statusCode === 422) {
    return { errorType: 'validation', isRetryable: false }
  }

  // Server errors
  if (statusCode >= 500) {
    return { errorType: 'server', isRetryable: true }
  }

  return { errorType: 'unknown', isRetryable: false }
}

// QuickBooks API URLs
export const QB_URLS = {
  oauth: {
    authorize: 'https://appcenter.intuit.com/connect/oauth2',
    token: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    revoke: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    userInfo: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
  },
  api: {
    production: 'https://quickbooks.api.intuit.com',
    sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  },
  scopes: 'com.intuit.quickbooks.accounting',
}

/**
 * Get the QuickBooks API base URL based on sandbox mode
 */
export function getQBApiBaseUrl(isSandbox: boolean): string {
  return isSandbox ? QB_URLS.api.sandbox : QB_URLS.api.production
}

/**
 * Build a QuickBooks API endpoint URL
 */
export function buildQBApiUrl(realmId: string, endpoint: string, isSandbox: boolean): string {
  const baseUrl = getQBApiBaseUrl(isSandbox)
  return `${baseUrl}/v3/company/${realmId}/${endpoint}`
}

/**
 * Standard CORS headers for Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Token response from QuickBooks OAuth
 */
export interface QBOAuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  x_refresh_token_expires_in: number
  id_token?: string
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<QBOAuthTokens> {
  const basicAuth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(QB_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`)
  }

  return await response.json()
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<QBOAuthTokens> {
  const basicAuth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(QB_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`)
  }

  return await response.json()
}

/**
 * Revoke tokens
 */
export async function revokeToken(
  token: string,
  clientId: string,
  clientSecret: string
): Promise<void> {
  const basicAuth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(QB_URLS.oauth.revoke, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  // Revoke returns 200 even if token is already invalid
  if (!response.ok && response.status !== 400) {
    throw new Error(`Token revocation failed: ${response.statusText}`)
  }
}

/**
 * Get company info from QuickBooks
 */
export async function getCompanyInfo(
  realmId: string,
  accessToken: string,
  isSandbox: boolean
): Promise<{ CompanyName: string }> {
  const url = buildQBApiUrl(realmId, `companyinfo/${realmId}`, isSandbox)

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get company info: ${response.statusText}`)
  }

  const data = await response.json()
  return data.CompanyInfo
}

/**
 * Make an authenticated QuickBooks API request with retry logic
 */
export async function qbApiRequest<T>(
  realmId: string,
  endpoint: string,
  accessToken: string,
  isSandbox: boolean,
  options: {
    method?: string
    body?: unknown
    query?: Record<string, string>
    retryConfig?: Partial<RetryConfig>
  } = {}
): Promise<T> {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options.retryConfig,
  }

  let url = buildQBApiUrl(realmId, endpoint, isSandbox)

  if (options.query) {
    const params = new URLSearchParams(options.query)
    url += `?${params.toString()}`
  }

  let lastError: QBApiError | Error | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const { errorType, isRetryable, retryAfterMs } = classifyQBError(response.status, errorData)
        const errorMessage = errorData.Fault?.Error?.[0]?.Message || response.statusText
        const qbErrorCode = errorData.Fault?.Error?.[0]?.code

        lastError = new QBApiError(
          `QB API error: ${errorMessage}`,
          errorType,
          response.status,
          qbErrorCode,
          isRetryable,
          retryAfterMs
        )

        // If retryable and we have retries left, wait and retry
        if (isRetryable && config.retryableErrors.includes(errorType) && attempt < config.maxRetries) {
          const delayMs = retryAfterMs || calculateBackoff(attempt, config)
          console.log(`QB API retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms - ${errorType}: ${errorMessage}`)
          await sleep(delayMs)
          continue
        }

        throw lastError
      }

      return await response.json()
    } catch (error) {
      // Handle network errors (fetch throws)
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        lastError = new QBApiError(
          `Network error: ${error.message}`,
          'network',
          undefined,
          undefined,
          true
        )

        if (config.retryableErrors.includes('network') && attempt < config.maxRetries) {
          const delayMs = calculateBackoff(attempt, config)
          console.log(`QB API network retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms`)
          await sleep(delayMs)
          continue
        }
      }

      // Re-throw QBApiError as-is
      if (error instanceof QBApiError) {
        throw error
      }

      // Wrap other errors
      throw lastError || error
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('QB API request failed after all retries')
}

/**
 * Make a QB API request without retry (for operations that shouldn't retry)
 */
export async function qbApiRequestNoRetry<T>(
  realmId: string,
  endpoint: string,
  accessToken: string,
  isSandbox: boolean,
  options: {
    method?: string
    body?: unknown
    query?: Record<string, string>
  } = {}
): Promise<T> {
  return qbApiRequest<T>(realmId, endpoint, accessToken, isSandbox, {
    ...options,
    retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, retryableErrors: [] },
  })
}

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

/**
 * Calculate refresh token expiration date
 */
export function calculateRefreshTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}
