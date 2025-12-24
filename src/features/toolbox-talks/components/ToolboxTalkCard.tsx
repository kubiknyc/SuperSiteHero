/**
 * Toolbox Talk Card Component
 *
 * Displays a toolbox talk in a card format for list views.
 */

import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { TalkStatusBadge } from './StatusBadge'
import type { ToolboxTalk } from '@/types/toolbox-talks'
import { TOPIC_CATEGORY_LABELS } from '@/types/toolbox-talks'
import {
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface ToolboxTalkCardProps {
  talk: ToolboxTalk
  className?: string
  showProject?: boolean
}

export function ToolboxTalkCard({
  talk,
  className,
  showProject = false,
}: ToolboxTalkCardProps) {
  const topicTitle = talk.topic?.title || talk.custom_topic_title || 'Untitled Topic'
  const categoryLabel = TOPIC_CATEGORY_LABELS[talk.category]

  // Calculate attendance if available
  const attendanceCount = talk.attendance_count ?? 0
  const presentCount = talk.present_count ?? 0
  const hasAttendance = attendanceCount > 0

  return (
    <Link
      to={`/toolbox-talks/${talk.id}`}
      className={cn(
        'block bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="font-medium text-foreground truncate">
            {talk.talk_number}
          </span>
        </div>
        <TalkStatusBadge status={talk.status} size="sm" />
      </div>

      {/* Topic Title */}
      <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2" className="heading-subsection">
        {topicTitle}
      </h3>

      {/* Category */}
      <div className="mt-1 text-xs text-muted">
        {categoryLabel}
      </div>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(talk.scheduled_date), 'MMM d, yyyy')}</span>
        </div>

        {talk.scheduled_time && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{talk.scheduled_time}</span>
          </div>
        )}

        {talk.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{talk.location}</span>
          </div>
        )}

        {(talk.presenter?.full_name || talk.presenter_name) && (
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{talk.presenter?.full_name || talk.presenter_name}</span>
          </div>
        )}
      </div>

      {/* Attendance (for completed talks) */}
      {talk.status === 'completed' && hasAttendance && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5 text-disabled" />
          <span className="text-secondary">
            {presentCount} of {attendanceCount} attended
          </span>
          {presentCount === attendanceCount ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
          )}
        </div>
      )}

      {/* Duration (for completed talks) */}
      {talk.status === 'completed' && talk.duration_minutes && (
        <div className="mt-1 text-xs text-muted">
          Duration: {talk.duration_minutes} minutes
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        {/* Project name (optional) */}
        {showProject && talk.project && (
          <div className="text-xs text-muted truncate">
            {talk.project.name}
          </div>
        )}

        {/* Time indicator */}
        <div className="flex items-center gap-1 text-xs text-disabled ml-auto">
          {talk.status === 'scheduled' && (
            <>
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(talk.scheduled_date), { addSuffix: true })}
              </span>
            </>
          )}
          {talk.status === 'completed' && talk.completed_at && (
            <>
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>
                Completed {formatDistanceToNow(new Date(talk.completed_at), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Certification indicator */}
      {talk.topic?.requires_certification && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          Certification Required
        </div>
      )}
    </Link>
  )
}

export default ToolboxTalkCard
