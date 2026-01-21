/**
 * BidPackageStatusBadge Component
 * Displays bid package status with appropriate color coding
 * Refactored to use unified StatusBadge component
 */

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type {
  BidPackageStatus,
  BidSubmissionStatus,
  InvitationResponseStatus,
} from '@/types/bidding'

interface BidPackageStatusBadgeProps {
  status: BidPackageStatus
  className?: string
}

export function BidPackageStatusBadge({ status, className }: BidPackageStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="bid_package"
      className={cn(className)}
    />
  )
}

interface BidSubmissionStatusBadgeProps {
  status: BidSubmissionStatus
  className?: string
}

export function BidSubmissionStatusBadge({ status, className }: BidSubmissionStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="bid_package"
      className={cn(className)}
    />
  )
}

interface InvitationStatusBadgeProps {
  status: InvitationResponseStatus
  className?: string
}

export function InvitationStatusBadge({ status, className }: InvitationStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="bid_package"
      className={cn(className)}
    />
  )
}
