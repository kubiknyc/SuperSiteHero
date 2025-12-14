/**
 * Near-Miss Trend Dashboard Component
 *
 * Comprehensive dashboard for near-miss trend analysis including:
 * - Summary metrics
 * - Trend charts
 * - Heat maps
 * - Pattern insights
 * - Alerts
 * - Recommendations
 */

import { useMemo, useState } from 'react'
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useNearMissAnalyticsDashboard, useUpdatePattern } from '../hooks/useNearMissAnalytics'
import { LocationHeatMap, TimeHeatMap } from './NearMissHeatMap'
import { PatternsList, AlertsList, RecommendationsList } from './PatternInsights'
import {
  generatePatternInsights,
  generateRecommendations,
  detectFrequencySpikesFromTrends,
  detectPeakHours,
} from '../utils/trendAnalysis'
import type {
  DailyTrendPoint,
  RootCauseParetoData,
  TrendDirection,
  PatternStatus,
} from '@/types/near-miss-analytics'
import { POTENTIAL_SEVERITY_CONFIG, DAY_OF_WEEK_SHORT } from '@/types/near-miss-analytics' // eslint-disable-line no-duplicate-imports
import { ROOT_CAUSE_LABELS, type RootCauseCategory } from '@/types/safety-incidents'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface NearMissTrendDashboardProps {
  companyId: string
  projectId?: string
  className?: string
}

