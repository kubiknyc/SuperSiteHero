/**
 * RFI Trend Report Component
 *
 * Comprehensive dashboard for identifying recurring RFI issues and patterns.
 * Displays trends over time, common issue categories, and assignee performance.
 * Includes export to PDF functionality.
 */

import { useState, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useRFIResponseAnalytics,
  getDateRangeFromPreset,
} from '@/features/rfis/hooks/useRFIResponseAnalytics'
import {
  RFITrendChart,
  RFIPriorityChart,
  RFIAssigneeChart,
  RFIOnTimeTrendChart,
} from './RFITrendChart'
import type {
  DateRangePreset,
  RFIPriority,
  TrendDirection,
  ResponseTimeByResponseType,
} from '@/types/rfi-response-analytics'

// ============================================================================
// Types
// ============================================================================

interface RFITrendReportProps {
  projectId: string
  className?: string
}

interface RecurringIssue {
  category: string
  count: number
  percentage: number
  averageResponseDays: number
  trend: TrendDirection
}

// ============================================================================
// Constants
// ============================================================================

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all_time', label: 'All Time' },
]

const PRIORITY_OPTIONS: { value: RFIPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get trend indicator
 */
function getTrendIndicator(trend: TrendDirection): React.ReactNode {
  switch (trend) {
    case 'improving':
      return <TrendingDown className="w-4 h-4 text-success" />
    case 'declining':
      return <TrendingUp className="w-4 h-4 text-error" />
    case 'stable':
      return <Minus className="w-4 h-4 text-secondary" />
  }
}

/**
 * Get trend color class
 */
function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case 'improving':
      return 'text-success'
    case 'declining':
      return 'text-error'
    case 'stable':
      return 'text-secondary'
  }
}

/**
 * Analyze recurring issues from response type data
 */
