/**
 * Resource Leveling Component
 *
 * Visual resource leveling tool with histogram, conflict detection,
 * and auto/manual leveling capabilities.
 */

import * as React from 'react'
import { format, parseISO, isWeekend } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  AlertTriangle,
  Play,
  Settings2,
  Users,
  BarChart3,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  RefreshCw,
  Zap,
  TrendingUp,
} from 'lucide-react'
import {
  useResourceLeveling,
  type LevelingOption,
  type LevelingSettings,
  type ResourceConflict,
  DEFAULT_LEVELING_SETTINGS,
} from '../hooks/useResourceLeveling'
import type {
  ScheduleActivity,
  ScheduleResource,
  ResourceAssignment,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

interface ResourceLevelingProps {
  projectId: string
  activities: ScheduleActivity[]
  resources: ScheduleResource[]
  assignments: ResourceAssignment[]
  onLevelingComplete?: () => void
}

// =============================================
// Sub-Components
// =============================================

interface ResourceHistogramProps {
  data: ReturnType<typeof useResourceLeveling>['histogramData']
  selectedResource: string | null
  onResourceSelect: (resourceId: string | null) => void
  height?: number
  columnWidth?: number
}

function ResourceHistogram({
  data,
  selectedResource,
  onResourceSelect,
  height = 200,
  columnWidth = 24,
}: ResourceHistogramProps) {
  const { dates, series, overallocatedDates } = data
  const overallocatedSet = new Set(overallocatedDates)

  // Get visible series (selected or all)
  const visibleSeries = selectedResource
    ? series.filter((s) => s.resourceId === selectedResource)
    : series

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...visibleSeries.flatMap((s) => s.data),
    ...visibleSeries.map((s) => s.capacity)
  )

  const chartPadding = 24
  const barAreaHeight = height - chartPadding

  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0
    return (value / maxValue) * barAreaHeight
  }

  const getCapacityY = (capacity: number) => {
    if (maxValue === 0) return barAreaHeight
    return chartPadding + barAreaHeight - (capacity / maxValue) * barAreaHeight
  }

  const totalWidth = dates.length * columnWidth

  if (dates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
        <BarChart3 className="h-8 w-8 mr-3 opacity-50" />
        No resource data available for histogram
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Resource filter */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Resource Filter:</Label>
            <Select
              value={selectedResource || 'all'}
              onValueChange={(v) => onResourceSelect(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {series.map((s) => (
                  <SelectItem key={s.resourceId} value={s.resourceId}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.resourceName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-primary rounded" />
              Normal
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-destructive rounded" />
              Over-allocated
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="overflow-x-auto">
          <svg width={totalWidth} height={height} className="block">
            {/* Weekend shading */}
            {dates.map((dateStr, index) => {
              const date = parseISO(dateStr)
              if (!isWeekend(date)) return null
              return (
                <rect
                  key={`weekend-${index}`}
                  x={index * columnWidth}
                  y={0}
                  width={columnWidth}
                  height={height}
                  fill="rgba(0,0,0,0.05)"
                />
              )
            })}

            {/* Grid lines */}
            {dates.map((_, index) => (
              <line
                key={`grid-${index}`}
                x1={index * columnWidth}
                y1={chartPadding}
                x2={index * columnWidth}
                y2={height}
                stroke="var(--border)"
                strokeWidth={0.5}
              />
            ))}

            {/* Capacity lines */}
            {visibleSeries.map((s) => (
              <line
                key={`cap-${s.resourceId}`}
                x1={0}
                y1={getCapacityY(s.capacity)}
                x2={totalWidth}
                y2={getCapacityY(s.capacity)}
                stroke={s.color}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.5}
              />
            ))}

            {/* Bars */}
            {visibleSeries.map((s, seriesIndex) =>
              s.data.map((value, dateIndex) => {
                const dateStr = dates[dateIndex]
                const isOverallocated = overallocatedSet.has(dateStr) && value > s.capacity
                const barHeight = getBarHeight(value)
                const barWidth = selectedResource
                  ? columnWidth - 4
                  : (columnWidth - 4) / visibleSeries.length
                const x = dateIndex * columnWidth + 2 + (selectedResource ? 0 : seriesIndex * barWidth)

                return (
                  <Tooltip key={`bar-${s.resourceId}-${dateIndex}`}>
                    <TooltipTrigger asChild>
                      <rect
                        x={x}
                        y={height - barHeight}
                        width={barWidth - (selectedResource ? 0 : 1)}
                        height={barHeight}
                        rx={2}
                        fill={isOverallocated ? 'var(--destructive)' : s.color}
                        opacity={0.8}
                        className="cursor-pointer hover:opacity-100 transition-opacity"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{s.resourceName}</p>
                        <p>{format(parseISO(dateStr), 'EEE, MMM d')}</p>
                        <p className="text-muted-foreground">
                          {value.toFixed(1)}h / {s.capacity}h capacity
                        </p>
                        {isOverallocated && (
                          <p className="text-destructive font-medium">
                            Over-allocated by {(value - s.capacity).toFixed(1)}h
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })
            )}

            {/* Date labels */}
            {dates.map((dateStr, index) => {
              const showLabel = columnWidth >= 40 || index % 7 === 0
              if (!showLabel) return null

              return (
                <text
                  key={`label-${index}`}
                  x={index * columnWidth + columnWidth / 2}
                  y={14}
                  textAnchor="middle"
                  className="text-[9px] fill-muted-foreground"
                >
                  {format(parseISO(dateStr), columnWidth >= 60 ? 'MMM d' : 'd')}
                </text>
              )
            })}
          </svg>
        </div>
      </div>
    </TooltipProvider>
  )
}

interface ConflictListProps {
  conflicts: ResourceConflict[]
  onConflictSelect: (conflict: ResourceConflict) => void
}

function ConflictList({ conflicts, onConflictSelect }: ConflictListProps) {
  // Group conflicts by date
  const conflictsByDate = React.useMemo(() => {
    const grouped = new Map<string, ResourceConflict[]>()
    conflicts.forEach((c) => {
      const existing = grouped.get(c.date) || []
      existing.push(c)
      grouped.set(c.date, existing)
    })
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [conflicts])

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-success mb-3" />
        <p className="font-medium">No Resource Conflicts</p>
        <p className="text-sm text-muted-foreground mt-1">
          All resources are within capacity limits
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 p-1">
        {conflictsByDate.map(([date, dateConflicts]) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(parseISO(date), 'EEE, MMM d, yyyy')}
              <Badge variant="destructive" className="text-xs">
                {dateConflicts.length} conflict{dateConflicts.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {dateConflicts.map((conflict, idx) => (
              <Card
                key={`${date}-${idx}`}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onConflictSelect(conflict)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{conflict.resourceName}</span>
                        <Badge variant="outline" className="text-xs">
                          {conflict.resourceType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conflict.totalDemand.toFixed(1)}h demand vs {conflict.capacity}h capacity
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conflict.affectedActivities.slice(0, 3).map((a) => (
                          <Badge
                            key={a.activityId}
                            variant={a.isCritical ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {a.activityName.substring(0, 20)}
                            {a.activityName.length > 20 ? '...' : ''}
                          </Badge>
                        ))}
                        {conflict.affectedActivities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{conflict.affectedActivities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="destructive">
                      +{conflict.overloadAmount.toFixed(1)}h
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

interface LevelingOptionsListProps {
  options: LevelingOption[]
  selectedOptions: Set<string>
  onToggleOption: (optionId: string) => void
}

function LevelingOptionsList({ options, selectedOptions, onToggleOption }: LevelingOptionsListProps) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Info className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="font-medium">No Leveling Options</p>
        <p className="text-sm text-muted-foreground mt-1">
          No viable leveling options found for current conflicts
        </p>
      </div>
    )
  }

  const getOptionId = (option: LevelingOption, index: number) =>
    `${option.activityId}-${option.type}-${index}`

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 p-1">
        {options.map((option, index) => {
          const optionId = getOptionId(option, index)
          const isSelected = selectedOptions.has(optionId)

          return (
            <Card
              key={optionId}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'
              }`}
              onClick={() => onToggleOption(optionId)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {option.type === 'delay' && <Clock className="h-4 w-4 text-blue-500" />}
                      {option.type === 'extend_duration' && <TrendingUp className="h-4 w-4 text-orange-500" />}
                      {option.type === 'split' && <Zap className="h-4 w-4 text-violet-500" />}
                      <span className="font-medium text-sm">{option.activityName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                    {option.impact.delayDays && option.impact.delayDays > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>
                          New dates: {option.impact.newStart} - {option.impact.newFinish}
                        </span>
                      </div>
                    )}
                  </div>
                  {option.impact.projectDelayDays !== undefined && option.impact.projectDelayDays > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      +{option.impact.projectDelayDays}d project delay
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}

interface LevelingSettingsPanelProps {
  settings: LevelingSettings
  onSettingsChange: (updates: Partial<LevelingSettings>) => void
}

function LevelingSettingsPanel({ settings, onSettingsChange }: LevelingSettingsPanelProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Priority Rule</Label>
        <Select
          value={settings.prioritizeBy}
          onValueChange={(value) =>
            onSettingsChange({ prioritizeBy: value as LevelingSettings['prioritizeBy'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical_path">Critical Path First</SelectItem>
            <SelectItem value="total_float">Most Float First</SelectItem>
            <SelectItem value="start_date">Earliest Start First</SelectItem>
            <SelectItem value="duration">Shortest Duration First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Leveling Methods</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="allowDelay" className="font-normal cursor-pointer">
              Allow Delay
            </Label>
            <Switch
              id="allowDelay"
              checked={settings.allowDelay}
              onCheckedChange={(checked) => onSettingsChange({ allowDelay: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowExtend" className="font-normal cursor-pointer">
              Allow Extend Duration
            </Label>
            <Switch
              id="allowExtend"
              checked={settings.allowExtendDuration}
              onCheckedChange={(checked) => onSettingsChange({ allowExtendDuration: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowSplit" className="font-normal cursor-pointer">
              Allow Split Activities
            </Label>
            <Switch
              id="allowSplit"
              checked={settings.allowSplit}
              onCheckedChange={(checked) => onSettingsChange({ allowSplit: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Constraints</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="preserveCritical" className="font-normal cursor-pointer">
              Preserve Critical Path
            </Label>
            <Switch
              id="preserveCritical"
              checked={settings.preserveCriticalPath}
              onCheckedChange={(checked) => onSettingsChange({ preserveCriticalPath: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="levelFloat" className="font-normal cursor-pointer">
              Level Within Float Only
            </Label>
            <Switch
              id="levelFloat"
              checked={settings.levelWithinFloat}
              onCheckedChange={(checked) => onSettingsChange({ levelWithinFloat: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Max Delay per Activity: {settings.maxDelayPerActivity} days
        </Label>
        <Slider
          value={[settings.maxDelayPerActivity]}
          onValueChange={([value]) => onSettingsChange({ maxDelayPerActivity: value })}
          min={1}
          max={90}
          step={1}
        />
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export function ResourceLeveling({
  projectId,
  activities,
  resources,
  assignments,
  onLevelingComplete,
}: ResourceLevelingProps) {
  const [selectedResource, setSelectedResource] = React.useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = React.useState<Set<string>>(new Set())
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false)
  const [selectedConflict, setSelectedConflict] = React.useState<ResourceConflict | null>(null)

  const {
    histogramData,
    conflicts,
    solution,
    settings,
    hasConflicts,
    totalConflicts,
    uniqueConflictDays,
    affectedResources,
    updateSettings,
    applyLeveling,
    isApplying,
  } = useResourceLeveling(projectId, activities, resources, assignments)

  // Toggle option selection
  const toggleOption = React.useCallback((optionId: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }, [])

  // Handle auto-level
  const handleAutoLevel = React.useCallback(() => {
    if (solution.recommendations.length > 0) {
      applyLeveling(solution.recommendations)
    }
  }, [solution.recommendations, applyLeveling])

  // Handle apply selected
  const handleApplySelected = React.useCallback(() => {
    const optionsToApply = solution.options.filter((opt, idx) =>
      selectedOptions.has(`${opt.activityId}-${opt.type}-${idx}`)
    )
    if (optionsToApply.length > 0) {
      applyLeveling(optionsToApply)
    }
  }, [solution.options, selectedOptions, applyLeveling])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasConflicts ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {hasConflicts ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConflicts}</p>
                <p className="text-xs text-muted-foreground">Total Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueConflictDays}</p>
                <p className="text-xs text-muted-foreground">Affected Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{affectedResources}</p>
                <p className="text-xs text-muted-foreground">Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${solution.totalDelayDays > 0 ? 'bg-warning/10' : 'bg-muted'}`}>
                <Clock className={`h-5 w-5 ${solution.totalDelayDays > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {solution.totalDelayDays > 0 ? `+${solution.totalDelayDays}` : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Project Delay (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resource Histogram
              </CardTitle>
              <CardDescription>
                Resource allocation over time with capacity limits
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResourceHistogram
            data={histogramData}
            selectedResource={selectedResource}
            onResourceSelect={setSelectedResource}
            height={180}
            columnWidth={28}
          />
        </CardContent>
      </Card>

      {/* Conflicts & Leveling Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Resource Conflicts
              {hasConflicts && (
                <Badge variant="destructive">{totalConflicts}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Over-allocated resources by date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConflictList
              conflicts={conflicts}
              onConflictSelect={setSelectedConflict}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Leveling Options
                </CardTitle>
                <CardDescription>
                  Available solutions to resolve conflicts
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoLevel}
                  disabled={!hasConflicts || isApplying}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Auto-Level
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplySelected}
                  disabled={selectedOptions.size === 0 || isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Apply Selected ({selectedOptions.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LevelingOptionsList
              options={solution.options}
              selectedOptions={selectedOptions}
              onToggleOption={toggleOption}
            />
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leveling Settings</DialogTitle>
            <DialogDescription>
              Configure how resource leveling is performed
            </DialogDescription>
          </DialogHeader>
          <LevelingSettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => updateSettings(DEFAULT_LEVELING_SETTINGS)}>
              Reset to Defaults
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Detail Dialog */}
      <Dialog open={selectedConflict !== null} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conflict Details
            </DialogTitle>
            <DialogDescription>
              {selectedConflict && format(parseISO(selectedConflict.date), 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedConflict.resourceName}</p>
                  <p className="text-sm text-muted-foreground">{selectedConflict.resourceType}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-destructive">
                    {selectedConflict.totalDemand.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    vs {selectedConflict.capacity}h capacity
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Affected Activities</Label>
                <div className="space-y-2 mt-2">
                  {selectedConflict.affectedActivities.map((a) => (
                    <div
                      key={a.activityId}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        {a.isCritical && <Badge variant="destructive">Critical</Badge>}
                        <span className="text-sm">{a.activityName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{a.units} units</span>
                    </div>
                  ))}
                </div>
              </div>

              {!selectedConflict.affectedActivities.every((a) => a.canDelay) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Limited Options</AlertTitle>
                  <AlertDescription>
                    Some activities cannot be delayed without affecting the critical path.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedConflict(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResourceLeveling
