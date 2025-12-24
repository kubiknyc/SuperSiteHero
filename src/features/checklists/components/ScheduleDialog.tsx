// File: /src/features/checklists/components/ScheduleDialog.tsx
// Dialog for creating and editing recurring checklist schedules
// Enhancement: #7 - Reminders and Recurring Checklists

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Bell,
  User,
  Save,
  AlertCircle,
} from 'lucide-react'
import type {
  ChecklistSchedule,
  CreateChecklistScheduleDTO,
  RecurrenceFrequency,
  DayOfWeek,
} from '@/types/checklist-schedules'
import { getFrequencyLabel, getDayOfWeekLabel } from '@/types/checklist-schedules'
import { format } from 'date-fns'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CreateChecklistScheduleDTO) => void
  schedule?: ChecklistSchedule | null
  templateId: string
  templateName: string
  projectId: string
}

export function ScheduleDialog({
  open,
  onOpenChange,
  onSave,
  schedule,
  templateId,
  templateName,
  projectId,
}: ScheduleDialogProps) {
  const [formData, setFormData] = useState<CreateChecklistScheduleDTO>({
    project_id: projectId,
    checklist_template_id: templateId,
    name: `${templateName} - Recurring`,
    description: '',
    frequency: 'weekly',
    interval: 1,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: null,
    days_of_week: ['monday'],
    day_of_month: 1,
    time_of_day: '09:00',
    reminder_enabled: true,
    reminder_hours_before: 24,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form if editing
  useEffect(() => {
    if (schedule) {
      setFormData({
        project_id: schedule.project_id,
        checklist_template_id: schedule.checklist_template_id,
        name: schedule.name,
        description: schedule.description || '',
        frequency: schedule.frequency,
        interval: schedule.interval,
        start_date: format(new Date(schedule.start_date), 'yyyy-MM-dd'),
        end_date: schedule.end_date ? format(new Date(schedule.end_date), 'yyyy-MM-dd') : null,
        days_of_week: schedule.days_of_week,
        day_of_month: schedule.day_of_month,
        time_of_day: schedule.time_of_day,
        assigned_user_id: schedule.assigned_user_id,
        reminder_enabled: schedule.reminder_enabled,
        reminder_hours_before: schedule.reminder_hours_before,
      })
    }
  }, [schedule])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Schedule name is required'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date'
    }

    if (formData.frequency === 'weekly' && (!formData.days_of_week || formData.days_of_week.length === 0)) {
      newErrors.days_of_week = 'Select at least one day of the week'
    }

    if (formData.frequency === 'monthly' && (!formData.day_of_month || formData.day_of_month < 1 || formData.day_of_month > 31)) {
      newErrors.day_of_month = 'Day of month must be between 1 and 31'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validate()) {
      onSave(formData)
      onOpenChange(false)
    }
  }

  const toggleDayOfWeek = (day: DayOfWeek) => {
    const current = formData.days_of_week || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day]

    setFormData({ ...formData, days_of_week: updated })
  }

  const allDaysOfWeek: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  if (!open) {return null}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                {schedule ? 'Edit Schedule' : 'Create Recurring Schedule'}
              </CardTitle>
              <CardDescription className="mt-2">
                Automatically create checklists on a recurring basis
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Template Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Template:</strong> {templateName}
            </p>
          </div>

          {/* Schedule Name */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Schedule Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekly Safety Inspection"
            />
            {errors.name && (
              <p className="text-sm text-error mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full min-h-[80px] rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Optional description..."
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                <Repeat className="w-4 h-4" />
                Frequency *
              </label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency })
                }
                className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {(formData.frequency === 'daily' ||
              formData.frequency === 'weekly' ||
              formData.frequency === 'monthly' ||
              formData.frequency === 'yearly') && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Interval
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({ ...formData, interval: parseInt(e.target.value) || 1 })
                  }
                />
                <p className="text-xs text-muted mt-1">
                  {getFrequencyLabel(formData.frequency, formData.interval)}
                </p>
              </div>
            )}
          </div>

          {/* Days of Week (for weekly schedules) */}
          {formData.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Days of Week *
              </label>
              <div className="flex flex-wrap gap-2">
                {allDaysOfWeek.map((day) => (
                  <Badge
                    key={day}
                    variant={formData.days_of_week?.includes(day) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-info-light"
                    onClick={() => toggleDayOfWeek(day)}
                  >
                    {getDayOfWeekLabel(day)}
                  </Badge>
                ))}
              </div>
              {errors.days_of_week && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.days_of_week}
                </p>
              )}
            </div>
          )}

          {/* Day of Month (for monthly schedules) */}
          {formData.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Day of Month *
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month || ''}
                onChange={(e) =>
                  setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })
                }
                placeholder="1-31"
              />
              {errors.day_of_month && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.day_of_month}
                </p>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              {errors.start_date && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.start_date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                End Date (Optional)
              </label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value || null })
                }
              />
              {errors.end_date && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.end_date}
                </p>
              )}
              <p className="text-xs text-muted mt-1">Leave empty for indefinite</p>
            </div>
          </div>

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Time of Day
            </label>
            <Input
              type="time"
              value={formData.time_of_day || ''}
              onChange={(e) =>
                setFormData({ ...formData, time_of_day: e.target.value || null })
              }
            />
            <p className="text-xs text-muted mt-1">
              When to create the checklist each occurrence
            </p>
          </div>

          {/* Reminders */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary">
                <Bell className="w-4 h-4" />
                Enable Reminders
              </label>
              <input
                type="checkbox"
                checked={formData.reminder_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, reminder_enabled: e.target.checked })
                }
                className="w-4 h-4 text-primary border-input rounded"
              />
            </div>

            {formData.reminder_enabled && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Remind Hours Before Due
                </label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.reminder_hours_before}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminder_hours_before: parseInt(e.target.value) || 24,
                    })
                  }
                />
                <p className="text-xs text-muted mt-1">
                  Send reminder notification before the checklist is due
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
