// File: /src/features/punch-lists/components/PunchItemStatusBadge.tsx
// Display status and priority as colored badges for punch items
// Refactored to use unified StatusBadge component

import { StatusWithPriorityBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { PunchItemStatus, Priority } from '@/types/database'

interface PunchItemStatusBadgeProps {
  status: PunchItemStatus | string | null
  priority?: Priority | string | null
  className?: string
}

export function PunchItemStatusBadge({
  status,
  priority,
  className,
}: PunchItemStatusBadgeProps) {
  return (
    <StatusWithPriorityBadge
      status={status}
      priority={priority}
      domain="punch"
      className={cn(className)}
    />
  )
}
