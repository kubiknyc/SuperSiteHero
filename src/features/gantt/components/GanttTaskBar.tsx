// File: src/features/gantt/components/GanttTaskBar.tsx
// Task bar component for Gantt chart with drag-and-drop and baseline support

import { useMemo, useState, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { Diamond, AlertTriangle, GripVertical } from 'lucide-react'
import type { ScheduleItem, GanttZoomLevel, ScheduleItemStatus, GanttConfig } from '@/types/schedule'
import { TASK_BAR_COLORS, CRITICAL_PATH_COLOR, MILESTONE_COLOR, BASELINE_COLOR } from '@/types/schedule'
import { getDatePosition, getTaskBarWidth, getColumnWidth } from '../utils/dateUtils'
import {
  type DragMode,
  type DragState,
  type DragResult,
  startDrag,
  calculateDragResult,
  getDragMode,
  getDragCursor,
  getActiveDragCursor,
  hasDragStarted,
  formatDragFeedback,
  DRAG_THRESHOLD,
} from '../utils/dragUtils'

interface GanttTaskBarProps {
  task: ScheduleItem
  timelineStartDate: Date
  zoomLevel: GanttZoomLevel
  rowIndex: number
  rowHeight: number
  barHeight: number
  showProgress: boolean
  showCriticalPath: boolean
  showBaseline: boolean
  config: GanttConfig
  onClick?: (task: ScheduleItem) => void
  onHover?: (task: ScheduleItem | null) => void
  onDragStart?: (task: ScheduleItem, mode: DragMode) => void
  onDragMove?: (task: ScheduleItem, result: DragResult) => void
  onDragEnd?: (task: ScheduleItem, result: DragResult) => void
}

function getTaskStatus(task: ScheduleItem): ScheduleItemStatus {
  const today = new Date().toISOString().split('T')[0]

  if (task.percent_complete === 100) {return 'completed'}
  if (task.percent_complete > 0) {return 'in_progress'}
  if (task.finish_date < today) {return 'delayed'}
  return 'not_started'
}

export function GanttTaskBar({
  task,
  timelineStartDate,
  zoomLevel,
  rowIndex,
  rowHeight,
  barHeight,
  showProgress,
  showCriticalPath,
  showBaseline,
  config,
  onClick,
  onHover,
  onDragStart,
  onDragMove,
  onDragEnd,
}: GanttTaskBarProps) {
  const columnWidth = getColumnWidth(zoomLevel)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragResult, setDragResult] = useState<DragResult | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const barRef = useRef<SVGRectElement>(null)

  // Calculate position for main task bar
  const position = useMemo(() => {
    const startDate = new Date(task.start_date)
    const endDate = new Date(task.finish_date)

    const x = getDatePosition(startDate, timelineStartDate, zoomLevel, columnWidth)
    const width = getTaskBarWidth(startDate, endDate, zoomLevel, columnWidth)
    const y = rowIndex * rowHeight + (rowHeight - barHeight) / 2

    return { x, y, width }
  }, [task, timelineStartDate, zoomLevel, columnWidth, rowIndex, rowHeight, barHeight])

  // Calculate position for baseline bar (if exists)
  const baselinePosition = useMemo(() => {
    if (!task.baseline_start_date || !task.baseline_finish_date || !showBaseline) {
      return null
    }

    const startDate = parseISO(task.baseline_start_date)
    const endDate = parseISO(task.baseline_finish_date)

    const x = getDatePosition(startDate, timelineStartDate, zoomLevel, columnWidth)
    const width = getTaskBarWidth(startDate, endDate, zoomLevel, columnWidth)
    // Baseline bar is positioned slightly above the main bar
    const y = rowIndex * rowHeight + (rowHeight - barHeight) / 2 - 6

    return { x, y, width }
  }, [task, timelineStartDate, zoomLevel, columnWidth, rowIndex, rowHeight, barHeight, showBaseline])

  // Calculate variance for tooltip
  const variance = useMemo(() => {
    if (!task.baseline_finish_date) {return null}

    const actualFinish = new Date(task.finish_date)
    const baselineFinish = parseISO(task.baseline_finish_date)
    const days = Math.round((actualFinish.getTime() - baselineFinish.getTime()) / (1000 * 60 * 60 * 24))

    return {
      days,
      status: days < 0 ? 'ahead' : days > 0 ? 'behind' : 'on_track',
    }
  }, [task.finish_date, task.baseline_finish_date])

  const status = getTaskStatus(task)
  const isOverdue = status === 'delayed'
  const isCritical = task.is_critical && showCriticalPath

  // Determine bar color
  const barColor = useMemo(() => {
    if (task.color) {return task.color}
    if (isCritical) {return CRITICAL_PATH_COLOR}
    if (task.is_milestone) {return MILESTONE_COLOR}
    return TASK_BAR_COLORS[status]
  }, [task.color, isCritical, task.is_milestone, status])

  // Progress bar width
  const progressWidth = showProgress ? (position.width * task.percent_complete) / 100 : 0

  // Tooltip content
  const tooltipContent = useMemo(() => {
    const lines = [
      task.task_name,
      `${format(new Date(task.start_date), 'MMM d')} - ${format(new Date(task.finish_date), 'MMM d, yyyy')}`,
      `Progress: ${task.percent_complete}%`,
      `Duration: ${task.duration_days} days`,
    ]
    if (task.assigned_to) {lines.push(`Assigned: ${task.assigned_to}`)}
    if (isCritical) {lines.push('⚠️ Critical Path')}
    if (isOverdue) {lines.push('⚠️ Overdue')}
    if (variance) {
      if (variance.status === 'ahead') {
        lines.push(`✅ ${Math.abs(variance.days)} days ahead of baseline`)
      } else if (variance.status === 'behind') {
        lines.push(`⚠️ ${variance.days} days behind baseline`)
      } else {
        lines.push('✓ On track with baseline')
      }
    }
    return lines.join('\n')
  }, [task, isCritical, isOverdue, variance])

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (!config.allow_drag && !config.allow_resize) {return}
      if (task.is_milestone) {return} // Milestones can't be dragged

      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) {return}

      const mode = getDragMode(e.clientX, rect.left, rect.width)

      // Check permissions
      if (mode === 'move' && !config.allow_drag) {return}
      if ((mode === 'resize-start' || mode === 'resize-end') && !config.allow_resize) {return}

      dragStateRef.current = startDrag(task, mode, e.clientX, e.clientY)
      setDragMode(mode)

      // Add global mouse listeners
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      e.preventDefault()
      e.stopPropagation()
    },
    [config.allow_drag, config.allow_resize, task]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStateRef.current) {return}

      const state = dragStateRef.current

      // Check if drag has started (exceeded threshold)
      if (!isDragging && hasDragStarted(state.startX, state.startY, e.clientX, e.clientY)) {
        setIsDragging(true)
        onDragStart?.(task, state.mode)
      }

      if (isDragging || hasDragStarted(state.startX, state.startY, e.clientX, e.clientY)) {
        const result = calculateDragResult(state, e.clientX, columnWidth)
        setDragResult(result)
        onDragMove?.(task, result)
      }
    },
    [isDragging, task, columnWidth, onDragStart, onDragMove]
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (isDragging && dragResult) {
        onDragEnd?.(task, dragResult)
      }

      setIsDragging(false)
      setDragMode(null)
      setDragResult(null)
      dragStateRef.current = null
    },
    [isDragging, dragResult, task, onDragEnd, handleMouseMove]
  )

  // Cursor based on hover position
  const [hoverCursor, setHoverCursor] = useState<string>('pointer')

  const handleMouseMoveOnBar = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (isDragging) {return}
      if (!config.allow_drag && !config.allow_resize) {
        setHoverCursor('pointer')
        return
      }

      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) {return}

      const mode = getDragMode(e.clientX, rect.left, rect.width)
      setHoverCursor(getDragCursor(mode))
    },
    [isDragging, config.allow_drag, config.allow_resize]
  )

  // Calculate ghost bar position during drag
  const ghostPosition = useMemo(() => {
    if (!isDragging || !dragResult) {return null}

    const startDate = parseISO(dragResult.newStartDate)
    const endDate = parseISO(dragResult.newFinishDate)

    const x = getDatePosition(startDate, timelineStartDate, zoomLevel, columnWidth)
    const width = getTaskBarWidth(startDate, endDate, zoomLevel, columnWidth)

    return { x, width }
  }, [isDragging, dragResult, timelineStartDate, zoomLevel, columnWidth])

  // Render milestone as diamond
  if (task.is_milestone) {
    return (
      <g
        className="cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => onClick?.(task)}
        onMouseEnter={() => onHover?.(task)}
        onMouseLeave={() => onHover?.(null)}
      >
        <title>{tooltipContent}</title>
        {/* Baseline milestone (smaller, behind) */}
        {baselinePosition && (
          <g transform={`translate(${baselinePosition.x}, ${position.y + barHeight / 2})`}>
            <polygon
              points={`0,-${barHeight / 3} ${barHeight / 3},0 0,${barHeight / 3} -${barHeight / 3},0`}
              fill={BASELINE_COLOR}
              opacity={0.5}
            />
          </g>
        )}
        {/* Diamond shape */}
        <g transform={`translate(${position.x + position.width / 2}, ${position.y + barHeight / 2})`}>
          <polygon
            points={`0,-${barHeight / 2} ${barHeight / 2},0 0,${barHeight / 2} -${barHeight / 2},0`}
            fill={barColor}
            stroke={isCritical ? CRITICAL_PATH_COLOR : '#374151'}
            strokeWidth={isCritical ? 2 : 1}
          />
          {/* Milestone icon */}
          <Diamond
            className="text-white"
            x={-6}
            y={-6}
            width={12}
            height={12}
            fill="white"
            stroke="none"
          />
        </g>
        {/* Label */}
        <text
          x={position.x + position.width / 2 + barHeight / 2 + 8}
          y={position.y + barHeight / 2 + 4}
          className="text-xs fill-gray-700 font-medium"
        >
          {task.task_name}
        </text>
      </g>
    )
  }

  return (
    <g
      className="transition-opacity"
      onClick={() => !isDragging && onClick?.(task)}
      onMouseEnter={() => onHover?.(task)}
      onMouseLeave={() => onHover?.(null)}
    >
      <title>{tooltipContent}</title>

      {/* Baseline bar (semi-transparent, behind main bar) */}
      {baselinePosition && (
        <rect
          x={baselinePosition.x}
          y={baselinePosition.y}
          width={Math.max(baselinePosition.width, 4)}
          height={4}
          rx={2}
          ry={2}
          fill={BASELINE_COLOR}
          opacity={0.5}
          className="pointer-events-none"
        />
      )}

      {/* Ghost bar during drag */}
      {isDragging && ghostPosition && (
        <rect
          x={ghostPosition.x}
          y={position.y}
          width={Math.max(ghostPosition.width, 4)}
          height={barHeight}
          rx={4}
          ry={4}
          fill={barColor}
          opacity={0.4}
          strokeDasharray="4 2"
          stroke={barColor}
          strokeWidth={2}
          className="pointer-events-none"
        />
      )}

      {/* Task bar background */}
      <rect
        ref={barRef}
        x={position.x}
        y={position.y}
        width={Math.max(position.width, 4)}
        height={barHeight}
        rx={4}
        ry={4}
        fill={isDragging ? 'transparent' : barColor}
        stroke={isCritical ? CRITICAL_PATH_COLOR : isDragging ? barColor : 'transparent'}
        strokeWidth={isCritical ? 2 : isDragging ? 2 : 0}
        strokeDasharray={isDragging ? '4 2' : 'none'}
        className="transition-all"
        style={{ cursor: isDragging ? getActiveDragCursor(dragMode) : hoverCursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveOnBar}
      />

      {/* Resize handles (visible on hover when enabled) */}
      {config.allow_resize && !isDragging && position.width > 20 && (
        <>
          {/* Left resize handle */}
          <rect
            x={position.x}
            y={position.y}
            width={8}
            height={barHeight}
            fill="transparent"
            className="cursor-ew-resize"
            onMouseDown={handleMouseDown}
          />
          {/* Right resize handle */}
          <rect
            x={position.x + position.width - 8}
            y={position.y}
            width={8}
            height={barHeight}
            fill="transparent"
            className="cursor-ew-resize"
            onMouseDown={handleMouseDown}
          />
        </>
      )}

      {/* Progress bar */}
      {showProgress && task.percent_complete > 0 && task.percent_complete < 100 && !isDragging && (
        <rect
          x={position.x}
          y={position.y}
          width={Math.max(progressWidth, 4)}
          height={barHeight}
          rx={4}
          ry={4}
          fill="rgba(255,255,255,0.3)"
          className="pointer-events-none"
        />
      )}

      {/* Progress stripe pattern for completed portion */}
      {showProgress && task.percent_complete > 0 && !isDragging && (
        <rect
          x={position.x + 2}
          y={position.y + barHeight - 4}
          width={Math.max(progressWidth - 4, 0)}
          height={2}
          rx={1}
          fill="rgba(255,255,255,0.5)"
          className="pointer-events-none"
        />
      )}

      {/* Task name (inside bar if wide enough, otherwise outside) */}
      {!isDragging && (
        position.width > 60 ? (
          <text
            x={position.x + 8}
            y={position.y + barHeight / 2 + 4}
            className="text-xs fill-white font-medium pointer-events-none"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {task.task_name.length > Math.floor(position.width / 8)
              ? task.task_name.slice(0, Math.floor(position.width / 8)) + '...'
              : task.task_name}
          </text>
        ) : (
          <text
            x={position.x + position.width + 8}
            y={position.y + barHeight / 2 + 4}
            className="text-xs fill-gray-700 font-medium pointer-events-none"
          >
            {task.task_name}
          </text>
        )
      )}

      {/* Drag feedback */}
      {isDragging && dragResult && (
        <text
          x={ghostPosition ? ghostPosition.x + ghostPosition.width / 2 : position.x + position.width / 2}
          y={position.y - 8}
          textAnchor="middle"
          className="text-xs fill-gray-700 font-medium pointer-events-none"
        >
          {formatDragFeedback(dragResult, dragMode)}
        </text>
      )}

      {/* Progress percentage */}
      {showProgress && position.width > 40 && !isDragging && (
        <text
          x={position.x + position.width - 8}
          y={position.y + barHeight / 2 + 4}
          textAnchor="end"
          className="text-[10px] fill-white font-medium pointer-events-none"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {task.percent_complete}%
        </text>
      )}

      {/* Variance indicator */}
      {variance && !isDragging && (
        <g transform={`translate(${position.x + position.width + 4}, ${position.y + barHeight / 2})`}>
          {variance.status === 'behind' && (
            <text className="text-[10px] fill-red-500 font-medium">+{variance.days}d</text>
          )}
          {variance.status === 'ahead' && (
            <text className="text-[10px] fill-green-500 font-medium">{variance.days}d</text>
          )}
        </g>
      )}

      {/* Overdue indicator */}
      {isOverdue && !isDragging && (
        <g transform={`translate(${position.x - 16}, ${position.y + barHeight / 2 - 6})`}>
          <AlertTriangle className="text-error" width={12} height={12} />
        </g>
      )}

      {/* Critical path indicator */}
      {isCritical && !isOverdue && !isDragging && (
        <circle
          cx={position.x - 8}
          cy={position.y + barHeight / 2}
          r={4}
          fill={CRITICAL_PATH_COLOR}
        />
      )}
    </g>
  )
}
