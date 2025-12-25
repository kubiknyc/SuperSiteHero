/**
 * Shared Microsoft Graph API utilities for Edge Functions
 *
 * Microsoft Graph API for Outlook Calendar integration
 * OAuth: https://login.microsoftonline.com
 * API: https://graph.microsoft.com/v1.0
 */

// =============================================
// ERROR HANDLING
// =============================================

/**
 * Error types for Microsoft Graph API
 */
export type MSGraphErrorType =
  | 'network'       // Network/connection errors - retryable
  | 'rate_limit'    // Rate limiting (429) - retryable with backoff
  | 'server'        // Server errors (5xx) - retryable
  | 'auth'          // Authentication errors (401) - needs token refresh
  | 'forbidden'     // Forbidden (403) - permission issue
  | 'validation'    // Validation errors (400) - not retryable
  | 'not_found'     // Resource not found (404) - not retryable
  | 'conflict'      // Conflict (409) - needs resolution
  | 'unknown'       // Unknown errors

/**
 * Microsoft Graph API Error with additional context
 */
export class MSGraphApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: MSGraphErrorType,
    public readonly statusCode?: number,
    public readonly graphErrorCode?: string,
    public readonly isRetryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message)
    this.name = 'MSGraphApiError'
  }
}

/**
 * Retry configuration for API requests
 */
export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableErrors: MSGraphErrorType[]
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
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)
  const jitter = exponentialDelay * Math.random() * 0.25
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
export function classifyMSGraphError(
  statusCode: number,
  errorData?: { error?: { code?: string; message?: string } }
): { errorType: MSGraphErrorType; isRetryable: boolean; retryAfterMs?: number } {
  const graphErrorCode = errorData?.error?.code

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

  // Forbidden
  if (statusCode === 403) {
    return { errorType: 'forbidden', isRetryable: false }
  }

  // Not found
  if (statusCode === 404) {
    return { errorType: 'not_found', isRetryable: false }
  }

  // Conflict
  if (statusCode === 409) {
    return { errorType: 'conflict', isRetryable: false }
  }

  // Validation errors
  if (statusCode === 400 || statusCode === 422) {
    return { errorType: 'validation', isRetryable: false }
  }

  // Server errors
  if (statusCode >= 500) {
    return { errorType: 'server', isRetryable: true }
  }

  return { errorType: 'unknown', isRetryable: false }
}

// =============================================
// MICROSOFT GRAPH API URLs
// =============================================

export const MS_GRAPH_URLS = {
  oauth: {
    // Using 'common' tenant for multi-tenant support
    authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
  api: {
    base: 'https://graph.microsoft.com/v1.0',
    beta: 'https://graph.microsoft.com/beta',
  },
  // Required scopes for calendar access
  scopes: 'Calendars.ReadWrite offline_access User.Read',
}

/**
 * Build a Microsoft Graph API endpoint URL
 */
export function buildMSGraphUrl(endpoint: string, useBeta: boolean = false): string {
  const baseUrl = useBeta ? MS_GRAPH_URLS.api.beta : MS_GRAPH_URLS.api.base
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
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

// =============================================
// OAUTH TOKEN TYPES
// =============================================

/**
 * Token response from Microsoft OAuth
 */
export interface MSGraphOAuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
  id_token?: string
}

/**
 * User profile from Microsoft Graph
 */
export interface MSGraphUserProfile {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
}

// =============================================
// OAUTH FUNCTIONS
// =============================================

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<MSGraphOAuthTokens> {
  const response = await fetch(MS_GRAPH_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || response.statusText}`)
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
): Promise<MSGraphOAuthTokens> {
  const response = await fetch(MS_GRAPH_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`)
  }

  return await response.json()
}

/**
 * Get user profile from Microsoft Graph
 */
