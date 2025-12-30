/**
 * Report Builder React Query Hooks
 *
 * Provides data fetching and mutation hooks for the Custom Report Builder.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { reportBuilderApi } from '@/lib/api/services/report-builder'
import type {
  CreateReportTemplateDTO,
  UpdateReportTemplateDTO,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ReportTemplateSortingInput,
  ReportTemplateGroupingInput,
  CreateScheduledReportDTO,
  UpdateScheduledReportDTO,
  GenerateReportDTO,
  ReportTemplateFilters,
  ScheduledReportFilters,
  GeneratedReportFilters,
  ReportDataSource,
} from '@/types/report-builder'

// ============================================================================
// Query Keys
// ============================================================================

export const reportBuilderKeys = {
  all: ['report-builder'] as const,

  // Templates
  templates: () => [...reportBuilderKeys.all, 'templates'] as const,
  templateList: (filters: ReportTemplateFilters) => [...reportBuilderKeys.templates(), 'list', filters] as const,
  templateDetail: (id: string) => [...reportBuilderKeys.templates(), 'detail', id] as const,

  // Scheduled reports
  scheduled: () => [...reportBuilderKeys.all, 'scheduled'] as const,
  scheduledList: (filters: ScheduledReportFilters) => [...reportBuilderKeys.scheduled(), 'list', filters] as const,
  scheduledDetail: (id: string) => [...reportBuilderKeys.scheduled(), 'detail', id] as const,

  // Generated reports
  generated: () => [...reportBuilderKeys.all, 'generated'] as const,
  generatedList: (filters: GeneratedReportFilters) => [...reportBuilderKeys.generated(), 'list', filters] as const,
  generatedDetail: (id: string) => [...reportBuilderKeys.generated(), 'detail', id] as const,

  // Field definitions
  fieldDefinitions: () => [...reportBuilderKeys.all, 'field-definitions'] as const,
  fieldDefinitionsBySource: (source: ReportDataSource) => [...reportBuilderKeys.fieldDefinitions(), source] as const,
}

// ============================================================================
// Template Hooks
// ============================================================================

/**
 * Fetch report templates with optional filters
 */
export function useReportTemplates(filters: ReportTemplateFilters = {}) {
  return useQuery({
    queryKey: reportBuilderKeys.templateList(filters),
    queryFn: () => reportBuilderApi.getReportTemplates(filters),
  })
}

/**
 * Fetch a single report template by ID
 */
export function useReportTemplate(id: string | undefined) {
  return useQuery({
    queryKey: reportBuilderKeys.templateDetail(id!),
    queryFn: () => reportBuilderApi.getReportTemplate(id!),
    enabled: !!id,
  })
}

/**
 * Create a new report template
 */
export function useCreateReportTemplate() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateReportTemplateDTO) => reportBuilderApi.createReportTemplate(data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templates() })
      showToast({
        type: 'success',
        title: 'Template Created',
        message: `Report template "${template.name}" has been created.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create report template',
      })
    },
  })
}

/**
 * Update a report template
 */
export function useUpdateReportTemplate() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReportTemplateDTO }) =>
      reportBuilderApi.updateReportTemplate(id, data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templates() })
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(template.id) })
      showToast({
        type: 'success',
        title: 'Template Updated',
        message: `Report template "${template.name}" has been updated.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update report template',
      })
    },
  })
}

/**
 * Delete a report template
 */
export function useDeleteReportTemplate() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => reportBuilderApi.deleteReportTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templates() })
      showToast({
        type: 'success',
        title: 'Template Deleted',
        message: 'The report template has been deleted.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete report template',
      })
    },
  })
}

/**
 * Duplicate a report template
 */
export function useDuplicateReportTemplate() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      reportBuilderApi.duplicateReportTemplate(id, newName),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templates() })
      showToast({
        type: 'success',
        title: 'Template Duplicated',
        message: `Report template duplicated as "${template.name}".`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to duplicate report template',
      })
    },
  })
}

// ============================================================================
// Template Configuration Hooks
// ============================================================================

/**
 * Set template fields
 */
export function useSetTemplateFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, fields }: { templateId: string; fields: ReportTemplateFieldInput[] }) =>
      reportBuilderApi.setTemplateFields(templateId, fields),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(templateId) })
    },
  })
}

/**
 * Set template filters
 */
export function useSetTemplateFilters() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, filters }: { templateId: string; filters: ReportTemplateFilterInput[] }) =>
      reportBuilderApi.setTemplateFilters(templateId, filters),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(templateId) })
    },
  })
}

/**
 * Set template sorting
 */
export function useSetTemplateSorting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, sorting }: { templateId: string; sorting: ReportTemplateSortingInput[] }) =>
      reportBuilderApi.setTemplateSorting(templateId, sorting),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(templateId) })
    },
  })
}

/**
 * Set template grouping
 */
export function useSetTemplateGrouping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, grouping }: { templateId: string; grouping: ReportTemplateGroupingInput[] }) =>
      reportBuilderApi.setTemplateGrouping(templateId, grouping),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(templateId) })
    },
  })
}

/**
 * Save complete template configuration (fields, filters, sorting, grouping)
 */
