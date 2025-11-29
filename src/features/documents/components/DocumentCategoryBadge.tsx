// File: /src/features/documents/components/DocumentCategoryBadge.tsx
// Badge component for document AI-detected category

import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DocumentCategoryType } from '@/types/document-ai'

interface DocumentCategoryBadgeProps {
  category: DocumentCategoryType | null | undefined
  confidence?: number
  showConfidence?: boolean
  className?: string
}

// Category display labels
const CATEGORY_LABELS: Record<DocumentCategoryType, string> = {
  drawing: 'Drawing',
  specification: 'Specification',
  contract: 'Contract',
  submittal: 'Submittal',
  rfi: 'RFI',
  change_order: 'Change Order',
  meeting_minutes: 'Meeting Minutes',
  invoice: 'Invoice',
  report: 'Report',
  correspondence: 'Correspondence',
  photo: 'Photo',
  permit: 'Permit',
  schedule: 'Schedule',
  safety_report: 'Safety Report',
  inspection: 'Inspection',
  insurance: 'Insurance',
  other: 'Other',
}

// Category color classes using Tailwind
const CATEGORY_COLORS: Record<DocumentCategoryType, string> = {
  drawing: 'bg-blue-100 text-blue-800 border-blue-200',
  specification: 'bg-purple-100 text-purple-800 border-purple-200',
  contract: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  submittal: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  rfi: 'bg-orange-100 text-orange-800 border-orange-200',
  change_order: 'bg-amber-100 text-amber-800 border-amber-200',
  meeting_minutes: 'bg-slate-100 text-slate-800 border-slate-200',
  invoice: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  report: 'bg-teal-100 text-teal-800 border-teal-200',
  correspondence: 'bg-sky-100 text-sky-800 border-sky-200',
  photo: 'bg-pink-100 text-pink-800 border-pink-200',
  permit: 'bg-lime-100 text-lime-800 border-lime-200',
  schedule: 'bg-violet-100 text-violet-800 border-violet-200',
  safety_report: 'bg-red-100 text-red-800 border-red-200',
  inspection: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  insurance: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
}

// Category icons (using emoji for simplicity, could use Lucide icons)
const CATEGORY_ICONS: Record<DocumentCategoryType, string> = {
  drawing: '📐',
  specification: '📋',
  contract: '📄',
  submittal: '📦',
  rfi: '❓',
  change_order: '🔄',
  meeting_minutes: '📝',
  invoice: '💰',
  report: '📊',
  correspondence: '✉️',
  photo: '📷',
  permit: '📜',
  schedule: '📅',
  safety_report: '⚠️',
  inspection: '🔍',
  insurance: '🛡️',
  other: '📁',
}

/**
 * DocumentCategoryBadge Component
 *
 * Displays a colored badge for document category with AI confidence score.
 *
 * Usage:
 * ```tsx
 * <DocumentCategoryBadge category="drawing" confidence={0.95} showConfidence />
 * <DocumentCategoryBadge category="contract" />
 * ```
 */
export function DocumentCategoryBadge({
  category,
  confidence,
  showConfidence = false,
  className,
}: DocumentCategoryBadgeProps) {
  // Handle null/undefined category
  if (!category) {
    return (
      <Badge variant="outline" className={cn('bg-gray-100 text-gray-500', className)}>
        Uncategorized
      </Badge>
    )
  }

  const label = CATEGORY_LABELS[category] || category
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.other

  return (
    <Badge variant="outline" className={cn(colorClass, 'font-medium gap-1', className)}>
      <span className="text-xs">{icon}</span>
      <span>{label}</span>
      {showConfidence && confidence !== undefined && (
        <span className="ml-1 opacity-70 text-[10px]">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </Badge>
  )
}

/**
 * Get the category icon for use elsewhere
 */
export function getCategoryIcon(category: DocumentCategoryType): string {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.other
}

/**
 * Get the category label for use elsewhere
 */
export function getCategoryLabel(category: DocumentCategoryType): string {
  return CATEGORY_LABELS[category] || category
}
