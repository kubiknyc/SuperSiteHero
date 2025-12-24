// File: /src/features/punch-lists/components/PunchItemStatusBadge.tsx
// Display status and priority as colored badges for punch items

import { cn } from '@/lib/utils'
import type { PunchItemStatus, Priority } from '@/types/database'

interface PunchItemStatusBadgeProps {
  status: PunchItemStatus | string | null
  priority?: Priority | string | null
  className?: string
}

type ValidPunchItemStatus = 'open' | 'in_progress' | 'ready_for_review' | 'completed' | 'verified' | 'rejected'
type ValidPriority = 'low' | 'normal' | 'high'

// Status color mappings
const statusColors: Record<ValidPunchItemStatus, string> = {
  open: 'bg-muted text-foreground border-input',
  in_progress: 'bg-info-light text-blue-800 border-blue-300',
  ready_for_review: 'bg-warning-light text-yellow-800 border-yellow-300',
  completed: 'bg-success-light text-green-800 border-green-300',
  verified: 'bg-success text-white border-green-700',
  rejected: 'bg-error-light text-red-800 border-red-300',
}

// Status label mappings
const statusLabels: Record<ValidPunchItemStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  ready_for_review: 'Ready for Review',
  completed: 'Completed',
  verified: 'Verified',
  rejected: 'Rejected',
}

// Priority color mappings
const priorityColors: Record<ValidPriority, string> = {
  low: 'bg-success-light text-green-800 border-green-300',
  normal: 'bg-muted text-foreground border-input',
  high: 'bg-error-light text-red-800 border-red-300',
}

// Priority label mappings
const priorityLabels: Record<ValidPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export function PunchItemStatusBadge({
  status,
  priority,
  className,
}: PunchItemStatusBadgeProps) {
  // Handle null status gracefully
  const safeStatus = (status || 'open') as ValidPunchItemStatus

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status Badge */}
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
          statusColors[safeStatus]
        )}
      >
        {statusLabels[safeStatus]}
      </span>

      {/* Priority Badge (optional) */}
      {priority && (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
            priorityColors[priority as ValidPriority]
          )}
        >
          {priorityLabels[priority as ValidPriority]}
        </span>
      )}
    </div>
  )
}
