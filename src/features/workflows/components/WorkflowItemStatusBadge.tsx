// File: /src/features/workflows/components/WorkflowItemStatusBadge.tsx
// Display status and priority as colored badges for workflow items

import { cn } from '@/lib/utils'

interface WorkflowItemStatusBadgeProps {
  status: string
  priority?: string
  className?: string
}

// Status color mappings
const statusColors: Record<string, string> = {
  open: 'bg-info-light text-blue-800 border-blue-300',
  in_progress: 'bg-warning-light text-yellow-800 border-yellow-300',
  pending_review: 'bg-purple-100 text-purple-800 border-purple-300',
  approved: 'bg-success-light text-green-800 border-green-300',
  rejected: 'bg-error-light text-red-800 border-red-300',
  closed: 'bg-muted text-foreground border-input',
}

// Status label mappings
const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
}

// Priority color mappings
const priorityColors: Record<string, string> = {
  low: 'bg-success-light text-green-800 border-green-300',
  medium: 'bg-warning-light text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-error-light text-red-800 border-red-300',
}

// Priority label mappings
const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export function WorkflowItemStatusBadge({
  status,
  priority,
  className,
}: WorkflowItemStatusBadgeProps) {
  const statusColor = statusColors[status] || statusColors.open
  const statusLabel = statusLabels[status] || status

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status Badge */}
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
          statusColor
        )}
      >
        {statusLabel}
      </span>

      {/* Priority Badge (optional) */}
      {priority && (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
            priorityColors[priority] || priorityColors.medium
          )}
        >
          {priorityLabels[priority] || priority}
        </span>
      )}
    </div>
  )
}
