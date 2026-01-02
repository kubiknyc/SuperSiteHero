/**
 * Earned Value Dashboard Component
 *
 * Comprehensive Earned Value Management (EVM) dashboard with
 * metrics, charts, forecasts, and trend analysis.
 */

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
  BarChart3,
  LineChartIcon,
  RefreshCw,
} from 'lucide-react'
import {
  useEarnedValue,
  type EarnedValueMetrics,
  type EarnedValueAnalysis,
  type EarnedValueOptions,
} from '../hooks/useEarnedValue'
import type { ScheduleActivity } from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

interface EarnedValueDashboardProps {
  projectId: string
  projectName: string
  activities: ScheduleActivity[]
  dataDate?: Date
  currency?: string
  onRefresh?: () => void
}

// =============================================
// Helper Functions
// =============================================

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatIndex(value: number): string {
  return value.toFixed(2)
}

// =============================================
// Sub-Components
// =============================================

interface StatusIndicatorProps {
  status: 'ahead' | 'on_track' | 'behind' | 'critical' | 'under_budget' | 'on_budget' | 'over_budget' | 'healthy' | 'at_risk'
  label?: string
}

function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const config = {
    ahead: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', label: 'Ahead' },
    on_track: { icon: Minus, color: 'text-primary', bg: 'bg-primary/10', label: 'On Track' },
    behind: { icon: TrendingDown, color: 'text-warning', bg: 'bg-warning/10', label: 'Behind' },
    critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Critical' },
    under_budget: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', label: 'Under Budget' },
    on_budget: { icon: Minus, color: 'text-primary', bg: 'bg-primary/10', label: 'On Budget' },
    over_budget: { icon: TrendingDown, color: 'text-warning', bg: 'bg-warning/10', label: 'Over Budget' },
    healthy: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Healthy' },
    at_risk: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'At Risk' },
  }

  const { icon: Icon, color, bg, label: defaultLabel } = config[status]

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{label || defaultLabel}</span>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  tooltip?: string
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  tooltip,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-muted/30',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    error: 'bg-destructive/10 border-destructive/20',
  }

  const content = (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && <Info className="h-3 w-3" />}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

interface PerformanceGaugeProps {
  label: string
  value: number
  target?: number
  description?: string
}

