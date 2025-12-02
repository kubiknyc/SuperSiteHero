// File: /src/features/daily-reports/hooks/useDailyReports.v2.ts
// REFACTORED: Daily Reports hooks using new API abstraction layer

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dailyReportsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/api/errors'
import type { DailyReport } from '@/types/database'
import { logger } from '@/lib/utils/logger'

/**
 * Fetch daily reports for a project
 * This replaces the old useDailyReports hook
 */
export function useDailyReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return dailyReportsApi.getProjectReports(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single daily report
 * New hook for detail views
 */
export function useDailyReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-reports', reportId],
    queryFn: async () => {
      if (!reportId) {throw new Error('Report ID required')}
      return dailyReportsApi.getReport(reportId)
    },
    enabled: !!reportId,
  })
}

/**
 * Fetch reports by date range
 * New hook for filtering
 */
export function useDailyReportsByDateRange(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['daily-reports-range', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range required')
      }
      return dailyReportsApi.getReportsByDateRange(projectId, startDate, endDate)
    },
    enabled: !!projectId && !!startDate && !!endDate,
  })
}

/**
 * Create a new daily report mutation
 */
export function useCreateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>) => {
      return dailyReportsApi.createReport(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
    },
    onError: (error) => {
      logger.error('Error creating daily report:', getErrorMessage(error))
    },
  })
}

/**
 * Update a daily report mutation
 */
export function useUpdateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DailyReport> & { id: string }) => {
      return dailyReportsApi.updateReport(id, updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
    },
    onError: (error) => {
      logger.error('Error updating daily report:', getErrorMessage(error))
    },
  })
}

/**
 * Delete a daily report mutation
 */
export function useDeleteDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      return dailyReportsApi.deleteReport(reportId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error) => {
      logger.error('Error deleting daily report:', getErrorMessage(error))
    },
  })
}

/**
 * Submit a daily report for approval mutation
 */
export function useSubmitDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      return dailyReportsApi.submitReport(reportId)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error) => {
      logger.error('Error submitting daily report:', getErrorMessage(error))
    },
  })
}

/**
 * Approve a daily report mutation
 */
export function useApproveDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      return dailyReportsApi.approveReport(reportId)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error) => {
      logger.error('Error approving daily report:', getErrorMessage(error))
    },
  })
}

/**
 * Reject a daily report mutation
 */
export function useRejectDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
      return dailyReportsApi.rejectReport(reportId, reason)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error) => {
      logger.error('Error rejecting daily report:', getErrorMessage(error))
    },
  })
}
