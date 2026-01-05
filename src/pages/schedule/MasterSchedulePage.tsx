/**
 * Master Schedule Page
 * Full-featured project schedule with Gantt chart, using schedule_activities schema
 */

import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Download,
  Upload,
  Settings,
  Calendar,
  Target,
  AlertTriangle,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  History,
  ArrowRight,
  Printer,
} from 'lucide-react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { GanttChart } from '@/features/gantt/components/GanttChart'
import {
  ScheduleImportDialog,
  ScheduleExportDialog,
  ActivityDetailPanel,
  ActivityFormDialog,
  BaselineSelector,
  BaselineComparisonView,
  ImportHistoryList,
  LookAheadSyncDialog,
  LookAheadPrintView,
} from '@/features/schedule/components'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import {
  useMasterScheduleData,
  useUpdateScheduleActivity,
  useUpdateScheduleActivityWithNotification,
  useCreateScheduleActivityWithNotification,
  useCreateBaselineWithNotification,
  useSetActiveBaseline,
  useClearBaseline,
} from '@/features/schedule/hooks'
import {
  mapActivitiesToScheduleItems,
  mapDependenciesToTaskDependencies,
  calculateActivityDateRange,
} from '@/features/schedule/utils/activityAdapter'
import { exportScheduleToPdf } from '@/features/schedule/utils/schedulePdfExport'
import type { ScheduleItem } from '@/types/schedule'
import type { ScheduleActivity, ScheduleBaseline, CreateScheduleActivityDTO, UpdateScheduleActivityDTO } from '@/types/schedule-activities'
import { logger } from '../../lib/utils/logger';