function PerformanceGauge({ label, value, target = 1, description }: PerformanceGaugeProps) {
  const percentage = Math.min(200, (value / target) * 100)
  const isGood = value >= target

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-lg font-bold ${isGood ? 'text-success' : 'text-warning'}`}>
          {formatIndex(value)}
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute h-full transition-all duration-500 ${
            isGood ? 'bg-success' : value >= 0.8 ? 'bg-warning' : 'bg-destructive'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
        <div
          className="absolute h-full w-0.5 bg-foreground/50"
          style={{ left: '50%' }}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

interface EVChartProps {
  data: EarnedValueAnalysis['weekly']
  groupBy: 'day' | 'week' | 'month'
  currency?: string
}

function EVChart({ data, groupBy, currency = 'USD' }: EVChartProps) {
  const formatXAxis = (value: string) => {
    try {
      if (groupBy === 'month') {
        return format(parseISO(value + '-01'), 'MMM')
      }
      return format(parseISO(value), groupBy === 'day' ? 'MM/dd' : 'MM/dd')
    } catch {
      return value
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          className="text-xs"
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value, currency).replace(/\.\d+/, '')}
          className="text-xs"
        />
        <RechartsTooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency),
            name === 'PV' ? 'Planned Value' : name === 'EV' ? 'Earned Value' : 'Actual Cost'
          ]}
          labelFormatter={(label) => {
            try {
              if (groupBy === 'month') {
                return format(parseISO(label + '-01'), 'MMMM yyyy')
              }
              return format(parseISO(label), 'MMM d, yyyy')
            } catch {
              return label
            }
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="PV"
          name="Planned Value (PV)"
          stroke="#94a3b8"
          fill="#94a3b8"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="EV"
          name="Earned Value (EV)"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="AC"
          name="Actual Cost (AC)"
          stroke="#f97316"
          fill="#f97316"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <ReferenceLine y={data[data.length - 1]?.BAC} stroke="#3b82f6" strokeDasharray="5 5" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface PerformanceIndexChartProps {
  spiHistory: { date: string; value: number }[]
  cpiHistory: { date: string; value: number }[]
}

function PerformanceIndexChart({ spiHistory, cpiHistory }: PerformanceIndexChartProps) {
  // Combine data
  const data = spiHistory.map((spi, idx) => ({
    date: spi.date,
    SPI: spi.value,
    CPI: cpiHistory[idx]?.value || 1,
  }))

  // Sample to reduce data points for readability
  const sampledData = data.length > 30 ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0 || i === data.length - 1) : data

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={sampledData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            try {
              return format(parseISO(value), 'MM/dd')
            } catch {
              return value
            }
          }}
          className="text-xs"
        />
        <YAxis domain={[0, 2]} className="text-xs" />
        <RechartsTooltip
          formatter={(value: number, name: string) => [
            formatIndex(value),
            name === 'SPI' ? 'Schedule Performance Index' : 'Cost Performance Index'
          ]}
        />
        <Legend />
        <ReferenceLine y={1} stroke="#64748b" strokeDasharray="5 5" />
        <Line
          type="monotone"
          dataKey="SPI"
          name="SPI"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="CPI"
          name="CPI"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface VarianceChartProps {
  sv: number
  cv: number
  currency?: string
}

function VarianceChart({ sv, cv, currency = 'USD' }: VarianceChartProps) {
  const data = [
    { name: 'Schedule Variance', value: sv, fill: sv >= 0 ? '#22c55e' : '#f97316' },
    { name: 'Cost Variance', value: cv, fill: cv >= 0 ? '#22c55e' : '#f97316' },
  ]

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value, currency)} />
        <YAxis dataKey="name" type="category" className="text-xs" />
        <RechartsTooltip formatter={(value: number) => formatCurrency(value, currency)} />
        <ReferenceLine x={0} stroke="#64748b" />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// =============================================
// Main Component
// =============================================

export function EarnedValueDashboard({
  projectId,
  projectName,
  activities,
  dataDate = new Date(),
  currency = 'USD',
  onRefresh,
}: EarnedValueDashboardProps) {
  const [groupBy, setGroupBy] = React.useState<'day' | 'week' | 'month'>('week')

  const analysis = useEarnedValue(activities, {
    dataDate,
    includeForecasts: true,
    groupBy,
  })

  const { current, scheduleStatus, costStatus, overallHealth } = analysis

  // No data state
  if (activities.length === 0 || current.BAC === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Earned Value Data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add budgeted costs to activities to enable earned value analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earned Value Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data Date: {format(dataDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status={overallHealth} />
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Schedule Status</span>
              <StatusIndicator status={scheduleStatus} />
            </div>
            <PerformanceGauge
              label="Schedule Performance Index (SPI)"
              value={current.SPI}
              description={current.SPI >= 1 ? 'Ahead of schedule' : 'Behind schedule'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Cost Status</span>
              <StatusIndicator status={costStatus} />
            </div>
            <PerformanceGauge
              label="Cost Performance Index (CPI)"
              value={current.CPI}
              description={current.CPI >= 1 ? 'Under budget' : 'Over budget'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-bold">{current.percentComplete.toFixed(1)}%</span>
              </div>
              <Progress value={current.percentComplete} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Earned: {formatCurrency(current.EV, currency)}</span>
                <span>Budget: {formatCurrency(current.BAC, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Budget at Completion (BAC)"
          value={formatCurrency(current.BAC, currency)}
          icon={Target}
          tooltip="Total budgeted cost for all scheduled work"
        />
        <MetricCard
          title="Planned Value (PV)"
          value={formatCurrency(current.PV, currency)}
          subtitle={`${current.percentScheduled.toFixed(1)}% of BAC`}
          icon={Calendar}
          tooltip="Budgeted cost of work scheduled to date"
        />
        <MetricCard
          title="Earned Value (EV)"
          value={formatCurrency(current.EV, currency)}
          subtitle={`${current.percentComplete.toFixed(1)}% of BAC`}
          icon={CheckCircle2}
          variant={current.EV >= current.PV ? 'success' : 'warning'}
          tooltip="Budgeted cost of work actually performed"
        />
        <MetricCard
          title="Actual Cost (AC)"
          value={formatCurrency(current.AC, currency)}
          subtitle={`${current.percentSpent.toFixed(1)}% of BAC`}
          icon={DollarSign}
          variant={current.AC <= current.EV ? 'success' : 'warning'}
          tooltip="Actual cost incurred for work performed"
        />
      </div>

      {/* Tabs for Charts */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">
            <LineChartIcon className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="indices">
            <TrendingUp className="h-4 w-4 mr-2" />
            Indices
          </TabsTrigger>
          <TabsTrigger value="forecasts">
            <Target className="h-4 w-4 mr-2" />
            Forecasts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Earned Value Performance</CardTitle>
              <CardDescription>
                Planned Value, Earned Value, and Actual Cost over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EVChart
                data={groupBy === 'day' ? analysis.daily : groupBy === 'week' ? analysis.weekly : analysis.monthly}
                groupBy={groupBy}
                currency={currency}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indices" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Index Trends</CardTitle>
                <CardDescription>
                  SPI and CPI trends over time (target: 1.0)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceIndexChart
                  spiHistory={analysis.spiHistory}
                  cpiHistory={analysis.cpiHistory}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variances</CardTitle>
                <CardDescription>
                  Schedule and Cost variance from plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VarianceChart sv={current.SV} cv={current.CV} currency={currency} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Schedule Variance</p>
                    <p className={`text-xl font-bold ${current.SV >= 0 ? 'text-success' : 'text-warning'}`}>
                      {formatCurrency(current.SV, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatPercent(current.SVPercent)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Cost Variance</p>
                    <p className={`text-xl font-bold ${current.CV >= 0 ? 'text-success' : 'text-warning'}`}>
                      {formatCurrency(current.CV, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatPercent(current.CVPercent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Forecasts</CardTitle>
                <CardDescription>
                  Projected final cost based on current performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Estimate at Completion (EAC)</p>
                    <p className="text-2xl font-bold">{formatCurrency(current.EAC, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {current.EAC > current.BAC ? 'Over budget forecast' : 'Under budget forecast'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Estimate to Complete (ETC)</p>
                    <p className="text-2xl font-bold">{formatCurrency(current.ETC, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining work cost
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Variance at Completion (VAC)</p>
                    <p className={`text-2xl font-bold ${current.VAC >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(current.VAC, currency)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">To-Complete Index (TCPI)</p>
                    <p className={`text-2xl font-bold ${current.TCPI <= 1 ? 'text-success' : current.TCPI <= 1.1 ? 'text-warning' : 'text-destructive'}`}>
                      {formatIndex(current.TCPI)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {current.TCPI <= 1 ? 'Achievable' : current.TCPI <= 1.1 ? 'Challenging' : 'Difficult'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule Forecast</CardTitle>
                <CardDescription>
                  Projected completion based on current SPI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.forecastedCompletion ? (
                  <>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">Forecasted Completion</p>
                      <p className="text-2xl font-bold">
                        {format(parseISO(analysis.forecastedCompletion), 'MMM d, yyyy')}
                      </p>
                      <p className={`text-sm mt-1 ${
                        analysis.completionVarianceDays <= 0 ? 'text-success' : 'text-warning'
                      }`}>
                        {analysis.completionVarianceDays === 0
                          ? 'On schedule'
                          : analysis.completionVarianceDays > 0
                            ? `${analysis.completionVarianceDays} days late`
                            : `${Math.abs(analysis.completionVarianceDays)} days early`}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">Cost Schedule Index (CSI)</p>
                      <p className="text-2xl font-bold">{formatIndex(current.CSI)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Combined schedule and cost efficiency
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Info className="h-5 w-5 mr-2" />
                    Not enough data to forecast completion
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Trends Table */}
      {analysis.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Recent period-over-period performance changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Period</th>
                    <th className="text-right py-2 px-3 font-medium">PV</th>
                    <th className="text-right py-2 px-3 font-medium">EV</th>
                    <th className="text-right py-2 px-3 font-medium">AC</th>
                    <th className="text-center py-2 px-3 font-medium">SPI</th>
                    <th className="text-center py-2 px-3 font-medium">CPI</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.trends.map((trend, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-3">{trend.period}</td>
                      <td className="text-right py-2 px-3">{formatCurrency(trend.PV, currency)}</td>
                      <td className="text-right py-2 px-3">{formatCurrency(trend.EV, currency)}</td>
                      <td className="text-right py-2 px-3">{formatCurrency(trend.AC, currency)}</td>
                      <td className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <span className={trend.SPI >= 1 ? 'text-success' : 'text-warning'}>
                            {formatIndex(trend.SPI)}
                          </span>
                          {trend.SPITrend === 'improving' && <TrendingUp className="h-3 w-3 text-success" />}
                          {trend.SPITrend === 'declining' && <TrendingDown className="h-3 w-3 text-destructive" />}
                        </div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <span className={trend.CPI >= 1 ? 'text-success' : 'text-warning'}>
                            {formatIndex(trend.CPI)}
                          </span>
                          {trend.CPITrend === 'improving' && <TrendingUp className="h-3 w-3 text-success" />}
                          {trend.CPITrend === 'declining' && <TrendingDown className="h-3 w-3 text-destructive" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EarnedValueDashboard
