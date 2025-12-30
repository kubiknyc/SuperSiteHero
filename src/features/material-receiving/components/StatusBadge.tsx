/**
 * Material Receiving Status Badge Component
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MATERIAL_STATUSES, type MaterialStatus } from '@/types/material-receiving'

interface StatusBadgeProps {
  status: MaterialStatus
  className?: string
}

const statusColors: Record<MaterialStatus, string> = {
  received: 'bg-info-light text-blue-800 border-blue-200',
  inspected: 'bg-purple-100 text-purple-800 border-purple-200',
  stored: 'bg-success-light text-green-800 border-green-200',
  issued: 'bg-orange-100 text-orange-800 border-orange-200',
  returned: 'bg-muted text-foreground border-border',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = MATERIAL_STATUSES.find((s) => s.value === status)
  const label = statusConfig?.label || status

  return (
    <Badge variant="outline" className={cn(statusColors[status], className)}>
      {label}
    </Badge>
  )
}

export default StatusBadge
