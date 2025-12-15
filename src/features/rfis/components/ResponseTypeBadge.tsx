// File: src/features/rfis/components/ResponseTypeBadge.tsx
// Display badge for RFI response types

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { RFIResponseType } from '@/types/rfi'
import { RFI_RESPONSE_TYPES, getRFIResponseTypeLabel, getRFIResponseTypeDescription } from '@/types/rfi'

interface ResponseTypeBadgeProps {
  responseType: RFIResponseType | null | undefined
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Get color for response type
 */
function getResponseTypeColor(type: RFIResponseType): string {
  switch (type) {
    case 'answered':
      return 'green'
    case 'see_drawings':
    case 'see_specs':
      return 'blue'
    case 'deferred':
      return 'yellow'
    case 'partial_response':
      return 'orange'
    case 'request_clarification':
      return 'purple'
    case 'no_change_required':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Get icon for response type
 */
function ResponseTypeIcon({ type, className }: { type: RFIResponseType; className?: string }) {
  const iconClass = cn('h-3.5 w-3.5', className)

  switch (type) {
    case 'answered':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'see_drawings':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="m9 15 3-3 3 3" />
          <path d="M9 9h.01" />
        </svg>
      )
    case 'see_specs':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    case 'deferred':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'partial_response':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 12 12 6" />
          <path d="M12 12 16 14" />
        </svg>
      )
    case 'request_clarification':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'no_change_required':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    default:
      return null
  }
}

/**
 * Badge displaying RFI response type with color coding
 *
 * @example
 * ```tsx
 * <ResponseTypeBadge responseType="answered" />
 * <ResponseTypeBadge responseType="see_drawings" showDescription />
 * ```
 */
export function ResponseTypeBadge({
  responseType,
  showDescription = false,
  size = 'md',
  className,
}: ResponseTypeBadgeProps) {
  if (!responseType) {return null}

  const color = getResponseTypeColor(responseType)
  const label = getRFIResponseTypeLabel(responseType)
  const description = getRFIResponseTypeDescription(responseType)

  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded border',
        colorClasses[color] || colorClasses.gray,
        sizeClasses[size],
        className
      )}
      title={description}
    >
      <ResponseTypeIcon type={responseType} />
      <span>{label}</span>
      {showDescription && <span className="font-normal text-xs opacity-75">- {description}</span>}
    </span>
  )
}

/**
 * Response type legend showing all types
 */
export function ResponseTypeLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {RFI_RESPONSE_TYPES.map((type) => (
        <ResponseTypeBadge key={type.value} responseType={type.value} size="sm" />
      ))}
    </div>
  )
}

export default ResponseTypeBadge