export async function getUserProfile(accessToken: string): Promise<MSGraphUserProfile> {
  const url = buildMSGraphUrl('/me')

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.statusText}`)
  }

  return await response.json()
}

// =============================================
// CALENDAR EVENT TYPES
// =============================================

/**
 * Microsoft Graph date/time type
 */
export interface MSGraphDateTime {
  dateTime: string // ISO 8601 format without timezone
  timeZone: string // IANA timezone
}

/**
 * Microsoft Graph location type
 */
export interface MSGraphLocation {
  displayName?: string
  locationType?: 'default' | 'conferenceRoom' | 'homeAddress' | 'businessAddress' | 'geoCoordinates' | 'streetAddress' | 'hotel' | 'restaurant' | 'localBusiness' | 'postalAddress'
  address?: {
    street?: string
    city?: string
    state?: string
    countryOrRegion?: string
    postalCode?: string
  }
}

/**
 * Microsoft Graph attendee type
 */
export interface MSGraphAttendee {
  emailAddress: {
    address: string
    name?: string
  }
  type?: 'required' | 'optional' | 'resource'
  status?: {
    response?: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'
    time?: string
  }
}

/**
 * Microsoft Graph event (Outlook calendar event)
 */
export interface MSGraphEvent {
  id?: string
  subject: string
  body?: {
    contentType: 'text' | 'html'
    content: string
  }
  start: MSGraphDateTime
  end: MSGraphDateTime
  location?: MSGraphLocation
  locations?: MSGraphLocation[]
  attendees?: MSGraphAttendee[]
  organizer?: {
    emailAddress: {
      address: string
      name?: string
    }
  }
  isAllDay?: boolean
  isCancelled?: boolean
  isOnlineMeeting?: boolean
  onlineMeetingUrl?: string
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  importance?: 'low' | 'normal' | 'high'
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential'
  categories?: string[]
  webLink?: string
  changeKey?: string // ETag equivalent for conflict detection
  createdDateTime?: string
  lastModifiedDateTime?: string
  // Extended properties for linking to local entities
  singleValueExtendedProperties?: Array<{
    id: string
    value: string
  }>
}

/**
 * Microsoft Graph calendar
 */
export interface MSGraphCalendar {
  id: string
  name: string
  color?: string
  isDefaultCalendar?: boolean
  canEdit?: boolean
  canShare?: boolean
  owner?: {
    name: string
    address: string
  }
}

/**
 * Delta response for incremental sync
 */
export interface MSGraphDeltaResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

// =============================================
// GRAPH API REQUEST FUNCTION
// =============================================

/**
 * Make an authenticated Microsoft Graph API request with retry logic
 */
export async function msGraphRequest<T>(
  endpoint: string,
  accessToken: string,
  options: {
    method?: string
    body?: unknown
    query?: Record<string, string>
    retryConfig?: Partial<RetryConfig>
    useBeta?: boolean
  } = {}
): Promise<T> {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options.retryConfig,
  }

  let url = buildMSGraphUrl(endpoint, options.useBeta)

  if (options.query) {
    const params = new URLSearchParams(options.query)
    url += `?${params.toString()}`
  }

  let lastError: MSGraphApiError | Error | null = null

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
        const { errorType, isRetryable, retryAfterMs } = classifyMSGraphError(response.status, errorData)
        const errorMessage = errorData.error?.message || response.statusText
        const graphErrorCode = errorData.error?.code

        // Check for Retry-After header
        const retryAfterHeader = response.headers.get('Retry-After')
        const actualRetryAfter = retryAfterHeader
          ? parseInt(retryAfterHeader) * 1000
          : retryAfterMs

        lastError = new MSGraphApiError(
          `MS Graph API error: ${errorMessage}`,
          errorType,
          response.status,
          graphErrorCode,
          isRetryable,
          actualRetryAfter
        )

        // If retryable and we have retries left, wait and retry
        if (isRetryable && config.retryableErrors.includes(errorType) && attempt < config.maxRetries) {
          const delayMs = actualRetryAfter || calculateBackoff(attempt, config)
          console.log(`MS Graph API retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms - ${errorType}: ${errorMessage}`)
          await sleep(delayMs)
          continue
        }

        throw lastError
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      // Handle network errors (fetch throws)
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        lastError = new MSGraphApiError(
          `Network error: ${error.message}`,
          'network',
          undefined,
          undefined,
          true
        )

        if (config.retryableErrors.includes('network') && attempt < config.maxRetries) {
          const delayMs = calculateBackoff(attempt, config)
          console.log(`MS Graph API network retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms`)
          await sleep(delayMs)
          continue
        }
      }

      // Re-throw MSGraphApiError as-is
      if (error instanceof MSGraphApiError) {
        throw error
      }

      // Wrap other errors
      throw lastError || error
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('MS Graph API request failed after all retries')
}

// =============================================
// CALENDAR HELPER FUNCTIONS
// =============================================

/**
 * Get user's calendars
 */
export async function getCalendars(accessToken: string): Promise<MSGraphCalendar[]> {
  const response = await msGraphRequest<{ value: MSGraphCalendar[] }>(
    '/me/calendars',
    accessToken
  )
  return response.value
}

/**
 * Get calendar events with optional delta sync
 */
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  options?: {
    startDateTime?: string
    endDateTime?: string
    deltaLink?: string
    select?: string[]
  }
): Promise<MSGraphDeltaResponse<MSGraphEvent>> {
  // If we have a delta link, use it for incremental sync
  if (options?.deltaLink) {
    return await fetch(options.deltaLink, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }).then(r => r.json())
  }

  const endpoint = calendarId === 'primary'
    ? '/me/calendar/events/delta'
    : `/me/calendars/${calendarId}/events/delta`

  const query: Record<string, string> = {}

  if (options?.startDateTime) {
    query.startDateTime = options.startDateTime
  }
  if (options?.endDateTime) {
    query.endDateTime = options.endDateTime
  }
  if (options?.select) {
    query.$select = options.select.join(',')
  }

  return await msGraphRequest<MSGraphDeltaResponse<MSGraphEvent>>(
    endpoint,
    accessToken,
    { query }
  )
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  accessToken: string,
  event: MSGraphEvent,
  calendarId: string = 'primary'
): Promise<MSGraphEvent> {
  const endpoint = calendarId === 'primary'
    ? '/me/calendar/events'
    : `/me/calendars/${calendarId}/events`

  return await msGraphRequest<MSGraphEvent>(
    endpoint,
    accessToken,
    { method: 'POST', body: event }
  )
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<MSGraphEvent>,
  calendarId: string = 'primary'
): Promise<MSGraphEvent> {
  const endpoint = calendarId === 'primary'
    ? `/me/calendar/events/${eventId}`
    : `/me/calendars/${calendarId}/events/${eventId}`

  return await msGraphRequest<MSGraphEvent>(
    endpoint,
    accessToken,
    { method: 'PATCH', body: event }
  )
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const endpoint = calendarId === 'primary'
    ? `/me/calendar/events/${eventId}`
    : `/me/calendars/${calendarId}/events/${eventId}`

  await msGraphRequest<void>(
    endpoint,
    accessToken,
    { method: 'DELETE' }
  )
}

/**
 * Get a single calendar event
 */
export async function getCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<MSGraphEvent> {
  const endpoint = calendarId === 'primary'
    ? `/me/calendar/events/${eventId}`
    : `/me/calendars/${calendarId}/events/${eventId}`

  return await msGraphRequest<MSGraphEvent>(endpoint, accessToken)
}

// =============================================
// WEBHOOK SUBSCRIPTION FUNCTIONS
// =============================================

/**
 * Webhook subscription type
 */
export interface MSGraphSubscription {
  id?: string
  changeType: string // 'created,updated,deleted'
  notificationUrl: string
  resource: string
  expirationDateTime: string
  clientState?: string
}

/**
 * Create a webhook subscription for calendar changes
 */
export async function createWebhookSubscription(
  accessToken: string,
  notificationUrl: string,
  calendarId: string = 'primary',
  clientState?: string
): Promise<MSGraphSubscription> {
  const resource = calendarId === 'primary'
    ? '/me/calendar/events'
    : `/me/calendars/${calendarId}/events`

  // Subscription expires in 3 days (Microsoft Graph max is 4230 minutes / ~3 days)
  const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  const subscription: MSGraphSubscription = {
    changeType: 'created,updated,deleted',
    notificationUrl,
    resource,
    expirationDateTime,
    clientState,
  }

  return await msGraphRequest<MSGraphSubscription>(
    '/subscriptions',
    accessToken,
    { method: 'POST', body: subscription }
  )
}

/**
 * Renew a webhook subscription
 */
export async function renewWebhookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<MSGraphSubscription> {
  const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  return await msGraphRequest<MSGraphSubscription>(
    `/subscriptions/${subscriptionId}`,
    accessToken,
    { method: 'PATCH', body: { expirationDateTime } }
  )
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  await msGraphRequest<void>(
    `/subscriptions/${subscriptionId}`,
    accessToken,
    { method: 'DELETE' }
  )
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

/**
 * Convert local datetime to MS Graph format
 */
export function toMSGraphDateTime(date: Date | string, timeZone: string = 'UTC'): MSGraphDateTime {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return {
    dateTime: dateObj.toISOString().replace('Z', ''),
    timeZone,
  }
}

/**
 * Convert MS Graph datetime to Date
 */
export function fromMSGraphDateTime(graphDateTime: MSGraphDateTime): Date {
  // If timezone is UTC, append Z
  if (graphDateTime.timeZone === 'UTC') {
    return new Date(graphDateTime.dateTime + 'Z')
  }
  // Otherwise, create a date string that includes the timezone
  return new Date(graphDateTime.dateTime)
}

/**
 * Extended property ID for storing local entity reference
 */
export const LOCAL_ENTITY_PROPERTY_ID = 'String {66f5a359-4659-4830-9070-00040ec6ac6e} Name LocalEntityRef'

/**
 * Create an event with local entity reference
 */
export function createEventWithLocalRef(
  event: MSGraphEvent,
  localEntityType: string,
  localEntityId: string
): MSGraphEvent {
  return {
    ...event,
    singleValueExtendedProperties: [
      {
        id: LOCAL_ENTITY_PROPERTY_ID,
        value: JSON.stringify({ type: localEntityType, id: localEntityId }),
      },
    ],
  }
}

/**
 * Extract local entity reference from event
 */
export function extractLocalEntityRef(event: MSGraphEvent): { type: string; id: string } | null {
  const prop = event.singleValueExtendedProperties?.find(p => p.id === LOCAL_ENTITY_PROPERTY_ID)
  if (!prop?.value) {return null}

  try {
    return JSON.parse(prop.value)
  } catch {
    return null
  }
}
