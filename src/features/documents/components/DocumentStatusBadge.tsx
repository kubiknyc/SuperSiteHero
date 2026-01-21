// File: /src/features/documents/components/DocumentStatusBadge.tsx
// Colored badge component for document status
// Refactored to use unified StatusBadge component

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types/database'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
  className?: string
}

/**
 * DocumentStatusBadge Component
 *
 * Displays a colored badge for document status with appropriate styling.
 *
 * Status Colors:
 * - current: Green (document is active and current)
 * - superseded: Amber/Yellow (document has been replaced)
 * - archived: Gray (document is archived)
 * - void: Red (document is void/invalid)
 *
 * Usage:
 * ```tsx
 * <DocumentStatusBadge status="current" />
 * <DocumentStatusBadge status="superseded" className="text-sm" />
 * ```
 */
export function DocumentStatusBadge({
  status,
  className,
}: DocumentStatusBadgeProps) {
  if (!status) {
    return (
      <StatusBadge
        status="unknown"
        domain="general"
        className={cn(className)}
      />
    )
  }

  return (
    <StatusBadge
      status={status}
      domain="document"
      className={cn(className)}
    />
  )
}
