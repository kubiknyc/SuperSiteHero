/**
 * Safety Metrics React Query Hooks
 *
 * Provides data fetching and mutation hooks for OSHA safety metrics:
 * - TRIR (Total Recordable Incident Rate)
 * - DART (Days Away, Restricted, or Transferred)
 * - LTIR (Lost Time Injury Rate)
 * - EMR (Experience Modification Rate)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { safetyMetricsApi } from '@/lib/api/services/safety-metrics'
import type {
  EmployeeHoursWorked,
  EmployeeHoursWorkedInput,
  SafetyMetricsSnapshot,
  EMRRecord,
  EMRRecordInput,
  HoursWorkedFilters,
  MetricsSnapshotFilters,
  MetricsPeriodType,
} from '@/types/safety-metrics'

// ============================================================================
// Query Keys
// ============================================================================

export const safetyMetricsKeys = {
  all: ['safety-metrics'] as const,

  // Hours worked
  hours: () => [...safetyMetricsKeys.all, 'hours'] as const,
  hoursList: (filters: HoursWorkedFilters) => [...safetyMetricsKeys.hours(), 'list', filters] as const,
  hoursTotal: (companyId: string, projectId: string | null, start: string, end: string) =>
    [...safetyMetricsKeys.hours(), 'total', companyId, projectId, start, end] as const,

  // Metrics
  metrics: () => [...safetyMetricsKeys.all, 'metrics'] as const,
  metricsDetail: (companyId: string, projectId?: string, start?: string, end?: string) =>
    [...safetyMetricsKeys.metrics(), companyId, projectId, start, end] as const,

  // Snapshots
  snapshots: () => [...safetyMetricsKeys.all, 'snapshots'] as const,
  snapshotsList: (filters: MetricsSnapshotFilters) => [...safetyMetricsKeys.snapshots(), 'list', filters] as const,

  // Trends
  trends: () => [...safetyMetricsKeys.all, 'trends'] as const,
  trend: (companyId: string, projectId: string | null, periodType: MetricsPeriodType, months: number) =>
    [...safetyMetricsKeys.trends(), companyId, projectId, periodType, months] as const,

  // Benchmarks
  benchmarks: () => [...safetyMetricsKeys.all, 'benchmarks'] as const,
  benchmark: (naicsCode: string, year: number) => [...safetyMetricsKeys.benchmarks(), naicsCode, year] as const,

  // EMR
  emr: () => [...safetyMetricsKeys.all, 'emr'] as const,
  emrList: (companyId: string) => [...safetyMetricsKeys.emr(), 'list', companyId] as const,
  emrCurrent: (companyId: string) => [...safetyMetricsKeys.emr(), 'current', companyId] as const,

  // Dashboard
  dashboard: (companyId: string, projectId?: string, year?: number) =>
    [...safetyMetricsKeys.all, 'dashboard', companyId, projectId, year] as const,
}

// ============================================================================
// Hours Worked Hooks
// ============================================================================

/**
 * Fetch hours worked records
 */
export function useHoursWorked(filters: HoursWorkedFilters = {}) {
  return useQuery({
    queryKey: safetyMetricsKeys.hoursList(filters),
    queryFn: () => safetyMetricsApi.getHoursWorked(filters),
    enabled: !!filters.company_id,
  })
}

/**
 * Fetch total hours for a period
 */
export function useTotalHoursForPeriod(
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: safetyMetricsKeys.hoursTotal(companyId, projectId, startDate, endDate),
    queryFn: () => safetyMetricsApi.getTotalHoursForPeriod(companyId, projectId, startDate, endDate),
    enabled: !!companyId && !!startDate && !!endDate,
  })
}

/**
 * Create hours worked record
 */
export function useCreateHoursWorked() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: EmployeeHoursWorkedInput) => safetyMetricsApi.createHoursWorked(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.hours() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.metrics() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.dashboard(variables.company_id) })
      showToast({
        type: 'success',
        title: 'Hours Recorded',
        message: 'Employee hours have been recorded successfully.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to record hours worked',
      })
    },
  })
}

/**
 * Update hours worked record
 */
