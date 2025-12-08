/**
 * QuickBooks Entity Sync Button
 *
 * A button to sync a single entity to QuickBooks, for use on entity detail pages.
 */

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
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Link,
  ExternalLink,
  MoreVertical,
} from 'lucide-react'
import { useQuickSync, useQBConnectionStatus } from '../hooks/useQuickBooks'
import { formatDistanceToNow } from 'date-fns'
import type { QBSyncStatus } from '@/types/quickbooks'

interface QBEntitySyncButtonProps {
  entityType: string
  entityId: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showStatus?: boolean
}

const STATUS_ICONS: Record<QBSyncStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  syncing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  synced: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  skipped: <Clock className="h-4 w-4 text-gray-400" />,
}

export function QBEntitySyncButton({
  entityType,
  entityId,
  size = 'default',
  variant = 'outline',
  showStatus = true,
}: QBEntitySyncButtonProps) {
  const { data: connectionStatus } = useQBConnectionStatus()
  const { canSync, isSynced, syncStatus, isLoading, sync, error } = useQuickSync(
    entityType,
    entityId
  )

  // Not connected to QuickBooks
  if (!connectionStatus?.isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size={size} disabled className="text-muted-foreground">
              <Link className="h-4 w-4 mr-2" />
              QuickBooks
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connect to QuickBooks in Settings to enable sync</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Connection needs attention
  if (connectionStatus.needsReauth || connectionStatus.isTokenExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size} disabled className="text-yellow-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              QB Sync
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {connectionStatus.needsReauth
                ? 'QuickBooks needs re-authorization'
                : 'QuickBooks token expired'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const handleSync = async () => {
    try {
      await sync()
    } catch (err) {
      console.error('Sync failed:', err)
    }
  }

  // Synced entity with more options
  if (isSynced && showStatus) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Synced to QB
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSync} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Re-sync to QuickBooks
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="h-4 w-4 mr-2" />
              View in QuickBooks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Main sync button
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={!canSync || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Syncing...
          </>
        ) : syncStatus === 'failed' ? (
          <>
            <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
            Retry Sync
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync to QB
          </>
        )}
      </Button>

      {showStatus && syncStatus && !isSynced && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              {STATUS_ICONS[syncStatus]}
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">{syncStatus}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

/**
 * Compact sync status indicator (for tables/lists)
 */
interface QBSyncStatusIndicatorProps {
  entityType: string
  entityId: string
}

export function QBSyncStatusIndicator({ entityType, entityId }: QBSyncStatusIndicatorProps) {
  const { data: connectionStatus } = useQBConnectionStatus()
  const { isSynced, syncStatus, isLoading } = useQuickSync(entityType, entityId)

  if (!connectionStatus?.isConnected) return null

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  if (!syncStatus) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {STATUS_ICONS[syncStatus]}
        </TooltipTrigger>
        <TooltipContent>
          <p>
            QuickBooks: <span className="capitalize">{syncStatus}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
