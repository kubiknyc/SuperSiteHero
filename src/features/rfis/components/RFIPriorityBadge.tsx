// File: /src/features/rfis/components/RFIPriorityBadge.tsx
// Display RFI priority level as colored badge
// Refactored to use unified PriorityBadge component

import { PriorityBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

export type RFIPriority = 'low' | 'normal' | 'high'

export interface RFIPriorityBadgeProps {
  priority: RFIPriority
  className?: string
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
  return (
    <PriorityBadge
      priority={priority}
      shape="pill"
      className={cn(className)}
    />
  )
}
