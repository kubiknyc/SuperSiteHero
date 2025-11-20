// File: /src/features/daily-reports/hooks/useDailyReports.ts
// React Query hooks for daily reports data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DailyReport, CreateInput } from '@/types/database'

// Fetch all daily reports for a project
export function useDailyReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })

      if (error) throw error
      return data as DailyReport[]
    },
    enabled: !!projectId,
  })
}

// Fetch a single daily report by ID
export function useDailyReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-reports', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required')

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (error) throw error
      return data as DailyReport
    },
    enabled: !!reportId,
  })
}

// Create a new daily report
export function useCreateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (report: CreateInput<DailyReport>) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(report)
        .select()
        .single()

      if (error) throw error
      return data as DailyReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
    },
  })
}

// Update an existing daily report
export function useUpdateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as DailyReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
    },
  })
}

// Delete a daily report
export function useDeleteDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}
