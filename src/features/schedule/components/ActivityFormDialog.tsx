/**
 * Activity Form Dialog
 *
 * Comprehensive dialog for creating and editing schedule activities.
 * Supports all activity fields including dates, constraints, assignments, and costs.
 */

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  CalendarDays,
  Clock,
  User,
  DollarSign,
  Flag,
  Hash,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { CalendarSelector } from './CalendarSelector'
import { CalendarConfigDialog } from './CalendarConfigDialog'
import { useCreateCalendar } from '../hooks/useScheduleActivities'
import type {
  ScheduleActivity,
  CreateScheduleActivityDTO,
  UpdateScheduleActivityDTO,
  ActivityType,
  ActivityStatus,
  ConstraintType,
  DurationType,
  CreateScheduleCalendarDTO,
} from '@/types/schedule-activities'

// =============================================
// Constants
// =============================================

const ACTIVITY_TYPES: { value: ActivityType; label: string; description: string }[] = [
  { value: 'task', label: 'Task', description: 'Standard work activity' },
  { value: 'milestone', label: 'Milestone', description: 'Zero-duration event marker' },
  { value: 'summary', label: 'Summary', description: 'Parent grouping activity' },
  { value: 'hammock', label: 'Hammock', description: 'Duration spans between activities' },
  { value: 'level_of_effort', label: 'Level of Effort', description: 'Ongoing support activity' },
  { value: 'wbs_summary', label: 'WBS Summary', description: 'WBS level summary' },
]

const ACTIVITY_STATUSES: { value: ActivityStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-muted text-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-info-light text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-success-light text-green-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-warning-light text-yellow-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-error-light text-red-800' },
]

const CONSTRAINT_TYPES: { value: ConstraintType; label: string }[] = [
  { value: 'as_soon_as_possible', label: 'As Soon As Possible' },
  { value: 'as_late_as_possible', label: 'As Late As Possible' },
  { value: 'must_start_on', label: 'Must Start On' },
  { value: 'must_finish_on', label: 'Must Finish On' },
  { value: 'start_no_earlier_than', label: 'Start No Earlier Than' },
  { value: 'start_no_later_than', label: 'Start No Later Than' },
  { value: 'finish_no_earlier_than', label: 'Finish No Earlier Than' },
  { value: 'finish_no_later_than', label: 'Finish No Later Than' },
]

const DURATION_TYPES: { value: DurationType; label: string }[] = [
  { value: 'fixed_duration', label: 'Fixed Duration' },
  { value: 'fixed_units', label: 'Fixed Units' },
  { value: 'fixed_work', label: 'Fixed Work' },
]

const BAR_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
]

// =============================================
// Form Schema
// =============================================