export function useUpdateHoursWorked() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmployeeHoursWorkedInput> }) =>
      safetyMetricsApi.updateHoursWorked(id, data),
    onSuccess: (record: EmployeeHoursWorked) => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.hours() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.metrics() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.dashboard(record.company_id) })
      showToast({
        type: 'success',
        title: 'Hours Updated',
        message: 'Employee hours have been updated.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update hours worked',
      })
    },
  })
}

/**
 * Delete hours worked record
 */
export function useDeleteHoursWorked() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyMetricsApi.deleteHoursWorked(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.hours() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.metrics() })
      showToast({
        type: 'success',
        title: 'Hours Deleted',
        message: 'Hours record has been deleted.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete hours record',
      })
    },
  })
}

// ============================================================================
// Safety Metrics Hooks
// ============================================================================

/**
 * Fetch current safety metrics
 */
export function useSafetyMetrics(
  companyId: string | undefined,
  projectId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: safetyMetricsKeys.metricsDetail(companyId || '', projectId, startDate, endDate),
    queryFn: () => safetyMetricsApi.getCurrentMetrics(companyId!, projectId, startDate, endDate),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch YTD safety metrics
 */
export function useYTDSafetyMetrics(companyId: string | undefined, projectId?: string) {
  const year = new Date().getFullYear()
  const startDate = `${year}-01-01`
  const endDate = new Date().toISOString().split('T')[0]

  return useSafetyMetrics(companyId, projectId, startDate, endDate)
}

// ============================================================================
// Metrics Snapshot Hooks
// ============================================================================

/**
 * Fetch metrics snapshots
 */
export function useMetricsSnapshots(filters: MetricsSnapshotFilters = {}) {
  return useQuery({
    queryKey: safetyMetricsKeys.snapshotsList(filters),
    queryFn: () => safetyMetricsApi.getSnapshots(filters),
    enabled: !!filters.company_id,
  })
}

/**
 * Create metrics snapshot
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
      periodType,
      year,
      month,
      quarter,
    }: {
      companyId: string
      projectId: string | null
      periodType: MetricsPeriodType
      year: number
      month?: number
      quarter?: number
    }) => safetyMetricsApi.createSnapshot(companyId, projectId, periodType, year, month, quarter),
    onSuccess: (snapshot: SafetyMetricsSnapshot) => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.snapshots() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.trends() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.dashboard(snapshot.company_id) })
      showToast({
        type: 'success',
        title: 'Snapshot Created',
        message: 'Safety metrics snapshot has been created.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create snapshot',
      })
    },
  })
}

// ============================================================================
// Trend Hooks
// ============================================================================

/**
 * Fetch metrics trend data
 */
export function useSafetyMetricsTrend(
  companyId: string | undefined,
  projectId: string | null = null,
  periodType: MetricsPeriodType = 'monthly',
  months: number = 12
) {
  return useQuery({
    queryKey: safetyMetricsKeys.trend(companyId || '', projectId, periodType, months),
    queryFn: () => safetyMetricsApi.getMetricsTrend(companyId!, projectId, periodType, months),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Benchmark Hooks
// ============================================================================

/**
 * Fetch industry benchmarks
 */
export function useIndustryBenchmarks(naicsCode?: string, year?: number) {
  return useQuery({
    queryKey: safetyMetricsKeys.benchmark(naicsCode || '', year || 0),
    queryFn: () => safetyMetricsApi.getBenchmarks(naicsCode, year),
    staleTime: 60 * 60 * 1000, // 1 hour - benchmarks don't change often
  })
}

/**
 * Fetch benchmark for comparison
 */
export function useBenchmarkComparison(naicsCode: string = '23', year?: number) {
  const currentYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: safetyMetricsKeys.benchmark(naicsCode, currentYear),
    queryFn: () => safetyMetricsApi.getBenchmarkForComparison(naicsCode, currentYear),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// ============================================================================
// EMR Hooks
// ============================================================================

/**
 * Fetch EMR records
 */
export function useEMRRecords(companyId: string | undefined) {
  return useQuery({
    queryKey: safetyMetricsKeys.emrList(companyId || ''),
    queryFn: () => safetyMetricsApi.getEMRRecords(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Fetch current EMR
 */
export function useCurrentEMR(companyId: string | undefined) {
  return useQuery({
    queryKey: safetyMetricsKeys.emrCurrent(companyId || ''),
    queryFn: () => safetyMetricsApi.getCurrentEMR(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Create EMR record
 */
export function useCreateEMR() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: EMRRecordInput) => safetyMetricsApi.createEMRRecord(input),
    onSuccess: (record: EMRRecord) => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.emr() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.dashboard(record.company_id) })
      showToast({
        type: 'success',
        title: 'EMR Recorded',
        message: 'Experience Modification Rate has been recorded.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create EMR record',
      })
    },
  })
}

/**
 * Update EMR record
 */
export function useUpdateEMR() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EMRRecordInput> }) =>
      safetyMetricsApi.updateEMRRecord(id, data),
    onSuccess: (record: EMRRecord) => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.emr() })
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.dashboard(record.company_id) })
      showToast({
        type: 'success',
        title: 'EMR Updated',
        message: 'Experience Modification Rate has been updated.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update EMR record',
      })
    },
  })
}

