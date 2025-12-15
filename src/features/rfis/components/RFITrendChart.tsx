/**
 * RFI Trend Chart Component
 *
 * Visualization component for displaying RFI response time trends over time.
 * Supports line charts, bar charts, and trend indicators.
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  ResponseTimeTrends,
  ResponseTimeTrendPoint,
  TrendDirection,
  ResponseTimeByPriority,
  ResponseTimeByAssignee,
} from '@/types/rfi-response-analytics'

// ============================================================================
// Types
// ============================================================================

interface RFITrendChartProps {
  data: ResponseTimeTrends
  title?: string
  height?: number
  showMovingAverage?: boolean
  className?: string
}

interface RFIPriorityChartProps {
  data: ResponseTimeByPriority[]
  title?: string
  height?: number
  className?: string
}

interface RFIAssigneeChartProps {
  data: ResponseTimeByAssignee[]
  title?: string
  height?: number
  maxAssignees?: number
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date for chart display
 */
function formatChartDate(dateStr: string, granularity: 'day' | 'week' | 'month'): string {
  const date = new Date(dateStr)

  switch (granularity) {
    case 'day':
      return format(date, 'MMM d')
    case 'week':
      return format(date, 'MMM d')
    case 'month':
      return format(date, 'MMM yyyy')
    default:
      return format(date, 'MMM d')
  }
}

/**
 * Get trend indicator icon
 */
function getTrendIcon(trend: TrendDirection): React.ReactNode {
  switch (trend) {
    case 'improving':
      return <TrendingDown className="w-4 h-4 text-green-600" />
    case 'declining':
      return <TrendingUp className="w-4 h-4 text-red-600" />
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-600" />
  }
}

/**
 * Get trend badge variant
 */
function getTrendBadge(trend: TrendDirection, percentageChange: number): React.ReactNode {
  const absChange = Math.abs(percentageChange)

  switch (trend) {
    case 'improving':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <TrendingDown className="w-3 h-3 mr-1" />
          Improving ({absChange.toFixed(1)}%)
        </Badge>
      )
    case 'declining':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <TrendingUp className="w-3 h-3 mr-1" />
          Declining ({absChange.toFixed(1)}%)
        </Badge>
      )
    case 'stable':
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          <Minus className="w-3 h-3 mr-1" />
          Stable
        </Badge>
      )
  }
}

// ============================================================================
// Response Time Trend Chart
// ============================================================================

/**
 * RFITrendChart Component
 *
 * Displays response time trends over time with optional moving averages.
 *
 * @example
 * ```tsx
 * <RFITrendChart
 *   data={trendsData}
 *   title="Response Time Trends"
 *   showMovingAverage={true}
 * />
 * ```
 */
export function RFITrendChart({
  data,
  title = 'Response Time Trends',
  height = 300,
  showMovingAverage = true,
  className,
}: RFITrendChartProps) {
  const formattedData = useMemo(() => {
    return data.dataPoints.map((point, index) => {
      const movingAvg = data.movingAverages[index]

      return {
        period: formatChartDate(point.period, data.granularity),
        averageResponseDays: point.averageResponseDays,
        medianResponseDays: point.medianResponseDays,
        onTimePercentage: point.onTimePercentage,
        totalRFIs: point.totalRFIs,
        respondedRFIs: point.respondedRFIs,
        movingAverage7Day: movingAvg?.movingAverage7Day,
        movingAverage30Day: movingAvg?.movingAverage30Day,
      }
    })
  }, [data])

  if (formattedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📊</span>
            <p className="mt-2 text-sm">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">
              {data.granularity.charAt(0).toUpperCase() + data.granularity.slice(1)}ly average response times
            </CardDescription>
          </div>
          {getTrendBadge(data.overallTrend, data.trendPercentageChange)}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData}>
            <defs>
              <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  averageResponseDays: 'Avg Response',
                  medianResponseDays: 'Median Response',
                  movingAverage7Day: '7-Day MA',
                  movingAverage30Day: '30-Day MA',
                  onTimePercentage: 'On-Time',
                }
                const formattedValue = name === 'onTimePercentage'
                  ? `${value.toFixed(1)}%`
                  : `${value.toFixed(1)} days`
                return [formattedValue, labels[name] || name]
              }}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="averageResponseDays"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              name="Avg Response"
            />
            <Line
              type="monotone"
              dataKey="medianResponseDays"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 3 }}
              strokeDasharray="5 5"
              name="Median Response"
            />
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage7Day"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
                name="7-Day MA"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Priority Distribution Chart
// ============================================================================

