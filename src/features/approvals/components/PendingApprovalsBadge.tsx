/**
 * Pending Approvals Badge Component
 *
 * Shows count of pending approvals for navigation/header
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { usePendingApprovals } from '../hooks/useApprovalRequests'
import { useAuth } from '@/lib/auth/AuthContext'

interface PendingApprovalsBadgeProps {
  userId?: string
  onClick?: () => void
  className?: string
  showZero?: boolean
}

export function PendingApprovalsBadge({
  userId: providedUserId,
  onClick,
  className,
  showZero = false,
}: PendingApprovalsBadgeProps) {
  const { userProfile } = useAuth()
  const userId = providedUserId ?? userProfile?.id
  const { data, isLoading } = usePendingApprovals(userId)

  const count = data?.total ?? 0

  if (isLoading) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-gray-200 animate-pulse',
          className
        )}
      />
    )
  }

  if (count === 0 && !showZero) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full',
        count > 0
          ? 'bg-red-500 text-white'
          : 'bg-gray-200 text-gray-600',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Navigation item with pending approvals count
 */
interface ApprovalsNavItemProps {
  userId: string | undefined
  onClick?: () => void
  isActive?: boolean
  className?: string
}

export function ApprovalsNavItem({
  userId,
  onClick,
  isActive,
  className,
}: ApprovalsNavItemProps) {
  const { data, isLoading } = usePendingApprovals(userId)
  const count = data?.total ?? 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100',
        className
      )}
    >
      <span className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
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
        <span>Approvals</span>
      </span>
      {!isLoading && count > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full bg-red-500 text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

export default PendingApprovalsBadge
