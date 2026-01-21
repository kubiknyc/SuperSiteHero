// File: /src/features/workflows/components/WorkflowItemStatusBadge.tsx
// Display status and priority as colored badges for workflow items
// Refactored to use unified StatusBadge component

import { StatusWithPriorityBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

interface WorkflowItemStatusBadgeProps {
  status: string
  priority?: string
  className?: string
}

export function WorkflowItemStatusBadge({
  status,
  priority,
  className,
}: WorkflowItemStatusBadgeProps) {
  return (
    <StatusWithPriorityBadge
      status={status}
      priority={priority}
      domain="workflow"
      className={cn(className)}
    />
  )
}