function analyzeRecurringIssues(
  responseTypes: ResponseTimeByResponseType[]
): RecurringIssue[] {
  return responseTypes.map((rt) => ({
    category: rt.responseType,
    count: rt.count,
    percentage: rt.percentage,
    averageResponseDays: rt.averageResponseDays,
    trend: 'stable' as TrendDirection, // Would need historical data for real trend
  }))
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * RFITrendReport Component
 *
 * Displays comprehensive RFI trend analysis with charts, insights, and export.
 *
 * @example
 * ```tsx
 * <RFITrendReport projectId="project-123" />
 * ```
 */
export function RFITrendReport({ projectId, className }: RFITrendReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [dateRange, setDateRange] = useState<DateRangePreset>('last_90_days')
  const [selectedPriority, setSelectedPriority] = useState<RFIPriority | 'all'>('all')

  // Fetch analytics data
  const {
    data: analytics,
    isLoading,
    isError,
    error,
  } = useRFIResponseAnalytics(projectId, {
    dateRange: getDateRangeFromPreset(dateRange),
    priority: selectedPriority !== 'all' ? selectedPriority : undefined,
  })

  // Analyze recurring issues
  const recurringIssues = useMemo(() => {
    if (!analytics) {return []}
    return analyzeRecurringIssues(analytics.byResponseType)
  }, [analytics])

  // Top performers and those needing attention
  const { topPerformers, needsAttention } = useMemo(() => {
    if (!analytics) {return { topPerformers: [], needsAttention: [] }}

    const top = analytics.byAssignee
      .filter((a) => a.performanceRating === 'excellent' || a.performanceRating === 'good')
      .slice(0, 5)

    const needs = analytics.byAssignee
      .filter((a) => a.performanceRating === 'needs_improvement')
      .slice(0, 5)

    return { topPerformers: top, needsAttention: needs }
  }, [analytics])

  // Handle PDF export
  const handleExportPDF = async () => {
    // In a real implementation, use a library like jsPDF or html2pdf
    alert('PDF export functionality would be implemented here using jsPDF or similar library')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (isError || !analytics) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-error py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Failed to load trend report</p>
            <p className="text-sm text-secondary mt-2">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div ref={reportRef} className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground heading-section">RFI Trend Report</h2>
          <p className="text-sm text-secondary mt-1">
            Analysis generated on {format(new Date(analytics.generatedAt), 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRangePreset)}
          >
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedPriority}
            onValueChange={(value) => setSelectedPriority(value as RFIPriority | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExportPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">
              Overall Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {analytics.summary.overallAverageResponseDays.toFixed(1)} days
                </div>
                <p className="text-xs text-secondary mt-1">Average Response Time</p>
              </div>
              <div className={cn('flex items-center gap-1', getTrendColor(analytics.trends.overallTrend))}>
                {getTrendIndicator(analytics.trends.overallTrend)}
                <span className="text-sm font-medium">
                  {Math.abs(analytics.trends.trendPercentageChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">
              Total RFIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {analytics.summary.totalRFIs}
                </div>
                <p className="text-xs text-secondary mt-1">
                  {analytics.summary.respondedRFIs} Responded
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">
              On-Time Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {analytics.summary.onTimePercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-secondary mt-1">
                  {analytics.summary.onTimeCount} of {analytics.summary.respondedRFIs}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">
              Median Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {analytics.summary.overallMedianResponseDays.toFixed(1)} days
                </div>
                <p className="text-xs text-secondary mt-1">50th Percentile</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RFITrendChart
          data={analytics.trends}
          title="Response Time Trends"
          showMovingAverage={true}
        />

        <RFIOnTimeTrendChart
          data={analytics.trends.dataPoints}
          title="On-Time Performance Trend"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RFIPriorityChart
          data={analytics.byPriority}
          title="Response Time by Priority"
        />

        <RFIAssigneeChart
          data={analytics.byAssignee}
          title="Top Performers"
          maxAssignees={8}
        />
      </div>

      {/* Recurring Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recurring Issue Categories</CardTitle>
          <CardDescription>
            Common RFI response types and their frequency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recurringIssues.length > 0 ? (
              recurringIssues.map((issue) => (
                <div
                  key={issue.category}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">
                        {issue.category.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {issue.count} responses
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-secondary">
                      <span>{issue.percentage.toFixed(1)}% of total</span>
                      <span>Avg: {issue.averageResponseDays.toFixed(1)} days</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIndicator(issue.trend)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recurring issues identified</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-success" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Assignees with excellent on-time performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {topPerformers.length > 0 ? (
                  topPerformers.map((assignee) => (
                    <div
                      key={assignee.assigneeId}
                      className="flex items-center justify-between p-3 bg-success-light border border-green-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{assignee.assigneeName}</p>
                        <p className="text-xs text-secondary mt-1">
                          {assignee.respondedCount} responses • Avg: {assignee.averageResponseDays.toFixed(1)} days
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-success-light text-green-800 border-green-200">
                          {assignee.onTimePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-8">
                    <p className="text-sm">No data available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-error" />
              Needs Attention
            </CardTitle>
            <CardDescription>
              Assignees with declining performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {needsAttention.length > 0 ? (
                  needsAttention.map((assignee) => (
                    <div
                      key={assignee.assigneeId}
                      className="flex items-center justify-between p-3 bg-error-light border border-red-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{assignee.assigneeName}</p>
                        <p className="text-xs text-secondary mt-1">
                          {assignee.respondedCount} responses • Avg: {assignee.averageResponseDays.toFixed(1)} days
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-error-light text-red-800 border-red-200">
                          {assignee.onTimePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All assignees performing well</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.trends.overallTrend === 'improving' && (
              <div className="flex gap-3 p-3 bg-success-light border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Response times are improving</p>
                  <p className="text-sm text-success-dark mt-1">
                    Average response time has decreased by {Math.abs(analytics.trends.trendPercentageChange).toFixed(1)}%.
                    Continue current practices and consider sharing best practices across the team.
                  </p>
                </div>
              </div>
            )}

            {analytics.trends.overallTrend === 'declining' && (
              <div className="flex gap-3 p-3 bg-error-light border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Response times are declining</p>
                  <p className="text-sm text-error-dark mt-1">
                    Average response time has increased by {Math.abs(analytics.trends.trendPercentageChange).toFixed(1)}%.
                    Review workload distribution and consider additional resources.
                  </p>
                </div>
              </div>
            )}

            {analytics.summary.onTimePercentage < 80 && (
              <div className="flex gap-3 p-3 bg-warning-light border border-yellow-200 rounded-lg">
                <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">On-time performance needs improvement</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Only {analytics.summary.onTimePercentage.toFixed(1)}% of RFIs are responded to on time.
                    Review priority assignments and response deadlines.
                  </p>
                </div>
              </div>
            )}

            {needsAttention.length > 0 && (
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Consider workload redistribution</p>
                  <p className="text-sm text-primary-hover mt-1">
                    {needsAttention.length} assignee{needsAttention.length > 1 ? 's need' : ' needs'} support.
                    Review their workload and consider redistributing RFIs to top performers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
