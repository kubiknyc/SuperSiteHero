/**
 * Gantt Chart Component for Task Scheduling
 * Enhanced with drag-and-drop rescheduling and critical path highlighting
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, AlertTriangle, Target, GripVertical, Undo2, Calendar, Save, ArrowLeftRight, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface GanttTask {
  id: string
  title: string
  startDate: Date | string
  endDate: Date | string
  progress?: number // 0-100
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  assignee?: string
  dependencies?: string[] // Task IDs this task depends on
  color?: string
  isMilestone?: boolean
  // Baseline schedule tracking
  baselineStartDate?: Date | string | null
  baselineEndDate?: Date | string | null
}

// Baseline schedule comparison types
export interface BaselineVariance {
  taskId: string
  startVarianceDays: number // Positive = behind schedule
  endVarianceDays: number // Positive = behind schedule
  durationVarianceDays: number // Positive = taking longer
  isAheadOfSchedule: boolean
  isBehindSchedule: boolean
  isOnSchedule: boolean
}

interface GanttChartProps {
  tasks: GanttTask[]
  onTaskClick?: (task: GanttTask) => void
  onTaskDoubleClick?: (task: GanttTask) => void
  onTaskUpdate?: (taskId: string, updates: { startDate: Date; endDate: Date }) => void
  onSaveBaseline?: (tasks: GanttTask[]) => void
  startDate?: Date
  endDate?: Date
  className?: string
  editable?: boolean
  showBaseline?: boolean
}

type ZoomLevel = 'day' | 'week' | 'month'

interface DragState {
  taskId: string
  mode: 'move' | 'resize-start' | 'resize-end'
  startX: number
  originalStart: Date
  originalEnd: Date
}

const PRIORITY_COLORS = {
  low: '#94A3B8',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
}

const STATUS_COLORS = {
  pending: '#94A3B8',
  in_progress: '#3B82F6',
  completed: '#22C55E',
  blocked: '#EF4444',
}

// Critical path calculation using topological sort
function calculateCriticalPath(tasks: Array<GanttTask & { startDate: Date; endDate: Date }>): Set<string> {
  if (tasks.length === 0) {return new Set()}

  // Build dependency graph
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  // Initialize
  tasks.forEach(t => {
    inDegree.set(t.id, 0)
    dependents.set(t.id, [])
  })

  // Count dependencies
  tasks.forEach(t => {
    (t.dependencies || []).forEach(depId => {
      if (taskMap.has(depId)) {
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1)
        const deps = dependents.get(depId) || []
        deps.push(t.id)
        dependents.set(depId, deps)
      }
    })
  })

  // Calculate early start/finish times (forward pass)
  const earlyStart = new Map<string, number>()
  const earlyFinish = new Map<string, number>()
  const queue: string[] = []

  // Find tasks with no dependencies (starting tasks)
  tasks.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id)
      earlyStart.set(t.id, 0)
      earlyFinish.set(t.id, differenceInDays(t.endDate, t.startDate))
    }
  })

  // Process in topological order
  while (queue.length > 0) {
    const taskId = queue.shift()!
    const task = taskMap.get(taskId)!
    const es = earlyStart.get(taskId) || 0
    const ef = earlyFinish.get(taskId) || 0

    const deps = dependents.get(taskId) || []
    deps.forEach(depId => {
      const depTask = taskMap.get(depId)!
      const newEs = Math.max(earlyStart.get(depId) || 0, ef)
      earlyStart.set(depId, newEs)
      earlyFinish.set(depId, newEs + differenceInDays(depTask.endDate, depTask.startDate))

      inDegree.set(depId, (inDegree.get(depId) || 1) - 1)
      if (inDegree.get(depId) === 0) {
        queue.push(depId)
      }
    })
  }

  // Find project end time
  let projectEnd = 0
  tasks.forEach(t => {
    projectEnd = Math.max(projectEnd, earlyFinish.get(t.id) || 0)
  })

  // Calculate late start/finish times (backward pass)
  const lateStart = new Map<string, number>()
  const lateFinish = new Map<string, number>()

  tasks.forEach(t => {
    lateFinish.set(t.id, projectEnd)
  })

  // Process in reverse topological order
  const processed = new Set<string>()
  const reverseTasks = [...tasks].sort((a, b) => (earlyFinish.get(b.id) || 0) - (earlyFinish.get(a.id) || 0))

  reverseTasks.forEach(task => {
    const deps = dependents.get(task.id) || []
    if (deps.length === 0) {
      lateFinish.set(task.id, projectEnd)
    } else {
      let minLateStart = projectEnd
      deps.forEach(depId => {
        minLateStart = Math.min(minLateStart, lateStart.get(depId) || projectEnd)
      })
      lateFinish.set(task.id, minLateStart)
    }
    const duration = differenceInDays(task.endDate, task.startDate)
    lateStart.set(task.id, (lateFinish.get(task.id) || 0) - duration)
  })

  // Critical path: tasks where early start equals late start (slack = 0)
  const criticalPath = new Set<string>()
  tasks.forEach(t => {
    const slack = (lateStart.get(t.id) || 0) - (earlyStart.get(t.id) || 0)
    if (slack === 0) {
      criticalPath.add(t.id)
    }
  })

  return criticalPath
}

// Calculate baseline variance for a task
function calculateBaselineVariance(
  task: GanttTask & { startDate: Date; endDate: Date },
  baselineStart: Date | null,
  baselineEnd: Date | null
): BaselineVariance | null {
  if (!baselineStart || !baselineEnd) {return null}

  const startVarianceDays = differenceInDays(task.startDate, baselineStart)
  const endVarianceDays = differenceInDays(task.endDate, baselineEnd)
  const actualDuration = differenceInDays(task.endDate, task.startDate)
  const baselineDuration = differenceInDays(baselineEnd, baselineStart)
  const durationVarianceDays = actualDuration - baselineDuration

  return {
    taskId: task.id,
    startVarianceDays,
    endVarianceDays,
    durationVarianceDays,
    isAheadOfSchedule: endVarianceDays < 0,
    isBehindSchedule: endVarianceDays > 0,
    isOnSchedule: endVarianceDays === 0,
  }
}

export function GanttChart({
  tasks,
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onSaveBaseline,
  startDate: propStartDate,
  endDate: propEndDate,
  className,
  editable = false,
  showBaseline: initialShowBaseline = true,
}: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week')
  const [viewOffset, setViewOffset] = useState(0)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [showCriticalPath, setShowCriticalPath] = useState(true)
  const [showBaseline, setShowBaseline] = useState(initialShowBaseline)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, { startDate: Date; endDate: Date }>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Convert string dates to Date objects
  const normalizedTasks = useMemo(() => {
    return tasks.map((task) => {
      const pending = pendingChanges.get(task.id)
      const baselineStart = task.baselineStartDate
        ? (typeof task.baselineStartDate === 'string' ? new Date(task.baselineStartDate) : task.baselineStartDate)
        : null
      const baselineEnd = task.baselineEndDate
        ? (typeof task.baselineEndDate === 'string' ? new Date(task.baselineEndDate) : task.baselineEndDate)
        : null
      return {
        ...task,
        startDate: pending?.startDate || (typeof task.startDate === 'string' ? new Date(task.startDate) : task.startDate),
        endDate: pending?.endDate || (typeof task.endDate === 'string' ? new Date(task.endDate) : task.endDate),
        baselineStartDate: baselineStart,
        baselineEndDate: baselineEnd,
      }
    })
  }, [tasks, pendingChanges])

  // Calculate baseline variances for all tasks
  const baselineVariances = useMemo(() => {
    const variances = new Map<string, BaselineVariance>()
    normalizedTasks.forEach((task) => {
      const variance = calculateBaselineVariance(task, task.baselineStartDate, task.baselineEndDate)
      if (variance) {
        variances.set(task.id, variance)
      }
    })
    return variances
  }, [normalizedTasks])

  // Calculate overall schedule health
  const scheduleHealth = useMemo(() => {
    const tasksWithBaseline = Array.from(baselineVariances.values())
    if (tasksWithBaseline.length === 0) {return null}

    const aheadCount = tasksWithBaseline.filter(v => v.isAheadOfSchedule).length
    const behindCount = tasksWithBaseline.filter(v => v.isBehindSchedule).length
    const onTimeCount = tasksWithBaseline.filter(v => v.isOnSchedule).length
    const totalVarianceDays = tasksWithBaseline.reduce((sum, v) => sum + v.endVarianceDays, 0)
    const avgVarianceDays = totalVarianceDays / tasksWithBaseline.length

    return {
      aheadCount,
      behindCount,
      onTimeCount,
      totalTasks: tasksWithBaseline.length,
      avgVarianceDays: Math.round(avgVarianceDays * 10) / 10,
      isHealthy: avgVarianceDays <= 0,
    }
  }, [baselineVariances])

  // Handler to save current schedule as baseline
  const handleSaveBaseline = useCallback(() => {
    if (!onSaveBaseline) {return}
    const tasksWithBaseline = normalizedTasks.map(task => ({
      ...task,
      baselineStartDate: task.startDate,
      baselineEndDate: task.endDate,
    }))
    onSaveBaseline(tasksWithBaseline)
  }, [normalizedTasks, onSaveBaseline])

  // Calculate critical path
  const criticalPath = useMemo(() => {
    return calculateCriticalPath(normalizedTasks)
  }, [normalizedTasks])

  // Calculate date range
  const { minDate, maxDate } = useMemo(() => {
    if (normalizedTasks.length === 0) {
      const today = new Date()
      return {
        minDate: startOfWeek(today),
        maxDate: addDays(endOfWeek(today), 14),
      }
    }

    const taskDates = normalizedTasks.flatMap((t) => [t.startDate, t.endDate])
    const min = propStartDate || new Date(Math.min(...taskDates.map((d) => d.getTime())))
    const max = propEndDate || new Date(Math.max(...taskDates.map((d) => d.getTime())))

    // Add buffer
    const bufferedMin = addDays(min, -3)
    const bufferedMax = addDays(max, 7)

    return {
      minDate: bufferedMin,
      maxDate: bufferedMax,
    }
  }, [normalizedTasks, propStartDate, propEndDate])

  // Get visible date range based on zoom and offset
  const { visibleStart, visibleEnd, visibleDays } = useMemo(() => {
    const daysToShow = zoomLevel === 'day' ? 14 : zoomLevel === 'week' ? 28 : 90
    const start = addDays(minDate, viewOffset)
    const end = addDays(start, daysToShow)

    return {
      visibleStart: start,
      visibleEnd: end,
      visibleDays: eachDayOfInterval({ start, end }),
    }
  }, [minDate, viewOffset, zoomLevel])

  // Column width based on zoom
  const columnWidth = zoomLevel === 'day' ? 40 : zoomLevel === 'week' ? 20 : 8

  // Navigate timeline
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const step = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30
    setViewOffset((prev) => prev + (direction === 'next' ? step : -step))
  }, [zoomLevel])

  // Calculate task position and width
  const getTaskStyle = useCallback((task: GanttTask & { startDate: Date; endDate: Date }) => {
    const startOffset = Math.max(0, differenceInDays(task.startDate, visibleStart))
    const endOffset = differenceInDays(task.endDate, visibleStart) + 1
    const width = Math.max(1, Math.min(endOffset, visibleDays.length) - startOffset)

    if (startOffset >= visibleDays.length || endOffset <= 0) {
      return null // Task not visible
    }

    return {
      left: `${startOffset * columnWidth}px`,
      width: `${width * columnWidth - 4}px`,
    }
  }, [visibleStart, visibleDays.length, columnWidth])

  // Get baseline task style (dashed bar behind actual bar)
  const getBaselineStyle = useCallback((task: GanttTask & { startDate: Date; endDate: Date; baselineStartDate: Date | null; baselineEndDate: Date | null }) => {
    if (!task.baselineStartDate || !task.baselineEndDate) {return null}

    const startOffset = Math.max(0, differenceInDays(task.baselineStartDate, visibleStart))
    const endOffset = differenceInDays(task.baselineEndDate, visibleStart) + 1
    const width = Math.max(1, Math.min(endOffset, visibleDays.length) - startOffset)

    if (startOffset >= visibleDays.length || endOffset <= 0) {
      return null // Baseline not visible
    }

    return {
      left: `${startOffset * columnWidth}px`,
      width: `${width * columnWidth - 4}px`,
    }
  }, [visibleStart, visibleDays.length, columnWidth])

  // Get task color
  const getTaskColor = useCallback((task: GanttTask, isCritical: boolean) => {
    if (isCritical && showCriticalPath) {return '#DC2626'} // Red for critical path
    if (task.color) {return task.color}
    if (task.status) {return STATUS_COLORS[task.status]}
    if (task.priority) {return PRIORITY_COLORS[task.priority]}
    return '#3B82F6'
  }, [showCriticalPath])

  // Drag handlers
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    taskId: string,
    mode: DragState['mode']
  ) => {
    if (!editable) {return}
    e.preventDefault()
    e.stopPropagation()

    const task = normalizedTasks.find(t => t.id === taskId)
    if (!task) {return}

    setDragState({
      taskId,
      mode,
      startX: e.clientX,
      originalStart: task.startDate,
      originalEnd: task.endDate,
    })
  }, [editable, normalizedTasks])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState) {return}

    const deltaX = e.clientX - dragState.startX
    const daysDelta = Math.round(deltaX / columnWidth)

    if (daysDelta === 0) {return}

    const newChanges = new Map(pendingChanges)
    const duration = differenceInDays(dragState.originalEnd, dragState.originalStart)

    let newStart: Date
    let newEnd: Date

    if (dragState.mode === 'move') {
      newStart = addDays(dragState.originalStart, daysDelta)
      newEnd = addDays(dragState.originalEnd, daysDelta)
    } else if (dragState.mode === 'resize-start') {
      newStart = addDays(dragState.originalStart, daysDelta)
      newEnd = dragState.originalEnd
      if (newStart >= newEnd) {return} // Invalid
    } else {
      newStart = dragState.originalStart
      newEnd = addDays(dragState.originalEnd, daysDelta)
      if (newEnd <= newStart) {return} // Invalid
    }

    newChanges.set(dragState.taskId, { startDate: newStart, endDate: newEnd })
    setPendingChanges(newChanges)
  }, [dragState, columnWidth, pendingChanges])

  const handleDragEnd = useCallback(() => {
    if (dragState && pendingChanges.has(dragState.taskId) && onTaskUpdate) {
      const changes = pendingChanges.get(dragState.taskId)!
      onTaskUpdate(dragState.taskId, changes)
    }
    setDragState(null)
  }, [dragState, pendingChanges, onTaskUpdate])

  // Mouse event listeners for drag
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [dragState, handleDragMove, handleDragEnd])

  // Undo pending changes
  const handleUndo = useCallback(() => {
    setPendingChanges(new Map())
  }, [])

  return (
    <div className={cn('bg-background border rounded-lg overflow-hidden', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {format(visibleStart, 'MMM d')} - {format(visibleEnd, 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Baseline Controls */}
          {baselineVariances.size > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-baseline"
                  checked={showBaseline}
                  onCheckedChange={setShowBaseline}
                />
                <Label htmlFor="show-baseline" className="text-sm flex items-center gap-1 cursor-pointer">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Baseline
                </Label>
              </div>
              {scheduleHealth && (
                <div className="flex items-center gap-1.5 text-xs">
                  {scheduleHealth.avgVarianceDays > 0 ? (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <TrendingDown className="h-3 w-3" />
                      {scheduleHealth.avgVarianceDays}d behind
                    </Badge>
                  ) : scheduleHealth.avgVarianceDays < 0 ? (
                    <Badge className="gap-1 text-[10px] bg-green-600 hover:bg-green-700">
                      <TrendingUp className="h-3 w-3" />
                      {Math.abs(scheduleHealth.avgVarianceDays)}d ahead
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Minus className="h-3 w-3" />
                      On schedule
                    </Badge>
                  )}
                </div>
              )}
              <div className="h-4 w-px bg-border" />
            </>
          )}

          {onSaveBaseline && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveBaseline}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                Save Baseline
              </Button>
              <div className="h-4 w-px bg-border" />
            </>
          )}

          {/* Critical Path Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="critical-path"
              checked={showCriticalPath}
              onCheckedChange={setShowCriticalPath}
            />
            <Label htmlFor="critical-path" className="text-sm flex items-center gap-1 cursor-pointer">
              <Target className="h-4 w-4 text-red-500" />
              Critical Path
            </Label>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant={zoomLevel === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoomLevel('day')}
            >
              Day
            </Button>
            <Button
              variant={zoomLevel === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoomLevel('week')}
            >
              Week
            </Button>
            <Button
              variant={zoomLevel === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoomLevel('month')}
            >
              Month
            </Button>
          </div>

          {/* Undo changes */}
          {pendingChanges.size > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button variant="ghost" size="sm" onClick={handleUndo}>
                <Undo2 className="h-4 w-4 mr-1" />
                Undo ({pendingChanges.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex overflow-hidden" ref={containerRef}>
        {/* Task List Sidebar */}
        <div className="w-64 flex-shrink-0 border-r bg-muted/20">
          <div className="h-12 flex items-center px-3 border-b bg-muted/40">
            <span className="text-sm font-medium">Tasks</span>
            {criticalPath.size > 0 && showCriticalPath && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {criticalPath.size} critical
              </Badge>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {normalizedTasks.map((task) => {
              const isCritical = criticalPath.has(task.id)
              return (
                <div
                  key={task.id}
                  className={cn(
                    'h-10 flex items-center px-3 border-b hover:bg-muted/40 cursor-pointer transition-colors',
                    hoveredTask === task.id && 'bg-muted/40',
                    isCritical && showCriticalPath && 'border-l-2 border-l-red-500'
                  )}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => onTaskClick?.(task)}
                  onDoubleClick={() => onTaskDoubleClick?.(task)}
                >
                  {editable && (
                    <GripVertical className="h-4 w-4 text-muted-foreground mr-2 cursor-grab" />
                  )}
                  <span className="text-sm truncate flex-1">{task.title}</span>
                  {isCritical && showCriticalPath && (
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  {task.status && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] h-5"
                      style={{
                        borderColor: getTaskColor(task, isCritical),
                        color: getTaskColor(task, isCritical)
                      }}
                    >
                      {Math.round(task.progress || 0)}%
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Date Headers */}
          <div className="h-12 flex border-b bg-muted/40 sticky top-0 z-10">
            {visibleDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center justify-center border-r text-xs',
                  isWeekend(day) && 'bg-muted/60'
                )}
                style={{ width: `${columnWidth}px` }}
              >
                {zoomLevel !== 'month' && (
                  <>
                    <span className="text-muted-foreground">{format(day, 'EEE')}</span>
                    <span className={cn('font-medium', isSameDay(day, new Date()) && 'text-primary')}>
                      {format(day, 'd')}
                    </span>
                  </>
                )}
                {zoomLevel === 'month' && index % 7 === 0 && (
                  <span className="text-muted-foreground">{format(day, 'MMM d')}</span>
                )}
              </div>
            ))}
          </div>

          {/* Task Bars */}
          <div className="relative" style={{ minWidth: `${visibleDays.length * columnWidth}px` }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {visibleDays.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex-shrink-0 border-r h-full',
                    isWeekend(day) && 'bg-muted/30',
                    isSameDay(day, new Date()) && 'bg-primary/10 border-primary/30'
                  )}
                  style={{ width: `${columnWidth}px` }}
                />
              ))}
            </div>

            {/* Dependency lines */}
            {showCriticalPath && normalizedTasks.map((task) => {
              const style = getTaskStyle(task)
              if (!style || !task.dependencies) {return null}

              return task.dependencies.map((depId) => {
                const depTask = normalizedTasks.find(t => t.id === depId)
                if (!depTask) {return null}

                const depStyle = getTaskStyle(depTask)
                if (!depStyle) {return null}

                const depTaskIndex = normalizedTasks.findIndex(t => t.id === depId)
                const taskIndex = normalizedTasks.findIndex(t => t.id === task.id)

                const x1 = parseFloat(depStyle.left) + parseFloat(depStyle.width)
                const y1 = depTaskIndex * 40 + 20
                const x2 = parseFloat(style.left)
                const y2 = taskIndex * 40 + 20

                const isCriticalLine = criticalPath.has(task.id) && criticalPath.has(depId)

                return (
                  <svg
                    key={`${depId}-${task.id}`}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                      width: `${visibleDays.length * columnWidth}px`,
                      height: `${normalizedTasks.length * 40}px`,
                    }}
                  >
                    <path
                      d={`M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isCriticalLine ? '#DC2626' : '#94A3B8'}
                      strokeWidth={isCriticalLine ? 2 : 1}
                      strokeDasharray={isCriticalLine ? '0' : '4'}
                      opacity={0.6}
                    />
                    <polygon
                      points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
                      fill={isCriticalLine ? '#DC2626' : '#94A3B8'}
                      opacity={0.6}
                    />
                  </svg>
                )
              })
            })}

            {/* Task bars */}
            {normalizedTasks.map((task) => {
              const style = getTaskStyle(task)
              if (!style) {return null}

              const isCritical = criticalPath.has(task.id)
              const color = getTaskColor(task, isCritical)
              const progress = task.progress || 0
              const isDragging = dragState?.taskId === task.id
              const baselineStyle = getBaselineStyle(task)
              const variance = baselineVariances.get(task.id)

              return (
                <TooltipProvider key={task.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'h-10 flex items-center px-1 relative transition-all',
                          hoveredTask === task.id && 'z-10',
                          isDragging && 'z-20'
                        )}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        onClick={() => !dragState && onTaskClick?.(task)}
                        onDoubleClick={() => !dragState && onTaskDoubleClick?.(task)}
                      >
                        {/* Baseline bar (behind actual bar) */}
                        {showBaseline && baselineStyle && (
                          <div
                            className="absolute h-3 rounded-sm pointer-events-none"
                            style={{
                              ...baselineStyle,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              backgroundColor: '#94A3B8',
                              opacity: 0.4,
                              border: '1px dashed #64748B',
                            }}
                          />
                        )}

                        <div
                          className={cn(
                            'absolute h-7 rounded-md shadow-sm transition-transform',
                            hoveredTask === task.id && 'scale-105 shadow-md',
                            isDragging && 'scale-105 shadow-lg opacity-90',
                            editable && 'cursor-grab',
                            isDragging && 'cursor-grabbing'
                          )}
                          style={{
                            ...style,
                            backgroundColor: `${color}20`,
                            border: isCritical && showCriticalPath
                              ? `2px solid ${color}`
                              : `1px solid ${color}`,
                          }}
                          onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                        >
                          {/* Progress bar */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-l-md"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: `${color}40`,
                            }}
                          />

                          {/* Variance indicator */}
                          {showBaseline && variance && (
                            <div className="absolute -top-1 -right-1">
                              {variance.isBehindSchedule ? (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <TrendingDown className="h-2.5 w-2.5 text-white" />
                                </div>
                              ) : variance.isAheadOfSchedule ? (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <TrendingUp className="h-2.5 w-2.5 text-white" />
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* Resize handles (only in edit mode) */}
                          {editable && (
                            <>
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 rounded-l"
                                onMouseDown={(e) => handleDragStart(e, task.id, 'resize-start')}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 rounded-r"
                                onMouseDown={(e) => handleDragStart(e, task.id, 'resize-end')}
                              />
                            </>
                          )}

                          {/* Label */}
                          <span
                            className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
                            style={{ color }}
                          >
                            {parseFloat(style.width) > 60 ? task.title : ''}
                          </span>

                          {/* Critical path indicator */}
                          {isCritical && showCriticalPath && parseFloat(style.width) > 40 && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2">
                              <Target className="h-3 w-3 text-red-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          {isCritical && showCriticalPath && (
                            <Badge variant="destructive" className="text-[10px]">Critical</Badge>
                          )}
                          {variance && (
                            variance.isBehindSchedule ? (
                              <Badge variant="destructive" className="text-[10px] gap-0.5">
                                <TrendingDown className="h-2.5 w-2.5" />
                                {variance.endVarianceDays}d late
                              </Badge>
                            ) : variance.isAheadOfSchedule ? (
                              <Badge className="text-[10px] gap-0.5 bg-green-600">
                                <TrendingUp className="h-2.5 w-2.5" />
                                {Math.abs(variance.endVarianceDays)}d early
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">On time</Badge>
                            )
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d, yyyy')}
                        </p>
                        {task.baselineStartDate && task.baselineEndDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Baseline: {format(task.baselineStartDate, 'MMM d')} - {format(task.baselineEndDate, 'MMM d')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <span>Progress: {progress}%</span>
                          {task.assignee && <span>Assignee: {task.assignee}</span>}
                        </div>
                        {variance && variance.durationVarianceDays !== 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {variance.durationVarianceDays > 0 ? '+' : ''}{variance.durationVarianceDays} days vs baseline
                          </p>
                        )}
                        {task.dependencies && task.dependencies.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Depends on: {task.dependencies.length} task(s)
                          </p>
                        )}
                        {editable && (
                          <p className="text-xs text-primary">
                            Drag to reschedule • Drag edges to resize
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between p-3 border-t text-xs flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Status:</span>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Baseline Legend */}
          {showBaseline && baselineVariances.size > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-6 h-2 rounded-sm bg-gray-400 opacity-40 border border-dashed border-gray-500" />
                <span className="text-muted-foreground">Baseline</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Ahead</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-600">Behind</span>
              </div>
            </>
          )}

          {showCriticalPath && criticalPath.size > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{criticalPath.size} tasks on critical path</span>
            </div>
          )}

          {/* Schedule Health Summary */}
          {scheduleHealth && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>|</span>
              <span className="text-green-600">{scheduleHealth.aheadCount} ahead</span>
              <span className="text-red-600">{scheduleHealth.behindCount} behind</span>
              <span>{scheduleHealth.onTimeCount} on time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GanttChart

// Export helper function for external use
export { calculateBaselineVariance }
export type { BaselineVariance }
