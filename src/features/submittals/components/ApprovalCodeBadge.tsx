// File: src/features/submittals/components/ApprovalCodeBadge.tsx
// Display badge for submittal approval codes (A/B/C/D)

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { SubmittalApprovalCode } from '@/types/submittal'
import { SUBMITTAL_APPROVAL_CODES, getApprovalCodeLabel, getApprovalCodeColor } from '@/types/submittal'

interface ApprovalCodeBadgeProps {
  code: SubmittalApprovalCode | null | undefined
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Badge displaying submittal approval code with color coding
 *
 * @example
 * ```tsx
 * <ApprovalCodeBadge code="A" />
 * <ApprovalCodeBadge code="C" showLabel />
 * ```
 */
export function ApprovalCodeBadge({
  code,
  showLabel = false,
  size = 'md',
  className,
}: ApprovalCodeBadgeProps) {
  if (!code) {return null}

  const color = getApprovalCodeColor(code)
  const label = getApprovalCodeLabel(code)
  const config = SUBMITTAL_APPROVAL_CODES.find((c) => c.value === code)

  const colorClasses: Record<string, string> = {
    green: 'bg-success-light text-green-800 border-green-200',
    lime: 'bg-lime-100 text-lime-800 border-lime-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-error-light text-red-800 border-red-200',
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded border',
        colorClasses[color] || colorClasses.green,
        sizeClasses[size],
        className
      )}
      title={config?.description}
    >
      <span className="font-bold">{code}</span>
      {showLabel && <span className="font-normal">- {label}</span>}
    </span>
  )
}

/**
 * Approval code legend showing all codes
 */
export function ApprovalCodeLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {SUBMITTAL_APPROVAL_CODES.map((code) => (
        <div key={code.value} className="flex items-center gap-2">
          <ApprovalCodeBadge code={code.value} size="sm" />
          <span className="text-xs text-secondary">{code.description}</span>
        </div>
      ))}
    </div>
  )
}

export default ApprovalCodeBadge
