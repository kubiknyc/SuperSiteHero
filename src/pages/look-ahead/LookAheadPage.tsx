/**
 * Look-Ahead Planning Page
 * 3-week rolling schedule view with drag-and-drop
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Camera,
  BarChart3,
  Settings,
  HardHat,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  downloadLookAheadAsPDF,
  downloadLookAheadAsExcel,
  downloadLookAheadAsCSV,
} from '@/features/look-ahead/utils/export'
import {
  useActivitiesByWeek,
  useCreateActivity,
  useUpdateActivity,
  useMoveActivityToWeek,
  useUpdateActivityStatus,
  useDeleteActivity,
  useActivityConstraints,
  useCreateConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
  usePPCMetrics,
} from '@/features/look-ahead/hooks'
import {
  WeekColumn,
  ActivityDetailDialog,
  LookAheadStats,
  PPCBadge,
} from '@/features/look-ahead/components'
import { AtRiskActivitiesPanel } from '@/features/analytics/components/risk-prediction/AtRiskActivitiesPanel'
import { ScheduleOptimizationPanel } from '@/features/analytics/components/schedule-optimization/ScheduleOptimizationPanel'
import {
  type LookAheadActivityWithDetails,
  type LookAheadActivityStatus,
  type CreateLookAheadActivityDTO,
  type UpdateLookAheadActivityDTO,
  type CreateLookAheadConstraintDTO,
  type LookAheadActivityFilters,
  CONSTRUCTION_TRADES,
  ACTIVITY_STATUS_CONFIG,
  filterActivities,
} from '@/types/look-ahead'
import { useProject } from '@/features/projects/hooks/useProjects'
import { logger } from '../../lib/utils/logger';


export function LookAheadPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // State
  const [baseDate, setBaseDate] = useState(new Date())
  const [selectedActivity, setSelectedActivity] = useState<LookAheadActivityWithDetails | null>(null)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [newActivityWeek, setNewActivityWeek] = useState<{ number: number; startDate: string } | null>(null)
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null)
  const [filters, setFilters] = useState<LookAheadActivityFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)

  // Queries
  const {
    data: weekData,
    isLoading,
    refetch,
  } = useActivitiesByWeek(projectId, baseDate)

  const { data: ppcMetrics } = usePPCMetrics(projectId)

  const { data: activityConstraints } = useActivityConstraints(selectedActivity?.id)

  // Get project info for export
  const { data: project } = useProject(projectId)

  // Mutations
  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const moveActivity = useMoveActivityToWeek()
  const updateStatus = useUpdateActivityStatus()
  const deleteActivity = useDeleteActivity()
  const createConstraint = useCreateConstraint()
  const updateConstraint = useUpdateConstraint()
  const deleteConstraint = useDeleteConstraint()

  // All activities combined for export
  const allActivities = useMemo(() => {
    if (!weekData?.activities) {return []}
    return [
      ...(weekData.activities[1] || []),
      ...(weekData.activities[2] || []),
      ...(weekData.activities[3] || []),
    ]
  }, [weekData?.activities])

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (!weekData?.activities) {return { 1: [], 2: [], 3: [] }}

    const withSearch = { ...filters, search: searchQuery }

    return {
      1: filterActivities(weekData.activities[1] || [], withSearch),
      2: filterActivities(weekData.activities[2] || [], withSearch),
      3: filterActivities(weekData.activities[3] || [], withSearch),
    }
  }, [weekData?.activities, filters, searchQuery])

  // Export handlers
  const handleExportPDF = async () => {
    if (allActivities.length === 0) {
      toast.error('No activities to export')
      return
    }

    setIsExporting('pdf')
    try {
      await downloadLookAheadAsPDF(
        allActivities,
        project?.name || 'Project',
        ppcMetrics || undefined
      )
      toast.success('PDF exported successfully')
    } catch (error) {
      logger.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportExcel = async () => {
    if (allActivities.length === 0) {
      toast.error('No activities to export')
      return
    }

    setIsExporting('excel')
    try {
      await downloadLookAheadAsExcel(
        allActivities,
        project?.name || 'Project',
        ppcMetrics || undefined
      )
      toast.success('Excel file exported successfully')
    } catch (error) {
      logger.error('Excel export error:', error)
      toast.error('Failed to export Excel file')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportCSV = () => {
    if (allActivities.length === 0) {
      toast.error('No activities to export')
      return
    }

    setIsExporting('csv')
    try {
      downloadLookAheadAsCSV(
        allActivities,
        project?.name || 'Project',
        ppcMetrics || undefined
      )
      toast.success('CSV exported successfully')
    } catch (error) {
      logger.error('CSV export error:', error)
      toast.error('Failed to export CSV')
    } finally {
      setIsExporting(null)
    }
  }

  // Print view handler
  const handlePrintView = () => {
    setIsPrintMode(true)
    // Wait for state update and then print
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 100)
  }

  // Handlers
  const handleAddActivity = (weekNumber: number, weekStartDate: string) => {
    setNewActivityWeek({ number: weekNumber, startDate: weekStartDate })
    setSelectedActivity(null)
    setShowActivityDialog(true)
  }

  const handleEditActivity = (activity: LookAheadActivityWithDetails) => {
    setSelectedActivity(activity)
    setNewActivityWeek(null)
    setShowActivityDialog(true)
  }

  const handleSaveActivity = async (dto: CreateLookAheadActivityDTO | UpdateLookAheadActivityDTO) => {
    try {
      if (selectedActivity) {
        await updateActivity.mutateAsync({
          activityId: selectedActivity.id,
          dto: dto as UpdateLookAheadActivityDTO,
        })
        toast.success('Activity updated')
      } else {
        await createActivity.mutateAsync(dto as CreateLookAheadActivityDTO)
        toast.success('Activity created')
      }
      setShowActivityDialog(false)
      setSelectedActivity(null)
      setNewActivityWeek(null)
    } catch (_error) {
      toast.error('Failed to save activity')
    }
  }

  const handleStatusChange = async (activityId: string, status: LookAheadActivityStatus) => {
    try {
      await updateStatus.mutateAsync({
        activityId,
        status,
      })
      toast.success(`Activity marked as ${status.replace('_', ' ')}`)
    } catch (_error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) {return}

    try {
      await deleteActivity.mutateAsync({
        activityId,
        projectId: projectId!,
      })
      toast.success('Activity deleted')
    } catch (_error) {
      toast.error('Failed to delete activity')
    }
  }

  const handleDrop = async (activityId: string, weekNumber: number, weekStartDate: string) => {
    try {
      await moveActivity.mutateAsync({
        activityId,
        weekNumber,
        weekStartDate,
      })
      toast.success(`Activity moved to Week ${weekNumber}`)
    } catch (_error) {
      toast.error('Failed to move activity')
    }
    setDraggedActivityId(null)
  }

  const handleAddConstraint = async (dto: CreateLookAheadConstraintDTO) => {
    try {
      await createConstraint.mutateAsync({
        dto,
        projectId: projectId!,
      })
      toast.success('Constraint added')
    } catch (_error) {
      toast.error('Failed to add constraint')
    }
  }

  const handleResolveConstraint = async (constraintId: string, notes?: string) => {
    try {
      await updateConstraint.mutateAsync({
        constraintId,
        dto: { status: 'resolved', resolution_notes: notes },
        activityId: selectedActivity!.id,
      })
      toast.success('Constraint resolved')
    } catch (_error) {
      toast.error('Failed to resolve constraint')
    }
  }

  const handleDeleteConstraint = async (constraintId: string) => {
    try {
      await deleteConstraint.mutateAsync({
        constraintId,
        activityId: selectedActivity!.id,
      })
      toast.success('Constraint deleted')
    } catch (_error) {
      toast.error('Failed to delete constraint')
    }
  }

  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(baseDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setBaseDate(newDate)
  }

  const handleResetToCurrentWeek = () => {
    setBaseDate(new Date())
  }

  // Count blocked activities
  const blockedCount = useMemo(() => {
    if (!weekData?.activities) {return 0}
    return Object.values(weekData.activities)
      .flat()
      .filter((a) => a.status === 'blocked').length
  }, [weekData?.activities])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[600px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
              <Calendar className="h-6 w-6" />
              Look-Ahead Schedule
            </h1>
            <p className="text-muted-foreground text-sm">3-week rolling schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ppcMetrics && (
            <PPCBadge
              ppc={ppcMetrics.currentWeekPPC}
              showTrend
              trend={ppcMetrics.trend}
            />
          )}
          {blockedCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {blockedCount} blocked
            </Badge>
          )}
          <Link to={`/projects/${projectId}/look-ahead/snapshots`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              PPC History
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PPC Stats */}
      {ppcMetrics && (
        <LookAheadStats metrics={ppcMetrics} />
      )}

      {/* AI Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projectId && (
          <>
            <AtRiskActivitiesPanel projectId={projectId} />
            <ScheduleOptimizationPanel projectId={projectId} />
          </>
        )}
      </div>

      {/* Filters & Navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleWeekNavigation('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleResetToCurrentWeek}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleWeekNavigation('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={filters.trades?.[0] || 'all'}
            onValueChange={(v) =>
              setFilters({ ...filters, trades: v === 'all' ? undefined : [v] })
            }
          >
            <SelectTrigger className="w-[150px]">
              <HardHat className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {CONSTRUCTION_TRADES.map((trade) => (
                <SelectItem key={trade} value={trade}>
                  {trade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.statuses?.[0] || 'all'}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                statuses: v === 'all' ? undefined : [v as LookAheadActivityStatus],
              })
            }
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(ACTIVITY_STATUS_CONFIG).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting !== null}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
                {isExporting === 'pdf' && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting !== null}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
                {isExporting === 'excel' && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                Export to CSV
                {isExporting === 'csv' && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintView}>
                <Printer className="h-4 w-4 mr-2" />
                Print 4-Week View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                Import from P6
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Camera className="h-4 w-4 mr-2" />
                Create Snapshot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3-Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weekData?.weeks.map((week) => (
          <WeekColumn
            key={week.weekNumber}
            week={week}
            activities={filteredActivities[week.weekNumber as 1 | 2 | 3] || []}
            onAddActivity={handleAddActivity}
            onEditActivity={handleEditActivity}
            onStatusChange={handleStatusChange}
            onDeleteActivity={handleDeleteActivity}
            onDragStart={setDraggedActivityId}
            onDragEnd={() => setDraggedActivityId(null)}
            onDrop={handleDrop}
            isDragTarget={draggedActivityId !== null}
            maxHeight="calc(100vh - 400px)"
          />
        ))}
      </div>

      {/* Activity Detail Dialog */}
      <ActivityDetailDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        activity={selectedActivity}
        projectId={projectId!}
        weekNumber={newActivityWeek?.number || selectedActivity?.week_number || 1}
        weekStartDate={newActivityWeek?.startDate || selectedActivity?.week_start_date || undefined}
        constraints={activityConstraints || []}
        onSave={handleSaveActivity}
        onAddConstraint={handleAddConstraint}
        onResolveConstraint={handleResolveConstraint}
        onDeleteConstraint={handleDeleteConstraint}
        isLoading={createActivity.isPending || updateActivity.isPending}
      />
    </div>
  )
}

export default LookAheadPage
