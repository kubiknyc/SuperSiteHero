// File: /src/lib/auth/session-manager.ts
// Enhanced session management with auto-refresh, expiry detection, and network resilience

import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { logger } from '@/lib/utils/logger'
import { isOnline, waitForOnline } from './auth-retry'

// ============================================================================
// Constants
// ============================================================================

/** Refresh session 5 minutes before expiry */
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000

/** Minimum interval between refresh attempts */
const MIN_REFRESH_INTERVAL_MS = 30 * 1000

/** Warning shown 10 minutes before expiry */
const EXPIRY_WARNING_MS = 10 * 60 * 1000

/** Session expiry check interval */
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000

/** Maximum offline refresh queue time */
const MAX_OFFLINE_QUEUE_TIME_MS = 5 * 60 * 1000

/** BroadcastChannel name for cross-tab sync */
const SESSION_CHANNEL_NAME = 'jobsight-session-sync'

// ============================================================================
// Types
// ============================================================================

export interface SessionState {
  session: Session | null
  expiresAt: number | null
  isRefreshing: boolean
  lastRefreshAttempt: number | null
  offlineQueuedAt: number | null
}

export interface SessionExpiryInfo {
  expiresAt: Date | null
  expiresIn: number | null
  isExpiringSoon: boolean
  isExpired: boolean
  formattedTimeRemaining: string | null
}

export type SessionEventType =
  | 'SESSION_REFRESHED'
  | 'SESSION_EXPIRING_SOON'
  | 'SESSION_EXPIRED'
  | 'SESSION_REFRESH_FAILED'
  | 'SESSION_SIGNED_OUT'
  | 'SESSION_SYNCED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_ONLINE'

export interface SessionEvent {
  type: SessionEventType
  payload?: unknown
  timestamp: number
}

type SessionEventCallback = (event: SessionEvent) => void

// ============================================================================
// Session Manager Singleton
// ============================================================================

