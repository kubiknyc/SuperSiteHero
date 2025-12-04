// File: /src/types/checklist-schedules.ts
// Types for recurring checklist schedules and reminders
// Enhancement: #7 - Reminders and Recurring Checklists

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/**
 * Checklist Schedule Configuration
 * Defines when and how checklists should be automatically created
 */
export interface ChecklistSchedule {
  id: string
  company_id: string
  project_id: string
  checklist_template_id: string

  // Schedule Info
  name: string
  description: string | null

  // Recurrence Settings
  frequency: RecurrenceFrequency
  interval: number // e.g., every 2 weeks, every 3 months
  start_date: string // ISO date string
  end_date: string | null // null = indefinite

  // Weekly/Monthly specific settings
  days_of_week: DayOfWeek[] | null // For weekly schedules
  day_of_month: number | null // For monthly schedules (1-31)

  // Time settings
  time_of_day: string | null // HH:mm format, when to create the checklist

  // Assignment
  assigned_user_id: string | null
  assigned_user_name: string | null

  // Reminders
  reminder_enabled: boolean
  reminder_hours_before: number // How many hours before due to send reminder

  // Status
  status: ScheduleStatus
  is_active: boolean

  // Tracking
  last_execution_date: string | null
  next_execution_date: string | null
  total_executions_created: number

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  deleted_at: string | null
}

/**
 * Schedule with related data
 */
export interface ChecklistScheduleWithRelations extends ChecklistSchedule {
  template_name?: string
  project_name?: string
  recent_executions?: Array<{
    id: string
    name: string
    created_at: string
    is_completed: boolean
    score_percentage: number | null
  }>
}

/**
 * DTO for creating a new schedule
 */
export interface CreateChecklistScheduleDTO {
  project_id: string
  checklist_template_id: string
  name: string
  description?: string
  frequency: RecurrenceFrequency
  interval?: number
  start_date: string
  end_date?: string | null
  days_of_week?: DayOfWeek[] | null
  day_of_month?: number | null
  time_of_day?: string | null
  assigned_user_id?: string | null
  reminder_enabled?: boolean
  reminder_hours_before?: number
}

/**
 * DTO for updating a schedule
 */
export interface UpdateChecklistScheduleDTO {
  name?: string
  description?: string | null
  frequency?: RecurrenceFrequency
  interval?: number
  start_date?: string
  end_date?: string | null
  days_of_week?: DayOfWeek[] | null
  day_of_month?: number | null
  time_of_day?: string | null
  assigned_user_id?: string | null
  assigned_user_name?: string | null
  reminder_enabled?: boolean
  reminder_hours_before?: number
  status?: ScheduleStatus
  is_active?: boolean
}

/**
 * Reminder notification for upcoming checklists
 */
export interface ChecklistReminder {
  id: string
  schedule_id: string
  checklist_execution_id: string | null

  // Reminder details
  reminder_type: 'upcoming' | 'overdue' | 'created'
  due_date: string
  hours_until_due: number

  // Status
  is_sent: boolean
  is_dismissed: boolean
  sent_at: string | null
  dismissed_at: string | null

  // Related data
  schedule: ChecklistSchedule

  created_at: string
}

/**
 * Schedule filters
 */
export interface ScheduleFilters {
  project_id?: string
  status?: ScheduleStatus
  frequency?: RecurrenceFrequency
  is_active?: boolean
  template_id?: string
}

/**
 * Schedule statistics
 */
export interface ScheduleStatistics {
  total_schedules: number
  active_schedules: number
  paused_schedules: number
  total_executions_created: number
  upcoming_due_count: number
  overdue_count: number
}

/**
 * Helper to get frequency display name
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency, interval: number = 1): string {
  const prefix = interval > 1 ? `Every ${interval} ` : ''

  switch (frequency) {
    case 'daily':
      return interval > 1 ? `${prefix}days` : 'Daily'
    case 'weekly':
      return interval > 1 ? `${prefix}weeks` : 'Weekly'
    case 'biweekly':
      return 'Every 2 weeks'
    case 'monthly':
      return interval > 1 ? `${prefix}months` : 'Monthly'
    case 'quarterly':
      return 'Quarterly'
    case 'yearly':
      return interval > 1 ? `${prefix}years` : 'Yearly'
  }
}

/**
 * Helper to get day of week display name
 */
export function getDayOfWeekLabel(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

/**
 * Helper to calculate next execution date based on schedule
 */
export function calculateNextExecutionDate(schedule: ChecklistSchedule): Date {
  const now = new Date()
  const startDate = new Date(schedule.start_date)
  let nextDate = new Date(schedule.last_execution_date || schedule.start_date)

  // If we haven't started yet, return start date
  if (now < startDate) {
    return startDate
  }

  // Calculate next date based on frequency
  switch (schedule.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + schedule.interval)
      break
    case 'weekly':
    case 'biweekly':
      const weekInterval = schedule.frequency === 'biweekly' ? 2 : schedule.interval
      nextDate.setDate(nextDate.getDate() + (7 * weekInterval))
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + schedule.interval)
      if (schedule.day_of_month) {
        nextDate.setDate(schedule.day_of_month)
      }
      break
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + schedule.interval)
      break
  }

  // Check if we've passed the end date
  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date)
    if (nextDate > endDate) {
      return endDate
    }
  }

  return nextDate
}

/**
 * Check if a schedule is due for execution
 */
export function isScheduleDue(schedule: ChecklistSchedule): boolean {
  if (!schedule.is_active || schedule.status !== 'active') {
    return false
  }

  const now = new Date()
  const nextExecution = schedule.next_execution_date
    ? new Date(schedule.next_execution_date)
    : calculateNextExecutionDate(schedule)

  return now >= nextExecution
}

/**
 * Get hours until due
 */
export function getHoursUntilDue(dueDate: string | Date): number {
  const now = new Date()
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const diffMs = due.getTime() - now.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60))
}
