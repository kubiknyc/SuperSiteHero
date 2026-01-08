// File: /src/features/checklists/pages/SchedulesPage.tsx
// Main page for managing recurring checklist schedules
// Enhancement: #7 - Reminders and Recurring Checklists

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Search,
  Repeat,
  Play,
  Pause,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { ScheduleDialog } from '../components/ScheduleDialog'
import { ScheduleRemindersNotification } from '../components/ScheduleRemindersNotification'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useSchedules,
  useScheduleStatistics,
  useDeleteSchedule,
  usePauseSchedule,
  useResumeSchedule,
  useCreateSchedule,
  useUpdateSchedule,
} from '../hooks/useSchedules'
import { useTemplates } from '../hooks/useTemplates'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  getFrequencyLabel,
  getDayOfWeekLabel,
  isScheduleDue,
  type ChecklistSchedule,
  type ScheduleStatus,
  type CreateChecklistScheduleDTO,
} from '@/types/checklist-schedules'
import { format, formatDistanceToNow } from 'date-fns'

type StatusFilter = 'all' | ScheduleStatus

export function SchedulesPage() {
  const navigate = useNavigate()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ChecklistSchedule | null>(null)
  const [selectedTemplateId, _setSelectedTemplateId] = useState('')
  const [selectedProjectId, _setSelectedProjectId] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<ChecklistSchedule | null>(null)

  // Data hooks
  const { data: allSchedules = [], isLoading } = useSchedules()
  const { data: stats } = useScheduleStatistics()
  const { data: templates = [] } = useTemplates()
  const { data: projects = [] } = useMyProjects()

  // Mutations
  const { mutate: createSchedule } = useCreateSchedule()
  const { mutate: updateSchedule } = useUpdateSchedule()
  const { mutate: deleteSchedule } = useDeleteSchedule()
  const { mutate: pauseSchedule } = usePauseSchedule()
  const { mutate: resumeSchedule } = useResumeSchedule()

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    let result = allSchedules

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(query))
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }

    return result.sort((a, b) => {
      // Sort by next execution date
      if (!a.next_execution_date) {return 1}
      if (!b.next_execution_date) {return -1}
      return new Date(a.next_execution_date).getTime() - new Date(b.next_execution_date).getTime()
    })
  }, [allSchedules, searchQuery, statusFilter])

  // Get due schedules for reminders
  const dueSchedules = useMemo(() => {
    return allSchedules.filter(
      (s) => s.is_active && s.status === 'active' && s.reminder_enabled && isScheduleDue(s)
    )
  }, [allSchedules])

  const handleCreateSchedule = () => {
    setEditingSchedule(null)
    setShowScheduleDialog(true)
  }

  const handleEditSchedule = (schedule: ChecklistSchedule) => {
    setEditingSchedule(schedule)
    setShowScheduleDialog(true)
  }

  const handleSaveSchedule = (data: CreateChecklistScheduleDTO) => {
    if (editingSchedule) {
      updateSchedule({ id: editingSchedule.id, ...data })
    } else {
      createSchedule(data)
    }
  }

  const handleDeleteClick = (schedule: ChecklistSchedule) => {
    setScheduleToDelete(schedule)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete.id)
      setDeleteDialogOpen(false)
      setScheduleToDelete(null)
    }
  }

  const handleTogglePause = (schedule: ChecklistSchedule) => {
    if (schedule.status === 'paused') {
      resumeSchedule(schedule.id)
    } else {
      pauseSchedule(schedule.id)
    }
  }

  const getStatusColor = (status: ScheduleStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-success-light text-green-800 border-green-200'
      case 'paused':
        return 'bg-warning-light text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-info-light text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-muted text-foreground border-border'
    }
  }

  const getStatusIcon = (status: ScheduleStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-3 h-3" />
      case 'paused':
        return <Pause className="w-3 h-3" />
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />
      case 'cancelled':
        return <XCircle className="w-3 h-3" />
    }
  }

  return (
    <SmartLayout title="Recurring Schedules" subtitle="Manage automated checklist creation">
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3 heading-page">
                <Repeat className="w-8 h-8 text-primary" />
                Recurring Schedules
              </h1>
              <p className="text-secondary">
                Manage automated checklist creation and reminders
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/checklists/dashboard')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button onClick={handleCreateSchedule} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Reminders Banner */}
        {dueSchedules.length > 0 && (
          <div className="mb-6">
            <ScheduleRemindersNotification
              schedules={dueSchedules}
              onStartChecklist={(schedule) => {
                navigate(`/checklists/templates/${schedule.checklist_template_id}/preview`)
              }}
            />
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-secondary">Total Schedules</div>
                <div className="text-3xl font-bold text-foreground mt-1">{stats.total_schedules}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-secondary">Active</div>
                <div className="text-3xl font-bold text-success mt-1">{stats.active_schedules}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-secondary">Upcoming</div>
                <div className="text-3xl font-bold text-primary mt-1">{stats.upcoming_due_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-secondary">Overdue</div>
                <div className="text-3xl font-bold text-error mt-1">{stats.overdue_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-secondary">Total Created</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">
                  {stats.total_executions_created}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-disabled w-4 h-4" />
                  <Input
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedules List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-secondary">Loading schedules...</p>
            </CardContent>
          </Card>
        ) : filteredSchedules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Repeat className="w-12 h-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                {allSchedules.length === 0 ? 'No schedules yet' : 'No schedules match your filters'}
              </h3>
              <p className="text-secondary mb-4">
                {allSchedules.length === 0
                  ? 'Create your first recurring schedule to automate checklist creation.'
                  : 'Try adjusting your search and filter criteria.'}
              </p>
              {allSchedules.length === 0 && (
                <Button onClick={handleCreateSchedule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Schedule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => {
              const template = templates.find((t) => t.id === schedule.checklist_template_id)
              const project = projects.find((p) => p.id === schedule.project_id)
              const isDue = isScheduleDue(schedule)
              const nextDue = schedule.next_execution_date
                ? new Date(schedule.next_execution_date)
                : null

              return (
                <Card key={schedule.id} className={isDue ? 'border-red-300' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground heading-subsection">{schedule.name}</h3>
                          <Badge className={getStatusColor(schedule.status)}>
                            {getStatusIcon(schedule.status)}
                            <span className="ml-1">{schedule.status}</span>
                          </Badge>
                          {isDue && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              DUE NOW
                            </Badge>
                          )}
                        </div>

                        {schedule.description && (
                          <p className="text-sm text-secondary mb-3">{schedule.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted">Template</p>
                            <p className="font-medium text-foreground">{template?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-muted">Project</p>
                            <p className="font-medium text-foreground">{project?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-muted flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              Frequency
                            </p>
                            <p className="font-medium text-foreground">
                              {getFrequencyLabel(schedule.frequency, schedule.interval)}
                            </p>
                            {schedule.frequency === 'weekly' && schedule.days_of_week && (
                              <p className="text-xs text-muted">
                                {schedule.days_of_week.map(getDayOfWeekLabel).join(', ')}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-muted flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Next Due
                            </p>
                            {nextDue ? (
                              <>
                                <p className="font-medium text-foreground">
                                  {format(nextDue, 'MMM d, yyyy')}
                                </p>
                                <p className="text-xs text-muted">
                                  {formatDistanceToNow(nextDue, { addSuffix: true })}
                                </p>
                              </>
                            ) : (
                              <p className="text-muted">-</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {formatDistanceToNow(new Date(schedule.created_at))} ago
                          </span>
                          <span>
                            Executions: {schedule.total_executions_created}
                          </span>
                          {schedule.reminder_enabled && (
                            <span className="flex items-center gap-1 text-primary">
                              <Clock className="w-3 h-3" />
                              Reminder {schedule.reminder_hours_before}h before
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {schedule.status === 'active' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTogglePause(schedule)}
                            title="Pause schedule"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {schedule.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTogglePause(schedule)}
                            title="Resume schedule"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditSchedule(schedule)}
                          title="Edit schedule"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClick(schedule)}
                          title="Delete schedule"
                          className="text-error hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <ScheduleDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSave={handleSaveSchedule}
          schedule={editingSchedule}
          templateId={selectedTemplateId || templates[0]?.id || ''}
          templateName={
            templates.find((t) => t.id === selectedTemplateId)?.name || templates[0]?.name || ''
          }
          projectId={selectedProjectId || projects[0]?.id || ''}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-error" />
              Delete Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{scheduleToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-error hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </SmartLayout>
  )
}

export default SchedulesPage
