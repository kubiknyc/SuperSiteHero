/**
 * Incident Card Component
 *
 * Displays a safety incident in a card format for list views.
 */

import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { SeverityBadge } from './SeverityBadge'
import type { SafetyIncident } from '@/types/safety-incidents'
import {
  INCIDENT_TYPE_CONFIG,
  INCIDENT_STATUS_CONFIG,
} from '@/types/safety-incidents'
import {
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Clock,
  FileWarning,
} from 'lucide-react'

interface IncidentCardProps {
  incident: SafetyIncident
  className?: string
  showProject?: boolean
}

export function IncidentCard({
  incident,
  className,
  showProject = false,
}: IncidentCardProps) {
  const typeConfig = INCIDENT_TYPE_CONFIG[incident.incident_type]
  const statusConfig = INCIDENT_STATUS_CONFIG[incident.status]

  const statusColorClasses: Record<string, string> = {
    blue: 'bg-info-light text-blue-800',
    yellow: 'bg-warning-light text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-success-light text-green-800',
  }

  return (
    <Link
      to={`/safety/${incident.id}`}
      className={cn(
        'block bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-disabled" />
          <span className="font-medium text-foreground">
            {incident.incident_number}
          </span>
        </div>
        <SeverityBadge severity={incident.severity} size="sm" />
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-secondary line-clamp-2">
        {incident.description}
      </p>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <FileWarning className="h-3.5 w-3.5" />
          <span>{typeConfig.label}</span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{incident.incident_date}</span>
        </div>

        {incident.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{incident.location}</span>
          </div>
        )}

        {incident.reporter && (
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{incident.reporter.full_name || incident.reporter.email}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            statusColorClasses[statusConfig.color]
          )}
        >
          {statusConfig.label}
        </span>

        <div className="flex items-center gap-1 text-xs text-disabled">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(incident.reported_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Project name (optional) */}
      {showProject && incident.project && (
        <div className="mt-2 text-xs text-muted">
          Project: {incident.project.name}
        </div>
      )}

      {/* OSHA indicator */}
      {incident.osha_recordable && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-error font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          OSHA Recordable
        </div>
      )}
    </Link>
  )
}

export default IncidentCard