export function useSaveTemplateConfiguration() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: async ({
      templateId,
      fields,
      filters,
      sorting,
      grouping,
    }: {
      templateId: string
      fields: ReportTemplateFieldInput[]
      filters?: ReportTemplateFilterInput[]
      sorting?: ReportTemplateSortingInput[]
      grouping?: ReportTemplateGroupingInput[]
    }) => {
      await reportBuilderApi.setTemplateFields(templateId, fields)
      if (filters) {await reportBuilderApi.setTemplateFilters(templateId, filters)}
      if (sorting) {await reportBuilderApi.setTemplateSorting(templateId, sorting)}
      if (grouping) {await reportBuilderApi.setTemplateGrouping(templateId, grouping)}
      return reportBuilderApi.getReportTemplate(templateId)
    },
    onSuccess: (template) => {
      if (template) {
        queryClient.invalidateQueries({ queryKey: reportBuilderKeys.templateDetail(template.id) })
      }
      showToast({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Report template configuration has been saved.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to save template configuration',
      })
    },
  })
}

// ============================================================================
// Scheduled Report Hooks
// ============================================================================

/**
 * Fetch scheduled reports with optional filters
 */
export function useScheduledReports(filters: ScheduledReportFilters = {}) {
  return useQuery({
    queryKey: reportBuilderKeys.scheduledList(filters),
    queryFn: () => reportBuilderApi.getScheduledReports(filters),
  })
}

/**
 * Fetch a single scheduled report
 */
export function useScheduledReport(id: string | undefined) {
  return useQuery({
    queryKey: reportBuilderKeys.scheduledDetail(id!),
    queryFn: () => reportBuilderApi.getScheduledReport(id!),
    enabled: !!id,
  })
}

/**
 * Create a scheduled report
 */
export function useCreateScheduledReport() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateScheduledReportDTO) => reportBuilderApi.createScheduledReport(data),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduled() })
      showToast({
        type: 'success',
        title: 'Schedule Created',
        message: `Report schedule "${report.name}" has been created.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create scheduled report',
      })
    },
  })
}

/**
 * Update a scheduled report
 */
export function useUpdateScheduledReport() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduledReportDTO }) =>
      reportBuilderApi.updateScheduledReport(id, data),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduledDetail(report.id) })
      showToast({
        type: 'success',
        title: 'Schedule Updated',
        message: `Report schedule "${report.name}" has been updated.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update scheduled report',
      })
    },
  })
}

/**
 * Delete a scheduled report
 */
export function useDeleteScheduledReport() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => reportBuilderApi.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduled() })
      showToast({
        type: 'success',
        title: 'Schedule Deleted',
        message: 'The report schedule has been deleted.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete scheduled report',
      })
    },
  })
}

/**
 * Toggle scheduled report active status
 */
export function useToggleScheduledReportActive() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      reportBuilderApi.toggleScheduledReportActive(id, isActive),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.scheduledDetail(report.id) })
      showToast({
        type: 'success',
        title: report.is_active ? 'Schedule Activated' : 'Schedule Paused',
        message: report.is_active
          ? `Report schedule "${report.name}" is now active.`
          : `Report schedule "${report.name}" has been paused.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update schedule status',
      })
    },
  })
}

// ============================================================================
// Generated Report Hooks
// ============================================================================

/**
 * Fetch generated reports with optional filters
 */
export function useGeneratedReports(filters: GeneratedReportFilters = {}) {
  return useQuery({
    queryKey: reportBuilderKeys.generatedList(filters),
    queryFn: () => reportBuilderApi.getGeneratedReports(filters),
  })
}

/**
 * Fetch a single generated report
 */
export function useGeneratedReport(id: string | undefined) {
  return useQuery({
    queryKey: reportBuilderKeys.generatedDetail(id!),
    queryFn: () => reportBuilderApi.getGeneratedReport(id!),
    enabled: !!id,
  })
}

/**
 * Generate a report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: GenerateReportDTO & { report_name: string }) =>
      reportBuilderApi.createGeneratedReport(data),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportBuilderKeys.generated() })
      showToast({
        type: 'success',
        title: 'Report Generated',
        message: `Report "${report.report_name}" is being generated.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to generate report',
      })
    },
  })
}

// ============================================================================
// Field Definition Hooks
// ============================================================================

/**
 * Fetch field definitions for a data source
 */
export function useFieldDefinitions(dataSource: ReportDataSource | undefined) {
  return useQuery({
    queryKey: reportBuilderKeys.fieldDefinitionsBySource(dataSource!),
    queryFn: () => reportBuilderApi.getFieldDefinitions(dataSource!),
    enabled: !!dataSource,
  })
}

/**
 * Fetch all field definitions grouped by data source
 */
export function useAllFieldDefinitions() {
  return useQuery({
    queryKey: reportBuilderKeys.fieldDefinitions(),
    queryFn: () => reportBuilderApi.getAllFieldDefinitions(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (field definitions rarely change)
  })
}

/**
 * Fetch default fields for a data source
 */
export function useDefaultFields(dataSource: ReportDataSource | undefined) {
  return useQuery({
    queryKey: [...reportBuilderKeys.fieldDefinitionsBySource(dataSource!), 'default'],
    queryFn: () => reportBuilderApi.getDefaultFields(dataSource!),
    enabled: !!dataSource,
  })
}

// ============================================================================
// Report Export Hook
// ============================================================================

import { reportExportService, type ReportExportOptions } from '../services/reportExportService'
import type { ReportOutputFormat } from '@/types/report-builder'

/**
 * Hook for exporting reports to different formats
 */
export function useExportReport() {
  const { showToast } = useToast()

  return useMutation({
    mutationFn: async ({
      format,
      options,
    }: {
      format: ReportOutputFormat
      options: ReportExportOptions
    }) => {
      const result = await reportExportService.generateReport(format, options)
      reportExportService.downloadReport(result)
      return result
    },
    onSuccess: (result) => {
      showToast({
        type: 'success',
        title: 'Report Exported',
        message: `Report exported successfully with ${result.rowCount} records.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: error.message || 'Failed to export report',
      })
    },
  })
}
