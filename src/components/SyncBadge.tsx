/**
 * SyncBadge - Per-item sync status indicator
 * Shows sync status badges for individual list items
 */

import { CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SyncBadgeStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';

export interface SyncBadgeProps {
  status: SyncBadgeStatus;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  errorMessage?: string;
}

const statusConfig = {
  synced: {
    icon: Check,
    label: 'Synced',
    className: 'text-success bg-success-light border-green-200',
    iconClassName: 'text-success',
  },
  pending: {
    icon: CloudOff,
    label: 'Pending sync',
    className: 'text-warning bg-warning-light border-yellow-200',
    iconClassName: 'text-warning',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing...',
    className: 'text-primary bg-blue-50 border-blue-200',
    iconClassName: 'text-primary animate-spin',
  },
  error: {
    icon: AlertTriangle,
    label: 'Sync failed',
    className: 'text-error bg-error-light border-red-200',
    iconClassName: 'text-error',
  },
  conflict: {
    icon: AlertTriangle,
    label: 'Conflict',
    className: 'text-orange-600 bg-orange-50 border-orange-200',
    iconClassName: 'text-orange-600',
  },
};

const sizeConfig = {
  sm: {
    iconSize: 'w-3 h-3',
    padding: 'px-1.5 py-0.5',
    text: 'text-xs',
  },
  md: {
    iconSize: 'w-4 h-4',
    padding: 'px-2 py-1',
    text: 'text-sm',
  },
  lg: {
    iconSize: 'w-5 h-5',
    padding: 'px-3 py-1.5',
    text: 'text-base',
  },
};

export function SyncBadge({
  status,
  className,
  showLabel = false,
  size = 'sm',
  errorMessage,
}: SyncBadgeProps) {
  const config = statusConfig[status];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        config.className,
        sizeStyle.padding,
        className
      )}
      title={errorMessage || config.label}
    >
      <Icon className={cn(sizeStyle.iconSize, config.iconClassName)} />
      {showLabel && (
        <span className={cn('font-medium', sizeStyle.text)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export interface SyncBadgeListProps {
  items: Array<{
    id: string;
    syncStatus: SyncBadgeStatus;
  }>;
  onItemClick?: (id: string) => void;
}

/**
 * Helper component to show sync badges in a list
 */
export function SyncBadgeList({ items }: SyncBadgeListProps) {
  const pendingCount = items.filter(i => i.syncStatus === 'pending').length;
  const errorCount = items.filter(i => i.syncStatus === 'error').length;
  const conflictCount = items.filter(i => i.syncStatus === 'conflict').length;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {pendingCount > 0 && (
        <span className="text-warning">
          {pendingCount} pending
        </span>
      )}
      {errorCount > 0 && (
        <span className="text-error">
          {errorCount} failed
        </span>
      )}
      {conflictCount > 0 && (
        <span className="text-orange-600">
          {conflictCount} conflicts
        </span>
      )}
    </div>
  );
}

export default SyncBadge;
