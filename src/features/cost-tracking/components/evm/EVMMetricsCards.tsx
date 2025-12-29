/**
 * EVM Metrics Cards Component
 *
 * Displays key EVM metrics (CPI, SPI, EAC, VAC) in card format
 * with visual indicators for performance status
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EarnedValueMetrics, EVMPerformanceStatus } from '@/types/cost-tracking'

interface EVMMetricsCardsProps {
  metrics: EarnedValueMetrics | undefined
  isLoading?: boolean
  compact?: boolean
}

const STATUS_COLORS: Record<EVMPerformanceStatus | 'unknown', { bg: string; text: string; border: string }> = {
  excellent: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  good: { bg: 'bg-success-light', text: 'text-success-dark', border: 'border-green-200' },
  fair: { bg: 'bg-warning-light', text: 'text-yellow-700', border: 'border-yellow-200' },
  poor: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { bg: 'bg-error-light', text: 'text-error-dark', border: 'border-red-200' },
  unknown: { bg: 'bg-surface', text: 'text-secondary', border: 'border-border' },
}

const STATUS_ICONS: Record<EVMPerformanceStatus | 'unknown', typeof CheckCircle> = {
  excellent: TrendingUp,
  good: CheckCircle,
  fair: AlertTriangle,
  poor: AlertTriangle,
  critical: XCircle,
  unknown: Minus,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1000000 ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatIndex(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {return '—'}
  return value.toFixed(2)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function MetricCard({
  title,
  value,
  subtitle,
  status,
  icon: Icon,
  trend,
  description,
}: {
  title: string
  value: string
  subtitle?: string
  status?: EVMPerformanceStatus | 'unknown'
  icon: typeof DollarSign
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}) {
  const statusColors = status ? STATUS_COLORS[status] : STATUS_COLORS.unknown
  const StatusIcon = status ? STATUS_ICONS[status] : Minus

  return (
    <Card className={cn('relative overflow-hidden', status && statusColors.border, 'border')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('p-2 rounded-full', statusColors.bg)}>
            <Icon className={cn('h-4 w-4', statusColors.text)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-error',
                trend === 'neutral' && 'text-muted'
              )}
            >
              {trend === 'up' && <ArrowUp className="h-3 w-3" />}
              {trend === 'down' && <ArrowDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {status && (
          <div className="flex items-center gap-1.5 mt-2">
            <StatusIcon className={cn('h-3.5 w-3.5', statusColors.text)} />
            <span className={cn('text-xs font-medium capitalize', statusColors.text)}>
              {status}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function EVMMetricsCards({ metrics, isLoading, compact }: EVMMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4', compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
        {Array.from({ length: 8 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No EVM data available. Ensure project has budget and schedule data.
      </Card>
    )
  }

  const cpiTrend = metrics.CPI > 1 ? 'up' : metrics.CPI < 1 ? 'down' : 'neutral'
  const spiTrend = metrics.SPI > 1 ? 'up' : metrics.SPI < 1 ? 'down' : 'neutral'

  return (
    <div className="space-y-6">
      {/* Performance Indices */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 heading-subsection">Performance Indices</h3>
        <div className={cn('grid gap-4', compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          <MetricCard
            title="Cost Performance Index (CPI)"
            value={formatIndex(metrics.CPI)}
            subtitle={metrics.CPI >= 1 ? 'Under budget' : 'Over budget'}
            status={metrics.cost_status}
            icon={DollarSign}
            trend={cpiTrend}
            description="EV ÷ AC - efficiency of cost"
          />
          <MetricCard
            title="Schedule Performance Index (SPI)"
            value={formatIndex(metrics.SPI)}
            subtitle={metrics.SPI >= 1 ? 'Ahead of schedule' : 'Behind schedule'}
            status={metrics.schedule_status}
            icon={Clock}
            trend={spiTrend}
            description="EV ÷ PV - efficiency of schedule"
          />
          <MetricCard
            title="Cost-Schedule Index (CSI)"
            value={formatIndex(metrics.CSI)}
            subtitle="Combined performance"
            status={metrics.overall_status}
            icon={Target}
            description="CPI × SPI - overall efficiency"
          />
          <MetricCard
            title="TCPI (to BAC)"
            value={formatIndex(metrics.TCPI_BAC)}
            subtitle="Required future CPI"
            status={metrics.TCPI_BAC > 1.2 ? 'critical' : metrics.TCPI_BAC > 1.1 ? 'poor' : 'good'}
            icon={TrendingUp}
            description="Performance needed to meet budget"
          />
        </div>
      </div>

      {/* Cost Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 heading-subsection">Cost Analysis</h3>
        <div className={cn('grid gap-4', compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          <MetricCard
            title="Budget at Completion (BAC)"
            value={formatCurrency(metrics.BAC)}
            subtitle="Total project budget"
            icon={DollarSign}
          />
          <MetricCard
            title="Estimate at Completion (EAC)"
            value={formatCurrency(metrics.EAC)}
            subtitle={`${formatPercent(Math.abs(metrics.VAC_percent))} ${metrics.VAC >= 0 ? 'under' : 'over'} budget`}
            status={metrics.VAC >= 0 ? 'good' : metrics.VAC > -metrics.BAC * 0.1 ? 'fair' : 'critical'}
            icon={Target}
            description="Projected final cost"
          />
          <MetricCard
            title="Estimate to Complete (ETC)"
            value={formatCurrency(metrics.ETC)}
            subtitle="Remaining cost"
            icon={DollarSign}
            description="Cost to finish remaining work"
          />
          <MetricCard
            title="Variance at Completion (VAC)"
            value={formatCurrency(metrics.VAC)}
            subtitle={metrics.VAC >= 0 ? 'Projected savings' : 'Projected overrun'}
            status={metrics.VAC >= 0 ? 'good' : 'critical'}
            icon={metrics.VAC >= 0 ? TrendingUp : TrendingDown}
            description="BAC − EAC"
          />
        </div>
      </div>

      {/* Variances */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 heading-subsection">Current Variances</h3>
        <div className={cn('grid gap-4', compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          <MetricCard
            title="Cost Variance (CV)"
            value={formatCurrency(metrics.CV)}
            subtitle={`${formatPercent(Math.abs(metrics.CV_percent))}`}
            status={metrics.CV >= 0 ? 'good' : 'critical'}
            icon={metrics.CV >= 0 ? TrendingUp : TrendingDown}
            description="EV − AC (positive = under budget)"
          />
          <MetricCard
            title="Schedule Variance (SV)"
            value={formatCurrency(metrics.SV)}
            subtitle={`${formatPercent(Math.abs(metrics.SV_percent))}`}
            status={metrics.SV >= 0 ? 'good' : 'critical'}
            icon={metrics.SV >= 0 ? TrendingUp : TrendingDown}
            description="EV − PV (positive = ahead)"
          />
          <MetricCard
            title="Earned Value (EV)"
            value={formatCurrency(metrics.EV)}
            subtitle={`${formatPercent(metrics.percent_complete_actual)} complete`}
            icon={CheckCircle}
            description="Value of work performed"
          />
          <MetricCard
            title="Actual Cost (AC)"
            value={formatCurrency(metrics.AC)}
            subtitle={`${formatPercent(metrics.percent_spent)} of budget spent`}
            icon={DollarSign}
            description="Cost incurred to date"
          />
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Planned Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, metrics.percent_complete_planned)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{formatPercent(metrics.percent_complete_planned)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actual Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      metrics.percent_complete_actual >= metrics.percent_complete_planned
                        ? 'bg-green-500'
                        : 'bg-orange-500'
                    )}
                    style={{ width: `${Math.min(100, metrics.percent_complete_actual)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{formatPercent(metrics.percent_complete_actual)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget Spent</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      metrics.percent_spent <= metrics.percent_complete_actual
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(100, metrics.percent_spent)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{formatPercent(metrics.percent_spent)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EVMMetricsCards
