/**
 * Insurance Expiration Alerts Component
 * Displays alerts for expiring/expired certificates
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  Clock,
  XCircle,
  ChevronRight,
  Bell,
  Shield,
  Building2,
  Calendar,
} from 'lucide-react'
import { useExpiringCertificates } from '../hooks/useInsurance'
import type { ExpiringCertificate } from '@/types/insurance'
import { INSURANCE_TYPE_LABELS } from '@/types/insurance'
import { cn } from '@/lib/utils'

interface InsuranceExpirationAlertsProps {
  daysAhead?: number
  maxItems?: number
  onViewCertificate?: (certificate: ExpiringCertificate) => void
  onViewAll?: () => void
  compact?: boolean
  className?: string
}

export function InsuranceExpirationAlerts({
  daysAhead = 30,
  maxItems = 5,
  onViewCertificate,
  onViewAll,
  compact = false,
  className,
}: InsuranceExpirationAlertsProps) {
  const { data: expiringCertificates, isLoading } = useExpiringCertificates(daysAhead)

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-24 bg-muted rounded-lg"></div>
      </div>
    )
  }

  if (!expiringCertificates || expiringCertificates.length === 0) {
    return null // Don't show anything if no alerts
  }

  const expiredCount = expiringCertificates.filter((c) => c.days_until_expiry < 0).length
  const expiringCount = expiringCertificates.filter((c) => c.days_until_expiry >= 0).length

  const displayCertificates = expiringCertificates.slice(0, maxItems)
  const hasMore = expiringCertificates.length > maxItems

  const getAlertVariant = () => {
    if (expiredCount > 0) {return 'destructive'}
    return 'default'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (compact) {
    return (
      <Alert variant={getAlertVariant()} className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Insurance Certificates Need Attention
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </AlertTitle>
        <AlertDescription>
          {expiredCount > 0 && <span className="text-error">{expiredCount} expired</span>}
          {expiredCount > 0 && expiringCount > 0 && ' and '}
          {expiringCount > 0 && (
            <span className="text-warning">{expiringCount} expiring within {daysAhead} days</span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-warning" />
          <h3 className="font-semibold heading-subsection">Insurance Alerts</h3>
          <Badge variant={expiredCount > 0 ? 'destructive' : 'secondary'}>
            {expiringCertificates.length}
          </Badge>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-error-light rounded-lg">
            <XCircle className="h-4 w-4 text-error" />
          </div>
          <div>
            <p className="text-2xl font-bold text-error">{expiredCount}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning-light rounded-lg">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{expiringCount}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
          </div>
        </div>
      </div>

      {/* Certificate List */}
      <ScrollArea className="max-h-[300px]">
        <div className="divide-y">
          {displayCertificates.map((cert) => (
            <div
              key={cert.id}
              className={cn(
                'p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                cert.days_until_expiry < 0 && 'bg-error-light hover:bg-error-light'
              )}
              onClick={() => onViewCertificate?.(cert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      cert.days_until_expiry < 0 ? 'bg-error-light' : 'bg-warning-light'
                    )}
                  >
                    <Shield
                      className={cn(
                        'h-4 w-4',
                        cert.days_until_expiry < 0 ? 'text-error' : 'text-warning'
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {INSURANCE_TYPE_LABELS[cert.insurance_type]}
                    </p>
                    <p className="text-xs text-muted-foreground">{cert.carrier_name}</p>
                    {cert.subcontractor_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {cert.subcontractor_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={cert.days_until_expiry < 0 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {cert.days_until_expiry < 0
                      ? `${Math.abs(cert.days_until_expiry)} days ago`
                      : cert.days_until_expiry === 0
                        ? 'Today'
                        : `${cert.days_until_expiry} days`}
                  </Badge>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                    <Calendar className="h-3 w-3" />
                    {formatDate(cert.expiration_date)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      {hasMore && (
        <div className="p-3 border-t bg-muted/30 text-center">
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View {expiringCertificates.length - maxItems} more certificates
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
