// File: src/components/realtime/ConnectionStatus.tsx
// Component to display realtime connection status

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useRealtimeConnectionState } from '@/hooks/useRealtimeSubscription'
import type { ConnectionState } from '@/lib/realtime'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface ConnectionStatusProps {
  showLabel?: boolean
  className?: string
  /** Position in the UI */
  variant?: 'inline' | 'floating'
}

const statusConfig: Record<
  ConnectionState,
  { color: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  connected: {
    color: 'text-success',
    label: 'Connected',
    icon: Wifi,
  },
  connecting: {
    color: 'text-warning',
    label: 'Connecting...',
    icon: Loader2,
  },
  reconnecting: {
    color: 'text-warning',
    label: 'Reconnecting...',
    icon: Loader2,
  },
  disconnected: {
    color: 'text-disabled',
    label: 'Offline',
    icon: WifiOff,
  },
}

/**
 * Display the current realtime connection status
 *
 * @example
 * ```tsx
 * // In header
 * <ConnectionStatus />
 *
 * // With label
 * <ConnectionStatus showLabel />
 *
 * // Floating badge
 * <ConnectionStatus variant="floating" />
 * ```
 */
export function ConnectionStatus({
  showLabel = false,
  className,
  variant = 'inline',
}: ConnectionStatusProps) {
  const connectionState = useRealtimeConnectionState()
  const config = statusConfig[connectionState]
  const Icon = config.icon
  const isLoading = connectionState === 'connecting' || connectionState === 'reconnecting'

  const content = (
    <div
      className={cn(
        'flex items-center gap-1.5',
        variant === 'floating' &&
          'fixed bottom-4 right-4 rounded-full bg-card dark:bg-surface px-3 py-1.5 shadow-lg border border-border dark:border-gray-700',
        className
      )}
    >
      <Icon
        className={cn('h-4 w-4', config.color, isLoading && 'animate-spin')}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={cn('text-sm', config.color)}>{config.label}</span>
      )}
    </div>
  )

  if (showLabel) {return content}

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Banner shown when disconnected from realtime
 */
export function ConnectionBanner() {
  const connectionState = useRealtimeConnectionState()

  if (connectionState === 'connected') {return null}

  const config = statusConfig[connectionState]

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white',
        connectionState === 'disconnected' ? 'bg-gray-600' : 'bg-warning'
      )}
    >
      <config.icon
        className={cn(
          'h-4 w-4',
          (connectionState === 'connecting' || connectionState === 'reconnecting') &&
            'animate-spin'
        )}
      />
      <span>{config.label}</span>
    </div>
  )
}

export default ConnectionStatus
