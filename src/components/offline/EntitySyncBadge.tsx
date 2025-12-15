// File: /src/components/offline/EntitySyncBadge.tsx
// Small badge component showing sync status for individual entities

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type EntitySyncStatus = 'queued' | 'syncing' | 'synced' | 'error';

interface EntitySyncBadgeProps {
  status: EntitySyncStatus;
  lastSyncTime?: number | null;
  error?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Entity sync badge component
 * Shows sync status for individual list items
 * Features:
 * - Color-coded badges (yellow/queued, blue/syncing, green/synced, red/error)
 * - Tooltip with detailed information
 * - Compact mode for smaller displays
 */
export function EntitySyncBadge({
  status,
  lastSyncTime,
  error,
  className,
  compact = false,
}: EntitySyncBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'queued':
        return {
          icon: Clock,
          label: 'Pending sync',
          className: 'bg-amber-100 text-amber-700 border-amber-300',
          tooltip: 'This item is queued for synchronization',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Syncing',
          className: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
          iconClassName: 'animate-spin',
          tooltip: 'Currently syncing with server',
        };
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          className: 'bg-green-100 text-green-700 border-green-300',
          tooltip: lastSyncTime
            ? `Synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`
            : 'Synced with server',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync failed',
          className: 'bg-red-100 text-red-700 border-red-300',
          tooltip: error || 'Sync failed - will retry automatically',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex h-2 w-2 rounded-full',
                status === 'queued' && 'bg-amber-500',
                status === 'syncing' && 'bg-blue-500 animate-pulse',
                status === 'synced' && 'bg-green-500',
                status === 'error' && 'bg-red-500',
                className
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('text-xs', config.className, className)}
          >
            <Icon className={cn('h-3 w-3 mr-1', config.iconClassName)} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-medium">{config.tooltip}</p>
            {error && (
              <p className="text-xs text-muted-foreground">{error}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
