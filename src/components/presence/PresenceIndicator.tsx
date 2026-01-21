// File: src/components/presence/PresenceIndicator.tsx
// Simple online/offline status indicator dot

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

interface PresenceIndicatorProps {
  status: PresenceStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  userName?: string
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-success dark:bg-success',
  away: 'bg-warning dark:bg-warning',
  busy: 'bg-destructive dark:bg-destructive',
  offline: 'bg-muted-foreground dark:bg-muted-foreground',
}

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Do not disturb',
  offline: 'Offline',
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

/**
 * Simple status indicator dot
 *
 * @example
 * ```tsx
 * <PresenceIndicator status="online" />
 * <PresenceIndicator status="away" showLabel />
 * ```
 */
export function PresenceIndicator({
  status,
  size = 'md',
  showLabel = false,
  className,
  userName,
}: PresenceIndicatorProps) {
  const indicator = (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses[size],
          statusColors[status],
          status === 'online' && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-sm text-secondary dark:text-disabled">
          {statusLabels[status]}
        </span>
      )}
    </div>
  )

  if (!userName) {return indicator}

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <p>
            {userName} - {statusLabels[status]}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default PresenceIndicator
