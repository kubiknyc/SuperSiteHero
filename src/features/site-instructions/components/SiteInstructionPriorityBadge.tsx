// File: /src/features/site-instructions/components/SiteInstructionPriorityBadge.tsx
// Priority badge for site instructions
// Refactored to use unified PriorityBadge component

import { PriorityBadge } from '@/components/ui/status-badge'
import type { SiteInstructionPriority } from '@/types/database'

interface SiteInstructionPriorityBadgeProps {
  priority: SiteInstructionPriority | string | null | undefined
}

export function SiteInstructionPriorityBadge({ priority }: SiteInstructionPriorityBadgeProps) {
  if (!priority) {
    return null
  }

  return (
    <PriorityBadge
      priority={priority}
    />
  )
}
