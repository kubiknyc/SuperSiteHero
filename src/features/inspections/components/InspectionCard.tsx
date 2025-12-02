/**
 * Inspection Card Component
 *
 * Displays an inspection in a card format for list views.
 */

import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import { InspectionTypeBadge } from './InspectionTypeBadge'
import type { Inspection } from '../types'
import {
  ClipboardCheck,
  Calendar,
  Clock,
  User,
  Building,
  Phone,
  AlertTriangle,
} from 'lucide-react'

interface InspectionCardProps {
  inspection: Inspection
  className?: string
  showProject?: boolean
}

export function InspectionCard({
  inspection,
  className,
  showProject = false,
}: InspectionCardProps) {
  const scheduledDate = inspection.scheduled_date
    ? new Date(inspection.scheduled_date)
    : null
  const isOverdue =
    scheduledDate &&
    isPast(scheduledDate) &&
    inspection.status === 'scheduled' &&
    !isToday(scheduledDate)

  return (
    <Link
      to={`/inspections/${inspection.id}`}
      className={cn(
        'block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow',
        isOverdue && 'border-red-300 bg-red-50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-900 line-clamp-1">
            {inspection.inspection_name}
          </span>
        </div>
        <InspectionTypeBadge type={inspection.inspection_type} size="sm" />
      </div>

      {/* Description */}
      {inspection.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {inspection.description}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        {scheduledDate && (
          <div className={cn('flex items-center gap-1', isOverdue && 'text-red-600')}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(scheduledDate, 'MMM d, yyyy')}</span>
            {isOverdue && (
              <AlertTriangle className="h-3.5 w-3.5 ml-1" />
            )}
          </div>
        )}

        {inspection.scheduled_time && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{inspection.scheduled_time}</span>
          </div>
        )}

        {inspection.inspector_name && (
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">
              {inspection.inspector_name}
            </span>
          </div>
        )}

        {inspection.inspector_company && (
          <div className="flex items-center gap-1">
            <Building className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">
              {inspection.inspector_company}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <InspectionStatusBadge
          status={inspection.status}
          result={inspection.result}
          size="sm"
        />

        {scheduledDate && (
          <div className="text-xs text-gray-400">
            {isToday(scheduledDate)
              ? 'Today'
              : formatDistanceToNow(scheduledDate, { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          Overdue - inspection not completed
        </div>
      )}

      {/* Reinspection indicator */}
      {inspection.reinspection_scheduled_date && (
        <div className="mt-2 text-xs text-orange-600 font-medium">
          Reinspection scheduled:{' '}
          {format(new Date(inspection.reinspection_scheduled_date), 'MMM d, yyyy')}
        </div>
      )}
    </Link>
  )
}

export default InspectionCard
