/**
 * Severity Badge Component
 *
 * Displays incident severity with color coding.
 */

import { cn } from '@/lib/utils'
import { SEVERITY_CONFIG, type IncidentSeverity } from '@/types/safety-incidents'

interface SeverityBadgeProps {
  severity: IncidentSeverity
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

const colorClasses: Record<string, string> = {
  green: 'bg-success-light text-green-800 border-green-200',
  yellow: 'bg-warning-light text-yellow-800 border-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  red: 'bg-error-light text-red-800 border-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
}

export function SeverityBadge({
  severity,
  size = 'md',
  showDescription = false,
  className,
}: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity]

  return (
    <div className={cn('inline-flex flex-col', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          sizeClasses[size],
          colorClasses[config.color]
        )}
      >
        {config.label}
      </span>
      {showDescription && (
        <span className="text-xs text-muted mt-1">
          {config.description}
        </span>
      )}
    </div>
  )
}

export default SeverityBadge
