/**
 * Enhanced Gantt Chart Component
 *
 * Full-featured Gantt chart with:
 * - FS, SS, FF, SF predecessor relationships
 * - Lag/Lead time support
 * - Schedule constraints (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
 * - Critical path highlighting
 * - Baseline comparison
 * - Drag-and-drop rescheduling
 * - Float visualization
 * - WBS hierarchy support
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  format,
  differenceInDays,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
  parseISO,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  GripVertical,
  Undo2,
  Calendar,
  Save,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Link2,
  Lock,
  Unlock,
  Settings2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import type {
  EnhancedGanttTask,
  TaskDependency,
  DependencyType,
  ConstraintType,
  ZoomLevel,
  GanttViewOptions,
  BaselineVariance,
  DependencyLine,
} from '../types/gantt'
import {
  DEPENDENCY_TYPE_LABELS,
  CONSTRAINT_TYPE_SHORT_LABELS,
  DEFAULT_GANTT_OPTIONS,
  getDependencyConnectionPoints,
  generateDependencyPath,
  getDependencyLineColor,
  getConstraintIndicatorPosition,
  formatLag,
  convertToEnhancedDependencies,
} from '../types/gantt'

// ============================================================================
// Props Interface
// ============================================================================

interface EnhancedGanttChartProps {
  tasks: EnhancedGanttTask[]
  onTaskClick?: (task: EnhancedGanttTask) => void
  onTaskDoubleClick?: (task: EnhancedGanttTask) => void
  onTaskUpdate?: (taskId: string, updates: Partial<EnhancedGanttTask>) => void
  onDependencyClick?: (dependency: TaskDependency, taskId: string) => void
  onDependencyAdd?: (predecessorId: string, successorId: string, type: DependencyType) => void
  onSaveBaseline?: (tasks: EnhancedGanttTask[]) => void
  startDate?: Date
  endDate?: Date
  dataDate?: Date // Current data date for status tracking
  className?: string
  editable?: boolean
  initialOptions?: Partial<GanttViewOptions>
}

// ============================================================================
// Color Constants
// ============================================================================

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
  on_hold: '#F59E0B',
}

const DEPENDENCY_TYPE_COLORS: Record<DependencyType, string> = {
  FS: '#6366F1', // Indigo
  SS: '#8B5CF6', // Violet
  FF: '#EC4899', // Pink
  SF: '#F97316', // Orange
}

// ============================================================================
// Drag State Interface
// ============================================================================

interface DragState {
  taskId: string
  mode: 'move' | 'resize-start' | 'resize-end' | 'link'
  startX: number
  startY: number
  originalStart: Date
  originalEnd: Date
}

// ============================================================================
// Internal Normalized Task Interface
// ============================================================================

interface NormalizedTask extends Omit<EnhancedGanttTask, 'startDate' | 'endDate' | 'constraintDate' | 'baselineStartDate' | 'baselineEndDate'> {
  startDate: Date
  endDate: Date
  constraintDate: Date | null
  baselineStartDate: Date | null
  baselineEndDate: Date | null
  dependencies: TaskDependency[]
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeDate(date: Date | string | null | undefined): Date | null {
  if (!date) {return null}
  return typeof date === 'string' ? parseISO(date) : date
}

function calculateCriticalPath(tasks: NormalizedTask[]): Set<string> {
  if (tasks.length === 0) {return new Set()}

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
    t.dependencies.forEach(dep => {
      if (taskMap.has(dep.predecessorId)) {
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1)
        const deps = dependents.get(dep.predecessorId) || []
        deps.push(t.id)
        dependents.set(dep.predecessorId, deps)
      }
    })
  })

  // Forward pass - calculate early start/finish
  const earlyStart = new Map<string, number>()
  const earlyFinish = new Map<string, number>()
  const queue: string[] = []

  tasks.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id)
      earlyStart.set(t.id, 0)
      earlyFinish.set(t.id, differenceInDays(t.endDate, t.startDate))
    }
  })

  const inDegreeCopy = new Map(inDegree)

  while (queue.length > 0) {
    const taskId = queue.shift()!
    const task = taskMap.get(taskId)!
    const ef = earlyFinish.get(taskId) || 0

    const deps = dependents.get(taskId) || []
    deps.forEach(depId => {
      const depTask = taskMap.get(depId)!
      const dep = depTask.dependencies.find(d => d.predecessorId === taskId)

      // Calculate early start based on dependency type
      let newEs = earlyStart.get(depId) || 0
      const lag = dep?.lag || 0

      switch (dep?.type || 'FS') {
        case 'FS':
          newEs = Math.max(newEs, ef + lag)
          break
        case 'SS':
          newEs = Math.max(newEs, (earlyStart.get(taskId) || 0) + lag)
          break
        case 'FF':
          // FF: successor finish must be >= predecessor finish + lag
          const depDuration = differenceInDays(depTask.endDate, depTask.startDate)
          newEs = Math.max(newEs, ef + lag - depDuration)
          break
        case 'SF':
          newEs = Math.max(newEs, (earlyStart.get(taskId) || 0) + lag - differenceInDays(depTask.endDate, depTask.startDate))
          break
      }

      earlyStart.set(depId, newEs)
      earlyFinish.set(depId, newEs + differenceInDays(depTask.endDate, depTask.startDate))

      inDegreeCopy.set(depId, (inDegreeCopy.get(depId) || 1) - 1)
      if (inDegreeCopy.get(depId) === 0) {
        queue.push(depId)
      }
    })
  }

  // Find project end time
  let projectEnd = 0
  tasks.forEach(t => {
    projectEnd = Math.max(projectEnd, earlyFinish.get(t.id) || 0)
  })

  // Backward pass - calculate late start/finish
  const lateStart = new Map<string, number>()
  const lateFinish = new Map<string, number>()

  tasks.forEach(t => {
    lateFinish.set(t.id, projectEnd)
  })

  const reverseTasks = [...tasks].sort(
    (a, b) => (earlyFinish.get(b.id) || 0) - (earlyFinish.get(a.id) || 0)
  )

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

  // Critical path: tasks where total float = 0
  const criticalPath = new Set<string>()
  tasks.forEach(t => {
    const slack = (lateStart.get(t.id) || 0) - (earlyStart.get(t.id) || 0)
    if (Math.abs(slack) < 0.01) {
      criticalPath.add(t.id)
    }
  })

  return criticalPath
}

function calculateBaselineVariance(
  task: NormalizedTask
): BaselineVariance | null {
  if (!task.baselineStartDate || !task.baselineEndDate) {return null}

  const startVarianceDays = differenceInDays(task.startDate, task.baselineStartDate)
  const endVarianceDays = differenceInDays(task.endDate, task.baselineEndDate)
  const actualDuration = differenceInDays(task.endDate, task.startDate)
  const baselineDuration = differenceInDays(task.baselineEndDate, task.baselineStartDate)
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

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedGanttChart({
  tasks,
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onDependencyClick,
  onDependencyAdd,
  onSaveBaseline,
  startDate: propStartDate,
  endDate: propEndDate,
  dataDate,
  className,
  editable = false,
  initialOptions,
}: EnhancedGanttChartProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [options, setOptions] = useState<GanttViewOptions>({
    ...DEFAULT_GANTT_OPTIONS,
    ...initialOptions,
  })

  const [viewOffset, setViewOffset] = useState(0)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [hoveredDependency, setHoveredDependency] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<EnhancedGanttTask>>>(
    new Map()
  )
  const [expandedWBS, setExpandedWBS] = useState<Set<string>>(new Set())
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // Normalized Tasks
  // ============================================================================

  const normalizedTasks = useMemo((): NormalizedTask[] => {
    return tasks.map(task => {
      const pending = pendingChanges.get(task.id)

      // Normalize dates
      const startDate = pending?.startDate
        ? normalizeDate(pending.startDate)!
        : normalizeDate(task.startDate) || new Date()
      const endDate = pending?.endDate
        ? normalizeDate(pending.endDate)!
        : normalizeDate(task.endDate) || addDays(startDate, 1)

      // Normalize dependencies
      const dependencies = task.dependencies ||
        convertToEnhancedDependencies(task.simpleDependencies)

      return {
        ...task,
        startDate,
        endDate,
        constraintDate: normalizeDate(task.constraintDate),
        baselineStartDate: normalizeDate(task.baselineStartDate),
        baselineEndDate: normalizeDate(task.baselineEndDate),
        dependencies,
      }
    })
  }, [tasks, pendingChanges])

  // ============================================================================
  // Critical Path
  // ============================================================================

  const criticalPath = useMemo(() => {
    return options.showCriticalPath ? calculateCriticalPath(normalizedTasks) : new Set<string>()
  }, [normalizedTasks, options.showCriticalPath])

  // ============================================================================
  // Baseline Variances
  // ============================================================================

  const baselineVariances = useMemo(() => {
    const variances = new Map<string, BaselineVariance>()
    normalizedTasks.forEach(task => {
      const variance = calculateBaselineVariance(task)
      if (variance) {
        variances.set(task.id, variance)
      }
    })
    return variances
  }, [normalizedTasks])

  // ============================================================================
  // Schedule Health Summary
  // ============================================================================

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

  // ============================================================================
  // Date Range Calculations
  // ============================================================================

  const { minDate, maxDate } = useMemo(() => {
    if (normalizedTasks.length === 0) {
      const today = new Date()
      return {
        minDate: startOfWeek(today),
        maxDate: addDays(endOfWeek(today), 14),
      }
    }

    const taskDates = normalizedTasks.flatMap(t => [t.startDate, t.endDate])
    const min = propStartDate || new Date(Math.min(...taskDates.map(d => d.getTime())))
    const max = propEndDate || new Date(Math.max(...taskDates.map(d => d.getTime())))

    const bufferedMin = addDays(min, -3)
    const bufferedMax = addDays(max, 7)

    return { minDate: bufferedMin, maxDate: bufferedMax }
  }, [normalizedTasks, propStartDate, propEndDate])

  // ============================================================================
  // Visible Date Range
  // ============================================================================

  const { visibleStart, visibleEnd, visibleDays } = useMemo(() => {
    const daysToShow =
      options.zoomLevel === 'day'
        ? 14
        : options.zoomLevel === 'week'
        ? 28
        : options.zoomLevel === 'month'
        ? 90
        : options.zoomLevel === 'quarter'
        ? 180
        : 365
    const start = addDays(minDate, viewOffset)
    const end = addDays(start, daysToShow)

    return {
      visibleStart: start,
      visibleEnd: end,
      visibleDays: eachDayOfInterval({ start, end }),
    }
  }, [minDate, viewOffset, options.zoomLevel])

  // Column width based on zoom
  const columnWidth =
    options.zoomLevel === 'day'
      ? 40
      : options.zoomLevel === 'week'
      ? 20
      : options.zoomLevel === 'month'
      ? 8
      : options.zoomLevel === 'quarter'
      ? 4
      : 2

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const step =
        options.zoomLevel === 'day'
          ? 7
          : options.zoomLevel === 'week'
          ? 14
          : options.zoomLevel === 'month'
          ? 30
          : 90
      setViewOffset(prev => prev + (direction === 'next' ? step : -step))
    },
    [options.zoomLevel]
  )

  const handleSaveBaseline = useCallback(() => {
    if (!onSaveBaseline) {return}
    const tasksWithBaseline = normalizedTasks.map(task => ({
      ...task,
      baselineStartDate: task.startDate,
      baselineEndDate: task.endDate,
    }))
    onSaveBaseline(tasksWithBaseline as EnhancedGanttTask[])
  }, [normalizedTasks, onSaveBaseline])

  const handleUndo = useCallback(() => {
    setPendingChanges(new Map())
  }, [])

  const toggleOption = useCallback((key: keyof GanttViewOptions) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const setZoom = useCallback((level: ZoomLevel) => {
    setOptions(prev => ({ ...prev, zoomLevel: level }))
  }, [])

  // ============================================================================
  // Task Position Calculations
  // ============================================================================

  const getTaskStyle = useCallback(
    (task: NormalizedTask) => {
      const startOffset = Math.max(0, differenceInDays(task.startDate, visibleStart))
      const endOffset = differenceInDays(task.endDate, visibleStart) + 1
      const width = Math.max(1, Math.min(endOffset, visibleDays.length) - startOffset)

      if (startOffset >= visibleDays.length || endOffset <= 0) {
        return null
      }

      return {
        left: `${startOffset * columnWidth}px`,
        width: `${width * columnWidth - 4}px`,
      }
    },
    [visibleStart, visibleDays.length, columnWidth]
  )

  const getBaselineStyle = useCallback(
    (task: NormalizedTask) => {
      if (!task.baselineStartDate || !task.baselineEndDate) {return null}

      const startOffset = Math.max(0, differenceInDays(task.baselineStartDate, visibleStart))
      const endOffset = differenceInDays(task.baselineEndDate, visibleStart) + 1
      const width = Math.max(1, Math.min(endOffset, visibleDays.length) - startOffset)

      if (startOffset >= visibleDays.length || endOffset <= 0) {
        return null
      }

      return {
        left: `${startOffset * columnWidth}px`,
        width: `${width * columnWidth - 4}px`,
      }
    },
    [visibleStart, visibleDays.length, columnWidth]
  )

  // ============================================================================
  // Task Color
  // ============================================================================

  const getTaskColor = useCallback(
    (task: NormalizedTask, isCritical: boolean) => {
      if (isCritical && options.showCriticalPath) {return '#DC2626'}
      if (task.color) {return task.color}
      if (task.status) {return STATUS_COLORS[task.status] || STATUS_COLORS.pending}
      if (task.priority) {return PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}
      return '#3B82F6'
    },
    [options.showCriticalPath]
  )

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleDragStart = useCallback(
    (e: React.MouseEvent, taskId: string, mode: DragState['mode']) => {
      if (!editable) {return}
      e.preventDefault()
      e.stopPropagation()

      const task = normalizedTasks.find(t => t.id === taskId)
      if (!task) {return}

      setDragState({
        taskId,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        originalStart: task.startDate,
        originalEnd: task.endDate,
      })

      if (mode === 'link') {
        setLinkingFrom(taskId)
      }
    },
    [editable, normalizedTasks]
  )

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || dragState.mode === 'link') {return}

      const deltaX = e.clientX - dragState.startX
      const daysDelta = Math.round(deltaX / columnWidth)

      if (daysDelta === 0) {return}

      const newChanges = new Map(pendingChanges)

      let newStart: Date
      let newEnd: Date

      if (dragState.mode === 'move') {
        newStart = addDays(dragState.originalStart, daysDelta)
        newEnd = addDays(dragState.originalEnd, daysDelta)
      } else if (dragState.mode === 'resize-start') {
        newStart = addDays(dragState.originalStart, daysDelta)
        newEnd = dragState.originalEnd
        if (newStart >= newEnd) {return}
      } else {
        newStart = dragState.originalStart
        newEnd = addDays(dragState.originalEnd, daysDelta)
        if (newEnd <= newStart) {return}
      }

      newChanges.set(dragState.taskId, { startDate: newStart, endDate: newEnd })
      setPendingChanges(newChanges)
    },
    [dragState, columnWidth, pendingChanges]
  )

  const handleDragEnd = useCallback(() => {
    if (dragState && dragState.mode !== 'link' && pendingChanges.has(dragState.taskId) && onTaskUpdate) {
      const changes = pendingChanges.get(dragState.taskId)!
      onTaskUpdate(dragState.taskId, changes)
    }

    setDragState(null)
    setLinkingFrom(null)
  }, [dragState, pendingChanges, onTaskUpdate])

  const handleLinkDrop = useCallback(
    (targetTaskId: string) => {
      if (linkingFrom && linkingFrom !== targetTaskId && onDependencyAdd) {
        onDependencyAdd(linkingFrom, targetTaskId, 'FS')
      }
      setLinkingFrom(null)
      setDragState(null)
    },
    [linkingFrom, onDependencyAdd]
  )

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

  // ============================================================================
  // Render Dependency Lines
  // ============================================================================

  const renderDependencyLines = useCallback(
    (task: NormalizedTask, taskIndex: number) => {
      if (!options.showDependencies) {return null}

      const taskStyle = getTaskStyle(task)
      if (!taskStyle) {return null}

      return task.dependencies.map(dep => {
        const predTask = normalizedTasks.find(t => t.id === dep.predecessorId)
        if (!predTask) {return null}

        const predIndex = normalizedTasks.findIndex(t => t.id === dep.predecessorId)
        const predStyle = getTaskStyle(predTask)
        if (!predStyle) {return null}

        const isCritical = criticalPath.has(task.id) && criticalPath.has(dep.predecessorId)
        const depKey = `${dep.predecessorId}-${task.id}`
        const isHovered = hoveredDependency === depKey

        // Calculate positions
        const predRect = {
          left: parseFloat(predStyle.left),
          right: parseFloat(predStyle.left) + parseFloat(predStyle.width),
          top: predIndex * 40,
          bottom: predIndex * 40 + 40,
          centerY: predIndex * 40 + 20,
        }

        const taskRect = {
          left: parseFloat(taskStyle.left),
          right: parseFloat(taskStyle.left) + parseFloat(taskStyle.width),
          top: taskIndex * 40,
          bottom: taskIndex * 40 + 40,
          centerY: taskIndex * 40 + 20,
        }

        const points = getDependencyConnectionPoints(dep.type, predRect, taskRect)
        const line: DependencyLine = {
          fromTaskId: dep.predecessorId,
          toTaskId: task.id,
          type: dep.type,
          lag: dep.lag,
          isCritical,
          isDriving: dep.isDriving || false,
          ...points,
        }

        const path = generateDependencyPath(line)
        const color = getDependencyLineColor(line, options.showCriticalPath)

        return (
          <g
            key={depKey}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredDependency(depKey)}
            onMouseLeave={() => setHoveredDependency(null)}
            onClick={() => onDependencyClick?.(dep, task.id)}
          >
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? 3 : isCritical ? 2 : 1.5}
              strokeDasharray={isHovered ? '0' : isCritical ? '0' : '4,2'}
              opacity={isHovered ? 1 : 0.7}
              className="transition-all"
            />
            {/* Arrowhead */}
            <polygon
              points={`${points.endX},${points.endY} ${points.endX - 6},${points.endY - 4} ${points.endX - 6},${points.endY + 4}`}
              fill={color}
              opacity={isHovered ? 1 : 0.7}
            />
            {/* Lag indicator */}
            {dep.lag !== 0 && (
              <text
                x={(points.startX + points.endX) / 2}
                y={(points.startY + points.endY) / 2 - 5}
                fill={color}
                fontSize="10"
                textAnchor="middle"
              >
                {formatLag(dep.lag, dep.lagUnit)}
              </text>
            )}
            {/* Type indicator on hover */}
            {isHovered && (
              <text
                x={(points.startX + points.endX) / 2}
                y={(points.startY + points.endY) / 2 + 12}
                fill={color}
                fontSize="9"
                textAnchor="middle"
                fontWeight="bold"
              >
                {dep.type}
              </text>
            )}
          </g>
        )
      })
    },
    [
      options.showDependencies,
      options.showCriticalPath,
      getTaskStyle,
      normalizedTasks,
      criticalPath,
      hoveredDependency,
      onDependencyClick,
    ]
  )

  // ============================================================================
  // Render Constraint Indicator
  // ============================================================================

  const renderConstraintIndicator = useCallback(
    (task: NormalizedTask, taskStyle: { left: string; width: string }) => {
      if (!task.constraintType || task.constraintType === 'as_soon_as_possible') {return null}

      const barRect = {
        left: parseFloat(taskStyle.left),
        right: parseFloat(taskStyle.left) + parseFloat(taskStyle.width),
        top: 6,
        centerY: 20,
      }

      const pos = getConstraintIndicatorPosition(task.constraintType, barRect)
      const constraintLabel = CONSTRAINT_TYPE_SHORT_LABELS[task.constraintType]

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold cursor-help"
                style={{
                  left: `${pos.x - 8}px`,
                  top: `${pos.y}px`,
                }}
              >
                <Lock className="h-2.5 w-2.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{constraintLabel}</p>
              {task.constraintDate && (
                <p className="text-xs text-muted-foreground">
                  {format(task.constraintDate, 'MMM d, yyyy')}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    []
  )

  // ============================================================================
  // Render Component
  // ============================================================================

  return (
    <div className={cn('bg-background border rounded-lg overflow-hidden', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 flex-wrap gap-2">
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
          {dataDate && (
            <Badge variant="outline" className="ml-2 text-xs">
              Data Date: {format(dataDate, 'MMM d')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Schedule Health */}
          {scheduleHealth && options.showBaseline && (
            <div className="flex items-center gap-1.5 text-xs">
              {scheduleHealth.avgVarianceDays > 0 ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <TrendingDown className="h-3 w-3" />
                  {scheduleHealth.avgVarianceDays}d behind
                </Badge>
              ) : scheduleHealth.avgVarianceDays < 0 ? (
                <Badge className="gap-1 text-[10px] bg-success hover:bg-success/90">
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

          {/* Save Baseline Button */}
          {onSaveBaseline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveBaseline}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              Save Baseline
            </Button>
          )}

          {/* View Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings2 className="h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Display Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={options.showCriticalPath}
                onCheckedChange={() => toggleOption('showCriticalPath')}
              >
                <Target className="h-4 w-4 mr-2 text-destructive" />
                Critical Path
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={options.showBaseline}
                onCheckedChange={() => toggleOption('showBaseline')}
              >
                <Calendar className="h-4 w-4 mr-2 text-info" />
                Baseline
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={options.showDependencies}
                onCheckedChange={() => toggleOption('showDependencies')}
              >
                <Link2 className="h-4 w-4 mr-2 text-muted-foreground" />
                Dependencies
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={options.showFloatBars}
                onCheckedChange={() => toggleOption('showFloatBars')}
              >
                <Clock className="h-4 w-4 mr-2 text-warning" />
                Float Bars
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={options.showProgress}
                onCheckedChange={() => toggleOption('showProgress')}
              >
                <TrendingUp className="h-4 w-4 mr-2 text-success" />
                Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Zoom Level</DropdownMenuLabel>
              {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map(level => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setZoom(level)}
                  className={cn(options.zoomLevel === level && 'bg-accent')}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => {
              const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
              const idx = levels.indexOf(options.zoomLevel)
              if (idx > 0) {setZoom(levels[idx - 1])}
            }}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
              const idx = levels.indexOf(options.zoomLevel)
              if (idx < levels.length - 1) {setZoom(levels[idx + 1])}
            }}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Undo Changes */}
          {pendingChanges.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleUndo}>
              <Undo2 className="h-4 w-4 mr-1" />
              Undo ({pendingChanges.size})
            </Button>
          )}
        </div>
      </div>

      <div className="flex overflow-hidden" ref={containerRef}>
        {/* Task List Sidebar */}
        <div className="w-72 flex-shrink-0 border-r bg-muted/20">
          <div className="h-12 flex items-center px-3 border-b bg-muted/40">
            <span className="text-sm font-medium flex-1">Tasks</span>
            {options.showCriticalPath && criticalPath.size > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {criticalPath.size} critical
              </Badge>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {normalizedTasks.map(task => {
              const isCritical = criticalPath.has(task.id)
              const variance = baselineVariances.get(task.id)

              return (
                <div
                  key={task.id}
                  className={cn(
                    'h-10 flex items-center px-3 border-b hover:bg-muted/40 cursor-pointer transition-colors',
                    hoveredTask === task.id && 'bg-muted/40',
                    selectedTask === task.id && 'bg-primary/10',
                    isCritical && options.showCriticalPath && 'border-l-2 border-l-destructive'
                  )}
                  style={{ paddingLeft: task.wbsLevel ? `${task.wbsLevel * 12 + 12}px` : undefined }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => {
                    setSelectedTask(task.id)
                    onTaskClick?.(task as EnhancedGanttTask)
                  }}
                  onDoubleClick={() => onTaskDoubleClick?.(task as EnhancedGanttTask)}
                  onMouseUp={() => {
                    if (linkingFrom && linkingFrom !== task.id) {
                      handleLinkDrop(task.id)
                    }
                  }}
                >
                  {editable && (
                    <GripVertical className="h-4 w-4 text-muted-foreground mr-2 cursor-grab flex-shrink-0" />
                  )}

                  {task.isMilestone ? (
                    <Target className="h-4 w-4 text-violet-500 mr-2 flex-shrink-0" />
                  ) : task.hasChildren ? (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setExpandedWBS(prev => {
                          const next = new Set(prev)
                          if (next.has(task.id)) {
                            next.delete(task.id)
                          } else {
                            next.add(task.id)
                          }
                          return next
                        })
                      }}
                      className="mr-1"
                    >
                      {expandedWBS.has(task.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}

                  <span className="text-sm truncate flex-1">{task.title}</span>

                  {/* Constraint indicator */}
                  {task.constraintType && task.constraintType !== 'as_soon_as_possible' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-amber-500 mr-1" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {CONSTRAINT_TYPE_SHORT_LABELS[task.constraintType]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Dependencies count */}
                  {task.dependencies.length > 0 && (
                    <Badge variant="outline" className="text-[10px] mr-1">
                      {task.dependencies.length} dep
                    </Badge>
                  )}

                  {/* Variance indicator */}
                  {options.showBaseline && variance && (
                    variance.isBehindSchedule ? (
                      <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                    ) : variance.isAheadOfSchedule ? (
                      <TrendingUp className="h-3 w-3 text-success mr-1" />
                    ) : null
                  )}

                  {isCritical && options.showCriticalPath && (
                    <AlertTriangle className="h-4 w-4 text-destructive mr-1" />
                  )}

                  {task.status && (
                    <Badge
                      variant="outline"
                      className="ml-1 text-[10px] h-5"
                      style={{
                        borderColor: getTaskColor(task, isCritical),
                        color: getTaskColor(task, isCritical),
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
                  options.showWeekends && isWeekend(day) && 'bg-muted/60',
                  isSameDay(day, new Date()) && 'bg-primary/10'
                )}
                style={{ width: `${columnWidth}px` }}
              >
                {options.zoomLevel !== 'quarter' && options.zoomLevel !== 'month' && (
                  <>
                    <span className="text-muted-foreground">{format(day, 'EEE')}</span>
                    <span
                      className={cn(
                        'font-medium',
                        isSameDay(day, new Date()) && 'text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </>
                )}
                {(options.zoomLevel === 'month' || options.zoomLevel === 'quarter') &&
                  index % 7 === 0 && (
                    <span className="text-muted-foreground">{format(day, 'MMM d')}</span>
                  )}
              </div>
            ))}
          </div>

          {/* Task Bars */}
          <div
            className="relative"
            style={{ minWidth: `${visibleDays.length * columnWidth}px` }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {visibleDays.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex-shrink-0 border-r h-full',
                    options.showWeekends && isWeekend(day) && 'bg-muted/30',
                    isSameDay(day, new Date()) && 'bg-primary/10 border-primary/30'
                  )}
                  style={{ width: `${columnWidth}px` }}
                />
              ))}
            </div>

            {/* Today line */}
            {options.showToday && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20"
                style={{
                  left: `${differenceInDays(new Date(), visibleStart) * columnWidth}px`,
                }}
              />
            )}

            {/* Data date line */}
            {options.showDataDate && dataDate && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                style={{
                  left: `${differenceInDays(dataDate, visibleStart) * columnWidth}px`,
                }}
              />
            )}

            {/* Dependency Lines SVG */}
            {options.showDependencies && (
              <svg
                className="absolute top-0 left-0 pointer-events-none z-5"
                style={{
                  width: `${visibleDays.length * columnWidth}px`,
                  height: `${normalizedTasks.length * 40}px`,
                }}
              >
                {normalizedTasks.map((task, index) => renderDependencyLines(task, index))}
              </svg>
            )}

            {/* Task bars */}
            {normalizedTasks.map((task, taskIndex) => {
              const style = getTaskStyle(task)
              if (!style) {return null}

              const isCritical = criticalPath.has(task.id)
              const color = getTaskColor(task, isCritical)
              const progress = task.progress || 0
              const isDragging = dragState?.taskId === task.id
              const baselineStyle = getBaselineStyle(task)
              const variance = baselineVariances.get(task.id)
              const isLinkTarget = linkingFrom && linkingFrom !== task.id

              return (
                <TooltipProvider key={task.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'h-10 flex items-center px-1 relative transition-all',
                          hoveredTask === task.id && 'z-10',
                          isDragging && 'z-20',
                          isLinkTarget && 'ring-2 ring-blue-400 ring-offset-1'
                        )}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        onClick={() => !dragState && onTaskClick?.(task as EnhancedGanttTask)}
                        onDoubleClick={() =>
                          !dragState && onTaskDoubleClick?.(task as EnhancedGanttTask)
                        }
                        onMouseUp={() => {
                          if (linkingFrom && linkingFrom !== task.id) {
                            handleLinkDrop(task.id)
                          }
                        }}
                      >
                        {/* Float bar (before actual) */}
                        {options.showFloatBars && task.totalFloat && task.totalFloat > 0 && (
                          <div
                            className="absolute h-1 bg-amber-300/60 rounded"
                            style={{
                              left: `${parseFloat(style.left) + parseFloat(style.width)}px`,
                              width: `${task.totalFloat * columnWidth}px`,
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          />
                        )}

                        {/* Baseline bar (behind actual bar) */}
                        {options.showBaseline && baselineStyle && (
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

                        {/* Constraint indicator */}
                        {renderConstraintIndicator(task, style)}

                        {/* Milestone */}
                        {task.isMilestone ? (
                          <div
                            className={cn(
                              'absolute w-5 h-5 rotate-45 transition-transform',
                              hoveredTask === task.id && 'scale-110'
                            )}
                            style={{
                              left: style.left,
                              top: '50%',
                              transform: 'translateY(-50%) rotate(45deg)',
                              backgroundColor: color,
                            }}
                          />
                        ) : (
                          /* Task bar */
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
                              border:
                                isCritical && options.showCriticalPath
                                  ? `2px solid ${color}`
                                  : `1px solid ${color}`,
                            }}
                            onMouseDown={e => handleDragStart(e, task.id, 'move')}
                          >
                            {/* Progress bar */}
                            {options.showProgress && (
                              <div
                                className="absolute inset-y-0 left-0 rounded-l-md"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: `${color}40`,
                                }}
                              />
                            )}

                            {/* Variance indicator */}
                            {options.showBaseline && variance && (
                              <div className="absolute -top-1 -right-1">
                                {variance.isBehindSchedule ? (
                                  <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                                    <TrendingDown className="h-2.5 w-2.5 text-white" />
                                  </div>
                                ) : variance.isAheadOfSchedule ? (
                                  <div className="w-4 h-4 bg-success rounded-full flex items-center justify-center">
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
                                  onMouseDown={e => handleDragStart(e, task.id, 'resize-start')}
                                />
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 rounded-r"
                                  onMouseDown={e => handleDragStart(e, task.id, 'resize-end')}
                                />
                              </>
                            )}

                            {/* Link handle */}
                            {editable && onDependencyAdd && hoveredTask === task.id && (
                              <div
                                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-crosshair flex items-center justify-center"
                                onMouseDown={e => handleDragStart(e, task.id, 'link')}
                              >
                                <Link2 className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}

                            {/* Label */}
                            <span
                              className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
                              style={{ color }}
                            >
                              {parseFloat(style.width) > 60 ? task.title : ''}
                            </span>

                            {/* Critical path indicator */}
                            {isCritical &&
                              options.showCriticalPath &&
                              parseFloat(style.width) > 40 && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                  <Target className="h-3 w-3 text-destructive" />
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{task.title}</p>
                          {isCritical && options.showCriticalPath && (
                            <Badge variant="destructive" className="text-[10px]">
                              Critical
                            </Badge>
                          )}
                          {variance &&
                            (variance.isBehindSchedule ? (
                              <Badge variant="destructive" className="text-[10px] gap-0.5">
                                <TrendingDown className="h-2.5 w-2.5" />
                                {variance.endVarianceDays}d late
                              </Badge>
                            ) : variance.isAheadOfSchedule ? (
                              <Badge className="text-[10px] gap-0.5 bg-success">
                                <TrendingUp className="h-2.5 w-2.5" />
                                {Math.abs(variance.endVarianceDays)}d early
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                On time
                              </Badge>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {format(task.startDate, 'MMM d')} -{' '}
                          {format(task.endDate, 'MMM d, yyyy')}
                        </p>

                        {task.baselineStartDate && task.baselineEndDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Baseline: {format(task.baselineStartDate, 'MMM d')} -{' '}
                            {format(task.baselineEndDate, 'MMM d')}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs">
                          <span>Progress: {progress}%</span>
                          {task.totalFloat !== null && task.totalFloat !== undefined && (
                            <span>Float: {task.totalFloat}d</span>
                          )}
                        </div>

                        {task.constraintType && task.constraintType !== 'as_soon_as_possible' && (
                          <p className="text-xs flex items-center gap-1 text-amber-600">
                            <Lock className="h-3 w-3" />
                            {CONSTRAINT_TYPE_SHORT_LABELS[task.constraintType]}
                            {task.constraintDate && `: ${format(task.constraintDate, 'MMM d')}`}
                          </p>
                        )}

                        {task.dependencies.length > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Dependencies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.dependencies.slice(0, 3).map(dep => {
                                const predTask = normalizedTasks.find(
                                  t => t.id === dep.predecessorId
                                )
                                return (
                                  <Badge key={dep.predecessorId} variant="outline" className="text-[10px]">
                                    {dep.type}
                                    {dep.lag !== 0 && formatLag(dep.lag, dep.lagUnit)}
                                    {predTask && ` - ${predTask.title.slice(0, 15)}...`}
                                  </Badge>
                                )
                              })}
                              {task.dependencies.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{task.dependencies.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {task.assignee && (
                          <p className="text-xs text-muted-foreground">
                            Assignee: {task.assignee}
                          </p>
                        )}

                        {editable && (
                          <p className="text-xs text-primary mt-1">
                            Drag to reschedule | Edges to resize | Circle to link
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
          {/* Dependency Types Legend */}
          {options.showDependencies && (
            <>
              <span className="text-muted-foreground">Dependencies:</span>
              {Object.entries(DEPENDENCY_TYPE_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  <div
                    className="w-4 h-0.5"
                    style={{ backgroundColor: DEPENDENCY_TYPE_COLORS[type as DependencyType] }}
                  />
                  <span>{type}</span>
                </div>
              ))}
            </>
          )}

          {/* Baseline Legend */}
          {options.showBaseline && baselineVariances.size > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-6 h-2 rounded-sm bg-muted-foreground opacity-40 border border-dashed border-muted-foreground" />
                <span className="text-muted-foreground">Baseline</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">Ahead</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Behind</span>
              </div>
            </>
          )}

          {/* Critical Path */}
          {options.showCriticalPath && criticalPath.size > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>{criticalPath.size} tasks on critical path</span>
            </div>
          )}

          {/* Schedule Health */}
          {scheduleHealth && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>|</span>
              <span className="text-success">{scheduleHealth.aheadCount} ahead</span>
              <span className="text-destructive">{scheduleHealth.behindCount} behind</span>
              <span>{scheduleHealth.onTimeCount} on time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedGanttChart
