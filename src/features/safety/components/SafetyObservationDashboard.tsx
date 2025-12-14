/**
 * Safety Observation Dashboard Component
 *
 * Displays analytics and leading indicators for safety observations.
 * Includes observation trends, category breakdown, and corrective action status.
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  useObservationStats,
  useLeadingIndicators,
  useRecentObservations,
  useObservations,
} from '../hooks/useSafetyObservations'
import { SafetyObservationCard } from './SafetyObservationCard'
import { ObserverLeaderboard } from './ObserverLeaderboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  OBSERVATION_TYPE_CONFIG,
  CATEGORY_CONFIG,
  SafetyObservationType,
  SafetyObservationCategory,
} from '@/types/safety-observations'
import {
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  Plus,
  ArrowRight,
} from 'lucide-react'

interface SafetyObservationDashboardProps {
  projectId: string
  companyId?: string
  onCreateObservation?: () => void
  className?: string
}

const TYPE_ICONS: Record<SafetyObservationType, React.ComponentType<{ className?: string }>> = {
  safe_behavior: ThumbsUp,
  unsafe_condition: AlertTriangle,
  near_miss: AlertCircle,
  best_practice: Award,
}

export function SafetyObservationDashboard({
  projectId,
  companyId,
  onCreateObservation,
  className,
}: SafetyObservationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: stats, isLoading: statsLoading } = useObservationStats(projectId, companyId)
  const { data: indicators, isLoading: indicatorsLoading } = useLeadingIndicators(
    projectId,
    companyId
  )
  const { data: recentObservations, isLoading: recentLoading } = useRecentObservations(
    projectId,
    10
  )
  const { data: actionRequired } = useObservations({
    project_id: projectId,
    status: ['action_required', 'in_progress'],
  })

  const isLoading = statsLoading || indicatorsLoading

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quick Action Button */}
      {onCreateObservation && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Safety Observations</h2>
            <p className="text-gray-500">Track and improve safety performance</p>
          </div>
          <Button onClick={onCreateObservation} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Observation
          </Button>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Observations */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Observations</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.total_observations || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats?.last_30_days || 0} in last 30 days
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positive Ratio */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Positive Ratio</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {indicators?.positive_observation_ratio.toFixed(0) || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Safe behaviors recognized</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Closure Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Action Closure Rate</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {indicators?.corrective_action_closure_rate.toFixed(0) || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats?.action_required_count || 0} pending
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participation Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Participation Rate</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {indicators?.participation_rate.toFixed(0) || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Active observers</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="actions">Actions ({actionRequired?.length || 0})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Observation Type Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Observation Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(
                    Object.entries(OBSERVATION_TYPE_CONFIG) as [
                      SafetyObservationType,
                      (typeof OBSERVATION_TYPE_CONFIG)[SafetyObservationType],
                    ][]
                  ).map(([type, config]) => {
                    const count = stats?.by_type[type] || 0
                    const Icon = TYPE_ICONS[type]
                    const percentage =
                      stats?.total_observations > 0
                        ? ((count / stats.total_observations) * 100).toFixed(0)
                        : 0

                    const colorClasses: Record<string, string> = {
                      green: 'bg-green-100 text-green-700',
                      yellow: 'bg-yellow-100 text-yellow-700',
                      orange: 'bg-orange-100 text-orange-700',
                      blue: 'bg-blue-100 text-blue-700',
                    }

                    return (
                      <div
                        key={type}
                        className={cn(
                          'p-4 rounded-lg text-center',
                          colorClasses[config.color]
                        )}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-sm">{config.label}</p>
                        <p className="text-xs opacity-75">{percentage}%</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Critical/High Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Severity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Critical</span>
                  <Badge variant="destructive">{stats?.critical_count || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">High</span>
                  <Badge className="bg-orange-500">{stats?.high_severity_count || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Review</span>
                  <Badge variant="secondary">{stats?.pending_count || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Resolved</span>
                  <Badge className="bg-green-500">{stats?.resolved_count || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Observations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Observations
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : recentObservations?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No observations yet. Submit the first one!</p>
                  {onCreateObservation && (
                    <Button onClick={onCreateObservation} className="mt-4">
                      Create Observation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentObservations?.slice(0, 5).map((observation) => (
                    <SafetyObservationCard
                      key={observation.id}
                      observation={observation}
                      linkTo={`/safety/observations/${observation.id}`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  30-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {stats?.trends.map((day, index) => {
                    const maxCount = Math.max(...(stats?.trends.map((d) => d.count) || [1]))
                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0

                    return (
                      <div
                        key={day.date}
                        className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.date}: ${day.count} observations`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {indicators?.category_breakdown.slice(0, 6).map((cat) => {
                    const percentage =
                      stats?.total_observations > 0
                        ? (cat.count / stats.total_observations) * 100
                        : 0

                    const TrendIcon =
                      cat.trend === 'up'
                        ? TrendingUp
                        : cat.trend === 'down'
                          ? TrendingDown
                          : Minus
                    const trendColor =
                      cat.trend === 'up'
                        ? 'text-green-500'
                        : cat.trend === 'down'
                          ? 'text-red-500'
                          : 'text-gray-400'

                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {CATEGORY_CONFIG[cat.category].label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{cat.count}</span>
                            <TrendIcon className={cn('h-4 w-4', trendColor)} />
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leading Indicators Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Leading Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {indicators?.observation_rate.toFixed(1) || 0}
                  </p>
                  <p className="text-sm text-gray-500">Observations per Observer</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {indicators?.positive_observation_ratio.toFixed(0) || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Positive Observations</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {indicators?.average_resolution_time || 0}
                  </p>
                  <p className="text-sm text-gray-500">Avg. Days to Resolve</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {indicators?.participation_rate.toFixed(0) || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Team Participation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Pending Corrective Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionRequired?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All corrective actions are resolved!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionRequired?.map((observation) => (
                    <SafetyObservationCard
                      key={observation.id}
                      observation={observation}
                      linkTo={`/safety/observations/${observation.id}`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <ObserverLeaderboard projectId={projectId} companyId={companyId} showMyStats />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SafetyObservationDashboard
