/**
 * Earned Value Management (EVM) Hooks
 *
 * React Query hooks for EVM data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evmApi } from '@/lib/api/services/earned-value-management'
import { format } from 'date-fns'

import type {
  EarnedValueMetrics,
  EVMByDivision,
  EVMTrendDataPoint,
  EVMSCurveData,
  EVMForecastScenarios,
  ProjectEVMSummary,
  EVMAlert,
} from '@/types/cost-tracking'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const evmKeys = {
  all: ['evm'] as const,
  metrics: (projectId: string, statusDate?: string) =>
    [...evmKeys.all, 'metrics', projectId, statusDate] as const,
  byDivision: (projectId: string) =>
    [...evmKeys.all, 'by-division', projectId] as const,
  trend: (projectId: string, days?: number) =>
    [...evmKeys.all, 'trend', projectId, days] as const,
  sCurve: (projectId: string) =>
    [...evmKeys.all, 's-curve', projectId] as const,
  forecasts: (projectId: string) =>
    [...evmKeys.all, 'forecasts', projectId] as const,
  alerts: (projectId: string) =>
    [...evmKeys.all, 'alerts', projectId] as const,
  summary: (projectId: string) =>
    [...evmKeys.all, 'summary', projectId] as const,
  snapshots: (projectId: string) =>
    [...evmKeys.all, 'snapshots', projectId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get current EVM metrics for a project
 */
export function useEVMMetrics(
  projectId: string | undefined,
  statusDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.metrics(projectId || '', statusDate),
    queryFn: () => evmApi.getEVMMetrics(projectId!, statusDate),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get EVM metrics broken down by cost code division
 */
export function useEVMByDivision(
  projectId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.byDivision(projectId || ''),
    queryFn: () => evmApi.getEVMByDivision(projectId!),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get historical EVM trend data
 */
export function useEVMTrend(
  projectId: string | undefined,
  days: number = 30,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.trend(projectId || '', days),
    queryFn: () => evmApi.getEVMTrend(projectId!, days),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get S-Curve data for visualization
 */
export function useEVMSCurve(
  projectId: string | undefined,
  includeForecasts: boolean = true,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.sCurve(projectId || ''),
    queryFn: () => evmApi.getSCurveData(projectId!, includeForecasts),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get forecast scenarios (Original, CPI, CPI*SPI, Management)
 */
export function useEVMForecasts(
  projectId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.forecasts(projectId || ''),
    queryFn: () => evmApi.getForecastScenarios(projectId!),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get EVM alerts for a project
 */
export function useEVMAlerts(
  projectId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.alerts(projectId || ''),
    queryFn: () => evmApi.getAlerts(projectId!),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes for alerts
  })
}

/**
 * Get complete EVM summary for dashboard
 */
export function useProjectEVMSummary(
  projectId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.summary(projectId || ''),
    queryFn: () => evmApi.getProjectEVMSummary(projectId!),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get historical snapshots
 */
export function useEVMSnapshots(
  projectId: string | undefined,
  limit: number = 30,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: evmKeys.snapshots(projectId || ''),
    queryFn: () => evmApi.getSnapshots(projectId!, limit),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create an EVM snapshot
 */
export function useCreateEVMSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      companyId,
      statusDate,
      createdBy,
    }: {
      projectId: string
      companyId: string
      statusDate?: string
      createdBy?: string
    }) => evmApi.createSnapshot(projectId, companyId, statusDate, createdBy),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: evmKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: evmKeys.snapshots(variables.projectId),
      })
    },
  })
}

/**
 * Update management estimate
 */
export function useUpdateManagementEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      snapshotId,
      projectId,
      managementEac,
      completionDate,
      notes,
    }: {
      snapshotId: string
      projectId: string
      managementEac: number | null
      completionDate: string | null
      notes: string | null
    }) =>
      evmApi.updateManagementEstimate(snapshotId, managementEac, completionDate, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: evmKeys.forecasts(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: evmKeys.summary(variables.projectId),
      })
    },
  })
}

/**
 * Generate daily snapshots for all projects
 */
export function useGenerateDailySnapshots() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (companyId: string) => evmApi.generateDailySnapshots(companyId),
    onSuccess: () => {
      // Invalidate all EVM queries
      queryClient.invalidateQueries({
        queryKey: evmKeys.all,
      })
    },
  })
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to get formatted display values for EVM metrics
 */
export function useEVMDisplayValues(metrics: EarnedValueMetrics | undefined) {
  if (!metrics) {
    return {
      cpi: '—',
      spi: '—',
      eac: '—',
      etc: '—',
      vac: '—',
      cv: '—',
      sv: '—',
      percentComplete: '—',
      percentSpent: '—',
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatIndex = (value: number) =>
    value ? value.toFixed(2) : '—'

  const formatPercent = (value: number) =>
    `${value.toFixed(1)}%`

  return {
    cpi: formatIndex(metrics.CPI),
    spi: formatIndex(metrics.SPI),
    csi: formatIndex(metrics.CSI),
    eac: formatCurrency(metrics.EAC),
    etc: formatCurrency(metrics.ETC),
    vac: formatCurrency(metrics.VAC),
    cv: formatCurrency(metrics.CV),
    sv: formatCurrency(metrics.SV),
    bac: formatCurrency(metrics.BAC),
    ac: formatCurrency(metrics.AC),
    ev: formatCurrency(metrics.EV),
    pv: formatCurrency(metrics.PV),
    percentComplete: formatPercent(metrics.percent_complete_actual),
    percentSpent: formatPercent(metrics.percent_spent),
    percentPlanned: formatPercent(metrics.percent_complete_planned),
    tcpiBac: formatIndex(metrics.TCPI_BAC),
    tcpiEac: formatIndex(metrics.TCPI_EAC),
    cvPercent: formatPercent(metrics.CV_percent),
    svPercent: formatPercent(metrics.SV_percent),
    vacPercent: formatPercent(metrics.VAC_percent),
  }
}

/**
 * Hook to determine if project health is at risk
 */
export function useEVMHealthCheck(projectId: string | undefined) {
  const { data: metrics } = useEVMMetrics(projectId)
  const { data: alerts } = useEVMAlerts(projectId)

  const isAtRisk = !!(
    (metrics?.CPI && metrics.CPI < 0.95) ||
    (metrics?.SPI && metrics.SPI < 0.95) ||
    (alerts && alerts.some(a => a.severity === 'critical'))
  )

  const riskLevel = !metrics
    ? 'unknown'
    : metrics.CSI >= 1.0
    ? 'low'
    : metrics.CSI >= 0.9
    ? 'medium'
    : metrics.CSI >= 0.8
    ? 'high'
    : 'critical'

  return {
    isAtRisk,
    riskLevel,
    criticalAlerts: alerts?.filter(a => a.severity === 'critical').length || 0,
    warningAlerts: alerts?.filter(a => a.severity === 'warning').length || 0,
  }
}
