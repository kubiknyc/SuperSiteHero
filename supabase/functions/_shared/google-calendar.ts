/**
 * Shared Google Calendar utilities for Edge Functions
 */

// =============================================
// GOOGLE CALENDAR API URLS
// =============================================

export const GCAL_URLS = {
  oauth: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    revoke: 'https://oauth2.googleapis.com/revoke',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  api: {
    base: 'https://www.googleapis.com/calendar/v3',
    calendars: 'https://www.googleapis.com/calendar/v3/calendars',
    calendarList: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    events: (calendarId: string) =>
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    event: (calendarId: string, eventId: string) =>
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    watch: (calendarId: string) =>
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    stopChannel: 'https://www.googleapis.com/calendar/v3/channels/stop',
  },
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' '),
}

/**
 * Standard CORS headers for Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// ERROR HANDLING
// =============================================

export type GCalErrorType =
  | 'network'
  | 'rate_limit'
  | 'server'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'quota_exceeded'
  | 'unknown'

export class GCalApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: GCalErrorType,
    public readonly statusCode?: number,
    public readonly googleErrorCode?: string,
    public readonly isRetryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message)
    this.name = 'GCalApiError'
  }
}

export function classifyGCalError(
  statusCode: number,
  errorData?: { error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> } }
): { errorType: GCalErrorType; isRetryable: boolean; retryAfterMs?: number } {
  const reason = errorData?.error?.errors?.[0]?.reason

  if (!statusCode) {
    return { errorType: 'network', isRetryable: true }
  }

  if (statusCode === 429 || reason === 'rateLimitExceeded') {
    return { errorType: 'rate_limit', isRetryable: true, retryAfterMs: 60000 }
  }

  if (statusCode === 403 && reason === 'quotaExceeded') {
    return { errorType: 'quota_exceeded', isRetryable: false }
  }

  if (statusCode === 401) {
    return { errorType: 'auth', isRetryable: false }
  }

  if (statusCode === 404) {
    return { errorType: 'not_found', isRetryable: false }
  }

  if (statusCode === 409 || reason === 'conflict') {
    return { errorType: 'conflict', isRetryable: false }
  }

  if (statusCode === 400 || statusCode === 422) {
    return { errorType: 'validation', isRetryable: false }
  }

  if (statusCode >= 500) {
    return { errorType: 'server', isRetryable: true }
  }

  return { errorType: 'unknown', isRetryable: false }
}

// =============================================
// RETRY LOGIC
// =============================================

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)
  const jitter = exponentialDelay * Math.random() * 0.25
  return Math.min(exponentialDelay + jitter, config.maxDelayMs)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================
// OAUTH TYPES
// =============================================

export interface GCalOAuthTokens {
  access_token: string
  refresh_token?: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
  id_token?: string
}

export interface GCalUserInfo {
  id: string
  email: string
  name?: string
  picture?: string
}

// =============================================
// OAUTH FUNCTIONS
// =============================================

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  accessType: 'offline' | 'online' = 'offline'
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GCAL_URLS.scopes,
    access_type: accessType,
    prompt: 'consent',
    state,
  })

  return `${GCAL_URLS.oauth.authorize}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<GCalOAuthTokens> {
  const response = await fetch(GCAL_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new GCalApiError(
      `Token exchange failed: ${errorData.error_description || response.statusText}`,
      'auth',
      response.status
    )
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
): Promise<GCalOAuthTokens> {
  const response = await fetch(GCAL_URLS.oauth.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new GCalApiError(
      `Token refresh failed: ${errorData.error_description || response.statusText}`,
      'auth',
      response.status
    )
  }

  return await response.json()
}

/**
 * Revoke tokens
 */
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(`${GCAL_URLS.oauth.revoke}?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!response.ok && response.status !== 400) {
    throw new GCalApiError(`Token revocation failed: ${response.statusText}`, 'auth', response.status)
  }
}

/**
 * Get user info from Google
 */
export async function getUserInfo(accessToken: string): Promise<GCalUserInfo> {
  const response = await fetch(GCAL_URLS.oauth.userInfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new GCalApiError('Failed to get user info', 'auth', response.status)
  }

  return await response.json()
}

// =============================================
// CALENDAR API FUNCTIONS
// =============================================

export interface GCalCalendar {
  id: string
  summary: string
  description?: string
  timeZone?: string
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

export interface GCalEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    optional?: boolean
  }>
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: { type: string }
    }
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
  }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  status?: 'confirmed' | 'tentative' | 'cancelled'
  etag?: string
  htmlLink?: string
  created?: string
  updated?: string
  recurrence?: string[]
  recurringEventId?: string
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
}

export interface GCalEventList {
  kind: 'calendar#events'
  etag: string
  summary: string
  updated: string
  timeZone: string
  accessRole: string
  nextPageToken?: string
  nextSyncToken?: string
  items: GCalEvent[]
}

/**
 * Make an authenticated Google Calendar API request with retry logic
 */
export async function gcalApiRequest<T>(
  endpoint: string,
  accessToken: string,
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

  let url = endpoint
  if (options.query) {
    const params = new URLSearchParams(options.query)
    url += `?${params.toString()}`
  }

  let lastError: GCalApiError | Error | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const { errorType, isRetryable, retryAfterMs } = classifyGCalError(response.status, errorData)
        const errorMessage = errorData.error?.message || response.statusText

        lastError = new GCalApiError(
          `Google Calendar API error: ${errorMessage}`,
          errorType,
          response.status,
          errorData.error?.errors?.[0]?.reason,
          isRetryable,
          retryAfterMs
        )

        if (isRetryable && attempt < config.maxRetries) {
          const delayMs = retryAfterMs || calculateBackoff(attempt, config)
          console.log(`GCal API retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms - ${errorType}: ${errorMessage}`)
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
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        lastError = new GCalApiError(`Network error: ${error.message}`, 'network', undefined, undefined, true)

        if (attempt < config.maxRetries) {
          const delayMs = calculateBackoff(attempt, config)
          console.log(`GCal API network retry ${attempt + 1}/${config.maxRetries} after ${delayMs}ms`)
          await sleep(delayMs)
          continue
        }
      }

      if (error instanceof GCalApiError) {
        throw error
      }

      throw lastError || error
    }
  }

  throw lastError || new Error('GCal API request failed after all retries')
}

/**
 * List user's calendars
 */
export async function listCalendars(accessToken: string): Promise<GCalCalendar[]> {
  const response = await gcalApiRequest<{ items: GCalCalendar[] }>(GCAL_URLS.api.calendarList, accessToken, {
    query: { minAccessRole: 'writer' },
  })
  return response.items || []
}

/**
 * Get calendar details
 */
export async function getCalendar(accessToken: string, calendarId: string): Promise<GCalCalendar> {
  return await gcalApiRequest<GCalCalendar>(`${GCAL_URLS.api.calendarList}/${encodeURIComponent(calendarId)}`, accessToken)
}

/**
 * List events from a calendar
 */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  options?: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
    pageToken?: string
    syncToken?: string
    singleEvents?: boolean
    orderBy?: 'startTime' | 'updated'
  }
): Promise<GCalEventList> {
  const query: Record<string, string> = {}

  if (options?.timeMin) query.timeMin = options.timeMin
  if (options?.timeMax) query.timeMax = options.timeMax
  if (options?.maxResults) query.maxResults = String(options.maxResults)
  if (options?.pageToken) query.pageToken = options.pageToken
  if (options?.syncToken) query.syncToken = options.syncToken
  if (options?.singleEvents !== undefined) query.singleEvents = String(options.singleEvents)
  if (options?.orderBy) query.orderBy = options.orderBy

  return await gcalApiRequest<GCalEventList>(GCAL_URLS.api.events(calendarId), accessToken, { query })
}

/**
 * Get a single event
 */
export async function getEvent(accessToken: string, calendarId: string, eventId: string): Promise<GCalEvent> {
  return await gcalApiRequest<GCalEvent>(GCAL_URLS.api.event(calendarId, eventId), accessToken)
}

/**
 * Create a new event
 */
export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: GCalEvent,
  options?: {
    sendUpdates?: 'all' | 'externalOnly' | 'none'
    conferenceDataVersion?: number
  }
): Promise<GCalEvent> {
  const query: Record<string, string> = {}
  if (options?.sendUpdates) query.sendUpdates = options.sendUpdates
  if (options?.conferenceDataVersion !== undefined) {
    query.conferenceDataVersion = String(options.conferenceDataVersion)
  }

  return await gcalApiRequest<GCalEvent>(GCAL_URLS.api.events(calendarId), accessToken, {
    method: 'POST',
    body: event,
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

/**
 * Update an existing event
 */
export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GCalEvent>,
  options?: {
    sendUpdates?: 'all' | 'externalOnly' | 'none'
  }
): Promise<GCalEvent> {
  const query: Record<string, string> = {}
  if (options?.sendUpdates) query.sendUpdates = options.sendUpdates

  return await gcalApiRequest<GCalEvent>(GCAL_URLS.api.event(calendarId, eventId), accessToken, {
    method: 'PATCH',
    body: event,
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

/**
 * Delete an event
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  options?: {
    sendUpdates?: 'all' | 'externalOnly' | 'none'
  }
): Promise<void> {
  const query: Record<string, string> = {}
  if (options?.sendUpdates) query.sendUpdates = options.sendUpdates

  await gcalApiRequest<void>(GCAL_URLS.api.event(calendarId, eventId), accessToken, {
    method: 'DELETE',
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

// =============================================
// PUSH NOTIFICATIONS (WEBHOOKS)
// =============================================

export interface GCalWatchChannel {
  id: string
  resourceId: string
  resourceUri: string
  token?: string
  expiration: string
}

/**
 * Set up push notifications for a calendar
 */
export async function watchCalendar(
  accessToken: string,
  calendarId: string,
  webhookUrl: string,
  channelId: string,
  token?: string,
  ttlSeconds: number = 604800 // 7 days
): Promise<GCalWatchChannel> {
  const expiration = Date.now() + ttlSeconds * 1000

  return await gcalApiRequest<GCalWatchChannel>(GCAL_URLS.api.watch(calendarId), accessToken, {
    method: 'POST',
    body: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token,
      expiration: String(expiration),
    },
  })
}

/**
 * Stop watching a calendar (cancel push notifications)
 */
export async function stopWatching(accessToken: string, channelId: string, resourceId: string): Promise<void> {
  await gcalApiRequest<void>(GCAL_URLS.api.stopChannel, accessToken, {
    method: 'POST',
    body: {
      id: channelId,
      resourceId,
    },
  })
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

/**
 * Check if token is expired or about to expire (with 5 minute buffer)
 */
export function isTokenExpired(expiresAt: Date | string): boolean {
  const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const bufferMs = 5 * 60 * 1000 // 5 minutes
  return Date.now() + bufferMs >= expirationDate.getTime()
}

/**
 * Convert meeting to Google Calendar event
 */
export function meetingToGCalEvent(meeting: {
  title: string
  description?: string | null
  location?: string | null
  virtual_meeting_link?: string | null
  meeting_date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  attendees?: Array<{ email?: string; name: string }> | null
}): GCalEvent {
  const startDateTime = meeting.start_time
    ? `${meeting.meeting_date}T${meeting.start_time}`
    : meeting.meeting_date

  let endDateTime: string
  if (meeting.end_time) {
    endDateTime = `${meeting.meeting_date}T${meeting.end_time}`
  } else if (meeting.start_time && meeting.duration_minutes) {
    const startDate = new Date(`${meeting.meeting_date}T${meeting.start_time}`)
    startDate.setMinutes(startDate.getMinutes() + meeting.duration_minutes)
    endDateTime = startDate.toISOString()
  } else {
    // Default to 1 hour
    const startDate = meeting.start_time
      ? new Date(`${meeting.meeting_date}T${meeting.start_time}`)
      : new Date(meeting.meeting_date)
    startDate.setHours(startDate.getHours() + 1)
    endDateTime = startDate.toISOString()
  }

  const event: GCalEvent = {
    summary: meeting.title,
    description: meeting.description || undefined,
    location: meeting.location || undefined,
  }

  // Set start/end based on whether we have time or just date
  if (meeting.start_time) {
    event.start = { dateTime: startDateTime }
    event.end = { dateTime: endDateTime }
  } else {
    event.start = { date: meeting.meeting_date }
    event.end = { date: meeting.meeting_date }
  }

  // Add virtual meeting link to description if provided
  if (meeting.virtual_meeting_link) {
    event.description = event.description
      ? `${event.description}\n\nVirtual Meeting Link: ${meeting.virtual_meeting_link}`
      : `Virtual Meeting Link: ${meeting.virtual_meeting_link}`
  }

  // Add attendees with valid emails
  if (meeting.attendees?.length) {
    const validAttendees = meeting.attendees.filter((a) => a.email && a.email.includes('@'))
    if (validAttendees.length > 0) {
      event.attendees = validAttendees.map((a) => ({
        email: a.email!,
        displayName: a.name,
      }))
    }
  }

  return event
}

/**
 * Convert Google Calendar event to meeting data
 */
export function gcalEventToMeetingData(event: GCalEvent): {
  title: string
  description: string | null
  location: string | null
  meeting_date: string
  start_time: string | null
  end_time: string | null
  virtual_meeting_link: string | null
} {
  let meetingDate: string
  let startTime: string | null = null
  let endTime: string | null = null

  if (event.start.dateTime) {
    const startDate = new Date(event.start.dateTime)
    meetingDate = startDate.toISOString().split('T')[0]
    startTime = startDate.toISOString().split('T')[1].substring(0, 5)
  } else {
    meetingDate = event.start.date!
  }

  if (event.end.dateTime) {
    const endDate = new Date(event.end.dateTime)
    endTime = endDate.toISOString().split('T')[1].substring(0, 5)
  }

  // Extract virtual meeting link from conference data or description
  let virtualMeetingLink: string | null = null
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find((e) => e.entryPointType === 'video')
    if (videoEntry) {
      virtualMeetingLink = videoEntry.uri
    }
  }

  return {
    title: event.summary,
    description: event.description || null,
    location: event.location || null,
    meeting_date: meetingDate,
    start_time: startTime,
    end_time: endTime,
    virtual_meeting_link: virtualMeetingLink,
  }
}
