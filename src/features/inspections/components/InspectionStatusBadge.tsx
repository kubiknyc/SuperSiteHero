/**
 * Inspection Status Badge Component
 *
 * Displays inspection status with color coding.
 * Shows both status and result when available.
 */

import { cn } from '@/lib/utils'
import {
  INSPECTION_STATUS_CONFIG,
  INSPECTION_RESULT_CONFIG,
  type InspectionStatus,
  type InspectionResult,
} from '../types'

interface InspectionStatusBadgeProps {
  status: InspectionStatus | string | null
  result?: InspectionResult | string | null
  size?: 'sm' | 'md' | 'lg'
  showResult?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

const colorClasses: Record<string, string> = {
  blue: 'bg-info-light text-blue-800 border-blue-200',
  green: 'bg-success-light text-green-800 border-green-200',
  yellow: 'bg-warning-light text-yellow-800 border-yellow-200',
  red: 'bg-error-light text-red-800 border-red-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-muted text-foreground border-border',
}

export function InspectionStatusBadge({
  status,
  result,
  size = 'md',
  showResult = true,
  className,
}: InspectionStatusBadgeProps) {
  // Get status config with fallback
  const statusConfig = status
    ? INSPECTION_STATUS_CONFIG[status as InspectionStatus] || {
        label: status,
        color: 'gray',
      }
    : { label: 'Unknown', color: 'gray' }

  // Get result config if available
  const resultConfig = result
    ? INSPECTION_RESULT_CONFIG[result as InspectionResult] || {
        label: result,
        color: 'gray',
      }
    : null

  // For completed inspections, show result badge instead of status
  if (showResult && result && status === 'completed') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          sizeClasses[size],
          colorClasses[resultConfig?.color || 'gray'],
          className
        )}
      >
        {resultConfig?.label || result}
      </span>
    )
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          sizeClasses[size],
          colorClasses[statusConfig.color]
        )}
      >
        {statusConfig.label}
      </span>
      {showResult && resultConfig && (
        <span
          className={cn(
            'inline-flex items-center rounded-full font-medium border',
            sizeClasses[size],
            colorClasses[resultConfig.color]
          )}
        >
          {resultConfig.label}
        </span>
      )}
    </div>
  )
}

export default InspectionStatusBadge
