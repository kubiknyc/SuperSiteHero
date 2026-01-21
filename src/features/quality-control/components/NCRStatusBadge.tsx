/**
 * NCR Status Badge Component
 *
 * Displays the status of a Non-Conformance Report with appropriate styling.
 * Status values match migration 155: open, under_review, corrective_action, verification, resolved, closed, voided
 * Refactored to use unified StatusBadge component
 */

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { NCRStatus } from '@/types/quality-control'

interface NCRStatusBadgeProps {
  status: NCRStatus | string
  className?: string
}

export function NCRStatusBadge({ status, className }: NCRStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="ncr"
      className={cn(className)}
    />
  )
}
