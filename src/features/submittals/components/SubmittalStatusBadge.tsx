// File: /src/features/submittals/components/SubmittalStatusBadge.tsx
// Display status as a colored badge for submittals
// Refactored to use unified StatusBadge component

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

interface SubmittalStatusBadgeProps {
  status: string
  className?: string
}

export function SubmittalStatusBadge({ status, className }: SubmittalStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="submittal"
      className={cn(className)}
    />
  )
}
