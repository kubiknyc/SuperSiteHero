// File: /src/features/punch-lists/components/PunchItemStatusBadge.tsx
// Display status and priority as colored badges for punch items

import { cn } from '@/lib/utils'
import type { PunchItemStatus, Priority } from '@/types/database'

interface PunchItemStatusBadgeProps {
  status: PunchItemStatus
  priority?: Priority
  className?: string
}

// Status color mappings
const statusColors: Record<PunchItemStatus, string> = {
  open: 'bg-gray-100 text-gray-800 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  ready_for_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  verified: 'bg-green-600 text-white border-green-700',
  rejected: 'bg-red-100 text-red-800 border-red-300',
}

// Status label mappings
const statusLabels: Record<PunchItemStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  ready_for_review: 'Ready for Review',
  completed: 'Completed',
  verified: 'Verified',
  rejected: 'Rejected',
}

// Priority color mappings
const priorityColors: Record<Priority, string> = {
  low: 'bg-green-100 text-green-800 border-green-300',
  normal: 'bg-gray-100 text-gray-800 border-gray-300',
  high: 'bg-red-100 text-red-800 border-red-300',
}

// Priority label mappings
const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export function PunchItemStatusBadge({
  status,
  priority,
  className,
}: PunchItemStatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status Badge */}
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
          statusColors[status]
        )}
      >
        {statusLabels[status]}
      </span>

      {/* Priority Badge (optional) */}
      {priority && (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
            priorityColors[priority]
          )}
        >
          {priorityLabels[priority]}
        </span>
      )}
    </div>
  )
}
