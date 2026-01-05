// File: src/pages/schedule/GanttChartPage.tsx
// Project schedule Gantt chart page with Phase 2 features

import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Settings, FileDown } from 'lucide-react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { GanttChart } from '@/features/gantt/components/GanttChart'
import { ImportScheduleDialog } from '@/features/gantt/components/ImportScheduleDialog'
import { useGanttData, useUpdateScheduleItem } from '@/features/gantt/hooks/useScheduleItems'
import { useProject } from '@/features/projects/hooks/useProjects'
import { scheduleApi } from '@/lib/api/services/schedule'
import { useToast } from '@/lib/notifications/ToastContext'
import type { ScheduleItem } from '@/types/schedule'
import type { ParsedSchedule } from '@/features/gantt/utils/msProjectImport'

export function GanttChartPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useProject(projectId)

  // Fetch Gantt data
  const {
    items,
    dependencies,
    stats,
    dateRange,
    isLoading,
    refetch,
  } = useGanttData(projectId)

  // Mutations
  const updateScheduleItem = useUpdateScheduleItem()

  // State
  const [selectedTask, setSelectedTask] = useState<ScheduleItem | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSavingBaseline, setIsSavingBaseline] = useState(false)

  // Check if project has baseline
  const hasBaseline = items.some(item => item.baseline_start_date !== null)

  const handleTaskClick = (task: ScheduleItem) => {
    setSelectedTask(task)
  }

  // Handle task updates from drag-and-drop
  const handleTaskUpdate = useCallback(
    async (taskId: string, updates: { start_date: string; finish_date: string; duration_days: number }) => {
      try {
        await updateScheduleItem.mutateAsync({
          itemId: taskId,
          updates: {
            start_date: updates.start_date,
            finish_date: updates.finish_date,
            duration_days: updates.duration_days,
          },
        })
        toast.success('Task Updated', 'Schedule has been updated')
      } catch (_error) {
        toast.error('Update Failed', 'Failed to update task dates')
      }
    },
    [updateScheduleItem, toast]
  )

  // Handle baseline save
  const handleSaveBaseline = useCallback(async () => {
    if (!projectId) {return}

    setIsSavingBaseline(true)
    try {
      await scheduleApi.saveBaseline(projectId, 'Baseline', 'Saved from Gantt chart')
      await refetch()
      toast.success('Baseline Saved', 'Current schedule has been saved as baseline')
    } catch (_error) {
      toast.error('Save Failed', 'Failed to save baseline')
    } finally {
      setIsSavingBaseline(false)
    }
  }, [projectId, refetch, toast])

  // Handle baseline clear
  const handleClearBaseline = useCallback(async () => {
    if (!projectId) {return}

    try {
      await scheduleApi.clearBaseline(projectId)
      await refetch()
      toast.success('Baseline Cleared', 'Baseline has been removed')
    } catch (_error) {
      toast.error('Clear Failed', 'Failed to clear baseline')
    }
  }, [projectId, refetch, toast])

  // Handle import
  const handleImport = useCallback(
    async (
      tasks: ParsedSchedule['tasks'],
      importDeps: ParsedSchedule['dependencies'],
      clearExisting: boolean
    ) => {
      if (!projectId) {return}

      setIsImporting(true)
      try {
        // Import tasks
        const taskResult = await scheduleApi.importScheduleItems(projectId, tasks, clearExisting)

        if (taskResult.errors.length > 0) {
          toast.warning('Import Completed with Warnings', `Imported ${taskResult.imported} tasks. ${taskResult.errors.length} errors occurred.`)
        } else {
          toast.success('Import Successful', `Imported ${taskResult.imported} tasks`)
        }

        // Note: Dependencies would need ID mapping which requires the imported task IDs
        // For now, dependencies are imported during the bulk import if available
        // A more complete solution would map the imported task IDs to dependency references

        await refetch()
      } catch (_error) {
        toast.error('Import Failed', 'Failed to import schedule')
      } finally {
        setIsImporting(false)
      }
    },
    [projectId, refetch, toast]
  )

  if (projectLoading) {
    return (
      <SmartLayout title="Gantt Chart">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Loading project...</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (!project) {
    return (
      <SmartLayout title="Gantt Chart">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">Project not found</h2>
            <p className="text-secondary mb-4">The requested project could not be found.</p>
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
    <SmartLayout title="Gantt Chart">
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
              Back to Project
            </Button>
            <div className="h-6 border-l border-input" />
            <div>
              <h1 className="text-xl font-bold text-foreground heading-page">Project Schedule</h1>
              <p className="text-sm text-muted">{project.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 p-4 bg-muted overflow-hidden">
          <GanttChart
            items={items}
            dependencies={dependencies}
            stats={stats}
            dateRange={dateRange}
            isLoading={isLoading || isSavingBaseline}
            onRefresh={refetch}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            onSaveBaseline={handleSaveBaseline}
            onClearBaseline={handleClearBaseline}
            onImport={() => setShowImportDialog(true)}
            hasBaseline={hasBaseline}
          />
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="absolute bottom-0 right-0 w-96 m-4 z-50">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedTask.task_name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTask(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Start Date</dt>
                    <dd className="font-medium">{selectedTask.start_date}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">End Date</dt>
                    <dd className="font-medium">{selectedTask.finish_date}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Duration</dt>
                    <dd className="font-medium">{selectedTask.duration_days} days</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Progress</dt>
                    <dd className="font-medium">{selectedTask.percent_complete}%</dd>
                  </div>
                  {selectedTask.assigned_to && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Assigned To</dt>
                      <dd className="font-medium">{selectedTask.assigned_to}</dd>
                    </div>
                  )}
                  {selectedTask.baseline_start_date && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-disabled mb-1">Baseline</div>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Baseline Start</dt>
                        <dd className="font-medium">{selectedTask.baseline_start_date}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Baseline End</dt>
                        <dd className="font-medium">{selectedTask.baseline_finish_date}</dd>
                      </div>
                    </>
                  )}
                  {selectedTask.is_critical && (
                    <div className="mt-2 p-2 bg-error-light rounded text-error-dark text-xs">
                      ⚠️ This task is on the critical path
                    </div>
                  )}
                  {selectedTask.is_milestone && (
                    <div className="mt-2 p-2 bg-violet-50 rounded text-violet-700 text-xs">
                      ◆ Milestone
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Dialog */}
        <ImportScheduleDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={handleImport}
          isImporting={isImporting}
        />
      </div>
    </SmartLayout>
  )
}

export default GanttChartPage
