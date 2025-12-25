/**
 * Activity Detail Panel
 *
 * Side panel showing comprehensive activity details including dates,
 * progress, assignments, dependencies, and variance from baseline.
 */

import * as React from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  CalendarDays,
  Clock,
  User,
  Building,
  DollarSign,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Pause,
  XCircle,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Hash,
  FileText,
  Link2,
} from 'lucide-react'
import { CalendarDisplay } from './CalendarSelector'
import type {
  ScheduleActivity,
  ScheduleActivityWithDetails,
  ActivityStatus,
  ScheduleCalendar,
} from '@/types/schedule-activities'

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

function formatCurrency(value: number | null | undefined): string {
  if (value == null) {return '—'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getVarianceDays(
  planned: string | null | undefined,
  actual: string | null | undefined
): number | null {
  if (!planned || !actual) {return null}
  try {
    return differenceInDays(parseISO(actual), parseISO(planned))
  } catch {
    return null
  }
}

function getStatusIcon(status: ActivityStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case 'in_progress':
      return <Circle className="h-4 w-4 text-primary fill-blue-500" />
    case 'on_hold':
      return <Pause className="h-4 w-4 text-warning" />
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-error" />
    default:
      return <Circle className="h-4 w-4 text-disabled" />
  }
}

function getStatusBadge(status: ActivityStatus) {
  const statusConfig: Record<ActivityStatus, { label: string; className: string }> = {
    not_started: { label: 'Not Started', className: 'bg-muted text-foreground' },
    in_progress: { label: 'In Progress', className: 'bg-info-light text-blue-800' },
    completed: { label: 'Completed', className: 'bg-success-light text-green-800' },
    on_hold: { label: 'On Hold', className: 'bg-warning-light text-yellow-800' },
    cancelled: { label: 'Cancelled', className: 'bg-error-light text-red-800' },
  }
  const config = statusConfig[status] || statusConfig.not_started
  return (
    <Badge variant="secondary" className={config.className}>
      {getStatusIcon(status)}
      <span className="ml-1">{config.label}</span>
    </Badge>
  )
}

// =============================================
// Sub-Components
// =============================================

interface DetailRowProps {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  className?: string
}

function DetailRow({ icon, label, value, className }: DetailRowProps) {
  return (
    <div className={`flex justify-between items-start py-2 ${className}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

interface VarianceIndicatorProps {
  days: number | null
  label: string
}

function VarianceIndicator({ days, label }: VarianceIndicatorProps) {
  if (days === null) {return null}

  const isNegative = days < 0
  const isPositive = days > 0
  const Icon = isNegative ? TrendingDown : isPositive ? TrendingUp : Minus

  return (
    <div
      className={`flex items-center gap-1 text-sm ${
        isNegative ? 'text-success' : isPositive ? 'text-error' : 'text-muted'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>
        {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} {label}
      </span>
    </div>
  )
}

// =============================================
// Component Props
// =============================================

interface ActivityDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ScheduleActivity | ScheduleActivityWithDetails | null
  calendar?: ScheduleCalendar | null
  onEdit?: () => void
  onDelete?: () => void
  onViewDependencies?: () => void
}

// =============================================
// Component
// =============================================

export function ActivityDetailPanel({
  open,
  onOpenChange,
  activity,
  calendar,
  onEdit,
  onDelete,
  onViewDependencies,
}: ActivityDetailPanelProps) {
  if (!activity) {return null}

  const startVariance = getVarianceDays(activity.baseline_start, activity.actual_start)
  const finishVariance = getVarianceDays(activity.baseline_finish, activity.actual_finish)

  const activityWithDetails = activity as ScheduleActivityWithDetails

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2">
                {activity.is_milestone && <Flag className="h-4 w-4 text-orange-500" />}
                {activity.is_critical && <AlertTriangle className="h-4 w-4 text-error" />}
                {activity.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Hash className="h-3.5 w-3.5" />
                {activity.activity_id}
                {activity.wbs_code && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    WBS: {activity.wbs_code}
                  </>
                )}
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="outline" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {getStatusBadge(activity.status)}
              {activity.is_critical && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Critical Path
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{activity.percent_complete}%</span>
              </div>
              <Progress value={activity.percent_complete} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Dates Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1 heading-card">
              <CalendarDays className="h-4 w-4" />
              Schedule
            </h4>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <DetailRow
                label="Planned Start"
                value={formatDate(activity.planned_start)}
              />
              <DetailRow
                label="Planned Finish"
                value={formatDate(activity.planned_finish)}
              />
              <DetailRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Duration"
                value={
                  activity.planned_duration
                    ? `${activity.planned_duration} day${activity.planned_duration !== 1 ? 's' : ''}`
                    : '—'
                }
              />
            </div>

            {(activity.actual_start || activity.actual_finish) && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <DetailRow
                  label="Actual Start"
                  value={formatDate(activity.actual_start)}
                />
                <DetailRow
                  label="Actual Finish"
                  value={formatDate(activity.actual_finish)}
                />
                {activity.actual_duration && (
                  <DetailRow
                    label="Actual Duration"
                    value={`${activity.actual_duration} day${activity.actual_duration !== 1 ? 's' : ''}`}
                  />
                )}
              </div>
            )}

            {/* Baseline Comparison */}
            {(activity.baseline_start || activity.baseline_finish) && (
              <div className="bg-surface rounded-lg p-3 space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase">
                  Baseline Comparison
                </h5>
                <DetailRow
                  label="Baseline Start"
                  value={formatDate(activity.baseline_start)}
                />
                <DetailRow
                  label="Baseline Finish"
                  value={formatDate(activity.baseline_finish)}
                />
                {startVariance !== null && (
                  <VarianceIndicator
                    days={startVariance}
                    label={startVariance > 0 ? 'late start' : 'early start'}
                  />
                )}
                {finishVariance !== null && (
                  <VarianceIndicator
                    days={finishVariance}
                    label={finishVariance > 0 ? 'late finish' : 'early finish'}
                  />
                )}
              </div>
            )}

            {/* Float */}
            {(activity.total_float !== null || activity.free_float !== null) && (
              <div className="flex gap-4 text-sm">
                {activity.total_float !== null && (
                  <div>
                    <span className="text-muted-foreground">Total Float: </span>
                    <span
                      className={`font-medium ${
                        activity.total_float <= 0 ? 'text-error' : ''
                      }`}
                    >
                      {activity.total_float} day{activity.total_float !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {activity.free_float !== null && (
                  <div>
                    <span className="text-muted-foreground">Free Float: </span>
                    <span className="font-medium">
                      {activity.free_float} day{activity.free_float !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Assignment Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1 heading-card">
              <User className="h-4 w-4" />
              Assignment
            </h4>

            <div className="space-y-1">
              <DetailRow
                icon={<User className="h-3.5 w-3.5" />}
                label="Responsible Party"
                value={activity.responsible_party || '—'}
              />
              {activityWithDetails.responsible_user_name && (
                <DetailRow
                  label="Assigned User"
                  value={activityWithDetails.responsible_user_name}
                />
              )}
              {activityWithDetails.subcontractor_name && (
                <DetailRow
                  icon={<Building className="h-3.5 w-3.5" />}
                  label="Subcontractor"
                  value={activityWithDetails.subcontractor_name}
                />
              )}
            </div>

            {/* Calendar */}
            <div className="pt-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                <Calendar className="h-3.5 w-3.5" />
                Work Calendar
              </Label>
              <CalendarDisplay calendar={calendar} />
            </div>
          </div>

          {/* Budget Section */}
          {(activity.budgeted_cost || activity.budgeted_labor_hours) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1 heading-card">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {activity.budgeted_cost && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Budgeted Cost</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(activity.budgeted_cost)}
                      </div>
                      {activity.actual_cost && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Actual: {formatCurrency(activity.actual_cost)}
                        </div>
                      )}
                    </div>
                  )}
                  {activity.budgeted_labor_hours && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Labor Hours</div>
                      <div className="text-lg font-semibold">
                        {activity.budgeted_labor_hours}h
                      </div>
                      {activity.actual_labor_hours && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Actual: {activity.actual_labor_hours}h
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Description & Notes */}
          {(activity.description || activity.notes) && (
            <>
              <Separator />
              <div className="space-y-3">
                {activity.description && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1 mb-1 heading-card">
                      <FileText className="h-4 w-4" />
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.description}
                    </p>
                  </div>
                )}
                {activity.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1 heading-card">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Dependencies Link */}
          {onViewDependencies && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={onViewDependencies}
              >
                <Link2 className="h-4 w-4 mr-2" />
                View Dependencies
              </Button>
            </>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <div>
              Created: {formatDate(activity.created_at)}
            </div>
            {activity.updated_at !== activity.created_at && (
              <div>
                Updated: {formatDate(activity.updated_at)}
              </div>
            )}
            {activity.external_source && (
              <div>
                Source: {activity.external_source.replace('_', ' ')}
                {activity.external_id && ` (${activity.external_id})`}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Helper Label component for consistency
function Label({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}
