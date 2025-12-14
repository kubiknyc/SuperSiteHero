/**
 * EVM Trend Chart Component
 *
 * Displays CPI/SPI trends over time using a line chart
 */

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { EVMTrendDataPoint } from '@/types/cost-tracking'

interface EVMTrendChartProps {
  data: EVMTrendDataPoint[] | undefined
  isLoading?: boolean
  height?: number
  showLegend?: boolean
  title?: string
}

export function EVMTrendChart({
  data,
  isLoading,
  height = 300,
  showLegend = true,
  title = 'Performance Trend',
}: EVMTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return []

    return data.map(point => ({
      ...point,
      date: format(parseISO(point.date), 'MMM d'),
      fullDate: point.date,
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>CPI and SPI over time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-muted-foreground text-sm">
            No trend data available. Create daily snapshots to track performance over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>CPI and SPI performance indices over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0.6, 1.4]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const data = payload[0].payload
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-medium mb-2">
                      {data.fullDate ? format(parseISO(data.fullDate), 'MMMM d, yyyy') : label}
                    </p>
                    <div className="space-y-1">
                      <p className="text-blue-600">
                        CPI: <span className="font-semibold">{data.CPI?.toFixed(2) || '—'}</span>
                      </p>
                      <p className="text-emerald-600">
                        SPI: <span className="font-semibold">{data.SPI?.toFixed(2) || '—'}</span>
                      </p>
                      <p className="text-gray-600">
                        Progress: <span className="font-semibold">{data.percent_complete?.toFixed(1)}%</span>
                      </p>
                    </div>
                  </div>
                )
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm">
                    {value === 'CPI' ? 'Cost Performance Index' : 'Schedule Performance Index'}
                  </span>
                )}
              />
            )}
            {/* Reference line at 1.0 (target) */}
            <ReferenceLine
              y={1}
              stroke="#888"
              strokeDasharray="5 5"
              label={{ value: 'Target', position: 'right', fontSize: 10 }}
            />
            {/* Warning threshold at 0.9 */}
            <ReferenceLine
              y={0.9}
              stroke="#f97316"
              strokeDasharray="3 3"
              label={{ value: 'Warning', position: 'right', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="CPI"
              name="CPI"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="SPI"
              name="SPI"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default EVMTrendChart
