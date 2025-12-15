// File: src/lib/realtime/client.ts
// Singleton manager for Supabase Realtime channels

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type {
  ConnectionState,
  ChannelState,
  SubscriptionOptions,
  RealtimeTable,
} from './types'

type ConnectionChangeCallback = (state: ConnectionState) => void
type ErrorCallback = (error: Error) => void

class RealtimeManager {
  private static instance: RealtimeManager
  private channels: Map<string, ChannelState> = new Map()
  private connectionState: ConnectionState = 'disconnected'
  private connectionListeners: Set<ConnectionChangeCallback> = new Set()
  private errorListeners: Set<ErrorCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  private constructor() {
    this.setupConnectionMonitoring()
  }

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  private setupConnectionMonitoring(): void {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  private handleOnline(): void {
    if (this.connectionState === 'disconnected') {
      this.setConnectionState('reconnecting')
      this.reconnectAllChannels()
    }
  }

  private handleOffline(): void {
    this.setConnectionState('disconnected')
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.connectionListeners.forEach((cb) => cb(state))
    }
  }

  private emitError(error: Error): void {
    this.errorListeners.forEach((cb) => cb(error))
  }

  private getChannelKey(table: string, filter?: string): string {
    return filter ? `${table}:${filter}` : table
  }

  private async reconnectAllChannels(): Promise<void> {
    this.reconnectAttempts++

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.setConnectionState('disconnected')
      this.emitError(new Error('Max reconnection attempts reached'))
      return
    }

    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts))

    for (const [key, state] of Array.from(this.channels.entries())) {
      try {
        await state.channel.subscribe()
      } catch (error) {
        console.error(`Failed to reconnect channel ${key}:`, error)
      }
    }

    this.reconnectAttempts = 0
    this.setConnectionState('connected')
  }

  // Subscribe to database changes for a table
  subscribeToTable<T = Record<string, unknown>>(
    options: SubscriptionOptions<T>
  ): () => void {
    const { table, schema = 'public', filter, onInsert, onUpdate, onDelete, onError } = options
    const channelKey = this.getChannelKey(table, filter)

    // Check if channel already exists
    const existing = this.channels.get(channelKey)
    if (existing) {
      existing.subscriptionCount++
      return () => this.unsubscribeFromTable(channelKey)
    }

    // Create new channel
    const channelName = `realtime:${channelKey}`
    let channel: RealtimeChannel

    if (filter) {
      channel = supabase.channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema, table, filter },
          (payload) => this.handlePayload(payload, { onInsert, onUpdate, onDelete })
        )
    } else {
      channel = supabase.channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema, table },
          (payload) => this.handlePayload(payload, { onInsert, onUpdate, onDelete })
        )
    }

    // Subscribe and handle connection state
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.setConnectionState('connected')
      } else if (status === 'CHANNEL_ERROR') {
        const error = new Error(`Channel error for ${table}`)
        this.emitError(error)
        onError?.(error)
      } else if (status === 'TIMED_OUT') {
        this.setConnectionState('reconnecting')
      }
    })

    this.channels.set(channelKey, {
      channel,
      subscriptionCount: 1,
      table,
    })

    return () => this.unsubscribeFromTable(channelKey)
  }

  private handlePayload<T>(
    payload: { eventType: string; new: unknown; old: unknown },
    callbacks: {
      onInsert?: (record: T) => void
      onUpdate?: (newRecord: T, oldRecord: T) => void
      onDelete?: (oldRecord: T) => void
    }
  ): void {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const { onInsert, onUpdate, onDelete } = callbacks

    switch (eventType) {
      case 'INSERT':
        onInsert?.(newRecord as T)
        break
      case 'UPDATE':
        onUpdate?.(newRecord as T, oldRecord as T)
        break
      case 'DELETE':
        onDelete?.(oldRecord as T)
        break
    }
  }

  private unsubscribeFromTable(channelKey: string): void {
    const state = this.channels.get(channelKey)
    if (!state) {return}

    state.subscriptionCount--

    if (state.subscriptionCount <= 0) {
      state.channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }

  // Create a presence channel for a room
  createPresenceChannel(roomId: string): RealtimeChannel {
    const channelKey = `presence:${roomId}`
    const existing = this.channels.get(channelKey)

    if (existing) {
      existing.subscriptionCount++
      return existing.channel
    }

    const channel = supabase.channel(roomId, {
      config: {
        presence: {
          key: roomId,
        },
      },
    })

    this.channels.set(channelKey, {
      channel,
      subscriptionCount: 1,
      roomId,
    })

    return channel
  }

  // Remove a presence channel
  removePresenceChannel(roomId: string): void {
    const channelKey = `presence:${roomId}`
    const state = this.channels.get(channelKey)
    if (!state) {return}

    state.subscriptionCount--

    if (state.subscriptionCount <= 0) {
      state.channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }

  // Connection state management
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  onConnectionChange(callback: ConnectionChangeCallback): () => void {
    this.connectionListeners.add(callback)
    // Immediately call with current state
    callback(this.connectionState)
    return () => this.connectionListeners.delete(callback)
  }

  onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }

  // Check if a table supports realtime
  isRealtimeTable(table: string): table is RealtimeTable {
    const realtimeTables: string[] = [
      'daily_reports',
      'workflow_items',
      'documents',
      'approval_requests',
      'approval_actions',
      'projects',
      'tasks',
      'messages',
    ]
    return realtimeTables.includes(table)
  }

  // Cleanup all channels
  dispose(): void {
    for (const [, state] of Array.from(this.channels.entries())) {
      state.channel.unsubscribe()
    }
    this.channels.clear()
    this.connectionListeners.clear()
    this.errorListeners.clear()
    this.setConnectionState('disconnected')
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance()

// Export class for testing
export { RealtimeManager }
