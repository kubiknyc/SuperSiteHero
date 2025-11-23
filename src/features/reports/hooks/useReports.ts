// File: /src/features/reports/hooks/useReports.ts
// React Query hooks for report generation

import { useQuery } from '@tanstack/react-query'
import {
  getProjectHealthReport,
  getDailyReportAnalytics,
  getWorkflowSummary,
  getPunchListReport,
  getSafetyIncidentReport,
  getFinancialSummary,
  getDocumentSummary,
  type ProjectHealthReport,
  type DailyReportAnalytics,
  type WorkflowSummary,
  type PunchListReport,
  type SafetyIncidentReport,
  type FinancialSummary,
  type DocumentSummary,
} from '@/lib/api/services/reports'

/**
 * Fetch project health report
 */
export function useProjectHealthReport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'project-health', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return getProjectHealthReport(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch daily report analytics for a date range
 */
export function useDailyReportAnalytics(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['reports', 'daily-analytics', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range required')
      }
      return getDailyReportAnalytics(projectId, startDate, endDate)
    },
    enabled: !!projectId && !!startDate && !!endDate,
  })
}

/**
 * Fetch workflow (RFI, Change Order, Submittal) summary
 */
export function useWorkflowSummary(projectId: string | undefined, workflowType: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'workflow-summary', projectId, workflowType],
    queryFn: async () => {
      if (!projectId || !workflowType) {
        throw new Error('Project ID and workflow type required')
      }
      return getWorkflowSummary(projectId, workflowType)
    },
    enabled: !!projectId && !!workflowType,
  })
}

/**
 * Fetch punch list report
 */
export function usePunchListReport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'punch-list', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return getPunchListReport(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch safety incident report
 */
export function useSafetyIncidentReport(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['reports', 'safety-incidents', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range required')
      }
      return getSafetyIncidentReport(projectId, startDate, endDate)
    },
    enabled: !!projectId && !!startDate && !!endDate,
  })
}

/**
 * Fetch financial summary
 */
export function useFinancialSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'financial', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return getFinancialSummary(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch document summary
 */
export function useDocumentSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'documents', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return getDocumentSummary(projectId)
    },
    enabled: !!projectId,
  })
}
