/**
 * ConnectionStatus Component
 *
 * Shows the status of the realtime WebSocket connection:
 * - Connected (green): Active connection, receiving updates
 * - Connecting (yellow): Establishing connection
 * - Disconnected (red): No connection, auto-reconnecting
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '../../../lib/utils/logger';


type ConnectionState = 'connected' | 'connecting' | 'disconnected'

interface ConnectionStatusProps {
  /** Optional conversation ID to monitor specific channel */
  conversationId?: string
  /** Show as compact badge (no text) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

const STATUS_CONFIG = {
  connected: {
    icon: Wifi,
    text: 'Connected',
    className: 'text-success dark:text-success',
    dotClassName: 'bg-green-500',
  },
  connecting: {
    icon: Loader2,
    text: 'Connecting...',
    className: 'text-warning dark:text-warning',
    dotClassName: 'bg-warning',
    animate: true,
  },
  disconnected: {
    icon: WifiOff,
    text: 'Disconnected',
    className: 'text-error dark:text-error',
    dotClassName: 'bg-red-500',
  },
}

export function ConnectionStatus({
  conversationId,
  compact = false,
  className,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionState>('connecting')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Monitor connection status
  useEffect(() => {
    // Create a status monitoring channel
    const channelName = conversationId
      ? `status:${conversationId}`
      : 'status:global'

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    })

    // Handle status changes
    const handleStatusChange = (newStatus: string) => {
      switch (newStatus) {
        case 'SUBSCRIBED':
          setStatus('connected')
          setReconnectAttempt(0)
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          setStatus('disconnected')
          setReconnectAttempt((prev) => prev + 1)
          break
        default:
          setStatus('connecting')
      }
    }

    channel.subscribe((status, error) => {
      handleStatusChange(status)
      if (error) {
        logger.warn('Realtime connection error:', error)
      }
    })

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus('connecting')
      // Supabase will auto-reconnect
    }

    const handleOffline = () => {
      setStatus('disconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (!navigator.onLine) {
      setStatus('disconnected')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          config.className,
          className
        )}
        title={config.text}
      >
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            config.dotClassName,
            status === 'connecting' && 'animate-pulse'
          )}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        config.className,
        className
      )}
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5',
          'animate' in config && config.animate && 'animate-spin'
        )}
      />
      <span>{config.text}</span>
      {status === 'disconnected' && reconnectAttempt > 0 && (
        <span className="text-muted-foreground">
          (retry {reconnectAttempt})
        </span>
      )}
    </div>
  )
}

/**
 * Hook to get connection status
 * Use this if you need the status value in a parent component
 */
export function useConnectionStatus(conversationId?: string): ConnectionState {
  const [status, setStatus] = useState<ConnectionState>('connecting')
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channelName = conversationId
      ? `connection-status:${conversationId}`
      : 'connection-status:global'

    const channel = supabase.channel(channelName)

    channel.subscribe((subscribeStatus) => {
      switch (subscribeStatus) {
        case 'SUBSCRIBED':
          setStatus('connected')
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          setStatus('disconnected')
          break
        default:
          setStatus('connecting')
      }
    })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId])

  // Also listen for browser online/offline
  useEffect(() => {
    const handleOnline = () => setStatus('connecting')
    const handleOffline = () => setStatus('disconnected')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (!navigator.onLine) {
      setStatus('disconnected')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
