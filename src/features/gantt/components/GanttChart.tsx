// File: src/features/gantt/components/GanttChart.tsx
// Main Gantt chart component with drag-and-drop and critical path support

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { format, differenceInDays, addDays } from 'date-fns'
import type {
  ScheduleItem,
  TaskDependency,
  GanttZoomLevel,
  GanttConfig,
  GanttTask,
} from '@/types/schedule'
import { DEFAULT_GANTT_CONFIG, TODAY_LINE_COLOR } from '@/types/schedule'
import { GanttToolbar } from './GanttToolbar'
import { GanttTimeline } from './GanttTimeline'
import { GanttTaskBar } from './GanttTaskBar'
import {
  getColumnWidth,
  calculateOptimalDateRange,
  getOptimalZoomLevel,
  calculateTimelineWidth,
  getDatePosition,
} from '../utils/dateUtils'
import { calculateCriticalPath, type CriticalPathResult } from '../utils/criticalPath'
import { type DragMode, type DragResult } from '../utils/dragUtils'

interface GanttChartProps {
  items: ScheduleItem[]
  dependencies: TaskDependency[]
  stats?: {
    total_tasks: number
    completed_tasks: number
    overdue_tasks: number
    critical_tasks: number
    overall_progress: number
  }
  dateRange?: {
    earliest_start: string | null
    latest_finish: string | null
  }
  isLoading?: boolean
  onRefresh?: () => void
  onTaskClick?: (task: ScheduleItem) => void
  onTaskUpdate?: (taskId: string, updates: { start_date: string; finish_date: string; duration_days: number }) => void
  onSaveBaseline?: () => void
  onClearBaseline?: () => void
  onImport?: () => void
  hasBaseline?: boolean
  config?: Partial<GanttConfig>
}

