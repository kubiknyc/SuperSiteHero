// File: src/features/gantt/components/GanttToolbar.tsx
// Toolbar component for Gantt chart controls with baseline and import support

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ZoomIn,
  ZoomOut,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Milestone,
  GitBranch,
  AlertTriangle,
  Target,
  Upload,
  Download,
  Save,
  Trash2,
  MoreVertical,
  Clock,
} from 'lucide-react'
import type { GanttZoomLevel } from '@/types/schedule'

interface GanttToolbarProps {
  zoomLevel: GanttZoomLevel
  onZoomChange: (level: GanttZoomLevel) => void
  onScrollToToday: () => void
  onRefresh: () => void
  onScrollLeft: () => void
  onScrollRight: () => void
  showCriticalPath: boolean
  onToggleCriticalPath: () => void
  showDependencies: boolean
  onToggleDependencies: () => void
  showMilestones: boolean
  onToggleMilestones: () => void
  showBaseline?: boolean
  onToggleBaseline?: () => void
  hasBaseline?: boolean
  onSaveBaseline?: () => void
  onClearBaseline?: () => void
  onImport?: () => void
  onExport?: () => void
  stats?: {
    total_tasks: number
    completed_tasks: number
    overdue_tasks: number
    critical_tasks: number
    overall_progress: number
  }
  criticalPathInfo?: {
    tasksCount: number
    projectDuration: number
  }
  isLoading?: boolean
}

const ZOOM_LEVELS: GanttZoomLevel[] = ['day', 'week', 'month', 'quarter']

