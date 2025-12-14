/**
 * BudgetVarianceAlerts Component
 * Displays budget variance alerts with severity-based styling
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  X,
} from 'lucide-react'
import { useVarianceAlerts } from '../hooks/useVarianceAlerts'
import type {
  BudgetVarianceAlert,
  BudgetVarianceAlertSeverity,
  BudgetVarianceThresholds,
} from '@/types/cost-tracking'
import { VARIANCE_ALERT_CONFIG } from '@/types/cost-tracking'
import { cn } from '@/lib/utils'

interface BudgetVarianceAlertsProps {
  projectId: string | undefined
  thresholds?: BudgetVarianceThresholds
  collapsible?: boolean
  maxVisible?: number
  onAlertClick?: (alert: BudgetVarianceAlert) => void
}

const SeverityIcon = ({ severity }: { severity: BudgetVarianceAlertSeverity }) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-5 w-5" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />
    case 'info':
      return <Info className="h-5 w-5" />
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BudgetVarianceAlerts({
  projectId,
  thresholds,
  collapsible = true,
  maxVisible = 5,
  onAlertClick,
}: BudgetVarianceAlertsProps) {
  const { alerts, summary, isLoading, error } = useVarianceAlerts(projectId, thresholds)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id))
  const displayedAlerts = showAll ? visibleAlerts : visibleAlerts.slice(0, maxVisible)
  const hasMore = visibleAlerts.length > maxVisible

  const handleDismiss = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const handleRestoreAll = () => {
    setDismissedAlerts(new Set())
  }

  // Don't render if no alerts or loading/error
  if (isLoading || error || visibleAlerts.length === 0) {
    return null
  }

  // Summary badge counts
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length
  const warningCount = visibleAlerts.filter(a => a.severity === 'warning').length
  const infoCount = visibleAlerts.filter(a => a.severity === 'info').length

  return (
    <Card className={cn(
      'border-l-4',
      criticalCount > 0 ? 'border-l-red-500' :
      warningCount > 0 ? 'border-l-amber-500' :
      'border-l-blue-500'
    )}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className={cn(
              'h-5 w-5',
              criticalCount > 0 ? 'text-red-600' :
              warningCount > 0 ? 'text-amber-600' :
              'text-blue-600'
            )} />
            <CardTitle className="text-base">
              Budget Alerts
            </CardTitle>
            {/* Badge counts */}
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {warningCount} Warning
                </span>
              )}
              {infoCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {infoCount} Info
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dismissedAlerts.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreAll}
                className="text-xs text-gray-500"
              >
                <BellOff className="h-3 w-3 mr-1" />
                Restore {dismissedAlerts.size}
              </Button>
            )}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          {/* Total overrun amount */}
          {summary.total_overrun_amount > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Total budget overrun:{' '}
                <span className="font-semibold text-red-600">
                  {formatCurrency(summary.total_overrun_amount)}
                </span>
                {' '}across {summary.lines_over_budget} line{summary.lines_over_budget !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Alert list */}
          <div className="space-y-2">
            {displayedAlerts.map((alert) => {
              const config = VARIANCE_ALERT_CONFIG[alert.severity]
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm',
                    config.bgColor,
                    config.borderColor,
                    onAlertClick && 'hover:opacity-90'
                  )}
                  onClick={() => onAlertClick?.(alert)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5', config.color)}>
                      <SeverityIcon severity={alert.severity} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('font-medium text-sm', config.color)}>
                          {alert.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          onClick={(e) => handleDismiss(alert.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {alert.message}
                      </p>
                      {/* Details row */}
                      {alert.cost_code && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Code: {alert.cost_code}</span>
                          <span>Budget: {formatCurrency(alert.budget_amount)}</span>
                          <span>Actual: {formatCurrency(alert.actual_amount)}</span>
                          <span className={alert.variance_amount < 0 ? 'text-red-600' : 'text-green-600'}>
                            Variance: {formatCurrency(alert.variance_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show more/less button */}
          {hasMore && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-gray-600"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {visibleAlerts.length - maxVisible} more
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Compact alert badge for navigation/headers
 */
export function BudgetVarianceAlertBadge({
  projectId,
  thresholds,
}: {
  projectId: string | undefined
  thresholds?: BudgetVarianceThresholds
}) {
  const { summary, isLoading } = useVarianceAlerts(projectId, thresholds)

  if (isLoading || summary.total_alerts === 0) {
    return null
  }

  const { critical_count, warning_count } = summary

  if (critical_count > 0) {
    return (
      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-red-500 text-white">
        {critical_count}
      </span>
    )
  }

  if (warning_count > 0) {
    return (
      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-amber-500 text-white">
        {warning_count}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-blue-500 text-white">
      {summary.info_count}
    </span>
  )
}

export default BudgetVarianceAlerts
