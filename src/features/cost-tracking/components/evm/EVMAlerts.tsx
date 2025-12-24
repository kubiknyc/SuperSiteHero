/**
 * EVM Alerts Component
 *
 * Displays EVM-based alerts and warnings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { EVMAlert } from '@/types/cost-tracking'

interface EVMAlertsProps {
  alerts: EVMAlert[] | undefined
  isLoading?: boolean
  maxAlerts?: number
  compact?: boolean
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-error-light',
    border: 'border-red-200',
    text: 'text-error-dark',
    badge: 'bg-error-light text-error-dark',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-light',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-primary-hover',
    badge: 'bg-info-light text-primary-hover',
  },
}

const TYPE_ICONS = {
  cost_overrun: DollarSign,
  schedule_slip: Clock,
  budget_exhaustion: AlertCircle,
  performance_decline: TrendingDown,
  milestone_risk: Target,
}

function AlertItem({ alert, compact }: { alert: EVMAlert; compact?: boolean }) {
  const config = SEVERITY_CONFIG[alert.severity]
  const TypeIcon = TYPE_ICONS[alert.type]
  const SeverityIcon = config.icon

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border',
          config.bg,
          config.border
        )}
      >
        <SeverityIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.text)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', config.text)}>{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {alert.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-full', config.bg)}>
            <TypeIcon className={cn('h-4 w-4', config.text)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={cn('font-medium', config.text)}>{alert.title}</h4>
              <Badge variant="secondary" className={cn('text-xs', config.badge)}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                {alert.metric}: {typeof alert.current_value === 'number'
                  ? alert.current_value.toFixed(2)
                  : alert.current_value}
              </span>
              <span>Threshold: {alert.threshold}</span>
              {alert.created_at && (
                <span>
                  {formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border">
        <Skeleton className="h-4 w-4 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </div>
  )
}

export function EVMAlerts({ alerts, isLoading, maxAlerts, compact }: EVMAlertsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>EVM Alerts</CardTitle>
          {!compact && <CardDescription>Performance warnings and issues</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
            <AlertSkeleton key={i} compact={compact} />
          ))}
        </CardContent>
      </Card>
    )
  }

  const displayAlerts = maxAlerts ? alerts?.slice(0, maxAlerts) : alerts
  const hasMore = maxAlerts && alerts && alerts.length > maxAlerts

  // Group alerts by severity for summary
  const criticalCount = alerts?.filter(a => a.severity === 'critical').length || 0
  const warningCount = alerts?.filter(a => a.severity === 'warning').length || 0
  const infoCount = alerts?.filter(a => a.severity === 'info').length || 0

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('flex items-center gap-2', compact && 'text-base')}>
              <Bell className="h-4 w-4" />
              EVM Alerts
            </CardTitle>
            {!compact && <CardDescription>Performance warnings and issues</CardDescription>}
          </div>
          {alerts && alerts.length > 0 && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive">{criticalCount} Critical</Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {warningCount} Warning
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="secondary">{infoCount} Info</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!displayAlerts?.length ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts</p>
            <p className="text-xs mt-1">Project performance is within acceptable thresholds</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} compact={compact} />
            ))}
            {hasMore && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{alerts!.length - maxAlerts} more alerts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EVMAlerts
