// File: /src/features/daily-reports/hooks/useDailyReportsMutations.ts
// Daily report mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { dailyReportsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { DailyReport } from '@/types/database'

/**
 * Create a new daily report with automatic success/error notifications
 */
export function useCreateDailyReportWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    DailyReport,
    Error,
    Omit<DailyReport, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  >({
    mutationFn: async (report) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return dailyReportsApi.createReport({
        ...report,
        reporter_id: userProfile.id,
        created_by: userProfile.id,
      })
    },
    successMessage: (data) => `Daily report for ${data.report_date} created successfully`,
    errorMessage: (error) => `Failed to create daily report: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
    },
  })
}

/**
 * Update a daily report with automatic success/error notifications
 */
export function useUpdateDailyReportWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    DailyReport,
    Error,
    { id: string; data: Partial<Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, data }) => {
      return dailyReportsApi.updateReport(id, data)
    },
    successMessage: (data) => `Daily report for ${data.report_date} updated successfully`,
    errorMessage: (error) => `Failed to update daily report: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
    },
  })
}

/**
 * Delete a daily report with automatic success/error notifications
 */
export function useDeleteDailyReportWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (reportId) => {
      return dailyReportsApi.deleteReport(reportId)
    },
    successMessage: 'Daily report deleted successfully',
    errorMessage: (error) => `Failed to delete daily report: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

/**
 * Submit a daily report for approval with automatic notifications
 */
export function useSubmitDailyReportWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<DailyReport, Error, string>({
    mutationFn: async (reportId) => {
      return dailyReportsApi.submitReport(reportId)
    },
    successMessage: 'Daily report submitted for approval',
    errorMessage: (error) => `Failed to submit daily report: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
    },
  })
}

/**
 * Approve a daily report with automatic notifications
 */
export function useApproveDailyReportWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<DailyReport, Error, string>({
    mutationFn: async (reportId) => {
      return dailyReportsApi.approveReport(reportId)
    },
    successMessage: 'Daily report approved',
    errorMessage: (error) => `Failed to approve daily report: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['daily-reports', data.id] })
    },
  })
}
