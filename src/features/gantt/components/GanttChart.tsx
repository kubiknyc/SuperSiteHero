// File: src/features/gantt/components/GanttChart.tsx
// Main Gantt chart component with drag-and-drop and critical path support
// Enhanced with tablet optimizations for better landscape/portrait viewing

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import {
  DEFAULT_GANTT_CONFIG,
  TODAY_LINE_COLOR,
  type ScheduleItem,
  type TaskDependency,
  type GanttZoomLevel,
  type GanttConfig,
  type GanttTask,
} from '@/types/schedule'
import { GanttToolbar } from './GanttToolbar'
import { GanttTimeline } from './GanttTimeline'
import { GanttTaskBar } from './GanttTaskBar'
import { ResourceHistogram } from './ResourceHistogram'
import { useResourceConflicts } from '../hooks/useResourceConflicts'
import {
  getColumnWidth,
  calculateOptimalDateRange,
  calculateTimelineWidth,
  getDatePosition,
} from '../utils/dateUtils'
import { calculateCriticalPath, type CriticalPathResult } from '../utils/criticalPath'
import { type DragMode, type DragResult } from '../utils/dragUtils'
import { useOrientation, useResponsiveLayout } from '@/hooks/useOrientation'
import { cn } from '@/lib/utils'

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
  onExport?: () => void
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
  onExport,
  hasBaseline = false,
  config: customConfig,
}: GanttChartProps) {
  // Removed 'use no memo' - allowing React Compiler optimizations for better performance
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Tablet/responsive layout hooks
  const layout = useResponsiveLayout()
  const { isTouchDevice, isTablet, isTabletLandscape, isTabletPortrait } = useOrientation()

  // Sidebar collapse state for tablets
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(customConfig?.sidebar_width || DEFAULT_GANTT_CONFIG.sidebar_width)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Auto-collapse sidebar on tablet portrait
  useEffect(() => {
    setTimeout(() => {
      if (isTabletPortrait) {
        setIsSidebarCollapsed(true)
      } else if (isTabletLandscape) {
        setIsSidebarCollapsed(false)
      }
    }, 0)
  }, [isTabletPortrait, isTabletLandscape])

  // Calculate responsive sidebar width based on device
  const responsiveSidebarWidth = useMemo(() => {
    if (isSidebarCollapsed) {return 0}
    if (layout === 'mobile') {return Math.min(sidebarWidth, 200)}
    if (layout === 'tablet-portrait') {return Math.min(sidebarWidth, 220)}
    if (layout === 'tablet-landscape') {return Math.min(sidebarWidth, 280)}
    return sidebarWidth
  }, [layout, isSidebarCollapsed, sidebarWidth])

  // Merge custom config with defaults, applying tablet optimizations
  const config = useMemo(
    () => ({
      ...DEFAULT_GANTT_CONFIG,
      ...customConfig,
      // Override sidebar width for tablets
      sidebar_width: responsiveSidebarWidth,
      // Larger row height on touch devices
      row_height: isTouchDevice
        ? Math.max((customConfig?.row_height || DEFAULT_GANTT_CONFIG.row_height), 48)
        : (customConfig?.row_height || DEFAULT_GANTT_CONFIG.row_height),
      // Larger bar height on touch devices
      bar_height: isTouchDevice
        ? Math.max((customConfig?.bar_height || DEFAULT_GANTT_CONFIG.bar_height), 28)
        : (customConfig?.bar_height || DEFAULT_GANTT_CONFIG.bar_height),
    }),
    [customConfig, responsiveSidebarWidth, isTouchDevice]
  )

  // State
  const [zoomLevel, setZoomLevel] = useState<GanttZoomLevel>(customConfig?.zoom_level || 'week')
  const [scrollX, setScrollX] = useState(0)
  const [hoveredTask, setHoveredTask] = useState<ScheduleItem | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showCriticalPath, setShowCriticalPath] = useState(config.show_critical_path)
  const [showDependencies, setShowDependencies] = useState(config.show_dependencies)
  const [showMilestones, setShowMilestones] = useState(config.show_milestones)
  const [showBaseline, setShowBaseline] = useState(config.show_baseline)
  const [showWeekends, setShowWeekends] = useState(true)
  const [showResources, setShowResources] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    return calculateOptimalDateRange(
      dateRange?.earliest_start || null,
      dateRange?.latest_finish || null,
      14 // 2 weeks padding
    )
  }, [dateRange?.earliest_start, dateRange?.latest_finish])

  // Calculate resource conflicts for histogram
  const resourceAnalysis = useResourceConflicts(items, startDate, endDate, {
    laborCapacityPerDay: 8,
    equipmentCapacityPerDay: 4,
    workHoursPerDay: 8,
  })

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
  }, [scrollToToday]) // Only on mount

  // Drag handlers
  const handleDragStart = useCallback((task: ScheduleItem, _mode: DragMode) => {
    setIsDragging(true)
    setDraggedTaskId(task.id)
  }, [])

  const handleDragMove = useCallback((_task: ScheduleItem, _result: DragResult) => {
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

  // Toggle sidebar collapse (for tablets)
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  // Handle task selection
  const handleTaskSelect = useCallback((task: ScheduleItem) => {
    setSelectedTaskId(task.id)
    onTaskClick?.(task)
  }, [onTaskClick])

  // Handle task double-click to open detail dialog
  const handleTaskDoubleClick = useCallback((task: ScheduleItem) => {
    setSelectedTaskId(task.id)
    onTaskClick?.(task)
  }, [onTaskClick])

  // Handle sidebar resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = sidebarWidth
  }, [sidebarWidth])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) {return}
    const diff = e.clientX - resizeStartX.current
    const newWidth = Math.max(150, Math.min(500, resizeStartWidth.current + diff))
    setSidebarWidth(newWidth)
  }, [isResizing])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add global mouse listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card rounded-lg shadow overflow-hidden",
        // Better touch handling on tablets
        isTouchDevice && "touch-manipulation"
      )}
      data-testid="gantt-chart"
    >
      {/* Toolbar - with tablet optimizations */}
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
        showWeekends={showWeekends}
        onToggleWeekends={() => setShowWeekends(!showWeekends)}
        showResources={showResources}
        onToggleResources={() => setShowResources(!showResources)}
        resourceConflictCount={resourceAnalysis.conflicts.length}
        hasBaseline={hasBaseline}
        onSaveBaseline={onSaveBaseline}
        onClearBaseline={onClearBaseline}
        onImport={onImport}
        onExport={onExport}
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
        data-testid="gantt-container"
      >
        <div className="flex min-h-full">
          {/* Sidebar toggle button for collapsed state on tablets */}
          {isSidebarCollapsed && (isTablet || layout === 'mobile') && (
            <button
              onClick={toggleSidebar}
              className={cn(
                "flex-shrink-0 bg-muted border-r flex items-center justify-center",
                "hover:bg-muted transition-colors",
                isTouchDevice ? "w-12 min-w-touch" : "w-8"
              )}
              title="Show task list"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Sidebar with task names - collapsible on tablets */}
          <div
            className={cn(
              "flex-shrink-0 bg-surface border-r sticky left-0 z-10 transition-all duration-300",
              isSidebarCollapsed && "w-0 overflow-hidden"
            )}
            style={{ width: isSidebarCollapsed ? 0 : config.sidebar_width }}
            data-testid="task-list"
          >
            {/* Collapse button header row for non-collapsed state */}
            {!isSidebarCollapsed && (isTablet || layout === 'mobile') && (
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2 bg-muted border-b",
                  isTouchDevice && "min-h-touch"
                )}
              >
                <span className="text-xs font-medium text-secondary uppercase tracking-wide">Tasks</span>
                <button
                  onClick={toggleSidebar}
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    isTouchDevice && "min-w-touch min-h-touch flex items-center justify-center"
                  )}
                  title="Hide task list"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
            {visibleItems.map((task) => {
              const floatInfo = getFloatInfo(task.id)
              const isSelected = selectedTaskId === task.id
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center px-4 border-b cursor-pointer",
                    "hover:bg-muted transition-colors",
                    hoveredTask?.id === task.id && "bg-blue-50",
                    draggedTaskId === task.id && "bg-warning-light",
                    isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                    // Larger padding on touch devices
                    isTouchDevice && "px-3"
                  )}
                  style={{ height: config.row_height }}
                  onClick={() => handleTaskSelect(task)}
                  onDoubleClick={() => handleTaskDoubleClick(task)}
                  onMouseEnter={() => setHoveredTask(task)}
                  onMouseLeave={() => setHoveredTask(null)}
                  data-state={isSelected ? 'selected' : undefined}
                  aria-selected={isSelected}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {task.is_milestone && (
                        <span className="text-violet-500">◆</span>
                      )}
                      {task.is_critical && showCriticalPath && (
                        <span className="text-error text-xs">●</span>
                      )}
                      <span
                        className={`text-sm font-medium truncate ${
                          task.percent_complete === 100 ? 'text-disabled line-through' : 'text-secondary'
                        }`}
                      >
                        {task.task_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>
                        {format(new Date(task.start_date), 'MMM d')} -{' '}
                        {format(new Date(task.finish_date), 'MMM d')}
                      </span>
                      {floatInfo && floatInfo.totalFloat > 0 && (
                        <span className="text-primary" title="Total Float">
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
                          ? 'text-success'
                          : task.percent_complete > 0
                          ? 'text-primary'
                          : 'text-disabled'
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
              <div className="flex items-center justify-center h-32 text-muted text-sm">
                No tasks to display
              </div>
            )}
          </div>

          {/* Resize handle */}
          {!isSidebarCollapsed && (
            <div
              className={cn(
                "flex-shrink-0 w-1 cursor-col-resize bg-border hover:bg-primary transition-colors",
                isResizing && "bg-primary"
              )}
              onMouseDown={handleResizeStart}
              data-testid="resize-handle"
              title="Drag to resize sidebar"
            />
          )}

          {/* Chart area */}
          <div
            className="flex-1 relative"
            style={{ minWidth: timelineWidth, minHeight: contentHeight }}
            data-testid="gantt-chart-area"
          >
            <svg
              ref={svgRef}
              width={timelineWidth}
              height={Math.max(contentHeight, 200)}
              className="absolute top-0 left-0"
              data-testid="gantt-svg"
            >
              {/* Grid */}
              <g className="grid">{renderGridLines}</g>

              {/* Today line */}
              {config.show_today_line && todayPosition >= 0 && todayPosition <= timelineWidth && (
                <g className="today-line" data-testid="today-indicator">
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
              <g className="dependencies" data-testid="dependency-lines">{renderDependencyLines}</g>

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
                    isSelected={selectedTaskId === task.id}
                    config={config}
                    onClick={handleTaskSelect}
                    onDoubleClick={handleTaskDoubleClick}
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
                  <div className="text-disabled text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-secondary mb-2 heading-subsection">
                    No schedule items yet
                  </h3>
                  <p className="text-sm text-muted">
                    Add tasks to your project schedule or import from MS Project.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Histogram */}
      {showResources && items.length > 0 && (
        <ResourceHistogram
          resourceAnalysis={resourceAnalysis}
          columnWidth={columnWidth}
          height={120}
          laborCapacity={8}
          equipmentCapacity={4}
          showEquipment={true}
          showWeekends={showWeekends}
        />
      )}

      {/* Hover tooltip */}
      {hoveredTask && !isDragging && (
        <div className="absolute bottom-4 right-4 bg-card rounded-lg shadow-lg border p-3 max-w-xs z-50">
          <h4 className="font-medium text-foreground heading-card">{hoveredTask.task_name}</h4>
          <div className="mt-1 text-sm text-secondary space-y-1">
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
              <p className="text-error font-medium">⚠️ Critical Path</p>
            )}
            {hoveredTask.baseline_start_date && hoveredTask.baseline_finish_date && (
              <p className="text-muted text-xs mt-2 pt-2 border-t">
                Baseline: {format(new Date(hoveredTask.baseline_start_date), 'MMM d')} -{' '}
                {format(new Date(hoveredTask.baseline_finish_date), 'MMM d')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
