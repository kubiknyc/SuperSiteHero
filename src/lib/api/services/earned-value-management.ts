// @ts-nocheck
/**
 * Earned Value Management (EVM) API Service
 *
 * Implements PMI/PMBOK standard EVM methodology:
 * - CPI (Cost Performance Index)
 * - SPI (Schedule Performance Index)
 * - EAC, ETC, VAC forecasts
 * - Trend analysis and S-curve data
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { addDays, differenceInDays, format, subDays } from 'date-fns'

import type {
  EarnedValueMetrics,
  EVMByDivision,
  EVMTrendDataPoint,
  EVMSCurveData,
  EVMForecastScenarios,
  ProjectEVMSummary,
  EVMAlert,
  EVMPerformanceStatus,
  EVMTrend,
  DEFAULT_EVM_THRESHOLDS,
  getPerformanceStatus,
} from '@/types/cost-tracking'

// Using extended Database types for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase

// ============================================================================
// EVM CALCULATIONS
// ============================================================================

export const evmApi = {
  /**
   * Get current EVM metrics for a project
   */
  async getEVMMetrics(
    projectId: string,
    statusDate: string = format(new Date(), 'yyyy-MM-dd')
  ): Promise<EarnedValueMetrics> {
    const { data, error } = await db.rpc('calculate_evm_metrics', {
      p_project_id: projectId,
      p_status_date: statusDate,
    })

    if (error) {
      throw new ApiErrorClass(500, 'Failed to calculate EVM metrics', error)
    }

    // Convert database result to EarnedValueMetrics
    const row = data?.[0]
    if (!row) {
      // Return empty metrics if no data
      return createEmptyMetrics(statusDate)
    }

    return {
      BAC: Number(row.bac) || 0,
      PV: Number(row.pv) || 0,
      EV: Number(row.ev) || 0,
      AC: Number(row.ac) || 0,
      CV: Number(row.cv) || 0,
      SV: Number(row.sv) || 0,
      CV_percent: Number(row.cv_percent) || 0,
      SV_percent: Number(row.sv_percent) || 0,
      CPI: Number(row.cpi) || 0,
      SPI: Number(row.spi) || 0,
      CSI: Number(row.csi) || 0,
      EAC: Number(row.eac) || 0,
      ETC: Number(row.etc) || 0,
      VAC: Number(row.vac) || 0,
      VAC_percent: Number(row.vac_percent) || 0,
      TCPI_BAC: Number(row.tcpi_bac) || 0,
      TCPI_EAC: Number(row.tcpi_eac) || 0,
      planned_duration: row.planned_duration_days || 0,
      actual_duration: row.actual_duration_days || 0,
      estimated_duration: row.estimated_duration_days || 0,
      percent_complete_planned: Number(row.percent_complete_planned) || 0,
      percent_complete_actual: Number(row.percent_complete_actual) || 0,
      percent_spent: Number(row.percent_spent) || 0,
      cost_status: row.cost_status as EVMPerformanceStatus,
      schedule_status: row.schedule_status as EVMPerformanceStatus,
      overall_status: row.overall_status as EVMPerformanceStatus,
      status_date: statusDate,
      data_currency: 'current',
    }
  },

  /**
   * Get EVM metrics broken down by cost code division
   */
  async getEVMByDivision(
    projectId: string,
    statusDate: string = format(new Date(), 'yyyy-MM-dd')
  ): Promise<EVMByDivision[]> {
    const { data, error } = await db.rpc('get_evm_by_division', {
      p_project_id: projectId,
      p_status_date: statusDate,
    })

    if (error) {
      throw new ApiErrorClass(500, 'Failed to get EVM by division', error)
    }

    return (data || []).map((row: any) => ({
      division: row.division,
      division_name: row.division_name,
      BAC: Number(row.bac) || 0,
      PV: Number(row.pv) || 0,
      EV: Number(row.ev) || 0,
      AC: Number(row.ac) || 0,
      CV: Number(row.cv) || 0,
      SV: Number(row.sv) || 0,
      CPI: Number(row.cpi) || 0,
      SPI: Number(row.spi) || 0,
      EAC: Number(row.eac) || 0,
      percent_complete: Number(row.percent_complete) || 0,
      cost_status: row.cost_status as EVMPerformanceStatus,
      schedule_status: row.schedule_status as EVMPerformanceStatus,
    }))
  },

  /**
   * Get historical EVM trend data
   */
  async getEVMTrend(projectId: string, days: number = 30): Promise<EVMTrendDataPoint[]> {
    const { data, error } = await db.rpc('get_evm_trend', {
      p_project_id: projectId,
      p_days: days,
    })

    if (error) {
      throw new ApiErrorClass(500, 'Failed to get EVM trend', error)
    }

    return (data || []).map((row: any) => ({
      date: row.status_date,
      PV: Number(row.pv) || 0,
      EV: Number(row.ev) || 0,
      AC: Number(row.ac) || 0,
      CPI: Number(row.cpi) || 0,
      SPI: Number(row.spi) || 0,
      percent_complete: Number(row.percent_complete) || 0,
    }))
  },

  /**
   * Create an EVM snapshot for the project
   */
  async createSnapshot(
    projectId: string,
    companyId: string,
    statusDate: string = format(new Date(), 'yyyy-MM-dd'),
    createdBy?: string
  ): Promise<string> {
    const { data, error } = await db.rpc('create_evm_snapshot', {
      p_project_id: projectId,
      p_company_id: companyId,
      p_status_date: statusDate,
      p_created_by: createdBy || null,
    })

    if (error) {
      throw new ApiErrorClass(500, 'Failed to create EVM snapshot', error)
    }

    return data
  },

  /**
   * Get historical snapshots
   */
  async getSnapshots(
    projectId: string,
    limit: number = 30
  ): Promise<any[]> {
    const { data, error } = await db
      .from('evm_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('status_date', { ascending: false })
      .limit(limit)

    if (error) {
      throw new ApiErrorClass(500, 'Failed to get EVM snapshots', error)
    }

    return data || []
  },

  /**
   * Update management estimate for a snapshot
   */
  async updateManagementEstimate(
    snapshotId: string,
    managementEac: number | null,
    managementCompletionDate: string | null,
    notes: string | null
  ): Promise<void> {
    const { error } = await db
      .from('evm_snapshots')
      .update({
        management_eac: managementEac,
        management_completion_date: managementCompletionDate,
        management_notes: notes,
      })
      .eq('id', snapshotId)

    if (error) {
      throw new ApiErrorClass(500, 'Failed to update management estimate', error)
    }
  },

  /**
   * Generate S-curve data for visualization
   */
  async getSCurveData(
    projectId: string,
    includeForecasts: boolean = true
  ): Promise<EVMSCurveData[]> {
    // Get project date range
    const { data: project, error: projectError } = await db
      .from('projects')
      .select('start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError) {
      throw new ApiErrorClass(500, 'Failed to get project dates', projectError)
    }

    // Get historical snapshots
    const snapshots = await this.getSnapshots(projectId, 365)

    // Get current metrics for forecast
    const currentMetrics = await this.getEVMMetrics(projectId)

    // Build S-curve data
    const sCurveData: EVMSCurveData[] = []

    // Historical data from snapshots
    for (const snapshot of snapshots.reverse()) {
      sCurveData.push({
        date: snapshot.status_date,
        planned_cumulative: Number(snapshot.pv) || 0,
        earned_cumulative: Number(snapshot.ev) || 0,
        actual_cumulative: Number(snapshot.ac) || 0,
        forecast_cumulative: 0, // Will be calculated below
      })
    }

    // Add forecast if requested
    if (includeForecasts && currentMetrics.CPI > 0) {
      const today = new Date()
      const daysToComplete = Math.ceil(
        (currentMetrics.BAC - currentMetrics.EV) /
        (currentMetrics.CPI * (currentMetrics.BAC / currentMetrics.planned_duration || 1))
      )

      // Add forecast points
      for (let i = 0; i <= Math.min(daysToComplete, 90); i += 7) {
        const forecastDate = addDays(today, i)
        const projectedEV = currentMetrics.EV +
          (currentMetrics.CPI * (currentMetrics.BAC / currentMetrics.planned_duration || 0) * i)

        sCurveData.push({
          date: format(forecastDate, 'yyyy-MM-dd'),
          planned_cumulative: currentMetrics.BAC, // Full budget as baseline
          earned_cumulative: 0, // No actual earned value in future
          actual_cumulative: 0,
          forecast_cumulative: Math.min(projectedEV, currentMetrics.BAC),
        })
      }
    }

    return sCurveData
  },

  /**
   * Calculate forecast scenarios
   */
  async getForecastScenarios(projectId: string): Promise<EVMForecastScenarios> {
    const metrics = await this.getEVMMetrics(projectId)

    // Get project end date
    const { data: project } = await db
      .from('projects')
      .select('end_date')
      .eq('id', projectId)
      .single()

    const originalEndDate = project?.end_date || format(addDays(new Date(), 365), 'yyyy-MM-dd')

    // Calculate completion dates based on different methods
    const remainingWork = metrics.BAC - metrics.EV
    const dailyRate = metrics.planned_duration > 0
      ? metrics.BAC / metrics.planned_duration
      : metrics.BAC / 365

    // Days to complete based on different scenarios
    const daysOriginal = metrics.planned_duration - metrics.actual_duration
    const daysCPI = metrics.CPI > 0 ? remainingWork / (dailyRate * metrics.CPI) : daysOriginal
    const daysSPIAdjusted = (metrics.CPI > 0 && metrics.SPI > 0)
      ? remainingWork / (dailyRate * metrics.CPI * metrics.SPI)
      : daysCPI

    // Get latest management estimate
    const { data: latestSnapshot } = await db
      .from('evm_snapshots')
      .select('management_eac, management_completion_date, management_notes')
      .eq('project_id', projectId)
      .not('management_eac', 'is', null)
      .order('status_date', { ascending: false })
      .limit(1)
      .single()

    return {
      original: {
        EAC: metrics.BAC,
        completion_date: originalEndDate,
        method: 'Original Budget',
      },
      cpi_based: {
        EAC: metrics.CPI > 0 ? metrics.BAC / metrics.CPI : metrics.BAC,
        completion_date: format(addDays(new Date(), daysCPI), 'yyyy-MM-dd'),
        method: 'CPI Projection',
      },
      spi_adjusted: {
        EAC: (metrics.CPI > 0 && metrics.SPI > 0)
          ? metrics.AC + (remainingWork / (metrics.CPI * metrics.SPI))
          : metrics.BAC,
        completion_date: format(addDays(new Date(), daysSPIAdjusted), 'yyyy-MM-dd'),
        method: 'CPI×SPI Projection',
      },
      management: {
        EAC: latestSnapshot?.management_eac || null,
        completion_date: latestSnapshot?.management_completion_date || null,
        method: 'Management Estimate',
        notes: latestSnapshot?.management_notes || null,
      },
    }
  },

  /**
   * Generate EVM alerts based on thresholds
   */
  async getAlerts(projectId: string): Promise<EVMAlert[]> {
    const metrics = await this.getEVMMetrics(projectId)
    const alerts: EVMAlert[] = []

    // Cost overrun alert
    if (metrics.CPI < 0.90) {
      alerts.push({
        id: `${projectId}-cost-critical`,
        type: 'cost_overrun',
        severity: 'critical',
        title: 'Critical Cost Overrun',
        message: `CPI of ${metrics.CPI.toFixed(2)} indicates significant cost overrun. Project is ${((1 - metrics.CPI) * 100).toFixed(0)}% over budget.`,
        metric: 'CPI',
        threshold: 0.90,
        current_value: metrics.CPI,
        created_at: new Date().toISOString(),
      })
    } else if (metrics.CPI < 0.95) {
      alerts.push({
        id: `${projectId}-cost-warning`,
        type: 'cost_overrun',
        severity: 'warning',
        title: 'Cost Overrun Warning',
        message: `CPI of ${metrics.CPI.toFixed(2)} indicates project is trending over budget.`,
        metric: 'CPI',
        threshold: 0.95,
        current_value: metrics.CPI,
        created_at: new Date().toISOString(),
      })
    }

    // Schedule slip alert
    if (metrics.SPI < 0.90) {
      alerts.push({
        id: `${projectId}-schedule-critical`,
        type: 'schedule_slip',
        severity: 'critical',
        title: 'Critical Schedule Delay',
        message: `SPI of ${metrics.SPI.toFixed(2)} indicates significant schedule delay. Project is ${((1 - metrics.SPI) * 100).toFixed(0)}% behind schedule.`,
        metric: 'SPI',
        threshold: 0.90,
        current_value: metrics.SPI,
        created_at: new Date().toISOString(),
      })
    } else if (metrics.SPI < 0.95) {
      alerts.push({
        id: `${projectId}-schedule-warning`,
        type: 'schedule_slip',
        severity: 'warning',
        title: 'Schedule Delay Warning',
        message: `SPI of ${metrics.SPI.toFixed(2)} indicates project is falling behind schedule.`,
        metric: 'SPI',
        threshold: 0.95,
        current_value: metrics.SPI,
        created_at: new Date().toISOString(),
      })
    }

    // Budget exhaustion alert
    if (metrics.percent_spent > 90 && metrics.percent_complete_actual < 80) {
      alerts.push({
        id: `${projectId}-budget-exhaustion`,
        type: 'budget_exhaustion',
        severity: 'critical',
        title: 'Budget Exhaustion Risk',
        message: `${metrics.percent_spent.toFixed(0)}% of budget spent with only ${metrics.percent_complete_actual.toFixed(0)}% work complete.`,
        metric: 'percent_spent',
        threshold: 90,
        current_value: metrics.percent_spent,
        created_at: new Date().toISOString(),
      })
    }

    // Performance decline alert (need trend data)
    const trend = await this.getEVMTrend(projectId, 14)
    if (trend.length >= 2) {
      const recent = trend[trend.length - 1]
      const previous = trend[0]
      const cpiChange = recent.CPI - previous.CPI

      if (cpiChange < -0.1) {
        alerts.push({
          id: `${projectId}-performance-decline`,
          type: 'performance_decline',
          severity: 'warning',
          title: 'Performance Declining',
          message: `CPI has dropped ${Math.abs(cpiChange).toFixed(2)} over the past 2 weeks, indicating declining cost performance.`,
          metric: 'CPI_trend',
          threshold: -0.1,
          current_value: cpiChange,
          created_at: new Date().toISOString(),
        })
      }
    }

    return alerts
  },

  /**
   * Get complete EVM summary for dashboard
   */
  async getProjectEVMSummary(projectId: string): Promise<ProjectEVMSummary> {
    // Get project info
    const { data: project } = await db
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    // Fetch all data in parallel
    const [metrics, byDivision, trend, forecasts, alerts] = await Promise.all([
      this.getEVMMetrics(projectId),
      this.getEVMByDivision(projectId),
      this.getEVMTrend(projectId, 30),
      this.getForecastScenarios(projectId),
      this.getAlerts(projectId),
    ])

    // Calculate trends
    const costTrend = calculateTrend(trend.map(t => t.CPI))
    const scheduleTrend = calculateTrend(trend.map(t => t.SPI))

    // Determine risk level
    const riskLevel = determineRiskLevel(metrics, alerts)

    return {
      project_id: projectId,
      project_name: project?.name || 'Unknown Project',
      metrics,
      trend,
      forecasts,
      by_division: byDivision,
      health_indicators: {
        cost_trend: costTrend,
        schedule_trend: scheduleTrend,
        risk_level: riskLevel,
        alerts,
      },
    }
  },

  /**
   * Generate a daily snapshot for all active projects
   * Typically called by a scheduled job
   */
  async generateDailySnapshots(companyId: string): Promise<number> {
    // Get all active projects for the company
    const { data: projects, error } = await db
      .from('projects')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (error) {
      throw new ApiErrorClass(500, 'Failed to get active projects', error)
    }

    let count = 0
    const today = format(new Date(), 'yyyy-MM-dd')

    for (const project of projects || []) {
      try {
        await this.createSnapshot(project.id, companyId, today)
        count++
      } catch (e) {
        console.error(`Failed to create snapshot for project ${project.id}:`, e)
      }
    }

    return count
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createEmptyMetrics(statusDate: string): EarnedValueMetrics {
  return {
    BAC: 0,
    PV: 0,
    EV: 0,
    AC: 0,
    CV: 0,
    SV: 0,
    CV_percent: 0,
    SV_percent: 0,
    CPI: 0,
    SPI: 0,
    CSI: 0,
    EAC: 0,
    ETC: 0,
    VAC: 0,
    VAC_percent: 0,
    TCPI_BAC: 0,
    TCPI_EAC: 0,
    planned_duration: 0,
    actual_duration: 0,
    estimated_duration: 0,
    percent_complete_planned: 0,
    percent_complete_actual: 0,
    percent_spent: 0,
    cost_status: 'good',
    schedule_status: 'good',
    overall_status: 'good',
    status_date: statusDate,
    data_currency: 'current',
  }
}

function calculateTrend(values: number[]): EVMTrend {
  if (values.length < 2) return 'stable'

  // Use linear regression to determine trend
  const n = values.length
  const recent = values.slice(-Math.min(7, n))
  const slope = (recent[recent.length - 1] - recent[0]) / recent.length

  if (slope > 0.01) return 'improving'
  if (slope < -0.01) return 'declining'
  return 'stable'
}

function determineRiskLevel(
  metrics: EarnedValueMetrics,
  alerts: EVMAlert[]
): 'low' | 'medium' | 'high' | 'critical' {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length

  // Critical if multiple critical alerts or CSI < 0.8
  if (criticalAlerts >= 2 || (metrics.CSI && metrics.CSI < 0.8)) {
    return 'critical'
  }

  // High if any critical alert or CSI < 0.9
  if (criticalAlerts >= 1 || (metrics.CSI && metrics.CSI < 0.9)) {
    return 'high'
  }

  // Medium if warnings present or performance below 1.0
  if (warningAlerts >= 1 || (metrics.CSI && metrics.CSI < 1.0)) {
    return 'medium'
  }

  return 'low'
}

export default evmApi
