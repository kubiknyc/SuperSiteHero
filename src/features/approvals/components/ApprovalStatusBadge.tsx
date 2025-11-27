/**
 * Approval Status Badge Component
 *
 * Displays the current approval status with appropriate colors
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ApprovalStatus } from '@/types/approval-workflow'
import { APPROVAL_STATUS_CONFIG } from '@/types/approval-workflow'

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus
  showConditions?: boolean
  conditions?: string | null
  className?: string
  onClick?: () => void
}

const statusColorClasses: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  approved_with_conditions: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function ApprovalStatusBadge({
  status,
  showConditions = false,
  conditions,
  className,
  onClick,
}: ApprovalStatusBadgeProps) {
  const config = APPROVAL_STATUS_CONFIG[status]
  const colorClass = statusColorClasses[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Status icon */}
      <StatusIcon status={status} />

      {/* Status label */}
      <span>{config.label}</span>

      {/* Show conditions indicator */}
      {status === 'approved_with_conditions' && conditions && showConditions && (
        <span title={conditions} className="text-blue-600">
          (!)
        </span>
      )}
    </span>
  )
}

function StatusIcon({ status }: { status: ApprovalStatus }) {
  switch (status) {
    case 'pending':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'approved':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )
    case 'approved_with_conditions':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'rejected':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )
    case 'cancelled':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      )
    default:
      return null
  }
}

export default ApprovalStatusBadge
