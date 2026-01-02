/**
 * Executive Summary Report Component
 *
 * A comprehensive dashboard-style report showing key metrics,
 * highlights, and concerns across all projects.
 */

import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  ListChecks,
  Shield,
  Calendar,
  Loader2,
  RefreshCw,
  Download,
  Building2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useExecutiveSummary, type ReportConcern, type ReportHighlight } from '../hooks'

// ============================================================================
// Sub-Components
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  colorClass,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  colorClass?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', colorClass)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('p-2 rounded-lg', colorClass ? `bg-opacity-10 ${colorClass.replace('text-', 'bg-')}` : 'bg-muted')}>
            <Icon className={cn('h-5 w-5', colorClass || 'text-muted-foreground')} />
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-destructive" />
            ) : null}
            <span className={cn('text-xs', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScheduleChart({ onTrack, atRisk, behind, ahead }: { onTrack: number; atRisk: number; behind: number; ahead: number }) {
  const total = onTrack + atRisk + behind + ahead
  if (total === 0) return null

  const segments = [
    { label: 'Ahead', value: ahead, color: 'bg-blue-500' },
    { label: 'On Track', value: onTrack, color: 'bg-green-500' },
    { label: 'At Risk', value: atRisk, color: 'bg-yellow-500' },
    { label: 'Behind', value: behind, color: 'bg-red-500' },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        {segments.map((segment, i) => (
          <div
            key={segment.label}
            className={cn(segment.color, 'transition-all')}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', segment.color)} />
            <span className="text-sm">
              {segment.label}: {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighlightCard({ highlight }: { highlight: ReportHighlight }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
      <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
      <div>
        <p className="font-medium text-sm">{highlight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{highlight.description}</p>
        {highlight.projectName && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {highlight.projectName}
          </Badge>
        )}
      </div>
    </div>
  )
}

function ConcernCard({ concern }: { concern: ReportConcern }) {
  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  }

  const severityIcons = {
    low: AlertCircle,
    medium: AlertTriangle,
    high: AlertTriangle,
    critical: AlertTriangle,
  }

  const Icon = severityIcons[concern.severity]

  return (
    <div className={cn('p-3 rounded-lg border', severityColors[concern.severity])}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{concern.title}</p>
            <Badge variant="outline" className="text-xs capitalize">
              {concern.severity}
            </Badge>
          </div>
          <p className="text-xs mt-1 opacity-80">{concern.description}</p>
          {concern.recommendation && (
            <p className="text-xs mt-2 font-medium">
              Recommendation: {concern.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function WeeklyComparison({
  tasksCompleted,
  rfisClosed,
  submittalsClosed,
  punchItemsResolved,
}: {
  tasksCompleted: number
  rfisClosed: number
  submittalsClosed: number
  punchItemsResolved: number
}) {
  const items = [
    { label: 'Tasks Completed', value: tasksCompleted, icon: CheckCircle2 },
    { label: 'RFIs Closed', value: rfisClosed, icon: FileText },
    { label: 'Submittals Approved', value: submittalsClosed, icon: ListChecks },
    { label: 'Punch Items Resolved', value: punchItemsResolved, icon: CheckCircle2 },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
          <item.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ExecutiveSummaryReport() {
  const { data: summary, isLoading, error, refetch } = useExecutiveSummary()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Failed to load executive summary</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Summary</h1>
          <p className="text-muted-foreground">
            {format(summary.dateRange.start, 'MMM d')} - {format(summary.dateRange.end, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{summary.activeProjects}</p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{summary.projectCount}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{summary.overallProgress}%</p>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(summary.budgetSummary.totalBudget)}</p>
              <p className="text-sm text-muted-foreground">Total Budget</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h4 className="text-sm font-medium mb-3">Schedule Status</h4>
            <ScheduleChart {...summary.scheduleSummary} />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Open RFIs"
            value={summary.keyMetrics.openRFIs}
            subtitle={`${summary.keyMetrics.overdueRFIs} overdue`}
            icon={FileText}
            colorClass={summary.keyMetrics.overdueRFIs > 5 ? 'text-destructive' : undefined}
          />
          <MetricCard
            title="Open Submittals"
            value={summary.keyMetrics.openSubmittals}
            subtitle={`${summary.keyMetrics.overdueSubmittals} overdue`}
            icon={ListChecks}
            colorClass={summary.keyMetrics.overdueSubmittals > 3 ? 'text-destructive' : undefined}
          />
          <MetricCard
            title="Change Orders"
            value={summary.keyMetrics.openChangeOrders}
            subtitle={formatCurrency(summary.keyMetrics.totalCOValue)}
            icon={DollarSign}
          />
          <MetricCard
            title="Punch Items"
            value={summary.keyMetrics.openPunchItems}
            icon={CheckCircle2}
          />
          <MetricCard
            title="Days Safe"
            value={summary.keyMetrics.daysSinceLastIncident}
            subtitle={`${summary.keyMetrics.safetyIncidents} total incidents`}
            icon={Shield}
            colorClass={summary.keyMetrics.daysSinceLastIncident >= 30 ? 'text-success' : undefined}
          />
        </div>
      </div>

      {/* This Week's Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week's Activity
          </CardTitle>
          <CardDescription>Progress made during the current week</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyComparison {...summary.weeklyComparison} />
        </CardContent>
      </Card>

      {/* Highlights & Concerns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Highlights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.highlights.length > 0 ? (
              <div className="space-y-3">
                {summary.highlights.map((highlight, i) => (
                  <HighlightCard key={i} highlight={highlight} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No highlights this week
              </p>
            )}
          </CardContent>
        </Card>

        {/* Concerns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.concerns.length > 0 ? (
              <div className="space-y-3">
                {summary.concerns.map((concern, i) => (
                  <ConcernCard key={i} concern={concern} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm text-muted-foreground">No major concerns</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t">
        Report generated on {format(summary.reportDate, 'MMMM d, yyyy at h:mm a')}
      </div>
    </div>
  )
}

export default ExecutiveSummaryReport
