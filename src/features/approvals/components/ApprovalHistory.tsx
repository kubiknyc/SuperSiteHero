/**
 * Approval History Timeline Component
 *
 * Displays a vertical timeline of all actions taken on an approval request
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ApprovalActionRecord, ApprovalActionType } from '@/types/approval-workflow'
import { APPROVAL_ACTION_CONFIG } from '@/types/approval-workflow'

interface ApprovalHistoryProps {
  actions: ApprovalActionRecord[]
  className?: string
}

const actionColorClasses: Record<ApprovalActionType, string> = {
  approve: 'bg-green-500',
  approve_with_conditions: 'bg-blue-500',
  reject: 'bg-red-500',
  delegate: 'bg-purple-500',
  comment: 'bg-gray-400',
}

const actionBgClasses: Record<ApprovalActionType, string> = {
  approve: 'bg-success-light border-green-200',
  approve_with_conditions: 'bg-blue-50 border-blue-200',
  reject: 'bg-error-light border-red-200',
  delegate: 'bg-purple-50 border-purple-200',
  comment: 'bg-surface border-border',
}

export function ApprovalHistory({ actions, className }: ApprovalHistoryProps) {
  if (!actions || actions.length === 0) {
    return (
      <div className={cn('text-sm text-muted text-center py-4', className)}>
        No activity yet
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {actions.map((action, index) => (
        <HistoryItem
          key={action.id}
          action={action}
          isLast={index === actions.length - 1}
        />
      ))}
    </div>
  )
}

interface HistoryItemProps {
  action: ApprovalActionRecord
  isLast: boolean
}

function HistoryItem({ action, isLast }: HistoryItemProps) {
  const config = APPROVAL_ACTION_CONFIG[action.action]
  const dotColor = actionColorClasses[action.action]
  const bgColor = actionBgClasses[action.action]

  const formattedDate = new Date(action.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-muted" />
      )}

      {/* Timeline dot */}
      <div className={cn('w-6 h-6 rounded-full flex-shrink-0 mt-0.5', dotColor)}>
        <ActionIcon action={action.action} />
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-4 border rounded-lg p-3', bgColor)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">
              {action.user?.full_name || action.user?.email || 'Unknown User'}
            </span>
            <span className="text-xs text-muted">{config.pastTense}</span>
          </div>
          <span className="text-xs text-muted whitespace-nowrap">{formattedDate}</span>
        </div>

        {/* Step info */}
        {action.step && (
          <div className="text-xs text-muted mb-2">
            Step: {action.step.name}
          </div>
        )}

        {/* Conditions (for approve_with_conditions) */}
        {action.action === 'approve_with_conditions' && action.conditions && (
          <div className="bg-info-light text-blue-800 text-sm rounded p-2 mb-2">
            <span className="font-medium">Conditions:</span> {action.conditions}
          </div>
        )}

        {/* Delegation info */}
        {action.action === 'delegate' && action.delegated_user && (
          <div className="text-sm text-secondary mb-2">
            Delegated to:{' '}
            <span className="font-medium">
              {action.delegated_user.full_name || action.delegated_user.email}
            </span>
          </div>
        )}

        {/* Comment */}
        {action.comment && (
          <div className="text-sm text-secondary bg-card rounded p-2 border border-border">
            {action.comment}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionIcon({ action }: { action: ApprovalActionType }) {
  const className = 'w-full h-full p-1 text-white'

  switch (action) {
    case 'approve':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'approve_with_conditions':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'reject':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case 'delegate':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      )
    case 'comment':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )
    default:
      return null
  }
}

export default ApprovalHistory