/**
 * RFIPriorityChart Component
 *
 * Bar chart showing response time performance by priority level.
 *
 * @example
 * ```tsx
 * <RFIPriorityChart
 *   data={priorityData}
 *   title="Response Time by Priority"
 * />
 * ```
 */
export function RFIPriorityChart({
  data,
  title = 'Response Time by Priority',
  height = 300,
  className,
}: RFIPriorityChartProps) {
  const formattedData = useMemo(() => {
    return data.map((item) => ({
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
      averageResponseDays: item.averageResponseDays,
      targetResponseDays: item.targetResponseDays,
      onTimePercentage: item.onTimePercentage,
      count: item.count,
      respondedCount: item.respondedCount,
    }))
  }, [data])

  if (formattedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📊</span>
            <p className="mt-2 text-sm">No priority data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Average response time vs target by priority level</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="priority"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  averageResponseDays: 'Actual',
                  targetResponseDays: 'Target',
                  onTimePercentage: 'On-Time %',
                }
                const formattedValue = name === 'onTimePercentage'
                  ? `${value.toFixed(1)}%`
                  : `${value.toFixed(1)} days`
                return [formattedValue, labels[name] || name]
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar
              dataKey="averageResponseDays"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="Actual"
            />
            <Bar
              dataKey="targetResponseDays"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              name="Target"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Assignee Performance Chart
// ============================================================================

/**
 * RFIAssigneeChart Component
 *
 * Horizontal bar chart showing top/bottom assignees by on-time percentage.
 *
 * @example
 * ```tsx
 * <RFIAssigneeChart
 *   data={assigneeData}
 *   title="Top Performers"
 *   maxAssignees={5}
 * />
 * ```
 */
export function RFIAssigneeChart({
  data,
  title = 'Assignee Performance',
  height = 300,
  maxAssignees = 10,
  className,
}: RFIAssigneeChartProps) {
  const formattedData = useMemo(() => {
    // Filter assignees with at least 3 responses for meaningful data
    const filtered = data.filter((item) => item.respondedCount >= 3)

    // Sort by on-time percentage and take top/bottom performers
    const sorted = [...filtered].sort((a, b) => b.onTimePercentage - a.onTimePercentage)
    const limited = sorted.slice(0, maxAssignees)

    return limited.map((item) => ({
      name: item.assigneeName,
      onTimePercentage: item.onTimePercentage,
      averageResponseDays: item.averageResponseDays,
      respondedCount: item.respondedCount,
      rating: item.performanceRating,
    }))
  }, [data, maxAssignees])

  if (formattedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📊</span>
            <p className="mt-2 text-sm">No assignee data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>On-time response percentage (min. 3 responses)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              label={{ value: 'On-Time %', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#6b7280' } }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={95}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'onTimePercentage') {return [`${value.toFixed(1)}%`, 'On-Time']}
                if (name === 'averageResponseDays') {return [`${value.toFixed(1)} days`, 'Avg Response']}
                return [value, name]
              }}
            />
            <Bar
              dataKey="onTimePercentage"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              name="On-Time %"
            >
              {formattedData.map((entry, index) => {
                let fill = '#3b82f6'
                if (entry.onTimePercentage >= 95) {fill = '#10b981'}
                else if (entry.onTimePercentage >= 85) {fill = '#3b82f6'}
                else if (entry.onTimePercentage >= 70) {fill = '#f59e0b'}
                else {fill = '#ef4444'}

                return <Bar key={`bar-${index}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// On-Time Percentage Trend Chart
// ============================================================================

interface RFIOnTimeTrendChartProps {
  data: ResponseTimeTrendPoint[]
  title?: string
  height?: number
  className?: string
}

/**
 * RFIOnTimeTrendChart Component
 *
 * Area chart showing on-time percentage trend over time.
 *
 * @example
 * ```tsx
 * <RFIOnTimeTrendChart
 *   data={trendPoints}
 *   title="On-Time Performance Trend"
 * />
 * ```
 */
export function RFIOnTimeTrendChart({
  data,
  title = 'On-Time Performance Trend',
  height = 250,
  className,
}: RFIOnTimeTrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      period: format(new Date(point.period), 'MMM d'),
      onTimePercentage: point.onTimePercentage,
      totalRFIs: point.totalRFIs,
      respondedRFIs: point.respondedRFIs,
    }))
  }, [data])

  if (formattedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📊</span>
            <p className="mt-2 text-sm">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Percentage of RFIs responded to on time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="onTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'On-Time %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'On-Time']}
            />
            <Area
              type="monotone"
              dataKey="onTimePercentage"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#onTimeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