/**
 * Delete EMR record
 */
export function useDeleteEMR() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyMetricsApi.deleteEMRRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: safetyMetricsKeys.emr() })
      showToast({
        type: 'success',
        title: 'EMR Deleted',
        message: 'EMR record has been deleted.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete EMR record',
      })
    },
  })
}

// ============================================================================
// Dashboard Hook
// ============================================================================

/**
 * Fetch complete dashboard data
 */
export function useSafetyMetricsDashboard(
  companyId: string | undefined,
  projectId?: string,
  year?: number
) {
  const currentYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: safetyMetricsKeys.dashboard(companyId || '', projectId, currentYear),
    queryFn: () => safetyMetricsApi.getDashboardData(companyId!, projectId, currentYear),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to format rate values for display
 */
export function useRateDisplay() {
  const formatTRIR = (value: number | null) =>
    value !== null ? value.toFixed(2) : 'N/A'

  const formatDART = (value: number | null) =>
    value !== null ? value.toFixed(2) : 'N/A'

  const formatLTIR = (value: number | null) =>
    value !== null ? value.toFixed(2) : 'N/A'

  const formatEMR = (value: number | null) =>
    value !== null ? value.toFixed(3) : 'N/A'

  const formatSeverity = (value: number | null) =>
    value !== null ? value.toFixed(1) : 'N/A'

  return {
    formatTRIR,
    formatDART,
    formatLTIR,
    formatEMR,
    formatSeverity,
  }
}

/**
 * Hook to get status colors for metrics
 */
export function useMetricStatus() {
  const getStatus = (
    value: number | null,
    benchmark: number | null,
    type: 'rate' | 'emr' = 'rate'
  ): 'good' | 'warning' | 'danger' | 'unknown' => {
    if (value === null) {return 'unknown'}

    if (type === 'emr') {
      // For EMR, lower is better (1.0 is industry average)
      if (value <= 0.85) {return 'good'}
      if (value <= 1.0) {return 'warning'}
      return 'danger'
    }

    // For rates, compare to benchmark
    if (benchmark === null) {
      // Default thresholds if no benchmark
      if (value < 2) {return 'good'}
      if (value < 4) {return 'warning'}
      return 'danger'
    }

    // Lower than 80% of benchmark is good
    if (value <= benchmark * 0.8) {return 'good'}
    // Within 120% of benchmark is warning
    if (value <= benchmark * 1.2) {return 'warning'}
    // Above is danger
    return 'danger'
  }

  const getStatusColor = (status: 'good' | 'warning' | 'danger' | 'unknown') => {
    switch (status) {
      case 'good':
        return { bg: 'bg-success-light', text: 'text-green-800', border: 'border-green-300' }
      case 'warning':
        return { bg: 'bg-warning-light', text: 'text-yellow-800', border: 'border-yellow-300' }
      case 'danger':
        return { bg: 'bg-error-light', text: 'text-red-800', border: 'border-red-300' }
      default:
        return { bg: 'bg-muted', text: 'text-secondary', border: 'border-input' }
    }
  }

  return { getStatus, getStatusColor }
}
