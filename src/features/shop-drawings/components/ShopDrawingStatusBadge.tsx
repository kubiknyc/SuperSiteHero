// File: /src/features/shop-drawings/components/ShopDrawingStatusBadge.tsx
// Display shop drawing status and priority as colored badges

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Lock, AlertTriangle } from 'lucide-react'
import type { SubmittalReviewStatus } from '@/types/database'
import { isShopDrawingLocked } from '../hooks/useShopDrawings'
import type { ShopDrawingPriority } from '@/types/submittal'

// Status color mappings
const statusColors: Record<string, string> = {
  not_submitted: 'bg-muted text-muted-foreground border-input',
  submitted: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  under_gc_review: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
  under_review: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
  submitted_to_architect: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  approved: 'bg-green-600 text-white border-green-700',
  approved_as_noted: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300',
  revise_resubmit: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  void: 'bg-gray-200 text-gray-600 border-gray-400 dark:bg-gray-800 dark:text-gray-400',
}

// Status labels
const statusLabels: Record<string, string> = {
  not_submitted: 'Not Submitted',
  submitted: 'Submitted',
  under_gc_review: 'Under GC Review',
  under_review: 'Under Review',
  submitted_to_architect: 'With Architect',
  approved: 'Approved (A)',
  approved_as_noted: 'Approved as Noted (B)',
  revise_resubmit: 'Revise & Resubmit (C)',
  rejected: 'Rejected (D)',
  void: 'Void',
}

interface ShopDrawingStatusBadgeProps {
  status: SubmittalReviewStatus | string
  showLockIcon?: boolean
  className?: string
}

export const ShopDrawingStatusBadge = memo(function ShopDrawingStatusBadge({
  status,
  showLockIcon = true,
  className,
}: ShopDrawingStatusBadgeProps) {
  const colorClass = statusColors[status] || statusColors.not_submitted
  const label = statusLabels[status] || status
  const isLocked = isShopDrawingLocked(status as SubmittalReviewStatus)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        colorClass,
        className
      )}
    >
      {showLockIcon && isLocked && <Lock className="h-3 w-3" />}
      {label}
    </span>
  )
})

// Priority badge component
const priorityColors: Record<ShopDrawingPriority, string> = {
  critical_path: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  standard: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  non_critical: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400',
}

const priorityLabels: Record<ShopDrawingPriority, string> = {
  critical_path: 'Critical Path',
  standard: 'Standard',
  non_critical: 'Non-Critical',
}

interface PriorityBadgeProps {
  priority: ShopDrawingPriority
  className?: string
}

export const PriorityBadge = memo(function PriorityBadge({
  priority,
  className,
}: PriorityBadgeProps) {
  const colorClass = priorityColors[priority] || priorityColors.standard
  const label = priorityLabels[priority] || priority

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {priority === 'critical_path' && <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  )
})

// Discipline badge component
const disciplineColors: Record<string, string> = {
  Structural: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30',
  Mechanical: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30',
  Electrical: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30',
  Plumbing: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30',
  'Fire Protection': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30',
  Architectural: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30',
  Civil: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30',
  Other: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800',
}

interface DisciplineBadgeProps {
  discipline: string
  className?: string
}

export const DisciplineBadge = memo(function DisciplineBadge({
  discipline,
  className,
}: DisciplineBadgeProps) {
  const colorClass = disciplineColors[discipline] || disciplineColors.Other

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {discipline}
    </span>
  )
})
