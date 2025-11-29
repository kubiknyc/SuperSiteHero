// File: /src/features/analytics/components/TrendChart.tsx
// Chart components for displaying analytics trends using Recharts

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui'
import type { TrendDataPoint } from '@/types/analytics'

// ============================================================================
// Risk Trend Chart
// ============================================================================

interface RiskTrendChartProps {
  data: TrendDataPoint[]
  title?: string
  height?: number
  className?: string
}

/**
 * RiskTrendChart Component
 *
 * Displays risk score trend over time with color zones.
 *
 * Usage:
 * ```tsx
 * <RiskTrendChart data={riskTrend} title="Risk Score Trend" />
 * ```
 */
export function RiskTrendChart({
  data,
  title = 'Risk Trend',
  height = 200,
  className,
}: RiskTrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📈</span>
            <p className="mt-2 text-sm">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(0)}`, 'Risk Score']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#riskGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Progress Trend Chart
// ============================================================================

interface ProgressTrendChartProps {
  data: TrendDataPoint[]
  plannedData?: TrendDataPoint[]
  title?: string
  height?: number
  className?: string
}

/**
 * ProgressTrendChart Component
 *
 * Displays project progress trend, optionally with planned vs actual.
 *
 * Usage:
 * ```tsx
 * <ProgressTrendChart data={progressTrend} plannedData={plannedTrend} />
 * ```
 */
export function ProgressTrendChart({
  data,
  plannedData,
  title = 'Progress Trend',
  height = 200,
  className,
}: ProgressTrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: d.value,
      planned: plannedData?.[i]?.value,
    }))
  }, [data, plannedData])

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📊</span>
            <p className="mt-2 text-sm">No progress data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`]}
            />
            {plannedData && (
              <Line
                type="monotone"
                dataKey="planned"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Planned"
              />
            )}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              name="Actual"
            />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Cost Trend Chart
// ============================================================================

interface CostTrendChartProps {
  data: TrendDataPoint[]
  title?: string
  height?: number
  showAsPercentage?: boolean
  className?: string
}

/**
 * CostTrendChart Component
 *
 * Displays cost/budget trend over time.
 *
 * Usage:
 * ```tsx
 * <CostTrendChart data={costTrend} showAsPercentage />
 * ```
 */
export function CostTrendChart({
  data,
  title = 'Cost Trend',
  height = 200,
  showAsPercentage = true,
  className,
}: CostTrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">💰</span>
            <p className="mt-2 text-sm">No cost data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => (showAsPercentage ? `${value}%` : `$${value}`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [
                showAsPercentage ? `${value.toFixed(1)}%` : `$${value.toFixed(0)}`,
                'Change Orders',
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#costGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Multi-Metric Chart
// ============================================================================

interface MultiMetricChartProps {
  data: Array<{
    date: string
    risk?: number
    progress?: number
    cost?: number
  }>
  title?: string
  height?: number
  className?: string
}

/**
 * MultiMetricChart Component
 *
 * Displays multiple metrics on a single chart for comparison.
 *
 * Usage:
 * ```tsx
 * <MultiMetricChart data={combinedData} title="Project Metrics" />
 * ```
 */
export function MultiMetricChart({
  data,
  title = 'Project Metrics',
  height = 250,
  className,
}: MultiMetricChartProps) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl">📉</span>
            <p className="mt-2 text-sm">No metrics data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}`]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Risk Score"
            />
            <Line
              type="monotone"
              dataKey="progress"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Progress %"
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Cost Variance %"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Sparkline (Mini Chart)
// ============================================================================

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  className?: string
}

/**
 * Sparkline Component
 *
 * Minimal inline chart for showing trends in tight spaces.
 *
 * Usage:
 * ```tsx
 * <Sparkline data={[10, 20, 15, 30, 25]} color="#3b82f6" />
 * ```
 */
export function Sparkline({
  data,
  color = '#3b82f6',
  width = 80,
  height = 24,
  className,
}: SparklineProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ index, value }))
  }, [data])

  if (data.length === 0) {
    return <div className={cn('bg-gray-100 rounded', className)} style={{ width, height }} />
  }

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