const activitySchema = z.object({
  // Basic Info
  activity_id: z
    .string()
    .min(1, 'Activity ID is required')
    .max(50, 'Activity ID must be 50 characters or less'),
  name: z
    .string()
    .min(1, 'Activity name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  activity_type: z.string(),
  is_milestone: z.boolean(),
  wbs_code: z.string().optional(),

  // Dates & Duration
  planned_start: z.string().optional(),
  planned_finish: z.string().optional(),
  planned_duration: z.number().min(0).optional(),
  duration_type: z.string(),
  actual_start: z.string().optional(),
  actual_finish: z.string().optional(),

  // Assignment
  responsible_party: z.string().optional(),
  responsible_user_id: z.string().optional(),
  subcontractor_id: z.string().optional(),

  // Constraints
  constraint_type: z.string().optional(),
  constraint_date: z.string().optional(),
  calendar_id: z.string().optional(),

  // Cost & Hours
  budgeted_cost: z.number().min(0).optional(),
  budgeted_labor_hours: z.number().min(0).optional(),

  // Progress (edit only)
  status: z.string(),
  percent_complete: z.number().min(0).max(100),

  // Display
  bar_color: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

type ActivityFormValues = z.infer<typeof activitySchema>

// =============================================
// Component Props
// =============================================

interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: ScheduleActivity | null
  projectId: string
  companyId: string
  parentActivityId?: string | null
  suggestedActivityId?: string
  users?: Array<{ id: string; full_name: string }>
  subcontractors?: Array<{ id: string; company_name: string }>
  onSubmit: (data: CreateScheduleActivityDTO | UpdateScheduleActivityDTO) => Promise<void>
  isLoading?: boolean
}

// =============================================
// Component
// =============================================

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  projectId,
  companyId,
  parentActivityId,
  suggestedActivityId,
  users = [],
  subcontractors = [],
  onSubmit,
  isLoading = false,
}: ActivityFormDialogProps) {
  const isEditing = !!activity

  // Calendar dialog state
  const [showCalendarDialog, setShowCalendarDialog] = React.useState(false)
  const createCalendarMutation = useCreateCalendar()

  const prevOpenRef = React.useRef(open)

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_id: activity?.activity_id || suggestedActivityId || '',
      name: activity?.name || '',
      description: activity?.description || '',
      activity_type: activity?.activity_type || 'task',
      is_milestone: activity?.is_milestone || false,
      wbs_code: activity?.wbs_code || '',
      planned_start: activity?.planned_start?.split('T')[0] || '',
      planned_finish: activity?.planned_finish?.split('T')[0] || '',
      planned_duration: activity?.planned_duration || undefined,
      duration_type: activity?.duration_type || 'fixed_duration',
      actual_start: activity?.actual_start?.split('T')[0] || '',
      actual_finish: activity?.actual_finish?.split('T')[0] || '',
      responsible_party: activity?.responsible_party || '',
      responsible_user_id: activity?.responsible_user_id || '',
      subcontractor_id: activity?.subcontractor_id || '',
      constraint_type: activity?.constraint_type || '',
      constraint_date: activity?.constraint_date?.split('T')[0] || '',
      calendar_id: activity?.calendar_id || '',
      budgeted_cost: activity?.budgeted_cost || undefined,
      budgeted_labor_hours: activity?.budgeted_labor_hours || undefined,
      status: activity?.status || 'not_started',
      percent_complete: activity?.percent_complete || 0,
      bar_color: activity?.bar_color || '',
      notes: activity?.notes || '',
    },
  })

  // Reset form when activity changes
  React.useEffect(() => {
    const isOpening = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (isOpening) {
      form.reset({
        activity_id: activity?.activity_id || suggestedActivityId || '',
        name: activity?.name || '',
        description: activity?.description || '',
        activity_type: activity?.activity_type || 'task',
        is_milestone: activity?.is_milestone || false,
        wbs_code: activity?.wbs_code || '',
        planned_start: activity?.planned_start?.split('T')[0] || '',
        planned_finish: activity?.planned_finish?.split('T')[0] || '',
        planned_duration: activity?.planned_duration || undefined,
        duration_type: activity?.duration_type || 'fixed_duration',
        actual_start: activity?.actual_start?.split('T')[0] || '',
        actual_finish: activity?.actual_finish?.split('T')[0] || '',
        responsible_party: activity?.responsible_party || '',
        responsible_user_id: activity?.responsible_user_id || '',
        subcontractor_id: activity?.subcontractor_id || '',
        constraint_type: activity?.constraint_type || '',
        constraint_date: activity?.constraint_date?.split('T')[0] || '',
        calendar_id: activity?.calendar_id || '',
        budgeted_cost: activity?.budgeted_cost || undefined,
        budgeted_labor_hours: activity?.budgeted_labor_hours || undefined,
        status: activity?.status || 'not_started',
        percent_complete: activity?.percent_complete || 0,
        bar_color: activity?.bar_color || '',
        notes: activity?.notes || '',
      })
    }
  }, [open, activity, suggestedActivityId, form])

  // Auto-calculate duration when dates change
  const plannedStart = form.watch('planned_start')
  const plannedFinish = form.watch('planned_finish')

  React.useEffect(() => {
    if (plannedStart && plannedFinish) {
      const start = new Date(plannedStart)
      const finish = new Date(plannedFinish)
      const diffTime = finish.getTime() - start.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include start day
      if (diffDays > 0) {
        form.setValue('planned_duration', diffDays)
      }
    }
  }, [plannedStart, plannedFinish, form])

  // Handle milestone toggle
  const isMilestone = form.watch('is_milestone')
  React.useEffect(() => {
    if (isMilestone) {
      form.setValue('activity_type', 'milestone')
      form.setValue('planned_duration', 0)
    }
  }, [isMilestone, form])

  const handleSubmit = async (values: ActivityFormValues) => {
    if (isEditing) {
      const updateData: UpdateScheduleActivityDTO = {
        activity_id: values.activity_id,
        name: values.name,
        description: values.description || undefined,
        activity_type: values.activity_type as ActivityType,
        is_milestone: values.is_milestone,
        wbs_code: values.wbs_code || undefined,
        planned_start: values.planned_start || null,
        planned_finish: values.planned_finish || null,
        planned_duration: values.planned_duration,
        duration_type: values.duration_type as DurationType,
        actual_start: values.actual_start || null,
        actual_finish: values.actual_finish || null,
        responsible_party: values.responsible_party || null,
        responsible_user_id: values.responsible_user_id || null,
        subcontractor_id: values.subcontractor_id || null,
        constraint_type: (values.constraint_type as ConstraintType) || null,
        constraint_date: values.constraint_date || null,
        calendar_id: values.calendar_id || null,
        budgeted_cost: values.budgeted_cost,
        budgeted_labor_hours: values.budgeted_labor_hours,
        status: values.status as ActivityStatus,
        percent_complete: values.percent_complete,
        bar_color: values.bar_color || null,
        notes: values.notes || undefined,
      }
      await onSubmit(updateData)
    } else {
      const createData: CreateScheduleActivityDTO = {
        project_id: projectId,
        company_id: companyId,
        activity_id: values.activity_id,
        name: values.name,
        description: values.description || undefined,
        activity_type: values.activity_type as ActivityType,
        is_milestone: values.is_milestone,
        wbs_code: values.wbs_code || undefined,
        parent_activity_id: parentActivityId || undefined,
        planned_start: values.planned_start || undefined,
        planned_finish: values.planned_finish || undefined,
        planned_duration: values.planned_duration,
        duration_type: values.duration_type as DurationType,
        responsible_party: values.responsible_party || undefined,
        responsible_user_id: values.responsible_user_id || undefined,
        subcontractor_id: values.subcontractor_id || undefined,
        constraint_type: (values.constraint_type as ConstraintType) || undefined,
        constraint_date: values.constraint_date || undefined,
        calendar_id: values.calendar_id || undefined,
        budgeted_cost: values.budgeted_cost,
        budgeted_labor_hours: values.budgeted_labor_hours,
        bar_color: values.bar_color || undefined,
        notes: values.notes || undefined,
      }
      await onSubmit(createData)
    }
    onOpenChange(false)
  }

  const handleCreateCalendar = async (data: CreateScheduleCalendarDTO) => {
    const result = await createCalendarMutation.mutateAsync(data)
    form.setValue('calendar_id', result.id)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {isEditing ? 'Edit Activity' : 'Create Activity'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the activity details below.'
                : 'Add a new activity to the schedule.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="dates">Dates</TabsTrigger>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Activity ID & Name */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activity_id" className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      Activity ID *
                    </Label>
                    <Input
                      id="activity_id"
                      {...form.register('activity_id')}
                      placeholder="e.g., A1010"
                    />
                    {form.formState.errors.activity_id && (
                      <p className="text-sm text-error">
                        {form.formState.errors.activity_id.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Activity Name *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="e.g., Site Excavation"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-error">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Detailed description of this activity..."
                    rows={3}
                  />
                </div>

                {/* Activity Type & Milestone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Select
                      value={form.watch('activity_type')}
                      onValueChange={(value) => form.setValue('activity_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {type.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>WBS Code</Label>
                    <Input
                      {...form.register('wbs_code')}
                      placeholder="e.g., 1.2.3"
                    />
                  </div>
                </div>

                {/* Milestone checkbox */}
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="is_milestone"
                    checked={form.watch('is_milestone')}
                    onCheckedChange={(checked) => form.setValue('is_milestone', !!checked)}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="is_milestone" className="text-sm font-medium flex items-center gap-1">
                      <Flag className="h-3.5 w-3.5" />
                      Milestone
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Zero-duration event marking a key project date
                    </span>
                  </div>
                </div>

                {/* Bar Color */}
                <div className="space-y-2">
                  <Label>Bar Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {BAR_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          form.watch('bar_color') === color.value
                            ? 'border-gray-900 ring-2 ring-offset-2'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => form.setValue('bar_color', color.value)}
                        title={color.label}
                      />
                    ))}
                    <button
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 bg-card ${
                        !form.watch('bar_color') ? 'border-gray-900' : 'border-input'
                      }`}
                      onClick={() => form.setValue('bar_color', '')}
                      title="Default"
                    >
                      <span className="text-xs">Auto</span>
                    </button>
                  </div>
                </div>
              </TabsContent>

              {/* Dates Tab */}
              <TabsContent value="dates" className="space-y-4 mt-4">
                {/* Planned Dates */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-1 heading-card">
                    <CalendarDays className="h-4 w-4" />
                    Planned Dates
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planned_start">Start Date</Label>
                      <Input
                        id="planned_start"
                        type="date"
                        {...form.register('planned_start')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planned_finish">Finish Date</Label>
                      <Input
                        id="planned_finish"
                        type="date"
                        {...form.register('planned_finish')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planned_duration" className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Duration (days)
                      </Label>
                      <Input
                        id="planned_duration"
                        type="number"
                        min="0"
                        {...form.register('planned_duration', { valueAsNumber: true })}
                        disabled={isMilestone}
                      />
                    </div>
                  </div>
                </div>

                {/* Actual Dates (edit mode only) */}
                {isEditing && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium heading-card">Actual Dates</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="actual_start">Actual Start</Label>
                        <Input
                          id="actual_start"
                          type="date"
                          {...form.register('actual_start')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actual_finish">Actual Finish</Label>
                        <Input
                          id="actual_finish"
                          type="date"
                          {...form.register('actual_finish')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Duration Type */}
                <div className="space-y-2">
                  <Label>Duration Type</Label>
                  <Select
                    value={form.watch('duration_type')}
                    onValueChange={(value) => form.setValue('duration_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress (edit mode only) */}
                {isEditing && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium heading-card">Progress</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={form.watch('status')}
                          onValueChange={(value) => form.setValue('status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                                  {status.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Percent Complete: {form.watch('percent_complete')}%</Label>
                        <Slider
                          value={[form.watch('percent_complete')]}
                          onValueChange={(value) => form.setValue('percent_complete', value[0])}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Assignment Tab */}
              <TabsContent value="assignment" className="space-y-4 mt-4">
                {/* Responsible Party */}
                <div className="space-y-2">
                  <Label htmlFor="responsible_party" className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Responsible Party
                  </Label>
                  <Input
                    id="responsible_party"
                    {...form.register('responsible_party')}
                    placeholder="e.g., ABC Contractors"
                  />
                </div>

                {/* Assigned User */}
                {users.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assigned User</Label>
                    <Select
                      value={form.watch('responsible_user_id') || ''}
                      onValueChange={(value) => form.setValue('responsible_user_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- None --</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subcontractor */}
                {subcontractors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Subcontractor</Label>
                    <Select
                      value={form.watch('subcontractor_id') || ''}
                      onValueChange={(value) => form.setValue('subcontractor_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcontractor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- None --</SelectItem>
                        {subcontractors.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Work Calendar */}
                <div className="space-y-2">
                  <Label>Work Calendar</Label>
                  <CalendarSelector
                    value={form.watch('calendar_id') || null}
                    onChange={(id) => form.setValue('calendar_id', id || '')}
                    companyId={companyId}
                    projectId={projectId}
                    showCreateButton
                    onCreateClick={() => setShowCalendarDialog(true)}
                  />
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Constraints */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-1 heading-card">
                    <AlertCircle className="h-4 w-4" />
                    Constraints
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Constraint Type</Label>
                      <Select
                        value={form.watch('constraint_type') || ''}
                        onValueChange={(value) => form.setValue('constraint_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No constraint" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- No Constraint --</SelectItem>
                          {CONSTRAINT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="constraint_date">Constraint Date</Label>
                      <Input
                        id="constraint_date"
                        type="date"
                        {...form.register('constraint_date')}
                        disabled={!form.watch('constraint_type')}
                      />
                    </div>
                  </div>
                </div>

                {/* Cost & Hours */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-1 heading-card">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budgeted_cost">Budgeted Cost ($)</Label>
                      <Input
                        id="budgeted_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register('budgeted_cost', { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budgeted_labor_hours">Budgeted Labor Hours</Label>
                      <Input
                        id="budgeted_labor_hours"
                        type="number"
                        min="0"
                        step="0.5"
                        {...form.register('budgeted_labor_hours', { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register('notes')}
                    placeholder="Additional notes or comments..."
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Activity' : 'Create Activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calendar Creation Dialog */}
      <CalendarConfigDialog
        open={showCalendarDialog}
        onOpenChange={setShowCalendarDialog}
        companyId={companyId}
        projectId={projectId}
        onSubmit={handleCreateCalendar}
        isLoading={createCalendarMutation.isPending}
      />
    </>
  )
}
