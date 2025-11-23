// File: /src/features/documents/components/DocumentStatusBadge.tsx
// Colored badge component for document status

import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types/database'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
  className?: string
}

type ValidDocumentStatus = 'current' | 'superseded' | 'archived' | 'void'

// Status display labels (capitalize first letter)
const STATUS_LABELS: Record<ValidDocumentStatus, string> = {
  current: 'Current',
  superseded: 'Superseded',
  archived: 'Archived',
  void: 'Void',
}

// Status color classes using Tailwind
const STATUS_COLORS: Record<ValidDocumentStatus, string> = {
  current: 'bg-green-100 text-green-800 border-green-200',
  superseded: 'bg-amber-100 text-amber-800 border-amber-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
  void: 'bg-red-100 text-red-800 border-red-200',
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
  // Handle null status gracefully
  if (!status) {
    return (
      <Badge variant="outline" className={cn('bg-gray-100 text-gray-800', className)}>
        Unknown
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        STATUS_COLORS[status as ValidDocumentStatus],
        'font-medium',
        className
      )}
    >
      {STATUS_LABELS[status as ValidDocumentStatus]}
    </Badge>
  )
}
