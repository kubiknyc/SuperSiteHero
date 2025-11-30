/**
 * Material Receiving Status Badge Component
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaterialStatus } from '@/types/material-receiving'
import { MATERIAL_STATUSES } from '@/types/material-receiving'

interface StatusBadgeProps {
  status: MaterialStatus
  className?: string
}

const statusColors: Record<MaterialStatus, string> = {
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  inspected: 'bg-purple-100 text-purple-800 border-purple-200',
  stored: 'bg-green-100 text-green-800 border-green-200',
  issued: 'bg-orange-100 text-orange-800 border-orange-200',
  returned: 'bg-gray-100 text-gray-800 border-gray-200',
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
