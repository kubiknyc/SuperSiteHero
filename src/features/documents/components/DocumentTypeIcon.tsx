// File: /src/features/documents/components/DocumentTypeIcon.tsx
// Icon component for document types

import { FileText, Send, Copy, File, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentType } from '@/types/database'

interface DocumentTypeIconProps {
  type: DocumentType
  className?: string
}

/**
 * DocumentTypeIcon Component
 *
 * Displays an appropriate icon for the document type using lucide-react icons.
 *
 * Icon Mapping:
 * - drawing: FileText
 * - specification: FileText
 * - submittal: Send
 * - shop_drawing: FileText (with special styling)
 * - scope: Copy
 * - general: File
 * - photo: Image
 * - other: File
 *
 * Usage:
 * ```tsx
 * <DocumentTypeIcon type="drawing" />
 * <DocumentTypeIcon type="photo" className="w-6 h-6 text-primary" />
 * ```
 */
export function DocumentTypeIcon({
  type,
  className,
}: DocumentTypeIconProps) {
  const iconClassName = cn('w-5 h-5', className)

  switch (type) {
    case 'drawing':
      return <FileText className={iconClassName} />

    case 'specification':
      return <FileText className={iconClassName} />

    case 'submittal':
      return <Send className={iconClassName} />

    case 'shop_drawing':
      return <FileText className={iconClassName} />

    case 'scope':
      return <Copy className={iconClassName} />

    case 'general':
      return <File className={iconClassName} />

    case 'photo':
      return <Image className={iconClassName} />

    case 'other':
      return <File className={iconClassName} />

    default:
      return <File className={iconClassName} />
  }
}
