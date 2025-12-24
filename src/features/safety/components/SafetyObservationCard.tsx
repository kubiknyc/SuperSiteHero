/**
 * Safety Observation Card Component
 *
 * Displays a safety observation in a card format for list views.
 * Shows observation type, status, severity, and key details.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { SafetyObservation } from '@/types/safety-observations'
import {
  OBSERVATION_TYPE_CONFIG,
  CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  isPositiveObservation,
  SafetyObservationType,
} from '@/types/safety-observations'
import {
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Award,
  Calendar,
  MapPin,
  User,
  Clock,
  Image,
  Trophy,
  CheckCircle2,
  Circle,
} from 'lucide-react'

interface SafetyObservationCardProps {
  observation: SafetyObservation
  className?: string
  showProject?: boolean
  onClick?: () => void
  linkTo?: string
}

const TYPE_ICONS: Record<SafetyObservationType, React.ComponentType<{ className?: string }>> = {
  safe_behavior: ThumbsUp,
  unsafe_condition: AlertTriangle,
  near_miss: AlertCircle,
  best_practice: Award,
}

const TYPE_COLOR_CLASSES: Record<SafetyObservationType, string> = {
  safe_behavior: 'text-success bg-success-light',
  unsafe_condition: 'text-orange-600 bg-orange-100',
  near_miss: 'text-warning bg-warning-light',
  best_practice: 'text-primary bg-info-light',
}

const SEVERITY_COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-muted text-foreground',
  yellow: 'bg-warning-light text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-error-light text-red-800',
}

const STATUS_COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-info-light text-blue-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  orange: 'bg-orange-100 text-orange-800',
  yellow: 'bg-warning-light text-yellow-800',
  green: 'bg-success-light text-green-800',
  gray: 'bg-muted text-foreground',
}

export function SafetyObservationCard({
  observation,
  className,
  showProject = false,
  onClick,
  linkTo,
}: SafetyObservationCardProps) {
  const typeConfig = OBSERVATION_TYPE_CONFIG[observation.observation_type]
  const categoryConfig = CATEGORY_CONFIG[observation.category]
  const severityConfig = SEVERITY_CONFIG[observation.severity]
  const statusConfig = STATUS_CONFIG[observation.status]
  const isPositive = isPositiveObservation(observation.observation_type)
  const TypeIcon = TYPE_ICONS[observation.observation_type]

  const content = (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              TYPE_COLOR_CLASSES[observation.observation_type]
            )}
          >
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted">
                {observation.observation_number}
              </span>
              {observation.points_awarded > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  <Trophy className="h-3 w-3" />
                  {observation.points_awarded}
                </span>
              )}
            </div>
            <span className="text-xs text-muted">{typeConfig.label}</span>
          </div>
        </div>

        {/* Severity badge (for non-positive observations) */}
        {!isPositive && (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              SEVERITY_COLOR_CLASSES[severityConfig.color]
            )}
          >
            {severityConfig.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 text-base font-semibold text-foreground line-clamp-2" className="heading-subsection">
        {observation.title}
      </h3>

      {/* Description */}
      <p className="mt-1 text-sm text-secondary line-clamp-2">
        {observation.description}
      </p>

      {/* Recognition info (for positive observations) */}
      {isPositive && observation.recognized_person && (
        <div className="mt-3 p-2 bg-success-light rounded-lg">
          <div className="flex items-center gap-2 text-sm text-success-dark">
            <User className="h-4 w-4" />
            <span>Recognizing: {observation.recognized_person}</span>
            {observation.recognized_company && (
              <span className="text-success">({observation.recognized_company})</span>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3" />
          <span>{categoryConfig.label}</span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(observation.observed_at).toLocaleDateString()}</span>
        </div>

        {observation.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{observation.location}</span>
          </div>
        )}

        {observation.photo_urls.length > 0 && (
          <div className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            <span>{observation.photo_urls.length} photo(s)</span>
          </div>
        )}

        {observation.observer && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>
              {observation.observer.full_name || observation.observer.email}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
            STATUS_COLOR_CLASSES[statusConfig.color]
          )}
        >
          {observation.status === 'resolved' || observation.status === 'closed' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : null}
          {statusConfig.label}
        </span>

        <div className="flex items-center gap-1 text-xs text-disabled">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(observation.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Project name (optional) */}
      {showProject && observation.project && (
        <div className="mt-2 text-xs text-muted">
          Project: {observation.project.name}
        </div>
      )}

      {/* Assigned to indicator */}
      {observation.assigned_to && observation.assignee && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <User className="h-3 w-3" />
          Assigned to: {observation.assignee.full_name || observation.assignee.email}
        </div>
      )}
    </>
  )

  const cardClasses = cn(
    'block bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow',
    isPositive && 'border-l-4 border-l-green-500',
    !isPositive && observation.severity === 'critical' && 'border-l-4 border-l-red-500',
    !isPositive && observation.severity === 'high' && 'border-l-4 border-l-orange-500',
    className
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className={cardClasses}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(cardClasses, 'text-left w-full')}>
        {content}
      </button>
    )
  }

  return <div className={cardClasses}>{content}</div>
}

export default SafetyObservationCard
