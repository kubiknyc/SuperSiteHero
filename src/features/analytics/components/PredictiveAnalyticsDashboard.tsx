// File: /src/features/analytics/components/PredictiveAnalyticsDashboard.tsx
// Main dashboard component for predictive analytics

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from '@/components/ui'
import {
  useAnalyticsDashboard,
  useRefreshAnalytics,
  useMLStatus,
} from '../hooks/useAnalytics'
import { RiskScoreGauge, MiniRiskScore } from './RiskScoreGauge'
import { BudgetPredictionCard, SchedulePredictionCard } from './PredictionCard'
import { RecommendationsList, RecommendationSummary } from './RecommendationsList'
import { RiskTrendChart, ProgressTrendChart, CostTrendChart } from './TrendChart'

interface PredictiveAnalyticsDashboardProps {
  projectId: string
  className?: string
}

/**
 * PredictiveAnalyticsDashboard Component
 *
 * Main dashboard for predictive analytics featuring:
 * - Risk score overview with gauges
 * - Budget and schedule predictions
 * - Trend charts
 * - AI recommendations
 *
 * Usage:
 * ```tsx
 * <PredictiveAnalyticsDashboard projectId="proj-123" />
 * ```
 */
export function PredictiveAnalyticsDashboard({
  projectId,
  className,
}: PredictiveAnalyticsDashboardProps) {
  const { data: dashboard, isLoading, error } = useAnalyticsDashboard(projectId)
  const refreshMutation = useRefreshAnalytics()
  const { data: mlStatus } = useMLStatus()

  const handleRefresh = () => {
    refreshMutation.mutate(projectId)
  }

  if (isLoading) {
    return <DashboardSkeleton className={className} />
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-error">
            <span className="text-3xl">⚠️</span>
            <p className="mt-2 font-medium">Failed to load analytics</p>
            <p className="text-sm text-muted">{(error as Error).message}</p>
            <Button variant="outline" className="mt-4" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!dashboard) {
    return (
      <Card className={cn('border-border', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-muted">
            <span className="text-3xl">📊</span>
            <p className="mt-2">No analytics data available</p>
            <p className="text-sm">Generate your first prediction to get started</p>
            <Button className="mt-4" onClick={handleRefresh}>
              Generate Prediction
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground" className="heading-section">
            Predictive Analytics
          </h2>
          <p className="text-sm text-muted">
            {dashboard.project_name} • Last updated{' '}
            {new Date(dashboard.last_updated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mlStatus && (
            <Badge variant="outline" className="text-xs">
              {mlStatus.usingMLModels ? '🧠 ML Active' : '📐 Heuristic Mode'}
            </Badge>
          )}
          <Button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            variant="outline"
          >
            {refreshMutation.isPending ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Risk Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Assessment</CardTitle>
          <CardDescription>Current risk levels across all dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <RiskScoreGauge
              score={dashboard.current_risk.overall.score}
              level={dashboard.current_risk.overall.level}
              label="Overall"
              size="lg"
            />
            <RiskScoreGauge
              score={dashboard.current_risk.schedule.score}
              level={dashboard.current_risk.schedule.level}
              label="Schedule"
            />
            <RiskScoreGauge
              score={dashboard.current_risk.cost.score}
              level={dashboard.current_risk.cost.level}
              label="Cost"
            />
            <RiskScoreGauge
              score={dashboard.current_risk.operational.score}
              level={dashboard.current_risk.operational.level}
              label="Operational"
            />
          </div>
        </CardContent>
      </Card>

      {/* Predictions */}
      {dashboard.current_prediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BudgetPredictionCard
            prediction={dashboard.current_prediction.budget}
          />
          <SchedulePredictionCard
            prediction={dashboard.current_prediction.schedule}
          />
        </div>
      )}

      {/* Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RiskTrendChart
          data={dashboard.risk_trend}
          title="Risk Score Trend"
        />
        <ProgressTrendChart
          data={dashboard.progress_trend}
          title="Progress Trend"
        />
        <CostTrendChart
          data={dashboard.cost_trend}
          title="Change Order Rate"
        />
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecommendationsList projectId={projectId} maxItems={5} />
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommendation Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                label="Total"
                value={dashboard.recommendation_stats.total}
              />
              <StatItem
                label="Pending"
                value={dashboard.recommendation_stats.pending}
                color="blue"
              />
              <StatItem
                label="Implemented"
                value={dashboard.recommendation_stats.implemented}
                color="green"
              />
              <StatItem
                label="Dismissed"
                value={dashboard.recommendation_stats.dismissed}
                color="gray"
              />
            </div>

            {/* By category */}
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted mb-2">By Category</p>
              <div className="space-y-1">
                {Object.entries(dashboard.recommendation_stats.by_category).map(
                  ([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-secondary">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* By priority */}
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted mb-2">By Priority</p>
              <div className="flex gap-2">
                {dashboard.recommendation_stats.by_priority.critical > 0 && (
                  <Badge variant="outline" className="bg-error-light text-error-dark text-xs">
                    {dashboard.recommendation_stats.by_priority.critical} critical
                  </Badge>
                )}
                {dashboard.recommendation_stats.by_priority.high > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                    {dashboard.recommendation_stats.by_priority.high} high
                  </Badge>
                )}
                {dashboard.recommendation_stats.by_priority.medium > 0 && (
                  <Badge variant="outline" className="bg-warning-light text-amber-700 text-xs">
                    {dashboard.recommendation_stats.by_priority.medium} medium
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model info footer */}
      {dashboard.current_prediction && (
        <div className="text-center text-xs text-disabled">
          Model version: {dashboard.current_prediction.model_version} •
          Generated: {new Date(dashboard.current_prediction.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  )
}

/**
 * Stat item for stats card
 */
interface StatItemProps {
  label: string
  value: number
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray'
}

function StatItem({ label, value, color }: StatItemProps) {
  const colorClass =
    color === 'blue'
      ? 'text-primary'
      : color === 'green'
      ? 'text-success'
      : color === 'amber'
      ? 'text-warning'
      : color === 'red'
      ? 'text-error'
      : 'text-secondary'

  return (
    <div className="bg-surface rounded-lg p-3 text-center">
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/**
 * Dashboard skeleton for loading state
 */
function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded mt-2" />
        </div>
        <div className="h-10 w-24 bg-muted rounded" />
      </div>

      {/* Risk overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-muted rounded-full" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prediction cards */}
      <div className="grid grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-40 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Compact analytics summary widget for project overview
 */
interface AnalyticsSummaryWidgetProps {
  projectId: string
  className?: string
}

export function AnalyticsSummaryWidget({
  projectId,
  className,
}: AnalyticsSummaryWidgetProps) {
  const { data: dashboard, isLoading } = useAnalyticsDashboard(projectId)

  if (isLoading || !dashboard) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <MiniRiskScore
        score={dashboard.current_risk.overall.score}
        level={dashboard.current_risk.overall.level}
      />
      {dashboard.pending_recommendations.length > 0 && (
        <RecommendationSummary projectId={projectId} />
      )}
    </div>
  )
}
