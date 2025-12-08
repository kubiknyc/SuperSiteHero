// File: src/features/look-ahead/components/PPCDashboard.tsx
// PPC (Percent Plan Complete) Dashboard for Last Planner System

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  LookAheadActivityWithDetails,
  LookAheadSnapshot,
  MakeReadyStatus,
  VarianceCategory,
  PPCMetrics,
} from '@/types/look-ahead'
import {
  MAKE_READY_STATUS_CONFIG,
  VARIANCE_CATEGORY_CONFIG,
  formatPPC,
  getPPCStatusColor,
  calculateReliabilityIndex,
  groupActivitiesByMakeReadyStatus,
} from '@/types/look-ahead'

// =============================================
// PPC Gauge Component
// =============================================

interface PPCGaugeProps {
  ppc: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

function PPCGauge({ ppc, size = 'md', showLabel = true, className }: PPCGaugeProps) {
  const { color, bgColor, label } = getPPCStatusColor(ppc)

  const sizeClasses = {
    sm: { container: 'h-16 w-16', text: 'text-lg', label: 'text-[10px]' },
    md: { container: 'h-24 w-24', text: 'text-2xl', label: 'text-xs' },
    lg: { container: 'h-32 w-32', text: 'text-3xl', label: 'text-sm' },
  }

  const circumference = 2 * Math.PI * 40
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (ppc / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', sizeClasses[size].container, className)}>
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={color}
          style={{
            strokeDasharray,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', sizeClasses[size].text, color)}>{ppc}%</span>
        {showLabel && (
          <span className={cn('font-medium', sizeClasses[size].label, color)}>{label}</span>
        )}
      </div>
    </div>
  )
}

// =============================================
// Make Ready Status Cards
// =============================================

interface MakeReadyCardProps {
  status: MakeReadyStatus
  count: number
  total: number
  onClick?: () => void
}

function MakeReadyCard({ status, count, total, onClick }: MakeReadyCardProps) {
  const config = MAKE_READY_STATUS_CONFIG[status]
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col p-4 rounded-lg border transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        config.bgColor
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('font-semibold text-sm', config.color)}>{config.label}</span>
        <span className={cn('text-2xl font-bold', config.color)}>{count}</span>
      </div>
      <div className="w-full bg-white/50 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full', config.color.replace('text-', 'bg-'))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 mt-1">{percentage}% of activities</span>
    </button>
  )
}

// =============================================
// Variance Analysis
// =============================================

interface VarianceAnalysisProps {
  varianceReasons: Array<{ category: VarianceCategory; description: string; activities_affected: number }>
}

function VarianceAnalysis({ varianceReasons }: VarianceAnalysisProps) {
  if (!varianceReasons || varianceReasons.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No variance reasons recorded
      </div>
    )
  }

  // Group by category
  const grouped = varianceReasons.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = { count: 0, activities: 0 }
    }
    acc[reason.category].count++
    acc[reason.category].activities += reason.activities_affected
    return acc
  }, {} as Record<VarianceCategory, { count: number; activities: number }>)

  const sortedCategories = Object.entries(grouped).sort((a, b) => b[1].activities - a[1].activities)

  return (
    <div className="space-y-2">
      {sortedCategories.map(([category, data]) => {
        const config = VARIANCE_CATEGORY_CONFIG[category as VarianceCategory]
        return (
          <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{config.label}</span>
              <span className="text-xs text-gray-500">{config.description}</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-orange-600">{data.activities}</span>
              <span className="text-xs text-gray-500 block">activities</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================
// PPC Trend Chart (simplified)
// =============================================

interface PPCTrendProps {
  snapshots: LookAheadSnapshot[]
}

function PPCTrend({ snapshots }: PPCTrendProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No historical data available
      </div>
    )
  }

  const maxPPC = 100
  const recentSnapshots = snapshots.slice(-8)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {recentSnapshots.map((snapshot, index) => {
          const height = (snapshot.ppc_percentage / maxPPC) * 100
          const { color } = getPPCStatusColor(snapshot.ppc_percentage)

          return (
            <div
              key={snapshot.id || index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
                <div
                  className={cn('absolute bottom-0 w-full rounded-t transition-all', color.replace('text-', 'bg-'))}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 truncate w-full text-center">
                {new Date(snapshot.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  )
}

// =============================================
// Main PPC Dashboard
// =============================================

interface PPCDashboardProps {
  activities: LookAheadActivityWithDetails[]
  snapshots?: LookAheadSnapshot[]
  currentSnapshot?: LookAheadSnapshot | null
  metrics?: PPCMetrics | null
  className?: string
  onMakeReadyClick?: (status: MakeReadyStatus) => void
}

/**
 * PPC (Percent Plan Complete) Dashboard
 * Displays Last Planner System metrics and analysis
 *
 * @example
 * ```tsx
 * <PPCDashboard
 *   activities={weekActivities}
 *   snapshots={historicalSnapshots}
 *   currentSnapshot={thisWeekSnapshot}
 * />
 * ```
 */
export function PPCDashboard({
  activities,
  snapshots = [],
  currentSnapshot,
  metrics,
  className,
  onMakeReadyClick,
}: PPCDashboardProps) {
  // Calculate metrics from activities if not provided
  const calculatedPPC = currentSnapshot?.ppc_percentage ??
    (activities.length > 0
      ? Math.round((activities.filter(a => a.status === 'completed').length / activities.length) * 100)
      : 0)

  const reliabilityIndex = currentSnapshot?.reliability_index ?? calculateReliabilityIndex(activities)

  const grouped = groupActivitiesByMakeReadyStatus(activities)

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {/* PPC Gauge Card */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Current Week PPC</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <PPCGauge ppc={calculatedPPC} size="lg" />
          {metrics && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              {metrics.trend === 'up' && <span className="text-green-600">+{metrics.ppcChange}%</span>}
              {metrics.trend === 'down' && <span className="text-red-600">{metrics.ppcChange}%</span>}
              {metrics.trend === 'stable' && <span className="text-gray-500">No change</span>}
              <span className="text-gray-500">vs last week</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reliability Index Card */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Reliability Index</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <PPCGauge ppc={reliabilityIndex} size="lg" showLabel={false} />
          <p className="mt-2 text-sm text-gray-600 text-center">
            Commitments completed as planned
          </p>
        </CardContent>
      </Card>

      {/* Activity Summary Card */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{activities.length}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {activities.filter(a => a.status === 'in_progress').length}
              </div>
              <div className="text-xs text-gray-600">In Progress</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.status === 'blocked' || a.status === 'delayed').length}
              </div>
              <div className="text-xs text-gray-600">Blocked/Delayed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Make Ready Status */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Make Ready Status (Last Planner)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['will_do', 'should_do', 'can_do', 'did_do'] as MakeReadyStatus[]).map((status) => (
              <MakeReadyCard
                key={status}
                status={status}
                count={grouped[status].length}
                total={activities.length}
                onClick={() => onMakeReadyClick?.(status)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PPC Trend */}
      <Card className="md:col-span-1 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">PPC Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <PPCTrend snapshots={snapshots} />
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      {currentSnapshot?.variance_reasons && currentSnapshot.variance_reasons.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <VarianceAnalysis varianceReasons={currentSnapshot.variance_reasons} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PPCDashboard
