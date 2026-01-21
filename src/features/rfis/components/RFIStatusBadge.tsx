// File: /src/features/rfis/components/RFIStatusBadge.tsx
// Display RFI status as colored badge with proper styling
// Refactored to use unified StatusBadge component

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

export type RFIStatus = 'pending' | 'submitted' | 'answered' | 'approved' | 'rejected' | 'closed' | 'overdue'

export interface RFIStatusBadgeProps {
  status: RFIStatus | string
  className?: string
}

/**
 * RFIStatusBadge Component
 *
 * Displays RFI workflow status with appropriate color coding
 *
 * @example
 * ```tsx
 * <RFIStatusBadge status="submitted" />
 * <RFIStatusBadge status="approved" className="ml-2" />
 * ```
 *
 * Accessibility:
 * - Uses semantic HTML with clear text labels
 * - Color is not the only indicator (text labels included)
 * - High contrast ratios for readability
 */
export function RFIStatusBadge({ status, className }: RFIStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="rfi"
      shape="pill"
      className={cn(className)}
    />
  )
}
