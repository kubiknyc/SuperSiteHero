/**
 * Baseline Comparison View Component
 *
 * Side-by-side variance analysis showing current schedule vs baseline.
 * Includes summary cards, milestone variance table, and full activity comparison.
 * Uses construction-standard variance thresholds: ±3 green, ±4-7 yellow, ±8-14 orange, >14 red
 */

import * as React from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Flag,
  X,
  Calendar,
} from 'lucide-react'
import type { ScheduleActivity, ScheduleBaseline } from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

type VarianceStatus = 'on_track' | 'caution' | 'warning' | 'critical'

interface ActivityVariance {
  activity: ScheduleActivity
  baseline_start: string | null
  baseline_finish: string | null
  start_variance_days: number | null
  finish_variance_days: number | null
  status: VarianceStatus
}

interface VarianceSummary {
  on_track: number
  caution: number
  warning: number
  critical: number
  avg_variance_days: number
}

// =============================================
// Constants - Construction Standard Thresholds
// =============================================

const VARIANCE_THRESHOLDS = {
  ON_TRACK: 3,     // ±3 days
  CAUTION: 7,      // ±4-7 days
  WARNING: 14,     // ±8-14 days
  // > 14 days = critical
}

// Critical path activities have tighter thresholds (50%)
const CRITICAL_PATH_MULTIPLIER = 0.5

// =============================================
// Helper Functions
// =============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d')
  } catch {
    return dateString
  }
}

function getVarianceStatus(
  varianceDays: number | null,
  isCritical: boolean = false
): VarianceStatus {
  if (varianceDays === null) {return 'on_track'}

  const absVariance = Math.abs(varianceDays)
  const multiplier = isCritical ? CRITICAL_PATH_MULTIPLIER : 1

  if (absVariance <= VARIANCE_THRESHOLDS.ON_TRACK * multiplier) {return 'on_track'}
  if (absVariance <= VARIANCE_THRESHOLDS.CAUTION * multiplier) {return 'caution'}
  if (absVariance <= VARIANCE_THRESHOLDS.WARNING * multiplier) {return 'warning'}
  return 'critical'
}

