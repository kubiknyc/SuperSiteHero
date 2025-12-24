/**
 * QuickBooks Sync Status Badge
 */

import { Badge } from '@/components/ui/badge'
import type { QBSyncStatus } from '@/types/quickbooks'
import { getSyncStatusConfig } from '@/types/quickbooks'

interface QBSyncStatusBadgeProps {
  status: QBSyncStatus | null | undefined
  size?: 'sm' | 'md'
}

export function QBSyncStatusBadge({ status, size = 'md' }: QBSyncStatusBadgeProps) {
  if (!status) {return null}

  const config = getSyncStatusConfig(status)

  const colorMap: Record<string, string> = {
    gray: 'bg-muted text-foreground border-input',
    blue: 'bg-info-light text-blue-800 border-blue-300',
    green: 'bg-success-light text-green-800 border-green-300',
    red: 'bg-error-light text-red-800 border-red-300',
    yellow: 'bg-warning-light text-yellow-800 border-yellow-300',
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <Badge
      variant="outline"
      className={`${colorMap[config.color]} ${sizeClasses} font-medium`}
    >
      {config.label}
    </Badge>
  )
}
