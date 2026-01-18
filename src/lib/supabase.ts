// File: /src/lib/supabase.ts
// Supabase client configuration and initialization with offline support

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database-extensions'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Flag indicating if Supabase configuration is missing.
 * When true, the app should show a configuration error instead of trying to use the client.
 */
export const isMissingSupabaseConfig = !supabaseUrl || !supabaseAnonKey

if (isMissingSupabaseConfig) {
  console.error(
    '[Supabase] Missing environment variables!\n' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.\n' +
    'You can copy .env.example to .env and fill in your Supabase project credentials.\n' +
    'Or run: vercel env pull .env.local'
  )
}

// Create typed Supabase client with offline-friendly configuration
// Only create if config is present, otherwise export a null placeholder
export const supabase: SupabaseClient<Database> = isMissingSupabaseConfig
  ? (null as unknown as SupabaseClient<Database>)
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Store auth state in localStorage for offline access
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Detect session from URL for OAuth flows
    detectSessionInUrl: true,
  },
  // Global configuration for offline resilience
  global: {
    headers: {
      'x-client-info': 'jobsight-web',
    },
  },
  // Realtime configuration for live updates
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ============================================================================
// Offline Sync Configuration
// ============================================================================

/**
 * Tables that should be synced for offline use
 * These tables are cached in IndexedDB for offline access
 */
export const OFFLINE_SYNC_TABLES = [
  'projects',
  'daily_reports',
  'workflow_items',
  'tasks',
  'documents',
  'punch_items',
  'checklists',
  'checklist_executions',
  'contacts',
  'safety_incidents',
  'meetings',
] as const

export type OfflineSyncTable = (typeof OFFLINE_SYNC_TABLES)[number]

/**
 * Configuration for offline sync behavior per table
 */
export const OFFLINE_SYNC_CONFIG: Record<
  OfflineSyncTable,
  {
    /** Priority for sync (higher = more important) */
    priority: number
    /** Max age in milliseconds before data is considered stale */
    maxAge: number
    /** Whether to sync on app launch */
    syncOnLaunch: boolean
    /** Whether to sync incrementally (only changes since last sync) */
    incrementalSync: boolean
  }
> = {
  projects: {
    priority: 100,
    maxAge: 1000 * 60 * 60, // 1 hour
    syncOnLaunch: true,
    incrementalSync: false,
  },
  daily_reports: {
    priority: 90,
    maxAge: 1000 * 60 * 30, // 30 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  workflow_items: {
    priority: 85,
    maxAge: 1000 * 60 * 30, // 30 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  tasks: {
    priority: 80,
    maxAge: 1000 * 60 * 30, // 30 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  documents: {
    priority: 70,
    maxAge: 1000 * 60 * 60, // 1 hour
    syncOnLaunch: false,
    incrementalSync: true,
  },
  punch_items: {
    priority: 75,
    maxAge: 1000 * 60 * 30, // 30 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  checklists: {
    priority: 65,
    maxAge: 1000 * 60 * 60, // 1 hour
    syncOnLaunch: true,
    incrementalSync: false,
  },
  checklist_executions: {
    priority: 70,
    maxAge: 1000 * 60 * 30, // 30 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  contacts: {
    priority: 50,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    syncOnLaunch: false,
    incrementalSync: false,
  },
  safety_incidents: {
    priority: 95,
    maxAge: 1000 * 60 * 15, // 15 minutes
    syncOnLaunch: true,
    incrementalSync: true,
  },
  meetings: {
    priority: 60,
    maxAge: 1000 * 60 * 60, // 1 hour
    syncOnLaunch: false,
    incrementalSync: true,
  },
}

// ============================================================================
// Service Worker Registration
// ============================================================================

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

/**
 * Check if Background Sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return (
    isServiceWorkerSupported() &&
    'sync' in ServiceWorkerRegistration.prototype
  )
}

/**
 * Register the service worker and set up PWA functionality
 * This is called automatically by VitePWA, but we add additional configuration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('[ServiceWorker] Service workers not supported in this browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    console.info('[ServiceWorker] Ready with scope:', registration.scope)

    // Register for background sync if supported
    if (isBackgroundSyncSupported()) {
      try {
        await registration.sync.register('offline-sync')
        console.info('[ServiceWorker] Background sync registered')
      } catch (syncError) {
        console.warn('[ServiceWorker] Background sync registration failed:', syncError)
      }
    }

    return registration
  } catch (error) {
    console.error('[ServiceWorker] Registration failed:', error)
    return null
  }
}

/**
 * Request persistent storage for offline data
 * This prevents the browser from clearing IndexedDB under storage pressure
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false
  }

  try {
    const isPersisted = await navigator.storage.persisted()
    if (isPersisted) {
      console.info('[Storage] Storage is already persistent')
      return true
    }

    const granted = await navigator.storage.persist()
    console.info(`[Storage] Persistent storage ${granted ? 'granted' : 'denied'}`)
    return granted
  } catch (error) {
    console.error('[Storage] Error requesting persistent storage:', error)
    return false
  }
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  usage: number
  quota: number
  percentUsed: number
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null
  }

  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0

    return { usage, quota, percentUsed }
  } catch (error) {
    console.error('[Storage] Error getting storage quota:', error)
    return null
  }
}

// ============================================================================
// Realtime Subscriptions for Offline Sync
// ============================================================================

const realtimeChannels = new Map<string, RealtimeChannel>()

/**
 * Subscribe to realtime changes for a table
 * Used to keep offline cache in sync with server changes
 */
export function subscribeToTableChanges(
  table: OfflineSyncTable,
  projectId: string,
  onInsert?: (payload: unknown) => void,
  onUpdate?: (payload: unknown) => void,
  onDelete?: (payload: unknown) => void
): () => void {
  const channelName = `${table}:${projectId}`

  // Unsubscribe from existing channel if any
  const existingChannel = realtimeChannels.get(channelName)
  if (existingChannel) {
    supabase.removeChannel(existingChannel)
    realtimeChannels.delete(channelName)
  }

  // Create new channel subscription
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table,
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.info(`[Realtime] ${table} INSERT:`, payload)
        onInsert?.(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.info(`[Realtime] ${table} UPDATE:`, payload)
        onUpdate?.(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table,
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.info(`[Realtime] ${table} DELETE:`, payload)
        onDelete?.(payload.old)
      }
    )
    .subscribe()

  realtimeChannels.set(channelName, channel)

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
    realtimeChannels.delete(channelName)
  }
}

/**
 * Unsubscribe from all realtime channels
 * Call this when the user logs out or the app is closed
 */
export function unsubscribeFromAllChannels(): void {
  realtimeChannels.forEach((channel, name) => {
    supabase.removeChannel(channel)
    console.info(`[Realtime] Unsubscribed from ${name}`)
  })
  realtimeChannels.clear()
}