export function GanttChart({
  items,
  dependencies,
  stats,
  dateRange,
  isLoading,
  onRefresh,
  onTaskClick,
  onTaskUpdate,
  onSaveBaseline,
  onClearBaseline,
  onImport,
  hasBaseline = false,
  config: customConfig,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Merge custom config with defaults
  const config = useMemo(
    () => ({ ...DEFAULT_GANTT_CONFIG, ...customConfig }),
    [customConfig]
  )

  // State
  const [zoomLevel, setZoomLevel] = useState<GanttZoomLevel>('week')
  const [scrollX, setScrollX] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [hoveredTask, setHoveredTask] = useState<ScheduleItem | null>(null)
  const [showCriticalPath, setShowCriticalPath] = useState(config.show_critical_path)
  const [showDependencies, setShowDependencies] = useState(config.show_dependencies)
  const [showMilestones, setShowMilestones] = useState(config.show_milestones)
  const [showBaseline, setShowBaseline] = useState(config.show_baseline)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const range = calculateOptimalDateRange(
      dateRange?.earliest_start || null,
      dateRange?.latest_finish || null,
      14 // 2 weeks padding
    )

    // Auto-select optimal zoom level based on date range
    const optimalZoom = getOptimalZoomLevel(range.startDate, range.endDate)
    if (optimalZoom !== zoomLevel && !customConfig?.zoom_level) {
      setZoomLevel(optimalZoom)
    }

    return range
  }, [dateRange, customConfig?.zoom_level])

  // Calculate critical path
  const criticalPathResult = useMemo((): CriticalPathResult | null => {
    if (items.length === 0) {return null}

    // Convert ScheduleItems to GanttTasks for critical path calculation
    const ganttTasks: GanttTask[] = items.map(item => ({
      ...item,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      progress_width: 0,
      level: 0,
      parent_id: null,
      children: [],
      is_expanded: true,
      dependencies: [],
      computed_status: 'not_started',
      days_remaining: 0,
      is_overdue: false,
    }))

    return calculateCriticalPath(ganttTasks, dependencies)
  }, [items, dependencies])

  // Merge critical path info with items
  const itemsWithCriticalPath = useMemo(() => {
    if (!criticalPathResult) {return items}

    return items.map(item => {
      const node = criticalPathResult.nodes.get(item.id)
      return {
        ...item,
        is_critical: node?.isCritical ?? item.is_critical,
      }
    })
  }, [items, criticalPathResult])

  // Calculate dimensions
  const columnWidth = getColumnWidth(zoomLevel)
  const timelineWidth = calculateTimelineWidth(startDate, endDate, zoomLevel)
  const contentHeight = items.length * config.row_height

  // Sort items by start date
  const sortedItems = useMemo(() => {
    return [...itemsWithCriticalPath].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime()
      const dateB = new Date(b.start_date).getTime()
      return dateA - dateB
    })
  }, [itemsWithCriticalPath])

  // Filter milestones if needed
  const visibleItems = useMemo(() => {
    if (!showMilestones) {
      return sortedItems.filter((item) => !item.is_milestone)
    }
    return sortedItems
  }, [sortedItems, showMilestones])

  // Today line position
  const todayPosition = useMemo(() => {
    const today = new Date()
    return getDatePosition(today, startDate, zoomLevel, columnWidth)
  }, [startDate, zoomLevel, columnWidth])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollX(target.scrollLeft)
    setScrollY(target.scrollTop)
  }, [])

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - config.sidebar_width
      const scrollTo = Math.max(0, todayPosition - containerWidth / 2)
      containerRef.current.scrollLeft = scrollTo
    }
  }, [todayPosition, config.sidebar_width])

  // Scroll left/right
  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft -= columnWidth * 5
    }
  }, [columnWidth])

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += columnWidth * 5
    }
  }, [columnWidth])

  // Initial scroll to today
  useEffect(() => {
    scrollToToday()
  }, []) // Only on mount

  // Drag handlers
  const handleDragStart = useCallback((task: ScheduleItem, mode: DragMode) => {
    setIsDragging(true)
    setDraggedTaskId(task.id)
  }, [])

  const handleDragMove = useCallback((task: ScheduleItem, result: DragResult) => {
    // Could show preview or update UI during drag
  }, [])

  const handleDragEnd = useCallback((task: ScheduleItem, result: DragResult) => {
    setIsDragging(false)
    setDraggedTaskId(null)

    // Only update if there was an actual change
    if (result.daysChanged !== 0) {
      onTaskUpdate?.(task.id, {
        start_date: result.newStartDate,
        finish_date: result.newFinishDate,
        duration_days: result.newDuration,
      })
    }
  }, [onTaskUpdate])

  // Render dependency lines
  const renderDependencyLines = useMemo(() => {
    if (!showDependencies || dependencies.length === 0) {return null}

    return dependencies.map((dep) => {
      const predecessorIndex = visibleItems.findIndex((i) => i.id === dep.predecessor_id)
      const successorIndex = visibleItems.findIndex((i) => i.id === dep.successor_id)

      if (predecessorIndex === -1 || successorIndex === -1) {return null}

      const predecessor = visibleItems[predecessorIndex]
      const successor = visibleItems[successorIndex]

      // Check if either task is on the critical path
      const isCriticalDep = predecessor.is_critical && successor.is_critical && showCriticalPath

      // Calculate line coordinates
      const predEndX = getDatePosition(
        new Date(predecessor.finish_date),
        startDate,
        zoomLevel,
        columnWidth
      )
      const predY = predecessorIndex * config.row_height + config.row_height / 2

      const succStartX = getDatePosition(
        new Date(successor.start_date),
        startDate,
        zoomLevel,
        columnWidth
      )
      const succY = successorIndex * config.row_height + config.row_height / 2

      // Create path for dependency arrow
      const midX = (predEndX + succStartX) / 2
      const path = `
        M ${predEndX} ${predY}
        L ${midX} ${predY}
        L ${midX} ${succY}
        L ${succStartX - 8} ${succY}
      `

      const strokeColor = isCriticalDep ? '#dc2626' : '#6b7280'

      return (
        <g key={dep.id} className="dependency-line">
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isCriticalDep ? 2 : 1.5}
            strokeDasharray={dep.dependency_type !== 'FS' ? '4,4' : 'none'}
          />
          {/* Arrow head */}
          <polygon
            points={`
              ${succStartX - 8},${succY - 4}
              ${succStartX},${succY}
              ${succStartX - 8},${succY + 4}
            `}
            fill={strokeColor}
          />
        </g>
      )
    })
  }, [showDependencies, dependencies, visibleItems, startDate, zoomLevel, columnWidth, config.row_height, showCriticalPath])

  // Render grid lines
  const renderGridLines = useMemo(() => {
    const lines: JSX.Element[] = []
    const numColumns = Math.ceil(timelineWidth / columnWidth)

    // Vertical grid lines
    for (let i = 0; i <= numColumns; i++) {
      const x = i * columnWidth
      lines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={contentHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      )
    }

    // Horizontal grid lines
    for (let i = 0; i <= visibleItems.length; i++) {
      const y = i * config.row_height
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={timelineWidth}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      )
    }

    return lines
  }, [timelineWidth, contentHeight, columnWidth, visibleItems.length, config.row_height])

  // Get float info for tooltip
  const getFloatInfo = useCallback((taskId: string) => {
    if (!criticalPathResult) {return null}
    const node = criticalPathResult.nodes.get(taskId)
    if (!node) {return null}
    return {
      totalFloat: node.totalFloat,
      freeFloat: node.freeFloat,
    }
  }, [criticalPathResult])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Toolbar */}
      <GanttToolbar
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onScrollToToday={scrollToToday}
        onRefresh={onRefresh || (() => {})}
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
        showDependencies={showDependencies}
        onToggleDependencies={() => setShowDependencies(!showDependencies)}
        showMilestones={showMilestones}
        onToggleMilestones={() => setShowMilestones(!showMilestones)}
        showBaseline={showBaseline}
        onToggleBaseline={() => setShowBaseline(!showBaseline)}
        hasBaseline={hasBaseline}
        onSaveBaseline={onSaveBaseline}
        onClearBaseline={onClearBaseline}
        onImport={onImport}
        stats={stats}
        isLoading={isLoading}
        criticalPathInfo={criticalPathResult ? {
          tasksCount: criticalPathResult.criticalPath.length,
          projectDuration: criticalPathResult.projectDuration,
        } : undefined}
      />

      {/* Timeline Header */}
      <GanttTimeline
        startDate={startDate}
        endDate={endDate}
        zoomLevel={zoomLevel}
        sidebarWidth={config.sidebar_width}
        headerHeight={config.header_height}
        scrollX={scrollX}
      />

      {/* Main content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onScroll={handleScroll}
      >
        <div className="flex min-h-full">
          {/* Sidebar with task names */}
          <div
            className="flex-shrink-0 bg-gray-50 border-r sticky left-0 z-10"
            style={{ width: config.sidebar_width }}
          >
            {visibleItems.map((task, index) => {
              const floatInfo = getFloatInfo(task.id)
              return (
                <div
                  key={task.id}
                  className={`
                    flex items-center px-4 border-b cursor-pointer
                    hover:bg-gray-100 transition-colors
                    ${hoveredTask?.id === task.id ? 'bg-blue-50' : ''}
                    ${draggedTaskId === task.id ? 'bg-yellow-50' : ''}
                  `}
                  style={{ height: config.row_height }}
                  onClick={() => onTaskClick?.(task)}
                  onMouseEnter={() => setHoveredTask(task)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {task.is_milestone && (
                        <span className="text-violet-500">◆</span>
                      )}
                      {task.is_critical && showCriticalPath && (
                        <span className="text-red-500 text-xs">●</span>
                      )}
                      <span
                        className={`text-sm font-medium truncate ${
                          task.percent_complete === 100 ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                      >
                        {task.task_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>
                        {format(new Date(task.start_date), 'MMM d')} -{' '}
                        {format(new Date(task.finish_date), 'MMM d')}
                      </span>
                      {floatInfo && floatInfo.totalFloat > 0 && (
                        <span className="text-blue-500" title="Total Float">
                          +{floatInfo.totalFloat}d
                        </span>
                      )}
                      {task.assigned_to && (
                        <>
                          <span>•</span>
                          <span className="truncate">{task.assigned_to}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span
                      className={`text-xs font-medium ${
                        task.percent_complete === 100
                          ? 'text-green-600'
                          : task.percent_complete > 0
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {task.percent_complete}%
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Empty state in sidebar */}
            {visibleItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No tasks to display
              </div>
            )}
          </div>

          {/* Chart area */}
          <div
            className="flex-1 relative"
            style={{ minWidth: timelineWidth, minHeight: contentHeight }}
          >
            <svg
              ref={svgRef}
              width={timelineWidth}
              height={Math.max(contentHeight, 200)}
              className="absolute top-0 left-0"
            >
              {/* Grid */}
              <g className="grid">{renderGridLines}</g>

              {/* Today line */}
              {config.show_today_line && todayPosition >= 0 && todayPosition <= timelineWidth && (
                <g className="today-line">
                  <line
                    x1={todayPosition}
                    y1={0}
                    x2={todayPosition}
                    y2={contentHeight}
                    stroke={TODAY_LINE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                  <circle cx={todayPosition} cy={0} r={6} fill={TODAY_LINE_COLOR} />
                  <text
                    x={todayPosition + 10}
                    y={14}
                    className="text-xs fill-orange-600 font-medium"
                  >
                    Today
                  </text>
                </g>
              )}

              {/* Dependency lines */}
              <g className="dependencies">{renderDependencyLines}</g>

              {/* Task bars */}
              <g className="tasks">
                {visibleItems.map((task, index) => (
                  <GanttTaskBar
                    key={task.id}
                    task={task}
                    timelineStartDate={startDate}
                    zoomLevel={zoomLevel}
                    rowIndex={index}
                    rowHeight={config.row_height}
                    barHeight={config.bar_height}
                    showProgress={config.show_progress}
                    showCriticalPath={showCriticalPath}
                    showBaseline={showBaseline}
                    config={config}
                    onClick={onTaskClick}
                    onHover={setHoveredTask}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </g>
            </svg>

            {/* Empty state */}
            {visibleItems.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    No schedule items yet
                  </h3>
                  <p className="text-sm text-gray-500">
                    Add tasks to your project schedule or import from MS Project.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTask && !isDragging && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs z-50">
          <h4 className="font-medium text-gray-900">{hoveredTask.task_name}</h4>
          <div className="mt-1 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Dates:</span>{' '}
              {format(new Date(hoveredTask.start_date), 'MMM d')} -{' '}
              {format(new Date(hoveredTask.finish_date), 'MMM d, yyyy')}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {hoveredTask.duration_days} days
            </p>
            <p>
              <span className="font-medium">Progress:</span> {hoveredTask.percent_complete}%
            </p>
            {hoveredTask.assigned_to && (
              <p>
                <span className="font-medium">Assigned:</span> {hoveredTask.assigned_to}
              </p>
            )}
            {(() => {
              const floatInfo = getFloatInfo(hoveredTask.id)
              if (floatInfo) {
                return (
                  <>
                    <p>
                      <span className="font-medium">Total Float:</span> {floatInfo.totalFloat} days
                    </p>
                    <p>
                      <span className="font-medium">Free Float:</span> {floatInfo.freeFloat} days
                    </p>
                  </>
                )
              }
              return null
            })()}
            {hoveredTask.is_critical && (
              <p className="text-red-600 font-medium">⚠️ Critical Path</p>
            )}
            {hoveredTask.baseline_start_date && (
              <p className="text-gray-500 text-xs mt-2 pt-2 border-t">
                Baseline: {format(new Date(hoveredTask.baseline_start_date), 'MMM d')} -{' '}
                {format(new Date(hoveredTask.baseline_finish_date!), 'MMM d')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
