/**
 * Inspection Type Badge Component
 *
 * Displays inspection type with color coding.
 */

import { cn } from '@/lib/utils'
import type { InspectionType } from '../types'
import { INSPECTION_TYPE_CONFIG } from '../types'

interface InspectionTypeBadgeProps {
  type: InspectionType | string | null
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
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function InspectionTypeBadge({
  type,
  size = 'md',
  showDescription = false,
  className,
}: InspectionTypeBadgeProps) {
  // Get config with fallback
  const config = type
    ? INSPECTION_TYPE_CONFIG[type as InspectionType] || {
        label: type,
        description: '',
        color: 'gray',
      }
    : { label: 'Unknown', description: '', color: 'gray' }

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
      {showDescription && config.description && (
        <span className="text-xs text-gray-500 mt-1">{config.description}</span>
      )}
    </div>
  )
}

export default InspectionTypeBadge