class SessionManager {
  private state: SessionState = {
    session: null,
    expiresAt: null,
    isRefreshing: false,
    lastRefreshAttempt: null,
    offlineQueuedAt: null,
  }

  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private expiryCheckTimer: ReturnType<typeof setInterval> | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private eventListeners: Set<SessionEventCallback> = new Set()
  private isInitialized = false

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('[SessionManager] Already initialized')
      return
    }

    logger.log('[SessionManager] Initializing...')

    // Set up BroadcastChannel for cross-tab sync
    this.setupBroadcastChannel()

    // Listen for online/offline events
    this.setupNetworkListeners()

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      this.updateSession(session)
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      logger.log('[SessionManager] Auth state change:', event)

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          if (session) {
            this.updateSession(session)
            this.emitEvent({ type: 'SESSION_REFRESHED', timestamp: Date.now() })
            this.broadcastSessionUpdate('SESSION_REFRESHED', session)
          }
          break

        case 'SIGNED_OUT':
          this.clearSession()
          this.emitEvent({ type: 'SESSION_SIGNED_OUT', timestamp: Date.now() })
          this.broadcastSessionUpdate('SESSION_SIGNED_OUT', null)
          break

        case 'USER_UPDATED':
          if (session) {
            this.updateSession(session)
          }
          break
      }
    })

    // Start expiry check timer
    this.startExpiryCheckTimer()

    this.isInitialized = true
    logger.log('[SessionManager] Initialized successfully')
  }

  /**
   * Update session state and schedule refresh
   */
  private updateSession(session: Session): void {
    const expiresAt = session.expires_at ? session.expires_at * 1000 : null

    this.state = {
      ...this.state,
      session,
      expiresAt,
      isRefreshing: false,
      lastRefreshAttempt: null,
      offlineQueuedAt: null,
    }

    logger.debug('[SessionManager] Session updated, expires at:', expiresAt ? new Date(expiresAt).toISOString() : 'unknown')

    // Schedule proactive refresh
    this.scheduleRefresh()
  }

  /**
   * Clear session state
   */
  private clearSession(): void {
    this.state = {
      session: null,
      expiresAt: null,
      isRefreshing: false,
      lastRefreshAttempt: null,
      offlineQueuedAt: null,
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Schedule proactive session refresh before expiry
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (!this.state.expiresAt) {
      return
    }

    const now = Date.now()
    const refreshAt = this.state.expiresAt - REFRESH_BEFORE_EXPIRY_MS
    const timeUntilRefresh = refreshAt - now

    if (timeUntilRefresh <= 0) {
      // Already past refresh window, refresh now
      this.refreshSession()
      return
    }

    logger.debug(`[SessionManager] Scheduling refresh in ${Math.round(timeUntilRefresh / 1000)}s`)

    this.refreshTimer = setTimeout(() => {
      this.refreshSession()
    }, timeUntilRefresh)
  }

  /**
   * Refresh the session with network resilience
   */
  async refreshSession(): Promise<boolean> {
    // Check for minimum interval between refresh attempts
    const now = Date.now()
    if (this.state.lastRefreshAttempt && now - this.state.lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
      logger.debug('[SessionManager] Skipping refresh, too soon since last attempt')
      return false
    }

    // If offline, queue refresh for when we're back online
    if (!isOnline()) {
      logger.log('[SessionManager] Offline, queuing refresh')
      this.state.offlineQueuedAt = now
      this.emitEvent({ type: 'NETWORK_OFFLINE', timestamp: now })
      this.waitForOnlineAndRefresh()
      return false
    }

    if (this.state.isRefreshing) {
      logger.debug('[SessionManager] Already refreshing')
      return false
    }

    this.state.isRefreshing = true
    this.state.lastRefreshAttempt = now

    try {
      logger.log('[SessionManager] Refreshing session...')
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        logger.error('[SessionManager] Refresh failed:', error.message)
        this.emitEvent({
          type: 'SESSION_REFRESH_FAILED',
          payload: { error: error.message },
          timestamp: Date.now(),
        })

        // If refresh token is invalid, sign out
        if (error.message.includes('refresh_token') || error.message.includes('invalid')) {
          logger.warn('[SessionManager] Invalid refresh token, signing out')
          await supabase.auth.signOut()
        }

        return false
      }

      if (data.session) {
        this.updateSession(data.session)
        logger.log('[SessionManager] Session refreshed successfully')
        return true
      }

      return false
    } catch (error) {
      logger.error('[SessionManager] Refresh error:', error)
      this.state.isRefreshing = false
      return false
    }
  }

  /**
   * Wait for online status and retry refresh
   */
  private async waitForOnlineAndRefresh(): Promise<void> {
    const queuedAt = this.state.offlineQueuedAt
    if (!queuedAt) {return}

    const online = await waitForOnline(MAX_OFFLINE_QUEUE_TIME_MS)

    if (!online) {
      logger.warn('[SessionManager] Timed out waiting for network')
      this.state.offlineQueuedAt = null
      return
    }

    // Check if queue is still valid (hasn't been cleared by another refresh)
    if (this.state.offlineQueuedAt !== queuedAt) {
      return
    }

    logger.log('[SessionManager] Back online, refreshing session')
    this.emitEvent({ type: 'NETWORK_ONLINE', timestamp: Date.now() })
    this.state.offlineQueuedAt = null
    await this.refreshSession()
  }

  /**
   * Start periodic expiry check timer
   */
  private startExpiryCheckTimer(): void {
    if (this.expiryCheckTimer) {
      clearInterval(this.expiryCheckTimer)
    }

    this.expiryCheckTimer = setInterval(() => {
      this.checkExpiry()
    }, EXPIRY_CHECK_INTERVAL_MS)
  }

  /**
   * Check session expiry and emit warnings
   */
  private checkExpiry(): void {
    if (!this.state.expiresAt) {return}

    const now = Date.now()
    const timeRemaining = this.state.expiresAt - now

    if (timeRemaining <= 0) {
      logger.warn('[SessionManager] Session has expired')
      this.emitEvent({ type: 'SESSION_EXPIRED', timestamp: now })
      return
    }

    if (timeRemaining <= EXPIRY_WARNING_MS) {
      logger.log('[SessionManager] Session expiring soon')
      this.emitEvent({
        type: 'SESSION_EXPIRING_SOON',
        payload: { timeRemaining },
        timestamp: now,
      })
    }
  }

  /**
   * Get session expiry information
   */
  getExpiryInfo(): SessionExpiryInfo {
    if (!this.state.expiresAt) {
      return {
        expiresAt: null,
        expiresIn: null,
        isExpiringSoon: false,
        isExpired: false,
        formattedTimeRemaining: null,
      }
    }

    const now = Date.now()
    const expiresIn = this.state.expiresAt - now
    const isExpired = expiresIn <= 0
    const isExpiringSoon = !isExpired && expiresIn <= EXPIRY_WARNING_MS

    let formattedTimeRemaining: string | null = null
    if (!isExpired) {
      const minutes = Math.floor(expiresIn / 60000)
      const seconds = Math.floor((expiresIn % 60000) / 1000)
      formattedTimeRemaining = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
    }

    return {
      expiresAt: new Date(this.state.expiresAt),
      expiresIn,
      isExpiringSoon,
      isExpired,
      formattedTimeRemaining,
    }
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.state.session
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    if (!this.state.session || !this.state.expiresAt) {
      return false
    }
    return Date.now() < this.state.expiresAt
  }

  // ============================================================================
  // BroadcastChannel for Cross-Tab Sync
  // ============================================================================

  /**
   * Set up BroadcastChannel for cross-tab session sync
   */
  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      logger.debug('[SessionManager] BroadcastChannel not supported')
      return
    }

    try {
      this.broadcastChannel = new BroadcastChannel(SESSION_CHANNEL_NAME)

      this.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data)
      }

      logger.debug('[SessionManager] BroadcastChannel initialized')
    } catch (error) {
      logger.warn('[SessionManager] Failed to initialize BroadcastChannel:', error)
    }
  }

  /**
   * Broadcast session update to other tabs
   */
  private broadcastSessionUpdate(type: string, session: Session | null): void {
    if (!this.broadcastChannel) {return}

    try {
      this.broadcastChannel.postMessage({
        type,
        session: session ? {
          access_token: session.access_token?.slice(-8), // Only send partial token for sync
          expires_at: session.expires_at,
        } : null,
        timestamp: Date.now(),
      })
    } catch (error) {
      logger.warn('[SessionManager] Failed to broadcast:', error)
    }
  }

  /**
   * Handle broadcast message from another tab
   */
  private handleBroadcastMessage(data: unknown): void {
    if (!data || typeof data !== 'object') {return}

    const message = data as { type: string; timestamp: number }
    logger.debug('[SessionManager] Received broadcast:', message.type)

    switch (message.type) {
      case 'SESSION_SIGNED_OUT':
        // Another tab signed out, clear local session
        logger.log('[SessionManager] Session signed out in another tab')
        this.clearSession()
        this.emitEvent({ type: 'SESSION_SYNCED', payload: { action: 'signed_out' }, timestamp: Date.now() })
        // Trigger local sign out
        supabase.auth.signOut()
        break

      case 'SESSION_REFRESHED':
        // Another tab refreshed, sync our session
        logger.log('[SessionManager] Session refreshed in another tab, syncing...')
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            this.updateSession(session)
            this.emitEvent({ type: 'SESSION_SYNCED', payload: { action: 'refreshed' }, timestamp: Date.now() })
          }
        })
        break
    }
  }

  // ============================================================================
  // Network Listeners
  // ============================================================================

  /**
   * Set up network online/offline listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') {return}

    window.addEventListener('online', () => {
      logger.log('[SessionManager] Network online')
      this.emitEvent({ type: 'NETWORK_ONLINE', timestamp: Date.now() })

      // If we have a queued refresh, process it
      if (this.state.offlineQueuedAt) {
        this.refreshSession()
      }
    })

    window.addEventListener('offline', () => {
      logger.log('[SessionManager] Network offline')
      this.emitEvent({ type: 'NETWORK_OFFLINE', timestamp: Date.now() })
    })
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to session events
   */
  subscribe(callback: SessionEventCallback): () => void {
    this.eventListeners.add(callback)
    return () => {
      this.eventListeners.delete(callback)
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: SessionEvent): void {
    this.eventListeners.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        logger.error('[SessionManager] Event listener error:', error)
      }
    })
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (this.expiryCheckTimer) {
      clearInterval(this.expiryCheckTimer)
      this.expiryCheckTimer = null
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }

    this.eventListeners.clear()
    this.isInitialized = false

    logger.log('[SessionManager] Destroyed')
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) {return 'Expired'}

  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Check if session needs refresh
 */
export function sessionNeedsRefresh(session: Session | null): boolean {
  if (!session?.expires_at) {return false}

  const expiresAt = session.expires_at * 1000
  const now = Date.now()

  return now >= expiresAt - REFRESH_BEFORE_EXPIRY_MS
}