function getVarianceColor(status: VarianceStatus): string {
  switch (status) {
    case 'on_track': return 'text-green-600'
    case 'caution': return 'text-yellow-600'
    case 'warning': return 'text-orange-600'
    case 'critical': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

function getVarianceBgColor(status: VarianceStatus): string {
  switch (status) {
    case 'on_track': return 'bg-green-100 text-green-800'
    case 'caution': return 'bg-yellow-100 text-yellow-800'
    case 'warning': return 'bg-orange-100 text-orange-800'
    case 'critical': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusIcon(status: VarianceStatus) {
  switch (status) {
    case 'on_track':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'caution':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-400" />
  }
}

function getVarianceIcon(days: number | null) {
  if (days === null) {return <Minus className="h-3.5 w-3.5" />}
  if (days < 0) {return <TrendingDown className="h-3.5 w-3.5" />}
  if (days > 0) {return <TrendingUp className="h-3.5 w-3.5" />}
  return <Minus className="h-3.5 w-3.5" />
}

function calculateVariance(
  activities: ScheduleActivity[],
  baselineActivities?: Map<string, { start: string | null; finish: string | null }>
): ActivityVariance[] {
  return activities.map((activity) => {
    const baseline = baselineActivities?.get(activity.id)
    const baseline_start = baseline?.start || activity.baseline_start
    const baseline_finish = baseline?.finish || activity.baseline_finish

    let start_variance_days: number | null = null
    let finish_variance_days: number | null = null

    if (baseline_start && activity.planned_start) {
      try {
        start_variance_days = differenceInDays(
          parseISO(activity.planned_start),
          parseISO(baseline_start)
        )
      } catch {
        // Ignore parse errors
      }
    }

    if (baseline_finish && activity.planned_finish) {
      try {
        finish_variance_days = differenceInDays(
          parseISO(activity.planned_finish),
          parseISO(baseline_finish)
        )
      } catch {
        // Ignore parse errors
      }
    }

    // Use finish variance for status (more important for delivery)
    const status = getVarianceStatus(finish_variance_days, activity.is_critical)

    return {
      activity,
      baseline_start,
      baseline_finish,
      start_variance_days,
      finish_variance_days,
      status,
    }
  })
}

function calculateSummary(variances: ActivityVariance[]): VarianceSummary {
  let on_track = 0
  let caution = 0
  let warning = 0
  let critical = 0
  let totalVariance = 0
  let countWithVariance = 0

  variances.forEach((v) => {
    switch (v.status) {
      case 'on_track': on_track++; break
      case 'caution': caution++; break
      case 'warning': warning++; break
      case 'critical': critical++; break
    }

    if (v.finish_variance_days !== null) {
      totalVariance += v.finish_variance_days
      countWithVariance++
    }
  })

  return {
    on_track,
    caution,
    warning,
    critical,
    avg_variance_days: countWithVariance > 0 ? totalVariance / countWithVariance : 0,
  }
}

// =============================================
// Sub-Components
// =============================================

interface SummaryCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  className?: string
}

function SummaryCard({ title, value, icon, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        {icon}
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </CardContent>
    </Card>
  )
}

interface VarianceBadgeProps {
  days: number | null
  status: VarianceStatus
}

function VarianceBadge({ days, status }: VarianceBadgeProps) {
  if (days === null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const isLate = days > 0
  const isEarly = days < 0

  return (
    <div className={`flex items-center gap-1 ${getVarianceColor(status)}`}>
      {getVarianceIcon(days)}
      <span className="text-sm font-medium">
        {isLate ? '+' : ''}{days}d
        <span className="text-xs ml-1">
          {isLate ? 'late' : isEarly ? 'early' : 'on time'}
        </span>
      </span>
    </div>
  )
}

// =============================================
// Component Props
// =============================================

interface BaselineComparisonViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  baseline: ScheduleBaseline | null
  activities: ScheduleActivity[]
}

// =============================================
// Component
// =============================================

export function BaselineComparisonView({
  open,
  onOpenChange,
  projectId,
  baseline,
  activities,
}: BaselineComparisonViewProps) {
  // State
  const [searchQuery, setSearchQuery] = React.useState('')
  const [criticalOnly, setCriticalOnly] = React.useState(false)
  const [milestonesOnly, setMilestonesOnly] = React.useState(false)

  // Calculate variances
  const variances = React.useMemo(
    () => calculateVariance(activities),
    [activities]
  )

  // Calculate summary
  const summary = React.useMemo(
    () => calculateSummary(variances),
    [variances]
  )

  // Filter milestones
  const milestoneVariances = React.useMemo(
    () => variances.filter((v) => v.activity.is_milestone),
    [variances]
  )

  // Filter activities based on search and filters
  const filteredVariances = React.useMemo(() => {
    let filtered = variances

    if (criticalOnly) {
      filtered = filtered.filter((v) => v.activity.is_critical)
    }

    if (milestonesOnly) {
      filtered = filtered.filter((v) => v.activity.is_milestone)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.activity.name.toLowerCase().includes(query) ||
          v.activity.activity_id.toLowerCase().includes(query) ||
          v.activity.wbs_code?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [variances, searchQuery, criticalOnly, milestonesOnly])

  if (!baseline) {return null}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[800px] sm:max-w-[800px] overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Baseline Comparison
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {baseline.name} - {formatDate(baseline.created_at)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <SummaryCard
              title="On Track"
              value={summary.on_track}
              icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
              className="border-green-200"
            />
            <SummaryCard
              title="Caution"
              value={summary.caution}
              icon={<AlertTriangle className="h-6 w-6 text-yellow-500" />}
              className="border-yellow-200"
            />
            <SummaryCard
              title="Critical"
              value={summary.warning + summary.critical}
              icon={<AlertCircle className="h-6 w-6 text-red-500" />}
              className="border-red-200"
            />
            <SummaryCard
              title="Avg Variance"
              value={`${summary.avg_variance_days > 0 ? '+' : ''}${summary.avg_variance_days.toFixed(1)}d`}
              icon={
                summary.avg_variance_days > 0 ? (
                  <TrendingUp className="h-6 w-6 text-red-500" />
                ) : summary.avg_variance_days < 0 ? (
                  <TrendingDown className="h-6 w-6 text-green-500" />
                ) : (
                  <Minus className="h-6 w-6 text-gray-400" />
                )
              }
              className={
                summary.avg_variance_days > 3
                  ? 'border-red-200'
                  : summary.avg_variance_days < -3
                  ? 'border-green-200'
                  : ''
              }
            />
          </div>

          {/* Milestone Variance Section */}
          {milestoneVariances.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Flag className="h-4 w-4 text-orange-500" />
                  Milestone Variance
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Milestone</TableHead>
                        <TableHead className="w-[100px]">Baseline</TableHead>
                        <TableHead className="w-[100px]">Current</TableHead>
                        <TableHead className="w-[120px]">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestoneVariances.map((v) => (
                        <TableRow key={v.activity.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(v.status)}
                              <span className="font-medium">{v.activity.name}</span>
                              {v.activity.is_critical && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatShortDate(v.baseline_finish)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatShortDate(v.activity.planned_finish)}
                          </TableCell>
                          <TableCell>
                            <VarianceBadge days={v.finish_variance_days} status={v.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Activity Variance Table */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Activity Variance</h3>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={criticalOnly}
                    onCheckedChange={(checked) => setCriticalOnly(checked === true)}
                  />
                  Critical Only
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={milestonesOnly}
                    onCheckedChange={(checked) => setMilestonesOnly(checked === true)}
                  />
                  Milestones Only
                </label>
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Activity</TableHead>
                    <TableHead className="w-[90px]">BL Start</TableHead>
                    <TableHead className="w-[90px]">Current</TableHead>
                    <TableHead className="w-[90px]">BL Finish</TableHead>
                    <TableHead className="w-[90px]">Current</TableHead>
                    <TableHead className="w-[100px]">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVariances.map((v) => (
                    <TableRow key={v.activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(v.status)}
                          <div>
                            <div className="font-medium text-sm truncate max-w-[180px]">
                              {v.activity.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {v.activity.activity_id}
                            </div>
                          </div>
                          {v.activity.is_milestone && (
                            <Flag className="h-3.5 w-3.5 text-orange-500" />
                          )}
                          {v.activity.is_critical && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatShortDate(v.baseline_start)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatShortDate(v.activity.planned_start)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatShortDate(v.baseline_finish)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatShortDate(v.activity.planned_finish)}
                      </TableCell>
                      <TableCell>
                        <VarianceBadge days={v.finish_variance_days} status={v.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVariances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No activities match the current filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="text-xs text-muted-foreground">
              Showing {filteredVariances.length} of {variances.length} activities
            </div>
          </div>

          {/* Variance Legend */}
          <Separator />
          <div className="text-xs text-muted-foreground">
            <strong>Variance Thresholds:</strong>
            <div className="flex gap-4 mt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                ±3 days = On Track
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                ±4-7 days = Caution
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                ±8-14 days = Warning
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                {'>'}14 days = Critical
              </span>
            </div>
            <div className="mt-1 italic">
              * Critical path activities use tighter thresholds (50%)
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
