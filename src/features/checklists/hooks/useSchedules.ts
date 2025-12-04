// File: /src/features/checklists/hooks/useSchedules.ts
// React Query hooks for checklist schedules (client-side implementation)
// Enhancement: #7 - Reminders and Recurring Checklists

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type {
  ChecklistSchedule,
  ChecklistScheduleWithRelations,
  CreateChecklistScheduleDTO,
  UpdateChecklistScheduleDTO,
  ScheduleFilters,
  ScheduleStatistics,
} from '@/types/checklist-schedules'
import { calculateNextExecutionDate } from '@/types/checklist-schedules'
import { useAuth } from '@/lib/auth/AuthContext'

// LocalStorage key
const SCHEDULES_STORAGE_KEY = 'checklist_schedules'

/**
 * Get all schedules from localStorage
 */
function getSchedulesFromStorage(): ChecklistSchedule[] {
  try {
    const stored = localStorage.getItem(SCHEDULES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load schedules:', error)
    return []
  }
}

/**
 * Save schedules to localStorage
 */
function saveSchedulesToStorage(schedules: ChecklistSchedule[]): void {
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules))
  } catch (error) {
    console.error('Failed to save schedules:', error)
  }
}

/**
 * Fetch all schedules with optional filters
 */
export function useSchedules(filters?: ScheduleFilters) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['checklist-schedules', filters],
    queryFn: () => {
      let schedules = getSchedulesFromStorage()

      // Filter by company
      if (userProfile?.company_id) {
        schedules = schedules.filter((s) => s.company_id === userProfile.company_id)
      }

      // Apply filters
      if (filters?.project_id) {
        schedules = schedules.filter((s) => s.project_id === filters.project_id)
      }

      if (filters?.status) {
        schedules = schedules.filter((s) => s.status === filters.status)
      }

      if (filters?.frequency) {
        schedules = schedules.filter((s) => s.frequency === filters.frequency)
      }

      if (filters?.is_active !== undefined) {
        schedules = schedules.filter((s) => s.is_active === filters.is_active)
      }

      if (filters?.template_id) {
        schedules = schedules.filter(
          (s) => s.checklist_template_id === filters.template_id
        )
      }

      return schedules
    },
  })
}

/**
 * Fetch a single schedule by ID
 */
export function useSchedule(scheduleId: string) {
  return useQuery({
    queryKey: ['checklist-schedule', scheduleId],
    queryFn: () => {
      const schedules = getSchedulesFromStorage()
      const schedule = schedules.find((s) => s.id === scheduleId)

      if (!schedule) {
        throw new Error('Schedule not found')
      }

      return schedule
    },
    enabled: !!scheduleId,
  })
}

/**
 * Get schedule statistics
 */
export function useScheduleStatistics(filters?: ScheduleFilters) {
  const { data: schedules = [] } = useSchedules(filters)

  return useQuery({
    queryKey: ['checklist-schedule-statistics', filters],
    queryFn: (): ScheduleStatistics => {
      const activeSchedules = schedules.filter((s) => s.is_active && s.status === 'active')

      const stats: ScheduleStatistics = {
        total_schedules: schedules.length,
        active_schedules: activeSchedules.length,
        paused_schedules: schedules.filter((s) => s.status === 'paused').length,
        total_executions_created: schedules.reduce(
          (sum, s) => sum + s.total_executions_created,
          0
        ),
        upcoming_due_count: 0,
        overdue_count: 0,
      }

      // Calculate upcoming/overdue
      const now = new Date()
      activeSchedules.forEach((schedule) => {
        if (schedule.next_execution_date) {
          const nextDate = new Date(schedule.next_execution_date)
          if (nextDate <= now) {
            stats.overdue_count++
          } else if (nextDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            stats.upcoming_due_count++
          }
        }
      })

      return stats
    },
    enabled: schedules.length > 0,
  })
}

/**
 * Create a new schedule
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient()
  const { userProfile, user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateChecklistScheduleDTO) => {
      const schedules = getSchedulesFromStorage()

      const newSchedule: ChecklistSchedule = {
        id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        company_id: userProfile?.company_id || '',
        project_id: data.project_id,
        checklist_template_id: data.checklist_template_id,
        name: data.name,
        description: data.description || null,
        frequency: data.frequency,
        interval: data.interval || 1,
        start_date: data.start_date,
        end_date: data.end_date || null,
        days_of_week: data.days_of_week || null,
        day_of_month: data.day_of_month || null,
        time_of_day: data.time_of_day || null,
        assigned_user_id: data.assigned_user_id || null,
        assigned_user_name: null,
        reminder_enabled: data.reminder_enabled || false,
        reminder_hours_before: data.reminder_hours_before || 24,
        status: 'active',
        is_active: true,
        last_execution_date: null,
        next_execution_date: calculateNextExecutionDate({
          ...({} as ChecklistSchedule),
          start_date: data.start_date,
          frequency: data.frequency,
          interval: data.interval || 1,
          last_execution_date: null,
          end_date: data.end_date || null,
          day_of_month: data.day_of_month || null,
        }).toISOString(),
        total_executions_created: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.id || '',
        deleted_at: null,
      }

      schedules.push(newSchedule)
      saveSchedulesToStorage(schedules)

      return Promise.resolve(newSchedule)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['checklist-schedule-statistics'] })
      toast.success('Schedule created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create schedule')
    },
  })
}

/**
 * Update an existing schedule
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: UpdateChecklistScheduleDTO & { id: string }) => {
      const schedules = getSchedulesFromStorage()
      const index = schedules.findIndex((s) => s.id === id)

      if (index === -1) {
        throw new Error('Schedule not found')
      }

      const updatedSchedule = {
        ...schedules[index],
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Recalculate next execution date if schedule parameters changed
      if (
        updates.frequency ||
        updates.interval ||
        updates.start_date ||
        updates.days_of_week ||
        updates.day_of_month
      ) {
        updatedSchedule.next_execution_date = calculateNextExecutionDate(
          updatedSchedule
        ).toISOString()
      }

      schedules[index] = updatedSchedule
      saveSchedulesToStorage(schedules)

      return Promise.resolve(updatedSchedule)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['checklist-schedule', data.id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-schedule-statistics'] })
      toast.success('Schedule updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update schedule')
    },
  })
}

/**
 * Delete a schedule
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: string) => {
      const schedules = getSchedulesFromStorage()
      const filtered = schedules.filter((s) => s.id !== scheduleId)
      saveSchedulesToStorage(filtered)
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['checklist-schedule-statistics'] })
      toast.success('Schedule deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete schedule')
    },
  })
}

/**
 * Pause a schedule
 */
export function usePauseSchedule() {
  const updateSchedule = useUpdateSchedule()

  return useMutation({
    mutationFn: (scheduleId: string) => {
      return updateSchedule.mutateAsync({
        id: scheduleId,
        status: 'paused',
        is_active: false,
      })
    },
  })
}

/**
 * Resume a paused schedule
 */
export function useResumeSchedule() {
  const updateSchedule = useUpdateSchedule()

  return useMutation({
    mutationFn: (scheduleId: string) => {
      return updateSchedule.mutateAsync({
        id: scheduleId,
        status: 'active',
        is_active: true,
      })
    },
  })
}

/**
 * Mark schedule as completed (reached end date or manually completed)
 */
export function useCompleteSchedule() {
  const updateSchedule = useUpdateSchedule()

  return useMutation({
    mutationFn: (scheduleId: string) => {
      return updateSchedule.mutateAsync({
        id: scheduleId,
        status: 'completed',
        is_active: false,
      })
    },
  })
}
