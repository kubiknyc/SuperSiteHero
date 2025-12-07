// File: /src/features/weather-logs/hooks/useWeatherLogs.ts
// React Query hooks for weather logs data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WeatherLog, Project } from '@/types/database-extensions'
// Note: weather_logs table may not exist in generated types but exists in database
// WeatherCondition and WorkImpact are defined as string literals for this module
type WeatherCondition = WeatherLog['conditions']
type WorkImpact = WeatherLog['work_impact']
import { useAuth } from '@/lib/auth/AuthContext'

export interface WeatherLogFilters {
  dateFrom?: string
  dateTo?: string
  conditions?: WeatherCondition[]
  workImpact?: WorkImpact[]
  workStopped?: boolean
}

export interface WeatherLogWithProject extends WeatherLog {
  project: Pick<Project, 'id' | 'name'>
}

// Fetch all weather logs for a project with optional filters
export function useWeatherLogs(projectId: string | undefined, filters?: WeatherLogFilters) {
  return useQuery({
    queryKey: ['weather-logs', projectId, filters],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      let query = (supabase as any)
        .from('weather_logs')
        .select(`
          *,
          project:projects!weather_logs_project_id_fkey(id, name)
        `)
        .eq('project_id', projectId)
        .order('log_date', { ascending: false })

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('log_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('log_date', filters.dateTo)
      }
      if (filters?.conditions && filters.conditions.length > 0) {
        query = query.in('conditions', filters.conditions)
      }
      if (filters?.workImpact && filters.workImpact.length > 0) {
        query = query.in('work_impact', filters.workImpact)
      }
      if (filters?.workStopped !== undefined) {
        query = query.eq('work_stopped', filters.workStopped)
      }

      const { data, error } = await query

      if (error) throw error
      return data as WeatherLogWithProject[]
    },
    enabled: !!projectId,
  })
}

