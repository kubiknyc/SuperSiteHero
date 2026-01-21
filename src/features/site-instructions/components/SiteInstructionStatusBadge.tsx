// File: /src/features/site-instructions/components/SiteInstructionStatusBadge.tsx
// Status badge for site instructions
// Refactored to use unified StatusBadge component

import { StatusBadge } from '@/components/ui/status-badge'
import type { SiteInstructionStatus } from '@/types/database'

interface SiteInstructionStatusBadgeProps {
  status: SiteInstructionStatus | string | null | undefined
}

export function SiteInstructionStatusBadge({ status }: SiteInstructionStatusBadgeProps) {
  if (!status) {
    return null
  }

  return (
    <StatusBadge
      status={status}
      domain="site_instruction"
    />
  )
}
