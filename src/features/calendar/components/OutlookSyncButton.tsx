/**
 * OutlookSyncButton Component
 *
 * A button component to sync individual entities (meetings, inspections, etc.)
 * to Outlook Calendar.
 */

import React from 'react'
import { Calendar, Check, AlertCircle, RefreshCw, Unlink } from 'lucide-react'
import { useQuickOutlookSync } from '../hooks/useOutlookCalendar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { OutlookEntityType } from '@/types/outlook-calendar'

interface OutlookSyncButtonProps {
  entityType: OutlookEntityType
  entityId: string | undefined
  variant?: 'default' | 'outline' | 'ghost' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
  onSynced?: () => void
  onError?: (error: Error) => void
}

export function OutlookSyncButton({
  entityType,
  entityId,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className,
  onSynced,
  onError,
}: OutlookSyncButtonProps) {
  const {
    canSync,
    isConnected,
    isSynced,
    syncStatus,
    isLoading,
    sync,
    unsync,
    error,
  } = useQuickOutlookSync(entityType, entityId)

  const handleSync = async () => {
    try {
      await sync()
      onSynced?.()
    } catch (err) {
      onError?.(err as Error)
    }
  }

  const handleUnsync = async () => {
    try {
      await unsync()
    } catch (err) {
      onError?.(err as Error)
    }
  }

  // Not connected to Outlook
  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled
              className={cn('text-muted-foreground', className)}
            >
              <Calendar className="h-4 w-4" />
              {showLabel && <span className="ml-2">Outlook</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Connect Outlook Calendar in Settings to sync events
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Already synced - show dropdown with options
  if (isSynced) {
    return (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  className={cn('text-success hover:text-success-dark', className)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {showLabel && <span className="ml-2">Synced</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Synced to Outlook Calendar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSync} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleUnsync}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            <Unlink className="mr-2 h-4 w-4" />
            Remove from Outlook
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Sync failed
  if (syncStatus === 'failed') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleSync}
              disabled={isLoading || !canSync}
              className={cn('text-error hover:text-error-dark', className)}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {showLabel && <span className="ml-2">Retry Sync</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Sync failed. Click to retry.
            {error && <div className="text-xs text-red-300 mt-1">{error.message}</div>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Pending or not synced - show sync button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleSync}
            disabled={isLoading || !canSync}
            className={cn(
              syncStatus === 'pending' && 'text-warning hover:text-yellow-700',
              className
            )}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {showLabel && (
              <span className="ml-2">
                {syncStatus === 'pending' ? 'Pending...' : 'Sync to Outlook'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!canSync
            ? 'Sync not available for this item type'
            : syncStatus === 'pending'
            ? 'Sync pending...'
            : 'Add to Outlook Calendar'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default OutlookSyncButton
