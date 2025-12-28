// File: /src/features/punch-lists/components/BackChargeStatusBadge.tsx
// Status badge component for back-charges

import { BackChargeStatus, BACK_CHARGE_STATUSES } from '@/types/punch-list-back-charge'
import { cn } from '@/lib/utils'

interface BackChargeStatusBadgeProps {
  status: BackChargeStatus | string
  size?: 'sm' | 'md'
}

const statusColors: Record<string, string> = {
  initiated: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  estimated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending_approval: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  sent_to_sub: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  disputed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  resolved: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  applied: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  voided: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function BackChargeStatusBadge({ status, size = 'sm' }: BackChargeStatusBadgeProps) {
  const statusConfig = BACK_CHARGE_STATUSES.find((s) => s.value === status)
  const label = statusConfig?.label || status
  const colorClass = statusColors[status] || statusColors.initiated

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorClass
      )}
    >
      {label}
    </span>
  )
}
