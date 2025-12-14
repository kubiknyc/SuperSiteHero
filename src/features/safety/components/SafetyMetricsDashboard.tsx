/**
 * Safety Metrics Dashboard
 *
 * Displays comprehensive OSHA safety metrics including:
 * - TRIR (Total Recordable Incident Rate)
 * - DART (Days Away, Restricted, or Transferred)
 * - LTIR (Lost Time Injury Rate)
 * - EMR (Experience Modification Rate)
 * - Trend charts
 * - Industry comparison
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  Activity,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  useSafetyMetricsDashboard,
  useSafetyMetricsTrend,
  useMetricStatus,
  useRateDisplay,
  useCreateSnapshot,
} from '../hooks/useSafetyMetrics'
import type {
  SafetyMetrics,
  SafetyMetricsTrendPoint,
  SafetyScorecard,
  IndustrySafetyBenchmark,
  MetricsPeriodType,
} from '@/types/safety-metrics'
import {
  calculatePercentChange,
  calculateBenchmarkVariance,
  formatHours,
  formatLargeNumber,
} from '../utils/safetyCalculations'

// ============================================================================
// Props
// ============================================================================

interface SafetyMetricsDashboardProps {
  companyId: string
  projectId?: string
  year?: number
  onViewDetails?: () => void
  onManageHours?: () => void
  className?: string
}

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  title: string
  shortTitle: string
  value: number | null
  previousValue?: number | null
  benchmark?: number | null
  description: string
  format: (v: number | null) => string
  isLoading?: boolean
}

function MetricCard({
  title,
  shortTitle,
  value,
  previousValue,
  benchmark,
  description,
  format,
  isLoading,
}: MetricCardProps) {
  const { getStatus, getStatusColor } = useMetricStatus()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const status = getStatus(value, benchmark)
  const statusColors = getStatusColor(status)
  const percentChange = calculatePercentChange(value, previousValue)
  const benchmarkVariance = benchmark ? calculateBenchmarkVariance(value, benchmark) : null

  return (
    <Card className={cn('relative overflow-hidden', statusColors.border, 'border-l-4')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{shortTitle}</p>
            <p className="text-3xl font-bold mt-1">{format(value)}</p>
          </div>
          <div className={cn('p-2 rounded-full', statusColors.bg)}>
            {status === 'good' && <CheckCircle className={cn('h-5 w-5', statusColors.text)} />}
            {status === 'warning' && <AlertTriangle className={cn('h-5 w-5', statusColors.text)} />}
            {status === 'danger' && <AlertTriangle className={cn('h-5 w-5', statusColors.text)} />}
            {status === 'unknown' && <Minus className="h-5 w-5 text-gray-400" />}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          {percentChange !== null && (
            <div className={cn(
              'flex items-center gap-1',
              percentChange < 0 ? 'text-green-600' : percentChange > 0 ? 'text-red-600' : 'text-gray-500'
            )}>
              {percentChange < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : percentChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>{Math.abs(percentChange)}% vs prev</span>
            </div>
          )}

          {benchmarkVariance?.percentVariance !== null && (
            <div className={cn(
              'flex items-center gap-1',
              benchmarkVariance.isBetter ? 'text-green-600' : 'text-red-600'
            )}>
              <span>
                {benchmarkVariance.isBetter ? '-' : '+'}
                {Math.abs(benchmarkVariance.percentVariance)}% vs industry
              </span>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-500">{description}</p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Scorecard Component
// ============================================================================

interface ScorecardProps {
  scorecard: SafetyScorecard
  isLoading?: boolean
}

function SafetyScorecardCard({ scorecard, isLoading }: ScorecardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-600" />
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'below':
        return <Badge className="bg-green-100 text-green-800">Better than Industry</Badge>
      case 'at':
        return <Badge className="bg-yellow-100 text-yellow-800">At Industry Average</Badge>
      case 'above':
        return <Badge className="bg-red-100 text-red-800">Above Industry Average</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Safety Scorecard - {scorecard.year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Days Without Incident */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {scorecard.days_without_incident}
            </div>
            <p className="text-sm text-gray-500">Days Without Incident</p>
          </div>

          {/* Total Recordable Incidents */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {scorecard.recordable_incidents}
            </div>
            <p className="text-sm text-gray-500">Recordable Incidents</p>
          </div>

          {/* Hours Worked */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {formatLargeNumber(scorecard.total_hours_worked)}
            </div>
            <p className="text-sm text-gray-500">Hours Worked</p>
          </div>

          {/* EMR */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {scorecard.current_emr?.toFixed(3) || 'N/A'}
            </div>
            <p className="text-sm text-gray-500">EMR</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">TRIR Performance</p>
            <div className="flex items-center gap-2">
              {getPerformanceBadge(scorecard.trir_performance)}
              {getTrendIcon(scorecard.trir_trend)}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">DART Performance</p>
            <div className="flex items-center gap-2">
              {getPerformanceBadge(scorecard.dart_performance)}
              {getTrendIcon(scorecard.dart_trend)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Trend Chart Component (Simple bars)
// ============================================================================

interface TrendChartProps {
  data: SafetyMetricsTrendPoint[]
  metric: 'trir' | 'dart' | 'ltir' | 'severity_rate'
  label: string
  benchmark?: number | null
  isLoading?: boolean
}

function TrendChart({ data, metric, label, benchmark, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trend data available
      </div>
    )
  }

  // Sort by date and take last 12 periods
  const sortedData = [...data]
    .sort((a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime())
    .slice(-12)

  // Find max value for scaling
  const values = sortedData.map((d) => d[metric] || 0)
  const maxValue = Math.max(...values, benchmark || 0) * 1.2 || 5

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">{label} Trend</h4>
        {benchmark && (
          <span className="text-xs text-gray-500">
            Industry Avg: {benchmark.toFixed(2)}
          </span>
        )}
      </div>

      <div className="relative h-40">
        {/* Benchmark line */}
        {benchmark && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-orange-400"
            style={{ bottom: `${(benchmark / maxValue) * 100}%` }}
          >
            <span className="absolute -top-3 right-0 text-xs text-orange-600">
              Benchmark
            </span>
          </div>
        )}

        {/* Bars */}
        <div className="flex items-end justify-between h-full gap-1">
          {sortedData.map((point, index) => {
            const value = point[metric] || 0
            const height = (value / maxValue) * 100
            const isBelowBenchmark = benchmark ? value < benchmark : true

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center group"
              >
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isBelowBenchmark ? 'bg-green-500' : 'bg-red-400',
                    'hover:opacity-80'
                  )}
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${point.period_label}: ${value.toFixed(2)}`}
                />
                <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                  {point.period_label.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Industry Comparison Card
// ============================================================================

interface IndustryComparisonProps {
  metrics: SafetyMetrics
  benchmark: IndustrySafetyBenchmark | null
  isLoading?: boolean
}

function IndustryComparison({ metrics, benchmark, isLoading }: IndustryComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!benchmark) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          No industry benchmark data available
        </CardContent>
      </Card>
    )
  }

  const comparisons = [
    {
      label: 'TRIR',
      yours: metrics.trir,
      industry: benchmark.avg_trir,
    },
    {
      label: 'DART',
      yours: metrics.dart,
      industry: benchmark.avg_dart,
    },
    {
      label: 'LTIR',
      yours: metrics.ltir,
      industry: benchmark.avg_ltir,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Industry Comparison - {benchmark.industry_name}
        </CardTitle>
        <CardDescription>
          NAICS Code: {benchmark.naics_code} ({benchmark.year})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comparisons.map((comp) => {
            const variance = comp.yours !== null && comp.industry
              ? ((comp.yours - comp.industry) / comp.industry) * 100
              : null

            return (
              <div key={comp.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{comp.label}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    variance !== null && variance < 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {variance !== null ? (
                      `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  {/* Industry benchmark line */}
                  {comp.industry && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
                      style={{ left: '50%' }}
                    />
                  )}
                  {/* Your rate bar */}
                  {comp.yours !== null && comp.industry && (
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 rounded-full',
                        comp.yours < comp.industry ? 'bg-green-500' : 'bg-red-400'
                      )}
                      style={{
                        width: `${Math.min((comp.yours / (comp.industry * 2)) * 100, 100)}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Your Rate: {comp.yours?.toFixed(2) || 'N/A'}</span>
                  <span>Industry: {comp.industry?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export function SafetyMetricsDashboard({
  companyId,
  projectId,
  year = new Date().getFullYear(),
  onViewDetails,
  onManageHours,
  className,
}: SafetyMetricsDashboardProps) {
  const [periodType, setPeriodType] = React.useState<MetricsPeriodType>('monthly')

  const { data: dashboard, isLoading, refetch } = useSafetyMetricsDashboard(
    companyId,
    projectId,
    year
  )

  const { data: trendData, isLoading: trendLoading } = useSafetyMetricsTrend(
    companyId,
    projectId || null,
    periodType,
    12
  )

  const { formatTRIR, formatDART, formatLTIR, formatEMR } = useRateDisplay()
  const createSnapshot = useCreateSnapshot()

  const handleRefresh = async () => {
    // Create a new snapshot then refetch
    try {
      await createSnapshot.mutateAsync({
        companyId,
        projectId: projectId || null,
        periodType: 'ytd',
        year,
      })
      refetch()
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Unable to load safety metrics</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { ytd_metrics, previous_metrics, benchmark, scorecard } = dashboard

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Safety Metrics Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            {year} Year-to-Date Performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as MetricsPeriodType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={createSnapshot.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', createSnapshot.isPending && 'animate-spin')} />
            Refresh
          </Button>

          {onManageHours && (
            <Button variant="outline" size="sm" onClick={onManageHours}>
              <Clock className="h-4 w-4 mr-1" />
              Hours
            </Button>
          )}

          {onViewDetails && (
            <Button variant="default" size="sm" onClick={onViewDetails}>
              View Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Recordable Incident Rate"
          shortTitle="TRIR"
          value={ytd_metrics.trir}
          previousValue={previous_metrics?.trir}
          benchmark={benchmark?.avg_trir}
          description="Recordable cases per 200,000 hours"
          format={formatTRIR}
        />

        <MetricCard
          title="Days Away, Restricted, or Transferred"
          shortTitle="DART"
          value={ytd_metrics.dart}
          previousValue={previous_metrics?.dart}
          benchmark={benchmark?.avg_dart}
          description="DART cases per 200,000 hours"
          format={formatDART}
        />

        <MetricCard
          title="Lost Time Injury Rate"
          shortTitle="LTIR"
          value={ytd_metrics.ltir}
          previousValue={previous_metrics?.ltir}
          benchmark={benchmark?.avg_ltir}
          description="Lost time cases per 200,000 hours"
          format={formatLTIR}
        />

        <MetricCard
          title="Experience Modification Rate"
          shortTitle="EMR"
          value={scorecard.current_emr}
          benchmark={1.0}
          description="1.0 = industry average"
          format={formatEMR}
        />
      </div>

      {/* Scorecard */}
      <SafetyScorecardCard scorecard={scorecard} />

      {/* Trends and Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TRIR Trend */}
        <Card>
          <CardContent className="pt-6">
            <TrendChart
              data={trendData || []}
              metric="trir"
              label="TRIR"
              benchmark={benchmark?.avg_trir}
              isLoading={trendLoading}
            />
          </CardContent>
        </Card>

        {/* DART Trend */}
        <Card>
          <CardContent className="pt-6">
            <TrendChart
              data={trendData || []}
              metric="dart"
              label="DART"
              benchmark={benchmark?.avg_dart}
              isLoading={trendLoading}
            />
          </CardContent>
        </Card>

        {/* Industry Comparison */}
        <IndustryComparison
          metrics={ytd_metrics}
          benchmark={benchmark}
        />
      </div>

      {/* Hours and Incidents Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours Worked</p>
                <p className="text-2xl font-bold">{formatHours(ytd_metrics.total_hours_worked)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Employees</p>
                <p className="text-2xl font-bold">{ytd_metrics.average_employees || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-100">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Days Away + Restricted</p>
                <p className="text-2xl font-bold">
                  {ytd_metrics.total_days_away + ytd_metrics.total_days_restricted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OSHA Formula Reference */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500">
            <span className="font-medium">OSHA Rate Formulas:</span>
            <span>TRIR = (Recordable Cases x 200,000) / Hours Worked</span>
            <span>DART = (DART Cases x 200,000) / Hours Worked</span>
            <span>LTIR = (Lost Time Cases x 200,000) / Hours Worked</span>
            <span>200,000 = 100 FTE working 40 hrs/week for 50 weeks</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SafetyMetricsDashboard
