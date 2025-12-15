/**
 * Scheduled Field Reports Hook
 * Phase 5: Field Workflow Automation - Milestone 5.3
 *
 * Provides React Query hooks for managing scheduled field reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduledFieldReportApi } from '@/lib/api/services/scheduled-field-reports'
import { useToast } from '@/components/ui/use-toast'
import type {
  ScheduledFieldReport,
  GeneratedFieldReport,
  CreateScheduledFieldReportInput,
  UpdateScheduledFieldReportInput,
  FieldReportType,
  ReportContentConfig,
} from '@/types/workflow-automation'

// ============================================================================
// Query Keys
// ============================================================================

export const scheduledReportKeys = {
  all: ['scheduled-field-reports'] as const,
  scheduled: () => [...scheduledReportKeys.all, 'scheduled'] as const,
  scheduledByProject: (projectId: string) =>
    [...scheduledReportKeys.scheduled(), 'project', projectId] as const,
  scheduledByCompany: (companyId: string) =>
    [...scheduledReportKeys.scheduled(), 'company', companyId] as const,
  scheduledDetail: (id: string) =>
    [...scheduledReportKeys.scheduled(), 'detail', id] as const,
  generated: () => [...scheduledReportKeys.all, 'generated'] as const,
  generatedByProject: (projectId: string) =>
    [...scheduledReportKeys.generated(), 'project', projectId] as const,
  generatedDetail: (id: string) =>
    [...scheduledReportKeys.generated(), 'detail', id] as const,
}

// ============================================================================
// Scheduled Reports Hooks
// ============================================================================

/**
 * Get scheduled reports for a project
 */
export function useScheduledReports(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduledReportKeys.scheduledByProject(projectId || ''),
    queryFn: () => scheduledFieldReportApi.scheduled.getReports(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get all scheduled reports for a company
 */
export function useCompanyScheduledReports(companyId: string | undefined) {
  return useQuery({
    queryKey: scheduledReportKeys.scheduledByCompany(companyId || ''),
    queryFn: () => scheduledFieldReportApi.scheduled.getCompanyReports(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Get a single scheduled report
 */
export function useScheduledReport(reportId: string | undefined) {
  return useQuery({
    queryKey: scheduledReportKeys.scheduledDetail(reportId || ''),
    queryFn: () => scheduledFieldReportApi.scheduled.getReport(reportId!),
    enabled: !!reportId,
  })
}

/**
 * Create a new scheduled report
 */
export function useCreateScheduledReport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateScheduledFieldReportInput) =>
      scheduledFieldReportApi.scheduled.createReport(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.scheduled() })
      toast({
        title: 'Report scheduled',
        description: `"${data.name}" has been scheduled.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create scheduled report.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a scheduled report
 */
export function useUpdateScheduledReport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateScheduledFieldReportInput }) =>
      scheduledFieldReportApi.scheduled.updateReport(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.scheduledDetail(data.id) })
      toast({
        title: 'Report updated',
        description: 'Scheduled report has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update scheduled report.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Toggle report active status
 */
export function useToggleScheduledReport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      scheduledFieldReportApi.scheduled.toggleReport(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.scheduled() })
      toast({
        title: variables.isActive ? 'Report enabled' : 'Report disabled',
        description: `Scheduled report has been ${variables.isActive ? 'enabled' : 'disabled'}.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle scheduled report.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a scheduled report
 */
export function useDeleteScheduledReport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => scheduledFieldReportApi.scheduled.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.scheduled() })
      toast({
        title: 'Report deleted',
        description: 'Scheduled report has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete scheduled report.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// Generated Reports Hooks
// ============================================================================

/**
 * Get generated reports for a project
 */
export function useGeneratedReports(projectId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: scheduledReportKeys.generatedByProject(projectId || ''),
    queryFn: () => scheduledFieldReportApi.generated.getReports(projectId!, limit),
    enabled: !!projectId,
  })
}

/**
 * Get a single generated report
 */
export function useGeneratedReport(reportId: string | undefined) {
  return useQuery({
    queryKey: scheduledReportKeys.generatedDetail(reportId || ''),
    queryFn: () => scheduledFieldReportApi.generated.getReport(reportId!),
    enabled: !!reportId,
  })
}

// ============================================================================
// Report Generation Hook
// ============================================================================

/**
 * Generate a report on-demand
 */
export function useGenerateReport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      reportType: FieldReportType;
      periodStart: string;
      periodEnd: string;
      reportName?: string;
      contentConfig?: ReportContentConfig;
    }) => {
      // Create the generated report record
      const report = await scheduledFieldReportApi.generated.createReport({
        project_id: params.projectId,
        report_name: params.reportName || `${params.reportType} Report`,
        report_type: params.reportType,
        period_start: params.periodStart,
        period_end: params.periodEnd,
      })

      try {
        // Generate the report data
        const reportData = await scheduledFieldReportApi.data.generateReportData(
          params.projectId,
          params.reportType,
          params.periodStart,
          params.periodEnd,
          params.contentConfig
        )

        // Update with the data
        await scheduledFieldReportApi.generated.updateReport(report.id, {
          report_data: reportData,
          status: 'completed',
        })

        return { ...report, report_data: reportData, status: 'completed' as const }
      } catch (error) {
        // Mark as failed
        await scheduledFieldReportApi.generated.markAsFailed(
          report.id,
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.generated() })
      toast({
        title: 'Report generated',
        description: `"${data.report_name}" has been generated.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// Preview Data Hook
// ============================================================================

/**
 * Preview report data without saving
 */
export function usePreviewReportData() {
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      reportType: FieldReportType;
      periodStart: string;
      periodEnd: string;
      contentConfig?: ReportContentConfig;
    }) => {
      return scheduledFieldReportApi.data.generateReportData(
        params.projectId,
        params.reportType,
        params.periodStart,
        params.periodEnd,
        params.contentConfig
      )
    },
  })
}

// ============================================================================
// Daily Summary Hook
// ============================================================================

/**
 * Get daily summary data for a specific date
 */
export function useDailySummary(projectId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: [...scheduledReportKeys.all, 'daily-summary', projectId, date] as const,
    queryFn: () => scheduledFieldReportApi.data.compileDailySummary(projectId!, date!),
    enabled: !!projectId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get weekly progress data
 */
export function useWeeklyProgress(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: [...scheduledReportKeys.all, 'weekly-progress', projectId, startDate, endDate] as const,
    queryFn: () => scheduledFieldReportApi.data.compileWeeklyProgress(projectId!, startDate!, endDate!),
    enabled: !!projectId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  })
}
