/**
 * Field Dashboard Hook
 * Aggregates today's field data with real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime/client'
import { usePunchItems } from '@/features/punch-lists/hooks/usePunchItems'
import { useInspections } from '@/features/inspections/hooks/useInspections'
import { useObservations } from '@/features/safety/hooks/useSafetyObservations'
import { useWeatherForDate } from '@/features/daily-reports/hooks/useWeather'
import { useLookAheadActivities } from '@/features/look-ahead/hooks/useLookAhead'
import type { PunchItem, PunchItemStatus } from '@/types/database'
import type { Inspection } from '@/features/inspections/types'
import type { SafetyObservation } from '@/types/safety-observations'
import type { LookAheadActivity } from '@/types/look-ahead'
import type { ExtendedWeatherData } from '@/features/daily-reports/hooks/useWeather'

export interface FieldDashboardData {
  punchItems: {
    total: number
    open: number
    inProgress: number
    byPriority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    items: PunchItem[]
  }
  inspections: {
    total: number
    scheduled: Inspection[]
  }
  safetyAlerts: {
    total: number
    recent: SafetyObservation[]
  }
  weather: ExtendedWeatherData | null
  schedule: {
    activitiesToday: LookAheadActivity[]
    milestones: LookAheadActivity[]
  }
}

export interface UseFieldDashboardOptions {
  projectId: string | undefined
  enabled?: boolean
}

/**
 * Query key factory for field dashboard
 */
export const fieldDashboardKeys = {
  all: ['field-dashboard'] as const,
  project: (projectId: string) => [...fieldDashboardKeys.all, projectId] as const,
  today: (projectId: string, date: string) =>
    [...fieldDashboardKeys.project(projectId), 'today', date] as const,
}

/**
 * Main hook for field dashboard data
 * Aggregates punch items, inspections, safety observations, weather, and schedule
 */
