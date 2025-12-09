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
  RefreshCw,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GanttChart } from '@/features/gantt/components/GanttChart'
import { ImportScheduleDialog } from '@/features/gantt/components/ImportScheduleDialog'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import {
  useMasterScheduleData,
  useUpdateScheduleActivity,
  useCreateBaselineWithNotification,
  useSetActiveBaseline,
  useImportScheduleActivities,
} from '@/features/schedule/hooks'
import {
  mapActivitiesToScheduleItems,
  mapDependenciesToTaskDependencies,
  calculateActivityDateRange,
} from '@/features/schedule/utils/activityAdapter'
import type { ScheduleItem } from '@/types/schedule'
import type { ScheduleActivity, ScheduleBaseline } from '@/types/schedule-activities'
import type { ParsedSchedule } from '@/features/gantt/utils/msProjectImport'

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
    activeBaseline,
    isLoading,
    refetch,
  } = useMasterScheduleData(projectId)

  // Mutations
  const updateActivity = useUpdateScheduleActivity()
  const createBaseline = useCreateBaselineWithNotification()
  const setActiveBaseline = useSetActiveBaseline()
  const importActivities = useImportScheduleActivities()

  // State
  const [selectedActivity, setSelectedActivity] = useState<ScheduleActivity | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [isSavingBaseline, setIsSavingBaseline] = useState(false)

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
    if (!stats) return undefined
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
        console.error('Failed to update activity:', error)
      }
    },
    [updateActivity]
  )

  // Handle save baseline
  const handleSaveBaseline = useCallback(async () => {
    if (!projectId) return

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
  const handleChangeBaseline = useCallback(
    async (baseline: ScheduleBaseline) => {
      if (!projectId) return
      await setActiveBaseline.mutateAsync({
        baselineId: baseline.id,
        projectId,
      })
    },
    [projectId, setActiveBaseline]
  )

  // Handle import
  const handleImport = useCallback(
    async (
      tasks: ParsedSchedule['tasks'],
      _importDeps: ParsedSchedule['dependencies'],
      clearExisting: boolean
    ) => {
      if (!projectId || !userProfile?.company_id) return

      // Map parsed tasks to CreateScheduleActivityDTO format
      const activitiesToImport = tasks.map((task, index) => ({
        activity_id: task.task_id || `IMP-${String(index + 1).padStart(4, '0')}`,
        name: task.task_name,
        wbs_code: task.wbs || null,
        planned_start: task.start_date,
        planned_finish: task.finish_date,
        planned_duration: task.duration_days,
        is_milestone: task.is_milestone || false,
        notes: task.notes || null,
      }))

      await importActivities.mutateAsync({
        projectId,
        companyId: userProfile.company_id,
        activities: activitiesToImport,
        fileName: 'Imported Schedule',
        fileType: 'xml',
        sourceSystem: 'ms_project',
        clearExisting,
      })

      setShowImportDialog(false)
    },
    [projectId, userProfile?.company_id, importActivities]
  )

  // Loading state
  if (projectLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Project not found
  if (!project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Project not found
            </h2>
            <p className="text-gray-600 mb-4">
              The requested project could not be found.
            </p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 border-l border-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Master Schedule
              </h1>
              <p className="text-sm text-gray-500">{project.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges */}
            {stats && (
              <div className="hidden md:flex items-center gap-2 mr-4">
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

            {/* Baseline selector */}
            {baselines.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    {activeBaseline ? activeBaseline.name : 'No Baseline'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {baselines.map((baseline) => (
                    <DropdownMenuItem
                      key={baseline.id}
                      onClick={() => handleChangeBaseline(baseline)}
                    >
                      <div className="flex items-center gap-2">
                        {baseline.is_active && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <span>{baseline.name}</span>
                        <span className="text-xs text-gray-500">
                          ({new Date(baseline.baseline_date).toLocaleDateString()})
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
                <DropdownMenuItem disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar (mobile-friendly) */}
        {stats && (
          <div className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-50 border-b overflow-x-auto">
            <StatBadge
              icon={<Target className="h-3 w-3" />}
              label="Total"
              value={stats.total_activities}
            />
            <StatBadge
              icon={<CheckCircle2 className="h-3 w-3 text-green-500" />}
              label="Done"
              value={stats.completed_activities}
            />
            <StatBadge
              icon={<Clock className="h-3 w-3 text-blue-500" />}
              label="In Progress"
              value={stats.in_progress_activities}
            />
            <StatBadge
              icon={<XCircle className="h-3 w-3 text-red-500" />}
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
        <div className="flex-1 p-4 bg-gray-100 overflow-hidden">
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
              onClearBaseline={() => {}} // TODO: Implement clear baseline
              onImport={() => setShowImportDialog(true)}
              hasBaseline={hasBaseline}
            />
          )}
        </div>

        {/* Activity Detail Panel */}
        {selectedActivity && (
          <ActivityDetailSidePanel
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            projectId={projectId!}
          />
        )}

        {/* Import Dialog */}
        <ImportScheduleDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={handleImport}
          isImporting={importActivities.isPending}
        />
      </div>
    </AppLayout>
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
          ? 'bg-red-100 text-red-700'
          : 'bg-white text-gray-700 border'
      }`}
    >
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}

// Simple activity detail side panel
function ActivityDetailSidePanel({
  activity,
  onClose,
  projectId,
}: {
  activity: ScheduleActivity
  onClose: () => void
  projectId: string
}) {
  const updateActivity = useUpdateScheduleActivity()
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'on_hold':
        return 'bg-amber-100 text-amber-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateActivity.mutateAsync({
      activityId: activity.id,
      updates: {
        status: newStatus as any,
        percent_complete: newStatus === 'completed' ? 100 : activity.percent_complete,
      },
    })
  }

  return (
    <div className="absolute bottom-0 right-0 w-96 m-4 z-50">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-mono">
                {activity.activity_id}
              </div>
              <CardTitle className="text-lg">{activity.name}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  className={`cursor-pointer ${getStatusColor(activity.status)}`}
                >
                  {activity.status.replace('_', ' ')}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {['not_started', 'in_progress', 'completed', 'on_hold'].map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {status.replace('_', ' ')}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Dates */}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Planned Start</dt>
              <dd className="font-medium">
                {activity.planned_start
                  ? new Date(activity.planned_start).toLocaleDateString()
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Planned Finish</dt>
              <dd className="font-medium">
                {activity.planned_finish
                  ? new Date(activity.planned_finish).toLocaleDateString()
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Duration</dt>
              <dd className="font-medium">
                {activity.planned_duration || 0} days
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Progress</dt>
              <dd className="font-medium">{activity.percent_complete}%</dd>
            </div>
          </dl>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${activity.percent_complete}%` }}
            />
          </div>

          {/* Additional info */}
          {activity.responsible_party && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Responsible</span>
              <span className="font-medium">{activity.responsible_party}</span>
            </div>
          )}

          {activity.wbs_code && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">WBS</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {activity.wbs_code}
              </span>
            </div>
          )}

          {/* Indicators */}
          <div className="flex gap-2 flex-wrap">
            {activity.is_critical && (
              <Badge variant="destructive" className="text-xs">
                Critical Path
              </Badge>
            )}
            {activity.is_milestone && (
              <Badge className="bg-violet-100 text-violet-700 text-xs">
                Milestone
              </Badge>
            )}
            {activity.baseline_start && (
              <Badge variant="outline" className="text-xs">
                Has Baseline
              </Badge>
            )}
          </div>

          {/* Baseline comparison */}
          {activity.baseline_start && activity.baseline_finish && (
            <div className="border-t pt-3 mt-3">
              <div className="text-xs text-gray-400 mb-2">Baseline</div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {new Date(activity.baseline_start).toLocaleDateString()}
                </span>
                <span>→</span>
                <span>
                  {new Date(activity.baseline_finish).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div className="border-t pt-3">
              <div className="text-xs text-gray-500 mb-1">Notes</div>
              <p className="text-sm text-gray-700">{activity.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                navigate(`/projects/${projectId}/look-ahead`, {
                  state: { activityId: activity.id },
                })
              }
            >
              Push to Look-Ahead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MasterSchedulePage