export function GanttToolbar({
  zoomLevel,
  onZoomChange,
  onScrollToToday,
  onRefresh,
  onScrollLeft,
  onScrollRight,
  showCriticalPath,
  onToggleCriticalPath,
  showDependencies,
  onToggleDependencies,
  showMilestones,
  onToggleMilestones,
  showBaseline = false,
  onToggleBaseline,
  hasBaseline = false,
  onSaveBaseline,
  onClearBaseline,
  onImport,
  onExport,
  stats,
  criticalPathInfo,
  isLoading,
}: GanttToolbarProps) {
  const currentZoomIndex = ZOOM_LEVELS.indexOf(zoomLevel)

  const handleZoomIn = () => {
    if (currentZoomIndex > 0) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex - 1])
    }
  }

  const handleZoomOut = () => {
    if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex + 1])
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-card border-b" data-testid="gantt-toolbar">
      {/* Left: Navigation & Zoom */}
      <div className="flex items-center gap-2">
        {/* Navigation */}
        <div className="flex items-center border rounded-md" data-testid="gantt-navigation">
          <Button
            variant="ghost"
            size="sm"
            onClick={onScrollLeft}
            className="rounded-r-none"
            title="Scroll left"
            aria-label="pan left"
            data-testid="pan-left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onScrollToToday}
            className="rounded-none border-x"
            title="Go to today"
            data-testid="go-to-today"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onScrollRight}
            className="rounded-l-none"
            title="Scroll right"
            aria-label="pan right"
            data-testid="pan-right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View switcher buttons */}
        <div className="flex items-center border rounded-md" data-testid="view-switcher">
          <Button
            variant={zoomLevel === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onZoomChange('day')}
            className="rounded-r-none"
            data-testid="view-day"
          >
            Day
          </Button>
          <Button
            variant={zoomLevel === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onZoomChange('week')}
            className="rounded-none border-x"
            data-testid="view-week"
          >
            Week
          </Button>
          <Button
            variant={zoomLevel === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onZoomChange('month')}
            className="rounded-l-none"
            data-testid="view-month"
          >
            Month
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center border rounded-md" data-testid="zoom-controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={currentZoomIndex === 0}
            className="rounded-r-none"
            title="Zoom in"
            aria-label="zoom in"
            data-testid="zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium capitalize border-x" data-testid="zoom-level">
            {zoomLevel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={currentZoomIndex === ZOOM_LEVELS.length - 1}
            className="rounded-l-none"
            title="Zoom out"
            aria-label="zoom out"
            data-testid="zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh data"
          data-testid="refresh-schedule"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Center: Toggle buttons */}
      <div className="flex items-center gap-2" data-testid="gantt-toggles">
        <Button
          variant={showCriticalPath ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCriticalPath}
          title="Toggle critical path"
          data-testid="toggle-critical-path"
          aria-pressed={showCriticalPath}
          className={showCriticalPath ? 'bg-error hover:bg-red-700' : ''}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Critical Path
          {criticalPathInfo && showCriticalPath && (
            <Badge variant="secondary" className="ml-1 bg-red-500/20 text-white text-[10px]">
              {criticalPathInfo.tasksCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={showDependencies ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleDependencies}
          title="Toggle dependencies"
          data-testid="toggle-dependencies"
          aria-pressed={showDependencies}
        >
          <GitBranch className="h-4 w-4 mr-1" />
          Dependencies
        </Button>

        <Button
          variant={showMilestones ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleMilestones}
          title="Toggle milestones"
          data-testid="toggle-milestones"
          aria-pressed={showMilestones}
        >
          <Milestone className="h-4 w-4 mr-1" />
          Milestones
        </Button>

        {/* Baseline toggle */}
        {onToggleBaseline && (
          <Button
            variant={showBaseline ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleBaseline}
            disabled={!hasBaseline}
            title={hasBaseline ? 'Toggle baseline comparison' : 'No baseline saved'}
            data-testid="toggle-baseline"
            aria-pressed={showBaseline}
            className={showBaseline ? 'bg-gray-600 hover:bg-gray-700' : ''}
          >
            <Target className="h-4 w-4 mr-1" />
            Baseline
          </Button>
        )}

        {/* Baseline/Import menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onSaveBaseline && (
              <DropdownMenuItem onClick={onSaveBaseline}>
                <Save className="h-4 w-4 mr-2" />
                Save Baseline
              </DropdownMenuItem>
            )}
            {onClearBaseline && hasBaseline && (
              <DropdownMenuItem onClick={onClearBaseline} className="text-error">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Baseline
              </DropdownMenuItem>
            )}
            {(onSaveBaseline || onClearBaseline) && (onImport || onExport) && <DropdownMenuSeparator />}
            {onImport && (
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import from MS Project
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={onExport} data-testid="export-schedule">
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export button (visible when export is available) */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            title="Export schedule"
            data-testid="export-button"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-3">
        {/* Project duration from critical path */}
        {criticalPathInfo && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-disabled" />
            <span className="text-sm text-muted">
              {criticalPathInfo.projectDuration} days
            </span>
          </div>
        )}

        {stats && (
          <>
            <div className="h-4 border-l border-input" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Progress:</span>
              <Badge
                variant="outline"
                className={
                  stats.overall_progress >= 75
                    ? 'bg-success-light text-success-dark border-green-200'
                    : stats.overall_progress >= 50
                    ? 'bg-blue-50 text-primary-hover border-blue-200'
                    : stats.overall_progress >= 25
                    ? 'bg-warning-light text-yellow-700 border-yellow-200'
                    : 'bg-surface text-secondary border-border'
                }
              >
                {stats.overall_progress}%
              </Badge>
            </div>

            <div className="h-4 border-l border-input" />

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">Tasks:</span>
              <span className="font-medium">
                {stats.completed_tasks}/{stats.total_tasks}
              </span>
            </div>

            {stats.overdue_tasks > 0 && (
              <>
                <div className="h-4 border-l border-input" />
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.overdue_tasks} overdue
                </Badge>
              </>
            )}

            {stats.critical_tasks > 0 && (
              <>
                <div className="h-4 border-l border-input" />
                <Badge variant="outline" className="bg-error-light text-error-dark border-red-200">
                  {stats.critical_tasks} critical
                </Badge>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
