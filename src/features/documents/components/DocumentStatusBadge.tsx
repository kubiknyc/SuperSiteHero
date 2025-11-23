// File: /src/features/documents/components/DocumentStatusBadge.tsx
// Colored badge component for document status

import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types/database'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
  className?: string
}

// Status display labels (capitalize first letter)
const STATUS_LABELS: Record<DocumentStatus, string> = {
  current: 'Current',
  superseded: 'Superseded',
  archived: 'Archived',
  void: 'Void',
}

// Status color classes using Tailwind
const STATUS_COLORS: Record<DocumentStatus, string> = {
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
  return (
    <Badge
      variant="outline"
      className={cn(
        STATUS_COLORS[status],
        'font-medium',
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