export function NearMissTrendDashboard({
  companyId,
  projectId,
  className,
}: NearMissTrendDashboardProps) {
  const [dateRange, setDateRange] = useState<'30' | '60' | '90'>('30')
  const [activeTab, setActiveTab] = useState('overview')

  const {
    summary,
    dailyTrends,
    heatMap,
    timePatterns,
    paretoData,
    patterns,
    alerts,
    benchmarks: _benchmarks, // Available for future benchmark comparison
    isLoading,
    hasError,
    refetch,
  } = useNearMissAnalyticsDashboard(companyId, projectId)

  const updatePatternMutation = useUpdatePattern()

  // Generate insights from the data (available for future use)
  const _insights = useMemo(() => {
    if (!dailyTrends || !heatMap || !timePatterns || !paretoData) return null

    return generatePatternInsights({
      trends: dailyTrends,
      heatMap,
      timeMatrix: timePatterns,
      paretoData,
      spikes: detectFrequencySpikesFromTrends(dailyTrends),
    })
  }, [dailyTrends, heatMap, timePatterns, paretoData])

  // Generate recommendations
  const recommendations = useMemo(() => {
    if (!heatMap || !paretoData || !timePatterns || !summary) return []

    const topRootCauses = summary.top_root_causes.map(c => ({
      category: c.category,
      count: c.count,
    }))

    const peakHours = detectPeakHours(timePatterns, 3)

    return generateRecommendations({
      topLocations: heatMap.slice(0, 3),
      topRootCauses,
      peakHours,
      trendDirection: summary.trend_vs_previous_30_days.direction,
    })
  }, [heatMap, paretoData, timePatterns, summary])

  const handleUpdatePattern = (id: string, status: PatternStatus, notes?: string) => {
    updatePatternMutation.mutate({ id, data: { status, notes } })
  }

  if (hasError) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="font-medium mb-2">Failed to load analytics</h3>
          <p className="text-muted-foreground text-sm mb-4">
            There was an error loading the near-miss analytics data.
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Near-Miss Trend Analysis</h2>
          <p className="text-muted-foreground">
            Identify patterns before they become incidents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v: '30' | '60' | '90') => setDateRange(v)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="30-Day Near-Misses"
          value={summary?.total_near_misses_30_days}
          trend={summary?.trend_vs_previous_30_days}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Active Alerts"
          value={summary?.active_alerts_count}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Unresolved Patterns"
          value={summary?.unresolved_patterns_count}
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Reporting Rate"
          value={summary?.reporting_rate}
          subtitle={`Benchmark: ${summary?.industry_benchmark_rate || 10}`}
          status={summary?.is_above_benchmark ? 'good' : 'warning'}
          isLoading={isLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="root-causes">Root Causes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <TrendChart data={dailyTrends} isLoading={isLoading} />

            {/* Alerts List */}
            <AlertsList
              alerts={alerts}
              isLoading={isLoading}
              onDismiss={_id => {
                // Would call dismiss mutation
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Heat Map */}
            <TimeHeatMap data={timePatterns} isLoading={isLoading} />

            {/* Recommendations */}
            <RecommendationsList recommendations={recommendations} isLoading={isLoading} />
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <TrendChart data={dailyTrends} isLoading={isLoading} height={350} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SeverityDistributionChart data={dailyTrends} isLoading={isLoading} />
            <DayOfWeekChart data={timePatterns} isLoading={isLoading} />
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LocationHeatMap data={heatMap} isLoading={isLoading} maxItems={15} />
            <TimeHeatMap data={timePatterns} isLoading={isLoading} />
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PatternsList
              patterns={patterns}
              isLoading={isLoading}
              onUpdatePattern={handleUpdatePattern}
            />
            <RecommendationsList recommendations={recommendations} isLoading={isLoading} />
          </div>
        </TabsContent>

        {/* Root Causes Tab */}
        <TabsContent value="root-causes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ParetoChart data={paretoData} isLoading={isLoading} />
            <RootCausePieChart data={paretoData} isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Summary Card Component
// ============================================================================

interface SummaryCardProps {
  title: string
  value?: number
  trend?: { change_percentage: number; direction: TrendDirection }
  subtitle?: string
  icon?: React.ReactNode
  status?: 'good' | 'warning' | 'critical'
  isLoading?: boolean
}

function SummaryCard({
  title,
  value,
  trend,
  subtitle,
  icon,
  status,
  isLoading,
}: SummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    )
  }

  const TrendIcon =
    trend?.direction === 'increasing'
      ? ArrowUp
      : trend?.direction === 'decreasing'
        ? ArrowDown
        : ArrowRight

  const trendColor =
    trend?.direction === 'increasing'
      ? 'text-red-500' // Increasing near-misses is concerning
      : trend?.direction === 'decreasing'
        ? 'text-green-500'
        : 'text-gray-500'

  const statusColor =
    status === 'good'
      ? 'text-green-500'
      : status === 'warning'
        ? 'text-amber-500'
        : status === 'critical'
          ? 'text-red-500'
          : ''

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', statusColor)}>{value ?? '-'}</span>
          {trend && (
            <span className={cn('text-sm flex items-center', trendColor)}>
              <TrendIcon className="h-3 w-3 mr-0.5" />
              {Math.abs(trend.change_percentage)}%
            </span>
          )}
        </div>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Trend Chart Component
// ============================================================================

interface TrendChartProps {
  data: DailyTrendPoint[] | undefined
  isLoading?: boolean
  height?: number
}

function TrendChart({ data, isLoading, height = 250 }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-muted-foreground text-sm">No trend data available</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Daily Near-Miss Trend
        </CardTitle>
        <CardDescription>
          Near-miss incidents over time with severity breakdown
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as DailyTrendPoint
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-medium mb-2">{label}</p>
                    <div className="space-y-1 text-xs">
                      <p>Total: {d.total_count}</p>
                      {d.fatality_potential_count > 0 && (
                        <p className="text-purple-600">
                          Fatality potential: {d.fatality_potential_count}
                        </p>
                      )}
                      {d.lost_time_potential_count > 0 && (
                        <p className="text-red-600">
                          Lost time potential: {d.lost_time_potential_count}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="total_count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#totalGradient)"
              name="Total"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Severity Distribution Chart
// ============================================================================

interface SeverityDistributionChartProps {
  data: DailyTrendPoint[] | undefined
  isLoading?: boolean
}

function SeverityDistributionChart({ data, isLoading }: SeverityDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!data) return []

    const totals = {
      fatality: 0,
      lost_time: 0,
      medical_treatment: 0,
      first_aid: 0,
    }

    data.forEach(d => {
      totals.fatality += d.fatality_potential_count
      totals.lost_time += d.lost_time_potential_count
      totals.medical_treatment += d.medical_treatment_potential_count
      totals.first_aid += d.first_aid_potential_count
    })

    return Object.entries(totals)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => ({
        severity,
        count,
        label: POTENTIAL_SEVERITY_CONFIG[severity as keyof typeof POTENTIAL_SEVERITY_CONFIG]?.label || severity,
        color: POTENTIAL_SEVERITY_CONFIG[severity as keyof typeof POTENTIAL_SEVERITY_CONFIG]?.color || '#6b7280',
      }))
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Potential Severity Distribution</CardTitle>
        <CardDescription>What could have happened if these became incidents</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Day of Week Chart
// ============================================================================

interface DayOfWeekChartProps {
  data: { matrix: number[][]; totalIncidents: number } | undefined
  isLoading?: boolean
}

function DayOfWeekChart({ data, isLoading }: DayOfWeekChartProps) {
  const chartData = useMemo(() => {
    if (!data) return []

    const dayCounts = Array(7).fill(0)
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        dayCounts[day] += data.matrix[hour][day]
      }
    }

    return dayCounts.map((count, index) => ({
      day: DAY_OF_WEEK_SHORT[index],
      count,
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Incidents by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Pareto Chart Component
// ============================================================================

interface ParetoChartProps {
  data: RootCauseParetoData[] | undefined
  isLoading?: boolean
}

function ParetoChart({ data, isLoading }: ParetoChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Root Cause Pareto Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">No root cause data available</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.slice(0, 8).map(d => ({
    ...d,
    label: ROOT_CAUSE_LABELS[d.root_cause_category as RootCauseCategory] || d.root_cause_category,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Root Cause Pareto Analysis</CardTitle>
        <CardDescription>
          Focus on the vital few causes that account for most incidents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Cumulative %') return [`${value}%`, name]
                return [value, name]
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="Count"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative_percentage"
              name="Cumulative %"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Root Cause Pie Chart
// ============================================================================

interface RootCausePieChartProps {
  data: RootCauseParetoData[] | undefined
  isLoading?: boolean
}

function RootCausePieChart({ data, isLoading }: RootCausePieChartProps) {
  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Root Cause Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.slice(0, 8).map(d => ({
    ...d,
    name: ROOT_CAUSE_LABELS[d.root_cause_category as RootCauseCategory] || d.root_cause_category,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Root Cause Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Count']} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default NearMissTrendDashboard
