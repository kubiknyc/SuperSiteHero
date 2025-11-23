// File: /src/features/rfis/components/RFIStatusBadge.tsx
// Display RFI status as colored badge with proper styling

import { cn } from '@/lib/utils'

export type RFIStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'closed'

export interface RFIStatusBadgeProps {
  status: RFIStatus
  className?: string
}

const statusConfig: Record<RFIStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-800',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
  closed: {
    label: 'Closed',
    className: 'bg-slate-100 text-slate-800',
  },
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
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  )
}
