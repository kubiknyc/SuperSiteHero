/**
 * Schedule Narrative Component
 *
 * Auto-generated schedule narrative with analysis, critical path status,
 * delays, variance, and export capabilities.
 */

import * as React from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  FileText,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  Flag,
  RefreshCw,
  Printer,
} from 'lucide-react'
import {
  useScheduleNarrative,
  type ScheduleNarrative as NarrativeType,
  type NarrativeSection,
  type NarrativeOptions,
} from '../hooks/useScheduleNarrative'
import type {
  ScheduleActivity,
  ScheduleDependency,
  ScheduleBaseline,
  ScheduleStats,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

interface ScheduleNarrativeProps {
  projectId: string
  projectName: string
  activities: ScheduleActivity[]
  dependencies: ScheduleDependency[]
  baseline?: ScheduleBaseline | null
  stats?: ScheduleStats | null
  options?: NarrativeOptions
  onExport?: (format: 'pdf' | 'docx' | 'txt') => void
}

// =============================================
// Sub-Components
// =============================================

function StatusBadge({ status }: { status: NarrativeType['overallStatus'] }) {
  const config = {
    on_track: { label: 'On Track', variant: 'default' as const, className: 'bg-success text-success-foreground' },
    at_risk: { label: 'At Risk', variant: 'default' as const, className: 'bg-warning text-warning-foreground' },
    behind: { label: 'Behind Schedule', variant: 'destructive' as const, className: '' },
    ahead: { label: 'Ahead of Schedule', variant: 'default' as const, className: 'bg-info text-info-foreground' },
  }

  const { label, variant, className } = config[status]

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

function HealthGauge({ score }: { score: number }) {
  const getColor = (value: number) => {
    if (value >= 80) return 'bg-success'
    if (value >= 60) return 'bg-warning'
    return 'bg-destructive'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Health Score</span>
              <span className="font-bold">{score}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${getColor(score)} transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {score >= 80
              ? 'Project is in good health'
              : score >= 60
                ? 'Project needs attention'
                : 'Project requires immediate action'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  description,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="p-2 bg-background rounded-md">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">
          {value}
          {trend && (
            <span className={`text-xs ml-1 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : ''}`}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            </span>
          )}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

function NarrativeSectionCard({ section }: { section: NarrativeSection }) {
  const severityConfig = {
    info: { icon: Info, borderColor: 'border-l-info', bgColor: 'bg-info/5' },
    success: { icon: CheckCircle2, borderColor: 'border-l-success', bgColor: 'bg-success/5' },
    warning: { icon: AlertTriangle, borderColor: 'border-l-warning', bgColor: 'bg-warning/5' },
    error: { icon: AlertCircle, borderColor: 'border-l-destructive', bgColor: 'bg-destructive/5' },
  }

  const config = severityConfig[section.severity || 'info']
  const Icon = config.icon

  return (
    <Card className={`border-l-4 ${config.borderColor} ${config.bgColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {section.content}
        </p>
        {section.items && section.items.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-sm">
            {section.items.map((item, idx) => (
              <li key={idx} className="text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function DelayedActivitiesTable({ delays }: { delays: NarrativeType['delayedActivities'] }) {
  if (delays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mb-2" />
        <p className="font-medium">No Delayed Activities</p>
        <p className="text-sm text-muted-foreground">All activities are on schedule</p>
      </div>
    )
  }

  const impactColors = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-warning text-warning-foreground',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="space-y-2">
      {delays.slice(0, 10).map((delay) => (
        <div
          key={delay.activity.id}
          className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{delay.activity.name}</span>
              <Badge variant="outline" className={impactColors[delay.impact]}>
                {delay.impact}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {delay.reason}
            </p>
          </div>
          <div className="text-right ml-4">
            <p className="font-bold text-destructive">+{delay.delayDays}d</p>
            <p className="text-xs text-muted-foreground">delay</p>
          </div>
        </div>
      ))}
      {delays.length > 10 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          And {delays.length - 10} more delayed activities...
        </p>
      )}
    </div>
  )
}

function UpcomingMilestonesList({ milestones }: { milestones: ScheduleActivity[] }) {
  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Flag className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="font-medium">No Upcoming Milestones</p>
        <p className="text-sm text-muted-foreground">No milestones in the look-ahead period</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-md">
              <Flag className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{milestone.name}</p>
              {milestone.wbs_code && (
                <p className="text-xs text-muted-foreground">WBS: {milestone.wbs_code}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-sm">
              {milestone.planned_finish && format(new Date(milestone.planned_finish), 'MMM d')}
            </p>
            <p className="text-xs text-muted-foreground">
              {milestone.percent_complete}% complete
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================
// Export Functions
// =============================================

function generatePlainText(narrative: NarrativeType): string {
  let text = ''

  // Header
  text += `${'='.repeat(60)}\n`
  text += `SCHEDULE NARRATIVE REPORT\n`
  text += `${'='.repeat(60)}\n\n`
  text += `Project: ${narrative.projectName}\n`
  text += `Data Date: ${format(new Date(narrative.dataDate), 'MMMM d, yyyy')}\n`
  text += `Report Period: ${narrative.reportPeriod}\n`
  text += `Generated: ${format(new Date(narrative.generatedAt), 'MMMM d, yyyy h:mm a')}\n\n`

  // Executive Summary
  text += `EXECUTIVE SUMMARY\n`
  text += `${'-'.repeat(40)}\n`
  text += `${narrative.executiveSummary}\n\n`

  // Overall Status
  text += `Status: ${narrative.overallStatus.toUpperCase().replace('_', ' ')}\n`
  text += `Health Score: ${narrative.healthScore}%\n`
  text += `Overall Progress: ${narrative.metrics.percentComplete}%\n\n`

  // Metrics
  text += `KEY METRICS\n`
  text += `${'-'.repeat(40)}\n`
  text += `Total Activities: ${narrative.metrics.totalActivities}\n`
  text += `Completed: ${narrative.metrics.completedCount}\n`
  text += `In Progress: ${narrative.metrics.inProgressCount}\n`
  text += `Not Started: ${narrative.metrics.notStartedCount}\n`
  text += `Overdue: ${narrative.metrics.overdueCount}\n`
  text += `Critical Path Activities: ${narrative.metrics.criticalCount}\n`
  text += `Schedule Variance: ${narrative.metrics.scheduleVarianceDays} days\n\n`

  // Sections
  narrative.sections.forEach((section) => {
    text += `${section.title.toUpperCase()}\n`
    text += `${'-'.repeat(40)}\n`
    text += `${section.content}\n`
    if (section.items && section.items.length > 0) {
      section.items.forEach((item) => {
        text += `  - ${item}\n`
      })
    }
    text += '\n'
  })

  // Delayed Activities
  if (narrative.delayedActivities.length > 0) {
    text += `DELAYED ACTIVITIES\n`
    text += `${'-'.repeat(40)}\n`
    narrative.delayedActivities.forEach((delay) => {
      text += `${delay.activity.name}\n`
      text += `  Delay: ${delay.delayDays} days (${delay.impact} impact)\n`
      text += `  Reason: ${delay.reason}\n\n`
    })
  }

  // Footer
  text += `${'='.repeat(60)}\n`
  text += `END OF REPORT\n`
  text += `${'='.repeat(60)}\n`

  return text
}

// =============================================
// Main Component
// =============================================

export function ScheduleNarrative({
  projectId,
  projectName,
  activities,
  dependencies,
  baseline,
  stats,
  options,
  onExport,
}: ScheduleNarrativeProps) {
  const [showExportDialog, setShowExportDialog] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const narrative = useScheduleNarrative(
    activities,
    dependencies,
    baseline,
    stats,
    { projectName, ...options }
  )

  // Handle copy to clipboard
  const handleCopy = React.useCallback(() => {
    const text = generatePlainText(narrative)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [narrative])

  // Handle export
  const handleExport = React.useCallback((format: 'pdf' | 'docx' | 'txt') => {
    if (format === 'txt') {
      const text = generatePlainText(narrative)
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schedule-narrative-${format(new Date(), 'yyyy-MM-dd')}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      onExport?.(format)
    }
    setShowExportDialog(false)
  }, [narrative, onExport])

  // Handle print
  const handlePrint = React.useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Schedule Narrative
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {narrative.reportPeriod}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status and Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={narrative.overallStatus} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{narrative.metrics.percentComplete}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <HealthGauge score={narrative.healthScore} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Schedule Variance</p>
                <p className={`text-2xl font-bold ${
                  narrative.metrics.scheduleVarianceDays > 0
                    ? 'text-destructive'
                    : narrative.metrics.scheduleVarianceDays < 0
                      ? 'text-success'
                      : ''
                }`}>
                  {narrative.metrics.scheduleVarianceDays > 0 ? '+' : ''}
                  {narrative.metrics.scheduleVarianceDays} days
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                narrative.metrics.scheduleVarianceDays > 0 ? 'bg-destructive/10' : 'bg-success/10'
              }`}>
                <TrendingUp className={`h-5 w-5 ${
                  narrative.metrics.scheduleVarianceDays > 0 ? 'text-destructive rotate-180' : 'text-success'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {narrative.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Activities"
          value={narrative.metrics.totalActivities}
          icon={Target}
        />
        <MetricCard
          label="Completed"
          value={narrative.metrics.completedCount}
          icon={CheckCircle2}
          description={`${((narrative.metrics.completedCount / narrative.metrics.totalActivities) * 100).toFixed(0)}% of total`}
        />
        <MetricCard
          label="In Progress"
          value={narrative.metrics.inProgressCount}
          icon={RefreshCw}
        />
        <MetricCard
          label="Overdue"
          value={narrative.metrics.overdueCount}
          icon={AlertTriangle}
          trend={narrative.metrics.overdueCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Narrative Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {narrative.sections.map((section, idx) => (
          <NarrativeSectionCard key={idx} section={section} />
        ))}
      </div>

      {/* Delayed Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-destructive" />
            Delayed Activities
            {narrative.delayedActivities.length > 0 && (
              <Badge variant="destructive">{narrative.delayedActivities.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Activities behind their baseline schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DelayedActivitiesTable delays={narrative.delayedActivities} />
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-violet-600" />
            Upcoming Milestones
          </CardTitle>
          <CardDescription>
            Key milestones in the next {options?.lookAheadDays || 14} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpcomingMilestonesList milestones={narrative.upcomingMilestones} />
        </CardContent>
      </Card>

      {/* Projected Dates */}
      {(narrative.metrics.projectedCompletionDate || narrative.metrics.baselineCompletionDate) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {narrative.metrics.baselineCompletionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Baseline Completion</p>
                  <p className="text-xl font-bold">
                    {format(new Date(narrative.metrics.baselineCompletionDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
              {narrative.metrics.projectedCompletionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Projected Completion</p>
                  <p className={`text-xl font-bold ${
                    narrative.metrics.scheduleVarianceDays > 0 ? 'text-destructive' : 'text-success'
                  }`}>
                    {format(new Date(narrative.metrics.projectedCompletionDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Schedule Narrative</DialogTitle>
            <DialogDescription>
              Choose a format to export the narrative report
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleExport('txt')}
            >
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Plain Text (.txt)</p>
                <p className="text-xs text-muted-foreground">Simple text format</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleExport('pdf')}
              disabled={!onExport}
            >
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">PDF Document (.pdf)</p>
                <p className="text-xs text-muted-foreground">Formatted for printing</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleExport('docx')}
              disabled={!onExport}
            >
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Word Document (.docx)</p>
                <p className="text-xs text-muted-foreground">Editable in Microsoft Word</p>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ScheduleNarrative
