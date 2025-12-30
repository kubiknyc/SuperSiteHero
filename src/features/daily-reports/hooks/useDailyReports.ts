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
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })
        .limit(100) as any

      if (error) {throw error}
      return data as DailyReport[]
    },
    enabled: !!projectId,
  })
}

// Extended type for daily report with project relation
export type DailyReportWithProject = DailyReport & {
  project?: { id: string; name: string } | null
}

// Fetch a single daily report by ID (includes project name for PDF export)
export function useDailyReport(reportId: string | undefined) {
  return useQuery<DailyReportWithProject, Error, DailyReportWithProject>({
    queryKey: ['daily-reports', reportId],
    queryFn: async (): Promise<DailyReportWithProject> => {
      if (!reportId) {throw new Error('Report ID required')}

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, project:projects(id, name)')
        .eq('id', reportId)
        .single() as any

      if (error) {throw error}
      return data as DailyReportWithProject
    },
    enabled: !!reportId,
  })
}

// Create a new daily report
export function useCreateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (report: CreateInput<'daily_reports'>) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(report as any)
        .select()
        .single()

      if (error) {throw error}
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
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
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

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

// Fetch the most recent daily report for a project (for "Copy from Previous" feature)
export function usePreviousDayReport(projectId: string | undefined, excludeDate?: string) {
  return useQuery({
    queryKey: ['daily-reports', 'previous', projectId, excludeDate],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })
        .limit(1)

      // Exclude the current date if provided (so we don't copy from today)
      if (excludeDate) {
        query = query.lt('report_date', excludeDate)
      }

      const { data, error } = await query.single() as any

      if (error) {
        // No previous report found is not an error for this use case
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }
      return data as DailyReport
    },
    enabled: !!projectId,
  })
}

// Helper to convert null values to undefined for DraftReport compatibility
function nullToUndefined<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result: Record<string, unknown> = {}
  for (const key in obj) {
    result[key] = obj[key] === null ? undefined : obj[key]
  }
  return result as { [K in keyof T]: T[K] extends null ? undefined : T[K] }
}

// Helper to extract copyable fields from a daily report
// Returns fields compatible with DraftReport (null values converted to undefined)
export function extractCopyableFields(report: DailyReport): Record<string, unknown> {
  // Fields that should be copied from the previous report
  // Excludes: id, report_date, status, created_at, updated_at, submitted_at, approved_at
  const {
    id: _id,
    report_date: _date,
    status: _status,
    created_at: _created,
    updated_at: _updated,
    submitted_at: _submitted,
    approved_at: _approved,
    approved_by: _approvedBy,
    ...copyableFields
  } = report

  // Convert null values to undefined for DraftReport compatibility
  return nullToUndefined(copyableFields)
}
