/**
 * Chart Renderer Component
 *
 * Renders charts using Recharts library based on configuration.
 * Supports bar, line, pie, and area charts with customization options.
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Label,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import type { ChartConfiguration } from '@/types/report-builder'
import { CHART_COLOR_SCHEMES } from '@/types/report-builder'
import { useChartData, type ChartDataPoint } from '@/features/reports/hooks/useChartData'

interface ChartRendererProps {
  data: Record<string, unknown>[]
  config: ChartConfiguration
  className?: string
  onChartClick?: (data: ChartDataPoint) => void
}

/**
 * Custom tooltip for charts
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) {return null}

  const value = payload[0].value
  const formattedValue =
    typeof value === 'number'
      ? new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 2,
        }).format(value)
      : value

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-sm text-secondary">
        Value: <span className="font-semibold">{formattedValue}</span>
      </p>
    </div>
  )
}

/**
 * Custom label for pie chart
 */
function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name: _name,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)

  // Only show label if percentage is > 5%
  if (percent < 0.05) {return null}

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ChartRenderer({
  data,
  config,
  className,
  onChartClick,
}: ChartRendererProps) {
  const { chartData, isEmpty, stats } = useChartData({
    data,
    chartConfig: config,
  })

  // Get color scheme
  const colors = useMemo(() => {
    if (config.customColors && config.customColors.length > 0) {
      return config.customColors
    }
    const scheme = config.colorScheme || 'default'
    return CHART_COLOR_SCHEMES[scheme]?.colors || CHART_COLOR_SCHEMES.default.colors
  }, [config.colorScheme, config.customColors])

  // Chart height
  const height = config.height || 400

  // Handle empty data
  if (isEmpty) {
    return (
      <Card className={className}>
        {config.title && (
          <CardHeader>
            <CardTitle>{config.title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <AlertCircle className="h-12 w-12 mb-3 text-disabled" />
            <p className="text-sm">No data available for this chart</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Common chart props
  const commonProps = {
    data: chartData,
    margin: { top: 20, right: 30, left: 20, bottom: 20 },
  }

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            >
              {config.xAxisLabel && (
                <Label value={config.xAxisLabel} offset={-10} position="insideBottom" />
              )}
            </XAxis>
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false}>
              {config.yAxisLabel && (
                <Label value={config.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && <Legend />}
            <Bar
              dataKey="value"
              fill={colors[0]}
              radius={[8, 8, 0, 0]}
              onClick={onChartClick}
              cursor={onChartClick ? 'pointer' : 'default'}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            >
              {config.xAxisLabel && (
                <Label value={config.xAxisLabel} offset={-10} position="insideBottom" />
              )}
            </XAxis>
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false}>
              {config.yAxisLabel && (
                <Label value={config.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={config.showDataLabels !== false ? renderPieLabel : false}
              outerRadius={Math.min(height / 3, 150)}
              fill={colors[0]}
              dataKey="value"
              onClick={onChartClick}
              cursor={onChartClick ? 'pointer' : 'default'}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value, entry: any) => {
                  const dataPoint = entry.payload
                  const percent = ((dataPoint.value / stats.total) * 100).toFixed(1)
                  return `${value} (${percent}%)`
                }}
              />
            )}
          </PieChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            >
              {config.xAxisLabel && (
                <Label value={config.xAxisLabel} offset={-10} position="insideBottom" />
              )}
            </XAxis>
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false}>
              {config.yAxisLabel && (
                <Label value={config.yAxisLabel} angle={-90} position="insideLeft" />
              )}
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.6}
            />
          </AreaChart>
        )

      default:
        return null
    }
  }

  return (
    <Card className={className}>
      {config.title && (
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>

        {/* Summary statistics */}
        {config.type !== 'pie' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div>
              <p className="text-xs text-muted">Total</p>
              <p className="text-sm font-semibold text-foreground">
                {new Intl.NumberFormat('en-US').format(stats.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Average</p>
              <p className="text-sm font-semibold text-foreground">
                {new Intl.NumberFormat('en-US').format(stats.average)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Min</p>
              <p className="text-sm font-semibold text-foreground">
                {new Intl.NumberFormat('en-US').format(stats.min)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Max</p>
              <p className="text-sm font-semibold text-foreground">
                {new Intl.NumberFormat('en-US').format(stats.max)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChartRenderer
