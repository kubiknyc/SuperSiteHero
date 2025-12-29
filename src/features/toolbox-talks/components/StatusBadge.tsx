/**
 * Status Badge Component
 *
 * Displays toolbox talk status, attendance status, or certification status.
 */

import { cn } from '@/lib/utils'
import {
  TALK_STATUS_LABELS,
  TALK_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  CERTIFICATION_STATUS_COLORS,
  type ToolboxTalkStatus,
  type ToolboxAttendanceStatus,
  type CertificationStatus,
} from '@/types/toolbox-talks'

interface TalkStatusBadgeProps {
  status: ToolboxTalkStatus
  size?: 'sm' | 'md'
  className?: string
}

interface AttendanceStatusBadgeProps {
  status: ToolboxAttendanceStatus
  size?: 'sm' | 'md'
  className?: string
}

interface CertificationStatusBadgeProps {
  status: CertificationStatus
  size?: 'sm' | 'md'
  className?: string
}

const colorClasses: Record<string, string> = {
  gray: 'bg-muted text-foreground',
  blue: 'bg-info-light text-blue-800',
  yellow: 'bg-warning-light text-yellow-800',
  green: 'bg-success-light text-green-800',
  red: 'bg-error-light text-red-800',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function TalkStatusBadge({ status, size = 'sm', className }: TalkStatusBadgeProps) {
  const color = TALK_STATUS_COLORS[status]
  const label = TALK_STATUS_LABELS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  )
}

export function AttendanceStatusBadge({
  status,
  size = 'sm',
  className,
}: AttendanceStatusBadgeProps) {
  const color = ATTENDANCE_STATUS_COLORS[status]
  const label = ATTENDANCE_STATUS_LABELS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  )
}

export function CertificationStatusBadge({
  status,
  size = 'sm',
  className,
}: CertificationStatusBadgeProps) {
  const color = CERTIFICATION_STATUS_COLORS[status]

  const labels: Record<CertificationStatus, string> = {
    valid: 'Valid',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      {labels[status]}
    </span>
  )
}
