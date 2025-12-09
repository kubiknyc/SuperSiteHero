/**
 * BidPackageStatusBadge Component
 * Displays bid package status with appropriate color coding
 */

import { Badge } from '@/components/ui/badge'
import type { BidPackageStatus, BidSubmissionStatus, InvitationResponseStatus } from '@/types/bidding'
import {
  BID_PACKAGE_STATUSES,
  BID_SUBMISSION_STATUSES,
  INVITATION_RESPONSE_STATUSES,
} from '@/types/bidding'

interface BidPackageStatusBadgeProps {
  status: BidPackageStatus
  className?: string
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  gray: 'secondary',
  blue: 'default',
  yellow: 'outline',
  orange: 'outline',
  purple: 'default',
  green: 'default',
  red: 'destructive',
  amber: 'outline',
  emerald: 'default',
}

export function BidPackageStatusBadge({ status, className }: BidPackageStatusBadgeProps) {
  const config = BID_PACKAGE_STATUSES.find((s) => s.value === status)
  const variant = config?.color ? statusVariants[config.color] || 'secondary' : 'secondary'

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  return (
    <Badge
      variant={variant}
      className={`${colorClasses[config?.color || 'gray']} ${className || ''}`}
    >
      {config?.label || status}
    </Badge>
  )
}

interface BidSubmissionStatusBadgeProps {
  status: BidSubmissionStatus
  className?: string
}

export function BidSubmissionStatusBadge({ status, className }: BidSubmissionStatusBadgeProps) {
  const config = BID_SUBMISSION_STATUSES.find((s) => s.value === status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  return (
    <Badge className={`${colorClasses[config?.color || 'gray']} ${className || ''}`}>
      {config?.label || status}
    </Badge>
  )
}

interface InvitationStatusBadgeProps {
  status: InvitationResponseStatus
  className?: string
}

export function InvitationStatusBadge({ status, className }: InvitationStatusBadgeProps) {
  const config = INVITATION_RESPONSE_STATUSES.find((s) => s.value === status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }

  return (
    <Badge className={`${colorClasses[config?.color || 'gray']} ${className || ''}`}>
      {config?.label || status}
    </Badge>
  )
}
