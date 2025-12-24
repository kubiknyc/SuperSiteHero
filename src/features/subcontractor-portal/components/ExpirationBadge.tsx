/**
 * Expiration Badge Component
 * Displays document expiration status with color-coded indicators
 */

import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDaysUntilExpiration } from '../hooks/useComplianceDocuments'

interface ExpirationBadgeProps {
  expirationDate: string | null
  className?: string
  showIcon?: boolean
}

export function ExpirationBadge({
  expirationDate,
  className,
  showIcon = true,
}: ExpirationBadgeProps) {
  const daysUntil = getDaysUntilExpiration(expirationDate)

  // No expiration date
  if (daysUntil === null) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        {showIcon && <Clock className="h-3 w-3" />}
        No Expiration
      </Badge>
    )
  }

  // Expired
  if (daysUntil <= 0) {
    const daysAgo = Math.abs(daysUntil)
    return (
      <Badge variant="destructive" className={cn('gap-1', className)}>
        {showIcon && <XCircle className="h-3 w-3" />}
        {daysAgo === 0 ? 'Expires Today' : `Expired ${daysAgo}d ago`}
      </Badge>
    )
  }

  // Expiring very soon (7 days or less)
  if (daysUntil <= 7) {
    return (
      <Badge className={cn('gap-1 bg-error-light text-red-800 hover:bg-error-light', className)}>
        {showIcon && <AlertTriangle className="h-3 w-3" />}
        {daysUntil === 1 ? 'Expires tomorrow' : `Expires in ${daysUntil}d`}
      </Badge>
    )
  }

  // Expiring soon (30 days or less)
  if (daysUntil <= 30) {
    return (
      <Badge className={cn('gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100', className)}>
        {showIcon && <AlertTriangle className="h-3 w-3" />}
        Expires in {daysUntil}d
      </Badge>
    )
  }

  // Expiring within 90 days
  if (daysUntil <= 90) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        {showIcon && <Clock className="h-3 w-3" />}
        Expires in {daysUntil}d
      </Badge>
    )
  }

  // Valid for a long time
  return (
    <Badge className={cn('gap-1 bg-success-light text-green-800 hover:bg-success-light', className)}>
      {showIcon && <CheckCircle className="h-3 w-3" />}
      Valid
    </Badge>
  )
}

export default ExpirationBadge
