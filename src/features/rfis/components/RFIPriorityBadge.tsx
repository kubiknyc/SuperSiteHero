// File: /src/features/rfis/components/RFIPriorityBadge.tsx
// Display RFI priority level as colored badge

import { cn } from '@/lib/utils'

export type RFIPriority = 'low' | 'normal' | 'high'

export interface RFIPriorityBadgeProps {
  priority: RFIPriority
  className?: string
}

const priorityConfig: Record<RFIPriority, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-success-light text-green-800',
  },
  normal: {
    label: 'Normal',
    className: 'bg-amber-100 text-amber-800',
  },
  high: {
    label: 'High',
    className: 'bg-error-light text-red-800',
  },
}

/**
 * RFIPriorityBadge Component
 *
 * Displays RFI priority level with appropriate color coding
 *
 * @example
 * ```tsx
 * <RFIPriorityBadge priority="normal" />
 * <RFIPriorityBadge priority="high" className="ml-2" />
 * ```
 *
 * Accessibility:
 * - Uses semantic HTML with clear text labels
 * - Color is not the only indicator (text labels included)
 * - High contrast ratios for readability
 */
export function RFIPriorityBadge({ priority, className }: RFIPriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
      role="status"
      aria-label={`Priority: ${config.label}`}
    >
      {config.label}
    </span>
  )
}
