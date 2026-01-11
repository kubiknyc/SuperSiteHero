/**
 * Cash Flow Projection Component
 *
 * Comprehensive cash flow management with:
 * - Monthly projections
 * - Chart visualization
 * - Compare to actuals
 * - S-Curve analysis
 */

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Settings,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format, parseISO, isBefore } from 'date-fns'
import {
  useCashFlowProjection,
  useSCurve,
  useCashFlowComparison,
  useMonthOptions,
} from '../hooks/useCashFlow'
import type { CashFlowMonth, CashFlowProjection as CashFlowType } from '../types/sov'

// ============================================================================
// TYPES
// ============================================================================

interface CashFlowProjectionProps {
  projectId: string
  className?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return formatCurrency(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryCardsProps {
  projection: CashFlowType
}

function SummaryCards({ projection }: SummaryCardsProps) {
  const netCashPosition = projection.total_collected - projection.total_disbursed

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projection.contract_value)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(projection.total_actual_billings)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPercent(
              (projection.total_actual_billings / projection.contract_value) * 100
            )}{' '}
            of contract
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collected</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projection.total_collected)}</div>
          <p className="text-xs text-muted-foreground">
            {projection.total_actual_billings > 0
              ? formatPercent(
                  (projection.total_collected / projection.total_actual_billings) * 100
                )
              : '0%'}{' '}
            collection rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disbursed</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projection.total_disbursed)}</div>
          <p className="text-xs text-muted-foreground">Project costs to date</p>
        </CardContent>
      </Card>

      <Card className={cn(netCashPosition >= 0 ? 'border-green-200' : 'border-red-200')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Cash Position</CardTitle>
          {netCashPosition >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              netCashPosition >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {netCashPosition >= 0 ? '+' : ''}
            {formatCurrency(netCashPosition)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface MonthlyChartProps {
  months: CashFlowMonth[]
}

function MonthlyChart({ months }: MonthlyChartProps) {
  // Find max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...months.flatMap((m) => [
        Math.abs(m.projected_billings),
        Math.abs(m.actual_billings),
        Math.abs(m.projected_cumulative),
        Math.abs(m.actual_cumulative),
      ])
    )
  }, [months])

  const getBarHeight = (value: number) => {
    if (maxValue === 0) {return 0}
    return Math.min((Math.abs(value) / maxValue) * 100, 100)
  }

  const now = new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Cash Flow</CardTitle>
        <CardDescription>Projected vs Actual billings and net cash flow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-48 overflow-x-auto pb-4">
          {months.map((month, index) => {
            const monthDate = parseISO(month.month + '-01')
            const isPast = isBefore(monthDate, now)

            return (
              <TooltipProvider key={month.month}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center min-w-[60px] cursor-pointer">
                      <div className="flex gap-1 h-32 items-end">
                        {/* Projected */}
                        <div
                          className={cn(
                            'w-5 rounded-t transition-all',
                            isPast ? 'bg-gray-200' : 'bg-blue-200'
                          )}
                          style={{ height: `${getBarHeight(month.projected_billings)}%` }}
                        />
                        {/* Actual */}
                        {isPast && (
                          <div
                            className="w-5 bg-green-500 rounded-t transition-all"
                            style={{ height: `${getBarHeight(month.actual_billings)}%` }}
                          />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        {format(monthDate, 'MMM')}
                        <br />
                        {format(monthDate, 'yy')}
                      </div>
                      {/* Net indicator */}
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-1',
                          (isPast ? month.actual_net : month.projected_net) >= 0
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold">{month.month_label}</p>
                      <p>Projected: {formatCurrency(month.projected_billings)}</p>
                      {isPast && (
                        <>
                          <p>Actual: {formatCurrency(month.actual_billings)}</p>
                          <p>
                            Variance:{' '}
                            {formatCurrency(month.actual_billings - month.projected_billings)}
                          </p>
                        </>
                      )}
                      <p>Net: {formatCurrency(isPast ? month.actual_net : month.projected_net)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 rounded" />
            <span className="text-sm">Projected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm">Positive Net</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm">Negative Net</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SCurveChartProps {
  projectId: string
}

function SCurveChart({ projectId }: SCurveChartProps) {
  const { data: sCurve, isLoading } = useSCurve(projectId)

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  if (!sCurve) {return null}

  // Find max for scaling
  const maxPercent = 100

  const getHeight = (value: number) => {
    return Math.min((value / maxPercent) * 100, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>S-Curve Analysis</CardTitle>
        <CardDescription>Planned vs Actual progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-48 border-l border-b border-gray-200">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[100, 75, 50, 25, 0].map((tick) => (
              <div key={tick} className="flex items-center">
                <span className="text-xs text-muted-foreground w-8 text-right pr-2">
                  {tick}%
                </span>
                <div className="flex-1 border-t border-dashed border-gray-100" />
              </div>
            ))}
          </div>

          {/* Planned curve (area) */}
          <svg className="absolute inset-0 ml-8" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              points={`0,100 ${sCurve.months
                .map(
                  (m, i) =>
                    `${(i / (sCurve.months.length - 1)) * 100},${
                      100 - getHeight(m.planned)
                    }`
                )
                .join(' ')} 100,100`}
              fill="rgba(59, 130, 246, 0.1)"
            />
            <polyline
              points={sCurve.months
                .map(
                  (m, i) =>
                    `${(i / (sCurve.months.length - 1)) * 100},${
                      100 - getHeight(m.planned)
                    }`
                )
                .join(' ')}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              strokeDasharray="4"
            />
          </svg>

          {/* Actual curve */}
          <svg className="absolute inset-0 ml-8" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={sCurve.months
                .filter((m) => m.actual > 0)
                .map(
                  (m, i, arr) =>
                    `${(i / Math.max(arr.length - 1, 1)) * ((arr.length - 1) / (sCurve.months.length - 1)) * 100},${
                      100 - getHeight(m.actual)
                    }`
                )
                .join(' ')}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="3"
            />
          </svg>

          {/* Month labels */}
          <div className="absolute bottom-0 left-8 right-0 flex justify-between -mb-6">
            {sCurve.months
              .filter((_, i) => i % Math.ceil(sCurve.months.length / 6) === 0)
              .map((m) => (
                <span key={m.month} className="text-xs text-muted-foreground">
                  {m.label.split(' ')[0]}
                </span>
              ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500" />
            <span className="text-sm">Planned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500" />
            <span className="text-sm">Actual</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">SPI</p>
            <Badge variant={sCurve.metrics.spi >= 1 ? 'default' : 'destructive'}>
              {sCurve.metrics.spi.toFixed(2)}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">CPI</p>
            <Badge variant={sCurve.metrics.cpi >= 1 ? 'default' : 'destructive'}>
              {sCurve.metrics.cpi.toFixed(2)}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Schedule Variance</p>
            <span
              className={cn(
                'text-sm font-medium',
                sCurve.metrics.sv >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatCurrencyCompact(sCurve.metrics.sv)}
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Cost Variance</p>
            <span
              className={cn(
                'text-sm font-medium',
                sCurve.metrics.cv >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatCurrencyCompact(sCurve.metrics.cv)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MonthlyTableProps {
  months: CashFlowMonth[]
}

function MonthlyTable({ months }: MonthlyTableProps) {
  const now = new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Detail</CardTitle>
        <CardDescription>Detailed cash flow by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Month</TableHead>
                <TableHead className="text-right">Proj. Billings</TableHead>
                <TableHead className="text-right">Act. Billings</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Collections</TableHead>
                <TableHead className="text-right">Disbursements</TableHead>
                <TableHead className="text-right">Net Cash</TableHead>
                <TableHead className="text-right">Cumulative</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => {
                const monthDate = parseISO(month.month + '-01')
                const isPast = isBefore(monthDate, now)
                const billingVariance = month.actual_billings - month.projected_billings
                const netCash = isPast ? month.actual_net : month.projected_net
                const cumulative = isPast ? month.actual_cumulative : month.projected_cumulative

                return (
                  <TableRow
                    key={month.month}
                    className={cn(!isPast && 'bg-blue-50/30 text-muted-foreground')}
                  >
                    <TableCell className="font-medium">
                      {month.month_label}
                      {!isPast && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Projected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(month.projected_billings)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {isPast ? formatCurrency(month.actual_billings) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPast ? (
                        <span
                          className={cn(
                            'font-mono',
                            billingVariance >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {billingVariance >= 0 ? '+' : ''}
                          {formatCurrency(billingVariance)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(
                        isPast ? month.actual_collections : month.projected_collections
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(
                        isPast ? month.actual_disbursements : month.projected_disbursements
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-mono',
                          netCash >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {netCash >= 0 ? '+' : ''}
                        {formatCurrency(netCash)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(cumulative)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CashFlowProjection({ projectId, className }: CashFlowProjectionProps) {
  const { data: projection, isLoading, error, refetch } = useCashFlowProjection(projectId)
  const [activeTab, setActiveTab] = useState('overview')

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">Error loading cash flow data</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!projection) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Cash Flow Data</p>
          <p className="text-sm text-muted-foreground">
            Cash flow projections will appear once billing data is available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Projection</h2>
          <p className="text-muted-foreground">{projection.project_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards projection={projection} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="s-curve">S-Curve</TabsTrigger>
          <TabsTrigger value="detail">Monthly Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MonthlyChart months={projection.months} />

          {/* Earned Value Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Earned Value Analysis</CardTitle>
              <CardDescription>Project performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Planned Value (PV)</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(projection.planned_value_to_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budgeted cost of scheduled work
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Earned Value (EV)</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(projection.earned_value_to_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budgeted cost of completed work
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Actual Cost (AC)</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(projection.actual_cost_to_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actual costs incurred
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Estimate at Completion</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(projection.estimate_at_completion)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Projected final cost
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Schedule Performance</span>
                    <Badge
                      variant={
                        projection.schedule_performance_index >= 1 ? 'default' : 'destructive'
                      }
                    >
                      SPI: {projection.schedule_performance_index.toFixed(2)}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(projection.schedule_performance_index * 50, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {projection.schedule_performance_index >= 1
                      ? 'Ahead of schedule'
                      : 'Behind schedule'}{' '}
                    - Schedule Variance: {formatCurrency(projection.schedule_variance)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Cost Performance</span>
                    <Badge
                      variant={projection.cost_performance_index >= 1 ? 'default' : 'destructive'}
                    >
                      CPI: {projection.cost_performance_index.toFixed(2)}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(projection.cost_performance_index * 50, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {projection.cost_performance_index >= 1 ? 'Under budget' : 'Over budget'} -
                    Cost Variance: {formatCurrency(projection.cost_variance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="s-curve">
          <SCurveChart projectId={projectId} />
        </TabsContent>

        <TabsContent value="detail">
          <MonthlyTable months={projection.months} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CashFlowProjection
