/**
 * Scheduled Report Form
 *
 * Form for creating and editing scheduled report delivery configurations.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Calendar,
  Clock,
  Mail,
  FileText,
  Plus,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReportTemplates,
  useScheduledReport,
  useCreateScheduledReport,
  useUpdateScheduledReport,
} from '../hooks/useReportBuilder'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  SCHEDULE_FREQUENCY_CONFIG,
  OUTPUT_FORMAT_CONFIG,
  isValidEmail,
  type CreateScheduledReportDTO,
  type UpdateScheduledReportDTO,
  type ReportScheduleFrequency,
  type ReportOutputFormat,
} from '@/types/report-builder'
import { logger } from '../../../lib/utils/logger';


// Form schema
const scheduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  template_id: z.string().min(1, 'Report template is required'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']),
  day_of_week: z.number().min(0).max(6).optional().nullable(),
  day_of_month: z.number().min(1).max(31).optional().nullable(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  timezone: z.string().min(1, 'Timezone is required'),
  output_format: z.enum(['pdf', 'excel', 'csv']),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  email_subject: z.string().max(500).optional().nullable(),
  email_body: z.string().max(2000).optional().nullable(),
  project_id: z.string().optional().nullable(),
  is_active: z.boolean(),
})

type ScheduleFormData = z.infer<typeof scheduleFormSchema>

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'UTC', label: 'UTC' },
]

// Days of week
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface ScheduledReportFormProps {
  scheduleId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ScheduledReportForm({ scheduleId, onSuccess, onCancel }: ScheduledReportFormProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedTemplateId = searchParams.get('template')

  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  // State
  const [newRecipient, setNewRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')

  // Queries
  const { data: templates, isLoading: templatesLoading } = useReportTemplates({
    company_id: companyId ?? undefined,
  })
  const { data: projects } = useProjects()
  const { data: existingSchedule, isLoading: scheduleLoading } = useScheduledReport(scheduleId)

  // Mutations
  const createSchedule = useCreateScheduledReport()
  const updateSchedule = useUpdateScheduledReport()

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: '',
      description: null,
      template_id: preselectedTemplateId || '',
      frequency: 'weekly',
      day_of_week: 1, // Monday
      day_of_month: 1,
      time_of_day: '08:00',
      timezone: 'America/New_York',
      output_format: 'pdf',
      recipients: [],
      email_subject: null,
      email_body: null,
      project_id: null,
      is_active: true,
    },
  })

  const frequency = watch('frequency')
  const recipients = watch('recipients')

  // Load existing schedule data
  useEffect(() => {
    if (existingSchedule) {
      setValue('name', existingSchedule.name)
      setValue('description', existingSchedule.description)
      setValue('template_id', existingSchedule.template_id)
      setValue('frequency', existingSchedule.frequency as ReportScheduleFrequency)
      setValue('day_of_week', existingSchedule.day_of_week)
      setValue('day_of_month', existingSchedule.day_of_month)
      setValue('time_of_day', existingSchedule.time_of_day.slice(0, 5))
      setValue('timezone', existingSchedule.timezone)
      setValue('output_format', existingSchedule.output_format as ReportOutputFormat)
      setValue('recipients', existingSchedule.recipients || [])
      setValue('email_subject', existingSchedule.email_subject)
      setValue('email_body', existingSchedule.email_body)
      setValue('project_id', existingSchedule.project_id)
      setValue('is_active', existingSchedule.is_active)
    }
  }, [existingSchedule, setValue])

  // Add recipient
  const handleAddRecipient = () => {
    const email = newRecipient.trim().toLowerCase()

    if (!email) {
      setRecipientError('Please enter an email address')
      return
    }

    if (!isValidEmail(email)) {
      setRecipientError('Please enter a valid email address')
      return
    }

    if (recipients.includes(email)) {
      setRecipientError('This email is already added')
      return
    }

    setValue('recipients', [...recipients, email])
    setNewRecipient('')
    setRecipientError('')
  }

  // Remove recipient
  const handleRemoveRecipient = (email: string) => {
    setValue('recipients', recipients.filter((r) => r !== email))
  }

  // Form submit
  const onSubmit = async (data: ScheduleFormData) => {
    if (!companyId) {return}

    try {
      if (scheduleId) {
        // Update existing
        const updateData: UpdateScheduledReportDTO = {
          name: data.name,
          description: data.description,
          frequency: data.frequency,
          day_of_week: data.day_of_week,
          day_of_month: data.day_of_month,
          time_of_day: `${data.time_of_day}:00`,
          timezone: data.timezone,
          output_format: data.output_format,
          recipients: data.recipients,
          email_subject: data.email_subject,
          email_body: data.email_body,
          project_id: data.project_id,
          is_active: data.is_active,
        }
        await updateSchedule.mutateAsync({ id: scheduleId, data: updateData })
      } else {
        // Create new
        const createData: CreateScheduledReportDTO = {
          template_id: data.template_id,
          company_id: companyId,
          name: data.name,
          description: data.description,
          frequency: data.frequency,
          day_of_week: data.day_of_week,
          day_of_month: data.day_of_month,
          time_of_day: `${data.time_of_day}:00`,
          timezone: data.timezone,
          output_format: data.output_format,
          recipients: data.recipients,
          email_subject: data.email_subject,
          email_body: data.email_body,
          project_id: data.project_id,
          is_active: data.is_active,
        }
        await createSchedule.mutateAsync(createData)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/reports')
      }
    } catch (error) {
      logger.error('Failed to save schedule:', error)
    }
  }

  // Cancel handler
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/reports')
    }
  }

  // Loading state
  if (scheduleId && scheduleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Details
          </CardTitle>
          <CardDescription>
            Configure when and how the report should be generated and delivered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Schedule Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Weekly Progress Report"
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Report Template *</Label>
            <Controller
              name="template_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={templatesLoading || !!scheduleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a report template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.template_id && (
              <p className="text-sm text-error">{errors.template_id.message}</p>
            )}
          </div>

          {/* Project Filter (optional) */}
          <div className="space-y-2">
            <Label>Project Filter (Optional)</Label>
            <Controller
              name="project_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'all'}
                  onValueChange={(v) => field.onChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Filter report data to a specific project
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this scheduled report
              </p>
            </div>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_FREQUENCY_CONFIG.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label} - {freq.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Day of Week (for weekly/biweekly) */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div className="space-y-2">
              <Label>Day of Week *</Label>
              <Controller
                name="day_of_week"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value ?? 1)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Day of Month (for monthly/quarterly) */}
          {(frequency === 'monthly' || frequency === 'quarterly') && (
            <div className="space-y-2">
              <Label>Day of Month *</Label>
              <Controller
                name="day_of_month"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value ?? 1)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day === 1
                            ? '1st'
                            : day === 2
                            ? '2nd'
                            : day === 3
                            ? '3rd'
                            : `${day}th`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Time of Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time_of_day">Time *</Label>
              <Input
                id="time_of_day"
                type="time"
                {...register('time_of_day')}
              />
              {errors.time_of_day && (
                <p className="text-sm text-error">{errors.time_of_day.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Timezone *</Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <Label>Output Format *</Label>
            <Controller
              name="output_format"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMAT_CONFIG.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Recipients
          </CardTitle>
          <CardDescription>
            Add email addresses to receive the scheduled report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Recipient */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddRecipient()
                }
              }}
            />
            <Button type="button" onClick={handleAddRecipient}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {recipientError && (
            <p className="text-sm text-error">{recipientError}</p>
          )}
          {errors.recipients && (
            <p className="text-sm text-error">{errors.recipients.message}</p>
          )}

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipients.map((email) => (
                <Badge key={email} variant="secondary" className="pl-2 pr-1 py-1">
                  {email}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-1 hover:bg-error-light"
                    onClick={() => handleRemoveRecipient(email)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {recipients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No recipients added yet. Add at least one email address.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Customization
          </CardTitle>
          <CardDescription>
            Customize the email subject and body (optional).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email_subject">Custom Subject</Label>
            <Input
              id="email_subject"
              {...register('email_subject')}
              placeholder="Leave blank for default subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_body">Custom Message</Label>
            <Textarea
              id="email_body"
              {...register('email_body')}
              placeholder="Add a custom message to include in the email (optional)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {scheduleId ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  )
}

export default ScheduledReportForm