// Fetch all weather logs across all projects for the user's company
export function useAllWeatherLogs(filters?: WeatherLogFilters) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['weather-logs', 'all', userProfile?.company_id, filters],
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID found')

      let query = (supabase as any)
        .from('weather_logs')
        .select(`
          *,
          project:projects!weather_logs_project_id_fkey(id, name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('log_date', { ascending: false })
        .limit(100)

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('log_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('log_date', filters.dateTo)
      }
      if (filters?.conditions && filters.conditions.length > 0) {
        query = query.in('conditions', filters.conditions)
      }
      if (filters?.workImpact && filters.workImpact.length > 0) {
        query = query.in('work_impact', filters.workImpact)
      }
      if (filters?.workStopped !== undefined) {
        query = query.eq('work_stopped', filters.workStopped)
      }

      const { data, error } = await query

      if (error) throw error
      return data as WeatherLogWithProject[]
    },
    enabled: !!userProfile?.company_id,
  })
}

// Fetch a single weather log by ID
export function useWeatherLog(logId: string | undefined) {
  return useQuery({
    queryKey: ['weather-logs', logId],
    queryFn: async () => {
      if (!logId) throw new Error('Weather log ID required')

      const { data, error } = await (supabase as any)
        .from('weather_logs')
        .select(`
          *,
          project:projects!weather_logs_project_id_fkey(id, name, address),
          recorded_by_user:users!weather_logs_recorded_by_fkey(id, first_name, last_name, email)
        `)
        .eq('id', logId)
        .single()

      if (error) throw error
      return data as WeatherLog & {
        project: Pick<Project, 'id' | 'name' | 'address'>
        recorded_by_user: { id: string; first_name: string; last_name: string; email: string }
      }
    },
    enabled: !!logId,
  })
}

// Fetch weather log for a specific project and date (for duplicate checking)
export function useWeatherLogByDate(projectId: string | undefined, logDate: string | undefined) {
  return useQuery({
    queryKey: ['weather-logs', 'by-date', projectId, logDate],
    queryFn: async () => {
      if (!projectId || !logDate) throw new Error('Project ID and log date required')

      const { data, error } = await (supabase as any)
        .from('weather_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('log_date', logDate)
        .maybeSingle()

      if (error) throw error
      return data as WeatherLog | null
    },
    enabled: !!projectId && !!logDate,
  })
}

// WeatherLog insert type for creation
type WeatherLogInsert = Omit<WeatherLog, 'id' | 'created_at' | 'updated_at'> & { id?: string }

// Create a new weather log
export function useCreateWeatherLog() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (weatherLog: Partial<WeatherLogInsert>) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }
      if (!userProfile?.id) {
        throw new Error('No user ID found')
      }

      const { data, error } = await (supabase as any)
        .from('weather_logs')
        .insert({
          ...weatherLog,
          company_id: userProfile.company_id,
          recorded_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as WeatherLog
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['weather-logs'] })
      queryClient.invalidateQueries({ queryKey: ['weather-logs', data.project_id] })
    },
  })
}

// Update an existing weather log
export function useUpdateWeatherLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeatherLog> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('weather_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as WeatherLog
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['weather-logs'] })
      queryClient.invalidateQueries({ queryKey: ['weather-logs', data.id] })
      queryClient.invalidateQueries({ queryKey: ['weather-logs', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['weather-logs', 'by-date'] })
    },
  })
}

// Delete a weather log
export function useDeleteWeatherLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await (supabase as any)
        .from('weather_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-logs'] })
    },
  })
}

// Get weather statistics for a project
export interface WeatherStatistics {
  totalLogs: number
  averageHighTemp: number | null
  averageLowTemp: number | null
  totalHoursLost: number
  daysWithImpact: number
  daysWithSevereImpact: number
  mostCommonCondition: string | null
  totalPrecipitation: number
}

export function useWeatherStatistics(projectId: string | undefined, filters?: WeatherLogFilters) {
  return useQuery({
    queryKey: ['weather-logs', 'statistics', projectId, filters],
    queryFn: async (): Promise<WeatherStatistics> => {
      if (!projectId) throw new Error('Project ID required')

      let query = (supabase as any)
        .from('weather_logs')
        .select('*')
        .eq('project_id', projectId)

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('log_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('log_date', filters.dateTo)
      }

      const { data, error } = await query

      if (error) throw error

      const logs = data as WeatherLog[]

      if (logs.length === 0) {
        return {
          totalLogs: 0,
          averageHighTemp: null,
          averageLowTemp: null,
          totalHoursLost: 0,
          daysWithImpact: 0,
          daysWithSevereImpact: 0,
          mostCommonCondition: null,
          totalPrecipitation: 0,
        }
      }

      // Calculate statistics
      const highTemps = logs.filter(l => l.temperature_high !== null).map(l => l.temperature_high!)
      const lowTemps = logs.filter(l => l.temperature_low !== null).map(l => l.temperature_low!)

      const averageHighTemp = highTemps.length > 0
        ? highTemps.reduce((sum, temp) => sum + temp, 0) / highTemps.length
        : null

      const averageLowTemp = lowTemps.length > 0
        ? lowTemps.reduce((sum, temp) => sum + temp, 0) / lowTemps.length
        : null

      const totalHoursLost = logs.reduce((sum, log) => sum + log.hours_lost, 0)

      const daysWithImpact = logs.filter(log => log.work_impact !== 'none').length

      const daysWithSevereImpact = logs.filter(log => log.work_impact === 'severe').length

      const totalPrecipitation = logs.reduce((sum, log) => sum + log.precipitation_amount, 0)

      // Find most common condition
      const conditionCounts = logs.reduce((acc, log) => {
        acc[log.conditions] = (acc[log.conditions] || 0) + 1
        return acc
      }, {} as Record<WeatherCondition, number>)

      const mostCommonEntry = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]
      const mostCommonCondition = (mostCommonEntry?.[0] as WeatherCondition) || null

      return {
        totalLogs: logs.length,
        averageHighTemp: averageHighTemp !== null ? Math.round(averageHighTemp) : null,
        averageLowTemp: averageLowTemp !== null ? Math.round(averageLowTemp) : null,
        totalHoursLost,
        daysWithImpact,
        daysWithSevereImpact,
        mostCommonCondition,
        totalPrecipitation: Math.round(totalPrecipitation * 100) / 100,
      }
    },
    enabled: !!projectId,
  })
}
