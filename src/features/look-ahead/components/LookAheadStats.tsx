/**
 * Look-Ahead Stats Component
 * Display PPC metrics and activity statistics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type PPCMetrics,
  formatPPC,
  getPPCStatusColor,
} from '@/types/look-ahead'

interface LookAheadStatsProps {
  metrics: PPCMetrics
  isLoading?: boolean
  className?: string
}

export function LookAheadStats({ metrics, isLoading, className }: LookAheadStatsProps) {
  const ppcStatus = getPPCStatusColor(metrics.currentWeekPPC)

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-success" />,
    down: <TrendingDown className="h-4 w-4 text-error" />,
    stable: <Minus className="h-4 w-4 text-disabled" />,
  }

  const trendLabel = {
    up: 'Improving',
    down: 'Declining',
    stable: 'Stable',
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* PPC Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Percent Plan Complete</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className={cn('text-3xl font-bold', ppcStatus.color)}>
              {formatPPC(metrics.currentWeekPPC)}
            </div>
            <Badge className={cn('text-xs', ppcStatus.bgColor, ppcStatus.color)}>
              {ppcStatus.label}
            </Badge>
          </div>
          <div className="mt-2">
            <Progress value={metrics.currentWeekPPC} className="h-2" />
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {trendIcon[metrics.trend]}
            <span>
              {metrics.ppcChange >= 0 ? '+' : ''}
              {metrics.ppcChange.toFixed(1)}% from last week
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Completed Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">{metrics.totalCompleted}</div>
          <p className="text-xs text-muted-foreground mt-1">
            of {metrics.totalPlanned} planned activities
          </p>
          <div className="mt-2">
            <Progress
              value={
                metrics.totalPlanned > 0
                  ? (metrics.totalCompleted / metrics.totalPlanned) * 100
                  : 0
              }
              className="h-2 bg-success-light [&>div]:bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* In Progress / Delayed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-bold text-warning">
                {metrics.totalPlanned - metrics.totalCompleted - metrics.totalBlocked - metrics.totalDelayed}
              </div>
              <p className="text-xs text-muted-foreground">active</p>
            </div>
            {metrics.totalDelayed > 0 && (
              <div>
                <div className="text-xl font-bold text-orange-600">{metrics.totalDelayed}</div>
                <p className="text-xs text-muted-foreground">delayed</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          <AlertTriangle className="h-4 w-4 text-error" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-error">{metrics.totalBlocked}</div>
          <p className="text-xs text-muted-foreground mt-1">activities with open constraints</p>
          {metrics.totalBlocked > 0 && (
            <Badge variant="destructive" className="mt-2">
              Needs attention
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Compact PPC Display
 */
interface PPCBadgeProps {
  ppc: number
  showTrend?: boolean
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export function PPCBadge({ ppc, showTrend = false, trend = 'stable', className }: PPCBadgeProps) {
  const status = getPPCStatusColor(ppc)

  return (
    <Badge className={cn('gap-1', status.bgColor, status.color, className)}>
      <Target className="h-3 w-3" />
      {formatPPC(ppc)}
      {showTrend && (
        <>
          {trend === 'up' && <TrendingUp className="h-3 w-3 ml-1" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 ml-1" />}
          {trend === 'stable' && <Minus className="h-3 w-3 ml-1" />}
        </>
      )}
    </Badge>
  )
}

/**
 * Activity Status Summary
 */
interface ActivityStatusSummaryProps {
  activitiesByStatus: Record<string, number>
  className?: string
}

export function ActivityStatusSummary({ activitiesByStatus, className }: ActivityStatusSummaryProps) {
  const total = Object.values(activitiesByStatus).reduce((a, b) => a + b, 0)

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; Icon: typeof CheckCircle }> = {
    completed: { label: 'Completed', color: 'text-success-dark', bgColor: 'bg-success-light', Icon: CheckCircle },
    in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-warning-light', Icon: Clock },
    planned: { label: 'Planned', color: 'text-primary-hover', bgColor: 'bg-info-light', Icon: Calendar },
    delayed: { label: 'Delayed', color: 'text-orange-700', bgColor: 'bg-orange-100', Icon: Clock },
    blocked: { label: 'Blocked', color: 'text-error-dark', bgColor: 'bg-error-light', Icon: AlertTriangle },
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(activitiesByStatus).map(([status, count]) => {
            const config = statusConfig[status]
            if (!config || count === 0) {return null}

            const percentage = total > 0 ? (count / total) * 100 : 0

            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <config.Icon className={cn('h-4 w-4', config.color)} />
                    <span>{config.label}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress
                  value={percentage}
                  className={cn('h-2', config.bgColor)}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span className="text-sm font-medium">Total Activities</span>
          <span className="text-lg font-bold">{total}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Trade Distribution Chart
 */
interface TradeDistributionProps {
  activitiesByTrade: Record<string, number>
  className?: string
}

export function TradeDistribution({ activitiesByTrade, className }: TradeDistributionProps) {
  const total = Object.values(activitiesByTrade).reduce((a, b) => a + b, 0)
  const sortedTrades = Object.entries(activitiesByTrade).sort((a, b) => b[1] - a[1])

  const tradeColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-warning',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-orange-500',
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Activities by Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedTrades.slice(0, 8).map(([trade, count], index) => {
            const percentage = total > 0 ? (count / total) * 100 : 0

            return (
              <div key={trade}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{trade}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', tradeColors[index % tradeColors.length])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {sortedTrades.length > 8 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{sortedTrades.length - 8} more trades
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default LookAheadStats
