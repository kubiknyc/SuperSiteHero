/**
 * Submittal Lead Time Analytics Component
 *
 * Displays visual analytics for submittal approval timelines.
 * Includes average times, trends, and bottleneck identification.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Timer,
  CalendarDays,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react'
import { useSubmittalLeadTime, type LeadTimeStats, type LeadTimeFilters } from '../hooks/useSubmittalLeadTime'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface LeadTimeAnalyticsProps {
  projectId?: string
  workflowTypeId?: string
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#64748b',
  info: '#06b6d4',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  under_review: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  resubmit_required: '#f97316',
}

const EXPECTED_TIMES = {
  submitToReview: 3,
  reviewToApproval: 7,
  total: 14,
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  status?: 'success' | 'warning' | 'danger' | 'neutral'
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, status = 'neutral' }: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200',
    neutral: 'text-gray-600 bg-gray-50 border-gray-200',
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  }

  return (
    <Card className={cn('border', statusColors[status].split(' ').slice(2).join(' '))}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', statusColors[status].split(' ').slice(1, 2).join(' '))}>
            <Icon className={cn('h-5 w-5', statusColors[status].split(' ')[0])} />
          </div>
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1 text-sm', trendColors[trend])}>
              {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

interface BottleneckCardProps {
  bottlenecks: LeadTimeStats['bottlenecks']
}

function BottleneckCard({ bottlenecks }: BottleneckCardProps) {
  const significantBottlenecks = bottlenecks.filter(b => b.averageDays > 2)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Bottleneck Analysis
        </CardTitle>
        <CardDescription>Stages taking longer than expected</CardDescription>
      </CardHeader>
      <CardContent>
        {significantBottlenecks.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No significant bottlenecks detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {significantBottlenecks.slice(0, 4).map((bottleneck) => {
              const isAboveExpected = bottleneck.stage === 'under_review'
                ? bottleneck.averageDays > EXPECTED_TIMES.reviewToApproval
                : bottleneck.averageDays > EXPECTED_TIMES.submitToReview

              return (
                <div key={bottleneck.stage} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[bottleneck.stage] || COLORS.secondary }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {bottleneck.stage.replace(/_/g, ' ')}
                      </p>
                      <span className={cn(
                        'text-sm font-semibold',
                        isAboveExpected ? 'text-red-600' : 'text-gray-600'
                      )}>
                        {bottleneck.averageDays} days avg
                      </span>
                    </div>
                    <Progress
                      value={Math.min((bottleneck.averageDays / 14) * 100, 100)}
                      className="h-1.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {bottleneck.maxDays} days | {bottleneck.count} submittals
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function LeadTimeAnalytics({ projectId: propProjectId, workflowTypeId: propWorkflowTypeId, className }: LeadTimeAnalyticsProps) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>()
  const projectId = propProjectId || routeProjectId

  // For now, we'll need the workflow type ID passed in or fetched separately
  const workflowTypeId = propWorkflowTypeId

  const [filters, setFilters] = useState<LeadTimeFilters>({})
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | 'all'>('90')

  // Calculate date range filter
  const dateRangeFilter = useMemo(() => {
    if (dateRange === 'all') return undefined

    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - parseInt(dateRange))

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }, [dateRange])

  const { submittals, stats, isLoading } = useSubmittalLeadTime(projectId, workflowTypeId, {
    ...filters,
    dateRange: dateRangeFilter,
  })

  // Prepare chart data
  const monthlyChartData = useMemo(() => {
    if (!stats?.byMonth) return []
    return stats.byMonth.map(m => ({
      name: `${m.month}/${m.year.toString().slice(-2)}`,
      submitted: m.submitted,
      approved: m.approved,
      rejected: m.rejected,
      avgLeadTime: m.averageLeadTime,
    }))
  }, [stats])

  const statusPieData = useMemo(() => {
    if (!stats?.byStatus) return []
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      fill: STATUS_COLORS[status] || COLORS.secondary,
    }))
  }, [stats])

  const leadTimeDistribution = useMemo(() => {
    if (!submittals) return []

    const ranges = [
      { name: '0-7 days', min: 0, max: 7, count: 0 },
      { name: '8-14 days', min: 8, max: 14, count: 0 },
      { name: '15-21 days', min: 15, max: 21, count: 0 },
      { name: '22-30 days', min: 22, max: 30, count: 0 },
      { name: '30+ days', min: 31, max: Infinity, count: 0 },
    ]

    submittals
      .filter(s => s.leadTimeMetrics.submittedToApproval !== null)
      .forEach(s => {
        const days = s.leadTimeMetrics.submittedToApproval!
        const range = ranges.find(r => days >= r.min && days <= r.max)
        if (range) range.count++
      })

    return ranges
  }, [submittals])

  // Loading state
  if (isLoading || !workflowTypeId) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No submittal data available</p>
        </CardContent>
      </Card>
    )
  }

  // Determine status based on average lead time
  const getLeadTimeStatus = (days: number): 'success' | 'warning' | 'danger' => {
    if (days <= EXPECTED_TIMES.total) return 'success'
    if (days <= EXPECTED_TIMES.total * 1.5) return 'warning'
    return 'danger'
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Date Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Timer className="h-6 w-6" />
            Lead Time Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing {stats.totalSubmittals} submittals
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
          <SelectTrigger className="w-[150px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Lead Time"
          value={`${stats.averageLeadTimeDays} days`}
          subtitle={`Target: ${EXPECTED_TIMES.total} days`}
          icon={Clock}
          status={getLeadTimeStatus(stats.averageLeadTimeDays)}
        />
        <MetricCard
          title="Submit to Review"
          value={`${stats.averageSubmitToReviewDays} days`}
          subtitle={`Target: ${EXPECTED_TIMES.submitToReview} days`}
          icon={Timer}
          status={stats.averageSubmitToReviewDays <= EXPECTED_TIMES.submitToReview ? 'success' : 'warning'}
        />
        <MetricCard
          title="Review to Approval"
          value={`${stats.averageReviewToApprovalDays} days`}
          subtitle={`Target: ${EXPECTED_TIMES.reviewToApproval} days`}
          icon={Target}
          status={stats.averageReviewToApprovalDays <= EXPECTED_TIMES.reviewToApproval ? 'success' : 'warning'}
        />
        <MetricCard
          title="Currently Overdue"
          value={stats.overdueCount}
          subtitle={`of ${stats.pendingCount} pending`}
          icon={AlertTriangle}
          status={stats.overdueCount === 0 ? 'success' : stats.overdueCount <= 3 ? 'warning' : 'danger'}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Submittal Activity</CardTitle>
              <CardDescription>Submissions and approvals over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submitted" fill={COLORS.primary} name="Submitted" />
                  <Bar dataKey="approved" fill={COLORS.success} name="Approved" />
                  <Bar dataKey="rejected" fill={COLORS.danger} name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Average Lead Time Trend</CardTitle>
              <CardDescription>Days from submission to approval</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avgLeadTime"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                    name="Avg Lead Time (days)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Time Distribution</CardTitle>
              <CardDescription>How long submittals typically take</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadTimeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.primary} name="Submittals" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.fastestApprovalDays}</p>
                  <p className="text-xs text-gray-500">Fastest (days)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.medianLeadTimeDays}</p>
                  <p className="text-xs text-gray-500">Median (days)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.slowestApprovalDays}</p>
                  <p className="text-xs text-gray-500">Slowest (days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submittals by Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                        labelLine={false}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2">
                  {statusPieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm text-gray-600 capitalize">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottlenecks" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BottleneckCard bottlenecks={stats.bottlenecks} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">90th Percentile</span>
                    <span className="text-sm font-semibold">{stats.percentile90Days} days</span>
                  </div>
                  <Progress value={(EXPECTED_TIMES.total / stats.percentile90Days) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    90% of submittals complete within {stats.percentile90Days} days
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Business Days Avg</span>
                    <span className="text-sm font-semibold">{stats.averageBusinessDays} days</span>
                  </div>
                  <Progress value={(10 / stats.averageBusinessDays) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Excluding weekends
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {stats.averageSubmitToReviewDays > EXPECTED_TIMES.submitToReview && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        Consider expediting initial review assignment
                      </li>
                    )}
                    {stats.averageReviewToApprovalDays > EXPECTED_TIMES.reviewToApproval && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        Review process may need additional resources
                      </li>
                    )}
                    {stats.overdueCount > 0 && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {stats.overdueCount} overdue submittals need attention
                      </li>
                    )}
                    {stats.averageLeadTimeDays <= EXPECTED_TIMES.total && stats.overdueCount === 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        Submittal process is performing well
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LeadTimeAnalytics