export function MasterSchedulePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useProject(projectId)

  // Fetch schedule data using new hooks
  const {
    activities,
    dependencies,
    stats,
    baselines,
    hasBaseline,
    activeBaseline: _activeBaseline,
    isLoading,
    refetch,
  } = useMasterScheduleData(projectId)

  // Mutations
  const updateActivity = useUpdateScheduleActivity()
  const updateActivityWithNotification = useUpdateScheduleActivityWithNotification()
  const createActivityWithNotification = useCreateScheduleActivityWithNotification()
  const createBaseline = useCreateBaselineWithNotification()
  const setActiveBaseline = useSetActiveBaseline()
  const clearBaseline = useClearBaseline()

  // State
  const [selectedActivity, setSelectedActivity] = useState<ScheduleActivity | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ScheduleActivity | null>(null)
  const [isSavingBaseline, setIsSavingBaseline] = useState(false)
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | null>(null)
  const [showComparisonView, setShowComparisonView] = useState(false)
  const [showImportHistory, setShowImportHistory] = useState(false)
  const [showLookAheadSync, setShowLookAheadSync] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showLookAheadPrint, setShowLookAheadPrint] = useState(false)

  // Map activities to GanttChart format
  const scheduleItems = useMemo(
    () => mapActivitiesToScheduleItems(activities),
    [activities]
  )

  const taskDependencies = useMemo(
    () => mapDependenciesToTaskDependencies(dependencies),
    [dependencies]
  )

  const dateRange = useMemo(
    () => calculateActivityDateRange(activities),
    [activities]
  )

  // Map stats to format expected by GanttChart
  const ganttStats = useMemo(() => {
    if (!stats) {return undefined}
    return {
      total_tasks: stats.total_activities,
      completed_tasks: stats.completed_activities,
      overdue_tasks: stats.overdue_activities,
      critical_tasks: stats.critical_activities,
      overall_progress: stats.overall_progress,
    }
  }, [stats])

  // Handle task click - find original activity
  const handleTaskClick = useCallback(
    (task: ScheduleItem) => {
      const activity = activities.find((a) => a.id === task.id)
      if (activity) {
        setSelectedActivity(activity)
      }
    },
    [activities]
  )

  // Handle task update from drag-drop
  const handleTaskUpdate = useCallback(
    async (
      taskId: string,
      updates: { start_date: string; finish_date: string; duration_days: number }
    ) => {
      try {
        await updateActivity.mutateAsync({
          activityId: taskId,
          updates: {
            planned_start: updates.start_date,
            planned_finish: updates.finish_date,
            planned_duration: updates.duration_days,
          },
        })
      } catch (error) {
        logger.error('Failed to update activity:', error)
      }
    },
    [updateActivity]
  )

  // Handle save baseline
  const handleSaveBaseline = useCallback(async () => {
    if (!projectId) {return}

    setIsSavingBaseline(true)
    try {
      const baselineNumber = baselines.length + 1
      await createBaseline.mutateAsync({
        project_id: projectId,
        name: `Baseline ${baselineNumber}`,
        description: `Saved on ${new Date().toLocaleDateString()}`,
      })
      await refetch()
    } finally {
      setIsSavingBaseline(false)
    }
  }, [projectId, baselines.length, createBaseline, refetch])

  // Handle clear/change baseline
  const _handleChangeBaseline = useCallback(
    async (baseline: ScheduleBaseline) => {
      if (!projectId) {return}
      await setActiveBaseline.mutateAsync({
        baselineId: baseline.id,
        projectId,
      })
    },
    [projectId, setActiveBaseline]
  )

  // Handle import complete - refresh data
  const handleImportComplete = useCallback(
    (_count: number) => {
      refetch()
    },
    [refetch]
  )

  // Handle clear baseline
  const handleClearBaseline = useCallback(async () => {
    if (!projectId) {return}
    await clearBaseline.mutateAsync(projectId)
    setSelectedBaselineId(null)
    await refetch()
  }, [projectId, clearBaseline, refetch])

  // Handle edit activity
  const handleEditActivity = useCallback((activity: ScheduleActivity) => {
    setEditingActivity(activity)
    setShowEditDialog(true)
    setSelectedActivity(null) // Close detail panel
  }, [])

  // Handle activity update submission
  const handleActivityUpdate = useCallback(
    async (data: CreateScheduleActivityDTO | UpdateScheduleActivityDTO) => {
      if (!editingActivity) {return}
      await updateActivityWithNotification.mutateAsync({
        activityId: editingActivity.id,
        updates: data as UpdateScheduleActivityDTO,
      })
      setShowEditDialog(false)
      setEditingActivity(null)
    },
    [editingActivity, updateActivityWithNotification]
  )

  // Handle create new activity
  const handleActivityCreate = useCallback(
    async (data: CreateScheduleActivityDTO) => {
      if (!projectId || !userProfile?.company_id) {return}
      await createActivityWithNotification.mutateAsync({
        ...data,
        project_id: projectId,
        company_id: userProfile.company_id,
      })
      setShowActivityDialog(false)
      await refetch()
    },
    [projectId, userProfile?.company_id, createActivityWithNotification, refetch]
  )

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (!project || !projectId) {return}
    await exportScheduleToPdf({
      projectId,
      projectName: project.name,
      projectNumber: project.project_number ?? undefined,
      activities,
      stats,
      includeBaseline: hasBaseline,
      includeMilestones: true,
      includeAllActivities: true,
      orientation: 'landscape',
    })
  }, [projectId, project, activities, stats, hasBaseline])

  // Loading state
  if (projectLoading) {
    return (
      <SmartLayout title="Master Schedule" subtitle="Project timeline">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-secondary">Loading project...</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  // Project not found
  if (!project) {
    return (
      <SmartLayout title="Master Schedule" subtitle="Project timeline">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">
              Project not found
            </h2>
            <p className="text-secondary mb-4">
              The requested project could not be found.
            </p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Master Schedule" subtitle="Project timeline">
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 border-l border-input" />
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2 heading-page">
                <Calendar className="h-5 w-5" />
                Master Schedule
              </h1>
              <p className="text-sm text-muted">{project.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges */}
            {stats && (
              <div className="hidden lg:flex items-center gap-2 mr-4">
                <Badge variant="outline" className="gap-1">
                  <Target className="h-3 w-3" />
                  {stats.total_activities} activities
                </Badge>
                {stats.critical_activities > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.critical_activities} critical
                  </Badge>
                )}
                <Badge
                  variant={stats.overall_progress >= 50 ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {stats.overall_progress}% complete
                </Badge>
              </div>
            )}

            {/* Baseline selector with comparison button */}
            <div className="hidden md:flex items-center gap-2">
              <BaselineSelector
                projectId={projectId!}
                value={selectedBaselineId}
                onChange={(id) => {
                  setSelectedBaselineId(id)
                  if (id) {
                    // Set as active baseline when selected
                    setActiveBaseline.mutate({ baselineId: id, projectId: projectId! })
                  }
                }}
                showCreateButton
                onCreateClick={handleSaveBaseline}
              />
              {selectedBaselineId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparisonView(true)}
                  title="View variance analysis"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSaveBaseline}>
                  <Clock className="h-4 w-4 mr-2" />
                  Save Baseline
                </DropdownMenuItem>
                {selectedBaselineId && (
                  <DropdownMenuItem onClick={() => setShowComparisonView(true)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Variance
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowImportHistory(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Import History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf} disabled={activities.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowExportDialog(true)} disabled={activities.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to MS Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLookAheadPrint(true)} disabled={activities.length === 0}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print 4-Week Look-Ahead
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowLookAheadSync(true)}
                  disabled={activities.length === 0}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Push to Look-Ahead
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${projectId}/look-ahead`)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Open Look-Ahead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => setShowActivityDialog(true)}
              data-testid="add-activity-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar (mobile-friendly) */}
        {stats && (
          <div className="md:hidden flex items-center gap-2 px-4 py-2 bg-surface border-b overflow-x-auto">
            <StatBadge
              icon={<Target className="h-3 w-3" />}
              label="Total"
              value={stats.total_activities}
            />
            <StatBadge
              icon={<CheckCircle2 className="h-3 w-3 text-success" />}
              label="Done"
              value={stats.completed_activities}
            />
            <StatBadge
              icon={<Clock className="h-3 w-3 text-primary" />}
              label="In Progress"
              value={stats.in_progress_activities}
            />
            <StatBadge
              icon={<XCircle className="h-3 w-3 text-error" />}
              label="Overdue"
              value={stats.overdue_activities}
              variant={stats.overdue_activities > 0 ? 'destructive' : 'default'}
            />
            {stats.variance_days !== null && stats.variance_days !== 0 && (
              <StatBadge
                icon={<AlertTriangle className="h-3 w-3" />}
                label="Variance"
                value={`${stats.variance_days > 0 ? '+' : ''}${stats.variance_days}d`}
                variant={stats.variance_days > 0 ? 'destructive' : 'default'}
              />
            )}
          </div>
        )}

        {/* Gantt Chart */}
        <div className="flex-1 p-4 bg-muted overflow-hidden">
          {isLoading ? (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Skeleton className="h-8 w-48 mx-auto mb-4" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <GanttChart
              items={scheduleItems}
              dependencies={taskDependencies}
              stats={ganttStats}
              dateRange={dateRange}
              isLoading={isLoading || isSavingBaseline || updateActivity.isPending}
              onRefresh={refetch}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
              onSaveBaseline={handleSaveBaseline}
              onClearBaseline={handleClearBaseline}
              onImport={() => setShowImportDialog(true)}
              onExport={() => setShowExportDialog(true)}
              hasBaseline={hasBaseline}
            />
          )}
        </div>

        {/* Activity Detail Panel */}
        <ActivityDetailPanel
          open={!!selectedActivity}
          onOpenChange={(open) => !open && setSelectedActivity(null)}
          activity={selectedActivity}
          onEdit={() => {
            if (selectedActivity) {
              handleEditActivity(selectedActivity)
            }
          }}
        />

        {/* Import Dialog */}
        <ScheduleImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          projectId={projectId!}
          companyId={userProfile?.company_id || ''}
          onImportComplete={handleImportComplete}
        />

        {/* Baseline Comparison View */}
        {selectedBaselineId && (
          <BaselineComparisonView
            open={showComparisonView}
            onOpenChange={setShowComparisonView}
            projectId={projectId!}
            baseline={baselines.find(b => b.id === selectedBaselineId) || null}
            activities={activities}
          />
        )}

        {/* Import History Sheet */}
        <Sheet open={showImportHistory} onOpenChange={setShowImportHistory}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Import History</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ImportHistoryList
                projectId={projectId!}
                limit={20}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Look-Ahead Sync Dialog */}
        <LookAheadSyncDialog
          open={showLookAheadSync}
          onOpenChange={setShowLookAheadSync}
          projectId={projectId!}
          companyId={userProfile?.company_id || ''}
          activities={activities}
          onSyncComplete={(_count: number) => {
            setShowLookAheadSync(false)
            // Optionally navigate to look-ahead page
          }}
        />

        {/* Activity Create Dialog */}
        <ActivityFormDialog
          open={showActivityDialog}
          onOpenChange={setShowActivityDialog}
          projectId={projectId!}
          companyId={userProfile?.company_id || ''}
          onSubmit={handleActivityCreate}
          isLoading={createActivityWithNotification.isPending}
        />

        {/* Activity Edit Dialog */}
        <ActivityFormDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open)
            if (!open) {setEditingActivity(null)}
          }}
          activity={editingActivity}
          projectId={projectId!}
          companyId={userProfile?.company_id || ''}
          onSubmit={handleActivityUpdate}
          isLoading={updateActivityWithNotification.isPending}
        />

        {/* Export Dialog */}
        <ScheduleExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          projectId={projectId!}
          projectName={project.name}
          projectNumber={project.project_number ?? undefined}
          activityCount={activities.length}
          milestonesCount={activities.filter(a => a.is_milestone).length}
          criticalCount={activities.filter(a => a.is_critical || a.is_on_critical_path).length}
        />

        {/* Look-Ahead Print View */}
        <Sheet open={showLookAheadPrint} onOpenChange={setShowLookAheadPrint}>
          <SheetContent className="w-full sm:max-w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>4-Week Look-Ahead Schedule</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {project && (
                <LookAheadPrintView
                  projectId={projectId!}
                  projectName={project.name}
                  activities={activities}
                  onClose={() => setShowLookAheadPrint(false)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SmartLayout>
  )
}

// Stat badge component for mobile
function StatBadge({
  icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  variant?: 'default' | 'destructive'
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${
        variant === 'destructive'
          ? 'bg-error-light text-error-dark'
          : 'bg-card text-secondary border'
      }`}
    >
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  )
}

export default MasterSchedulePage
