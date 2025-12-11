/**
 * Calendar Configuration Dialog
 *
 * Dialog for creating and editing work calendars with day-by-day hour settings.
 * Supports preset templates for common work schedules.
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
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Calendar, Clock, Info } from 'lucide-react'
import type { ScheduleCalendar, CreateScheduleCalendarDTO } from '@/types/schedule-activities'

// =============================================
// Constants
// =============================================

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
] as const

type DayKey = (typeof DAYS_OF_WEEK)[number]['key']

interface CalendarPreset {
  name: string
  description: string
  hours: Record<DayKey, number>
  workStart: string
  workEnd: string
}

const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    name: 'Standard 5-Day',
    description: 'Mon-Fri, 8h/day (40h/week)',
    hours: {
      sunday: 0,
      monday: 8,
      tuesday: 8,
      wednesday: 8,
      thursday: 8,
      friday: 8,
      saturday: 0,
    },
    workStart: '07:00',
    workEnd: '17:00',
  },
  {
    name: 'Extended 6-Day',
    description: 'Mon-Sat, 8h/day (48h/week)',
    hours: {
      sunday: 0,
      monday: 8,
      tuesday: 8,
      wednesday: 8,
      thursday: 8,
      friday: 8,
      saturday: 8,
    },
    workStart: '07:00',
    workEnd: '17:00',
  },
  {
    name: '4x10 Schedule',
    description: 'Mon-Thu, 10h/day (40h/week)',
    hours: {
      sunday: 0,
      monday: 10,
      tuesday: 10,
      wednesday: 10,
      thursday: 10,
      friday: 0,
      saturday: 0,
    },
    workStart: '06:00',
    workEnd: '17:00',
  },
  {
    name: '7-Day Operations',
    description: 'All days, 8h/day (56h/week)',
    hours: {
      sunday: 8,
      monday: 8,
      tuesday: 8,
      wednesday: 8,
      thursday: 8,
      friday: 8,
      saturday: 8,
    },
    workStart: '07:00',
    workEnd: '17:00',
  },
]

// =============================================
// Form Schema
// =============================================

const calendarSchema = z.object({
  name: z
    .string()
    .min(1, 'Calendar name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_default: z.boolean(),
  work_start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  work_end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  sunday_hours: z.number().min(0).max(24),
  monday_hours: z.number().min(0).max(24),
  tuesday_hours: z.number().min(0).max(24),
  wednesday_hours: z.number().min(0).max(24),
  thursday_hours: z.number().min(0).max(24),
  friday_hours: z.number().min(0).max(24),
  saturday_hours: z.number().min(0).max(24),
})

type CalendarFormValues = z.infer<typeof calendarSchema>

// =============================================
// Component Props
// =============================================

interface CalendarConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar?: ScheduleCalendar | null
  companyId: string
  projectId?: string
  onSubmit: (data: CreateScheduleCalendarDTO) => Promise<void>
  isLoading?: boolean
}

// =============================================
// Component
// =============================================

export function CalendarConfigDialog({
  open,
  onOpenChange,
  calendar,
  companyId,
  projectId,
  onSubmit,
  isLoading = false,
}: CalendarConfigDialogProps) {
  const isEditing = !!calendar

  const form = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarSchema),
    defaultValues: {
      name: calendar?.name || '',
      description: calendar?.description || '',
      is_default: calendar?.is_default || false,
      work_start_time: calendar?.work_start_time || '07:00',
      work_end_time: calendar?.work_end_time || '17:00',
      sunday_hours: calendar?.sunday_hours ?? 0,
      monday_hours: calendar?.monday_hours ?? 8,
      tuesday_hours: calendar?.tuesday_hours ?? 8,
      wednesday_hours: calendar?.wednesday_hours ?? 8,
      thursday_hours: calendar?.thursday_hours ?? 8,
      friday_hours: calendar?.friday_hours ?? 8,
      saturday_hours: calendar?.saturday_hours ?? 0,
    },
  })

  // Reset form when calendar changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: calendar?.name || '',
        description: calendar?.description || '',
        is_default: calendar?.is_default || false,
        work_start_time: calendar?.work_start_time || '07:00',
        work_end_time: calendar?.work_end_time || '17:00',
        sunday_hours: calendar?.sunday_hours ?? 0,
        monday_hours: calendar?.monday_hours ?? 8,
        tuesday_hours: calendar?.tuesday_hours ?? 8,
        wednesday_hours: calendar?.wednesday_hours ?? 8,
        thursday_hours: calendar?.thursday_hours ?? 8,
        friday_hours: calendar?.friday_hours ?? 8,
        saturday_hours: calendar?.saturday_hours ?? 0,
      })
    }
  }, [open, calendar, form])

  // Calculate total weekly hours
  const totalHours = React.useMemo(() => {
    const values = form.watch()
    return (
      (values.sunday_hours || 0) +
      (values.monday_hours || 0) +
      (values.tuesday_hours || 0) +
      (values.wednesday_hours || 0) +
      (values.thursday_hours || 0) +
      (values.friday_hours || 0) +
      (values.saturday_hours || 0)
    )
  }, [
    form.watch('sunday_hours'),
    form.watch('monday_hours'),
    form.watch('tuesday_hours'),
    form.watch('wednesday_hours'),
    form.watch('thursday_hours'),
    form.watch('friday_hours'),
    form.watch('saturday_hours'),
  ])

  // Apply preset template
  const applyPreset = (preset: CalendarPreset) => {
    form.setValue('sunday_hours', preset.hours.sunday)
    form.setValue('monday_hours', preset.hours.monday)
    form.setValue('tuesday_hours', preset.hours.tuesday)
    form.setValue('wednesday_hours', preset.hours.wednesday)
    form.setValue('thursday_hours', preset.hours.thursday)
    form.setValue('friday_hours', preset.hours.friday)
    form.setValue('saturday_hours', preset.hours.saturday)
    form.setValue('work_start_time', preset.workStart)
    form.setValue('work_end_time', preset.workEnd)
  }

  const handleSubmit = async (values: CalendarFormValues) => {
    const data: CreateScheduleCalendarDTO = {
      company_id: companyId,
      project_id: projectId,
      name: values.name,
      description: values.description || undefined,
      is_default: values.is_default,
      work_start_time: values.work_start_time,
      work_end_time: values.work_end_time,
      sunday_hours: values.sunday_hours,
      monday_hours: values.monday_hours,
      tuesday_hours: values.tuesday_hours,
      wednesday_hours: values.wednesday_hours,
      thursday_hours: values.thursday_hours,
      friday_hours: values.friday_hours,
      saturday_hours: values.saturday_hours,
    }

    await onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? 'Edit Calendar' : 'Create Calendar'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the work calendar settings.'
              : 'Create a new work calendar to define working days and hours.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Calendar Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Standard Work Week"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Optional description of this calendar..."
              rows={2}
            />
          </div>

          {/* Default Calendar */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={form.watch('is_default')}
              onCheckedChange={(checked) => form.setValue('is_default', !!checked)}
            />
            <Label htmlFor="is_default" className="text-sm font-normal">
              Set as default calendar for new activities
            </Label>
          </div>

          {/* Preset Templates */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Quick Setup
            </Label>
            <Select onValueChange={(value) => applyPreset(CALENDAR_PRESETS[parseInt(value)])}>
              <SelectTrigger>
                <SelectValue placeholder="Apply a preset template..." />
              </SelectTrigger>
              <SelectContent>
                {CALENDAR_PRESETS.map((preset, index) => (
                  <SelectItem key={preset.name} value={index.toString()}>
                    <div className="flex flex-col">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Work Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Work Hours
              </Label>
              <span className="text-sm font-medium text-blue-600">
                Total: {totalHours}h/week
              </span>
            </div>

            {/* Work Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work_start_time" className="text-xs">
                  Start Time
                </Label>
                <Input
                  id="work_start_time"
                  type="time"
                  {...form.register('work_start_time')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_end_time" className="text-xs">
                  End Time
                </Label>
                <Input
                  id="work_end_time"
                  type="time"
                  {...form.register('work_end_time')}
                />
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-medium px-3 py-2">Day</th>
                    <th className="text-center text-xs font-medium px-3 py-2">Hours</th>
                    <th className="text-center text-xs font-medium px-3 py-2">Work Day</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day) => {
                    const fieldName = `${day.key}_hours` as keyof CalendarFormValues
                    const hours = form.watch(fieldName) as number
                    const isWorkDay = hours > 0

                    return (
                      <tr
                        key={day.key}
                        className={`border-t ${isWorkDay ? 'bg-green-50/50' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-3 py-2 text-sm">{day.label}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            className="w-20 h-8 text-center mx-auto"
                            {...form.register(fieldName, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={isWorkDay}
                            onCheckedChange={(checked) => {
                              form.setValue(fieldName, checked ? 8 : 0)
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scope indicator */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            {projectId
              ? 'This calendar will be available only for this project.'
              : 'This calendar will be available company-wide for all projects.'}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Calendar' : 'Create Calendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
