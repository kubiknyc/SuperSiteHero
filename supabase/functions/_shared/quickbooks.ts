/**
 * Shared QuickBooks utilities for Edge Functions
 */

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
 * Make an authenticated QuickBooks API request
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
  } = {}
): Promise<T> {
  let url = buildQBApiUrl(realmId, endpoint, isSandbox)

  if (options.query) {
    const params = new URLSearchParams(options.query)
    url += `?${params.toString()}`
  }

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
    throw new Error(
      `QB API error: ${errorData.Fault?.Error?.[0]?.Message || response.statusText}`
    )
  }

  return await response.json()
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