export function useFieldDashboard({
  projectId,
  enabled = true
}: UseFieldDashboardOptions) {
  const queryClient = useQueryClient()
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Fetch punch items for the project
  const { data: punchItems = [], isLoading: punchLoading } = usePunchItems(
    enabled && projectId ? projectId : undefined
  )

  // Fetch inspections scheduled for today
  const { data: inspections = [], isLoading: inspectionsLoading } = useInspections(
    enabled && projectId ? projectId : undefined,
    {
      scheduled_date: today,
      status: 'scheduled',
    }
  )

  // Fetch recent safety observations (last 7 days)
  const { data: safetyObs = [], isLoading: safetyLoading } = useObservations(
    enabled && projectId ? {
      project_id: projectId,
      status: ['open', 'acknowledged', 'action_required'],
    } : {}
  )

  // Fetch weather for today
  const { data: weather = null, isLoading: weatherLoading } = useWeatherForDate(
    enabled && projectId ? projectId : undefined,
    today
  )

  // Fetch look-ahead activities for this week
  const { data: lookAheadActivities = [], isLoading: scheduleLoading } = useLookAheadActivities(
    enabled && projectId ? projectId : undefined,
    {
      week_number: 1, // Current week
      status: ['ready', 'in_progress'],
    }
  )

  // Set up real-time subscriptions
  useEffect(() => {
    if (!projectId || !enabled) {return}

    // Subscribe to punch items changes
    const unsubPunch = realtimeManager.subscribeToTable({
      table: 'punch_items',
      filter: `project_id=eq.${projectId}`,
      onInsert: () => {
        queryClient.invalidateQueries({
          queryKey: ['punch-items', projectId]
        })
      },
      onUpdate: () => {
        queryClient.invalidateQueries({
          queryKey: ['punch-items', projectId]
        })
      },
      onDelete: () => {
        queryClient.invalidateQueries({
          queryKey: ['punch-items', projectId]
        })
      },
    })

    // Subscribe to inspections changes
    const unsubInspections = realtimeManager.subscribeToTable({
      table: 'inspections',
      filter: `project_id=eq.${projectId}`,
      onInsert: () => {
        queryClient.invalidateQueries({
          queryKey: ['inspections', 'list', projectId]
        })
      },
      onUpdate: () => {
        queryClient.invalidateQueries({
          queryKey: ['inspections', 'list', projectId]
        })
      },
    })

    // Subscribe to safety observations changes
    const unsubSafety = realtimeManager.subscribeToTable({
      table: 'safety_observations',
      filter: `project_id=eq.${projectId}`,
      onInsert: () => {
        queryClient.invalidateQueries({
          queryKey: ['observations', 'list']
        })
      },
      onUpdate: () => {
        queryClient.invalidateQueries({
          queryKey: ['observations', 'list']
        })
      },
    })

    return () => {
      unsubPunch()
      unsubInspections()
      unsubSafety()
    }
  }, [projectId, enabled, queryClient])

  // Aggregate and transform data
  const dashboardData = useMemo<FieldDashboardData | null>(() => {
    if (!enabled || !projectId) {return null}

    // Filter punch items assigned to today or overdue
    const todaysPunchItems = punchItems.filter((item) => {
      if (!item || item.deleted_at) {return false}

      // Include if open or in progress
      const isActive = item.status === 'open' || item.status === 'in_progress'

      // Include if due today or overdue
      const isDueToday = item.due_date === today
      const isOverdue = item.due_date && item.due_date < today && item.status !== 'completed'

      return isActive && (isDueToday || isOverdue)
    })

    // Calculate punch item statistics
    const punchStats = {
      total: todaysPunchItems.length,
      open: todaysPunchItems.filter((item) => item.status === 'open').length,
      inProgress: todaysPunchItems.filter((item) => item.status === 'in_progress').length,
      byPriority: {
        critical: todaysPunchItems.filter((item) => item.priority === 'critical').length,
        high: todaysPunchItems.filter((item) => item.priority === 'high').length,
        medium: todaysPunchItems.filter((item) => item.priority === 'medium').length,
        low: todaysPunchItems.filter((item) => item.priority === 'low').length,
      },
      items: todaysPunchItems,
    }

    // Filter inspections scheduled for today
    const todaysInspections = inspections.filter((insp) =>
      insp.scheduled_date === today && insp.status === 'scheduled'
    )

    // Filter recent safety alerts (last 7 days, open status)
    const recentSafetyAlerts = safetyObs
      .filter((obs) => {
        const createdDate = new Date(obs.created_at || '')
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return createdDate >= sevenDaysAgo && obs.status !== 'closed'
      })
      .slice(0, 5) // Limit to 5 most recent

    // Filter schedule activities for today
    const todaysActivities = lookAheadActivities.filter((activity) => {
      const start = new Date(activity.planned_start_date || '')
      const end = new Date(activity.planned_end_date || '')
      const todayDate = new Date(today)
      return start <= todayDate && todayDate <= end
    })

    // Find milestone activities
    const milestones = lookAheadActivities.filter((activity) =>
      activity.is_milestone && activity.status !== 'completed'
    )

    return {
      punchItems: punchStats,
      inspections: {
        total: todaysInspections.length,
        scheduled: todaysInspections,
      },
      safetyAlerts: {
        total: recentSafetyAlerts.length,
        recent: recentSafetyAlerts,
      },
      weather,
      schedule: {
        activitiesToday: todaysActivities,
        milestones: milestones.slice(0, 3), // Show top 3 upcoming milestones
      },
    }
  }, [
    enabled,
    projectId,
    punchItems,
    inspections,
    safetyObs,
    weather,
    lookAheadActivities,
    today,
  ])

  const isLoading =
    punchLoading ||
    inspectionsLoading ||
    safetyLoading ||
    weatherLoading ||
    scheduleLoading

  return {
    data: dashboardData,
    isLoading,
    refetch: () => {
      queryClient.invalidateQueries({
        queryKey: fieldDashboardKeys.project(projectId!)
      })
    },
  }
}

/**
 * Hook for today's assigned punch items only (lighter query)
 */
export function useTodaysPunchItems(projectId: string | undefined) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  return useQuery({
    queryKey: ['punch-items', 'today', projectId, today],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .in('status', ['open', 'in_progress'])
        .or(`due_date.eq.${today},due_date.lt.${today}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) {throw error}
      return data as PunchItem[]
    },
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook for today's scheduled inspections only
 */
export function useTodaysInspections(projectId: string | undefined) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  return useQuery({
    queryKey: ['inspections', 'today', projectId, today],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('project_id', projectId)
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .order('scheduled_time', { ascending: true })

      if (error) {throw error}
      return data as Inspection[]
    },
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
  })
}
