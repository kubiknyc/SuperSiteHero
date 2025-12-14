/**
 * useVarianceAlerts Hook
 *
 * Generates budget variance alerts based on configurable thresholds.
 * Alerts project managers when budget lines exceed specified limits.
 */

import { useMemo } from 'react'
import { useProjectBudgets, useProjectBudgetTotals } from './useCostTracking'
import type {
  BudgetVarianceAlert,
  BudgetVarianceAlertSummary,
  BudgetVarianceThresholds,
  BudgetVarianceAlertSeverity,
  ProjectBudgetWithDetails,
  ProjectBudgetTotals,
} from '@/types/cost-tracking'
import { DEFAULT_VARIANCE_THRESHOLDS } from '@/types/cost-tracking'

/**
 * Generate variance alerts from budget data
 */
function generateVarianceAlerts(
  budgets: ProjectBudgetWithDetails[],
  totals: ProjectBudgetTotals | null,
  thresholds: BudgetVarianceThresholds
): BudgetVarianceAlert[] {
  const alerts: BudgetVarianceAlert[] = []
  const now = new Date().toISOString()

  // Generate alerts for individual budget lines
  for (const budget of budgets) {
    const revisedBudget = budget.revised_budget || budget.original_budget || 0
    const actualCost = budget.actual_cost || 0
    const variance = revisedBudget - actualCost
    const variancePercent = revisedBudget > 0 ? ((actualCost - revisedBudget) / revisedBudget) * 100 : 0
    const percentSpent = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0

    // Skip small variances to reduce noise
    if (Math.abs(variance) < thresholds.minimum_variance_amount && variancePercent < thresholds.warning_overrun_percent) {
      continue
    }

    // Critical overrun alert
    if (variancePercent >= thresholds.critical_overrun_percent) {
      alerts.push({
        id: `${budget.id}-critical-overrun`,
        type: 'line_over_budget',
        severity: 'critical',
        title: 'Critical Budget Overrun',
        message: `${budget.cost_code_name || budget.cost_code} is ${variancePercent.toFixed(1)}% over budget ($${Math.abs(variance).toLocaleString()} overrun)`,
        budget_id: budget.id,
        cost_code: budget.cost_code,
        cost_code_name: budget.cost_code_name,
        division: budget.cost_code?.substring(0, 2),
        budget_amount: revisedBudget,
        actual_amount: actualCost,
        variance_amount: variance,
        variance_percent: variancePercent,
        threshold_percent: thresholds.critical_overrun_percent,
        created_at: now,
      })
    }
    // Warning overrun alert
    else if (variancePercent >= thresholds.warning_overrun_percent) {
      alerts.push({
        id: `${budget.id}-warning-overrun`,
        type: 'line_over_budget',
        severity: 'warning',
        title: 'Budget Overrun Warning',
        message: `${budget.cost_code_name || budget.cost_code} is ${variancePercent.toFixed(1)}% over budget`,
        budget_id: budget.id,
        cost_code: budget.cost_code,
        cost_code_name: budget.cost_code_name,
        division: budget.cost_code?.substring(0, 2),
        budget_amount: revisedBudget,
        actual_amount: actualCost,
        variance_amount: variance,
        variance_percent: variancePercent,
        threshold_percent: thresholds.warning_overrun_percent,
        created_at: now,
      })
    }
    // Near budget alert (approaching limit)
    else if (percentSpent >= thresholds.near_budget_percent && variance > 0) {
      alerts.push({
        id: `${budget.id}-near-budget`,
        type: 'line_near_budget',
        severity: 'info',
        title: 'Approaching Budget Limit',
        message: `${budget.cost_code_name || budget.cost_code} is ${percentSpent.toFixed(0)}% spent ($${variance.toLocaleString()} remaining)`,
        budget_id: budget.id,
        cost_code: budget.cost_code,
        cost_code_name: budget.cost_code_name,
        division: budget.cost_code?.substring(0, 2),
        budget_amount: revisedBudget,
        actual_amount: actualCost,
        variance_amount: variance,
        variance_percent: variancePercent,
        threshold_percent: thresholds.near_budget_percent,
        created_at: now,
      })
    }
  }

  // Generate project-level alert
  if (totals && totals.total_revised_budget > 0) {
    const projectVariancePercent = ((totals.total_actual_cost - totals.total_revised_budget) / totals.total_revised_budget) * 100

    if (projectVariancePercent >= thresholds.project_critical_percent) {
      alerts.push({
        id: 'project-critical-overrun',
        type: 'project_over_budget',
        severity: 'critical',
        title: 'Project Over Budget',
        message: `Project is ${projectVariancePercent.toFixed(1)}% over budget ($${Math.abs(totals.total_variance).toLocaleString()} total overrun)`,
        budget_amount: totals.total_revised_budget,
        actual_amount: totals.total_actual_cost,
        variance_amount: totals.total_variance,
        variance_percent: projectVariancePercent,
        threshold_percent: thresholds.project_critical_percent,
        created_at: now,
      })
    } else if (projectVariancePercent >= thresholds.project_warning_percent) {
      alerts.push({
        id: 'project-warning-overrun',
        type: 'project_over_budget',
        severity: 'warning',
        title: 'Project Budget Warning',
        message: `Project is ${projectVariancePercent.toFixed(1)}% over budget`,
        budget_amount: totals.total_revised_budget,
        actual_amount: totals.total_actual_cost,
        variance_amount: totals.total_variance,
        variance_percent: projectVariancePercent,
        threshold_percent: thresholds.project_warning_percent,
        created_at: now,
      })
    }
  }

  // Sort alerts by severity (critical first, then warning, then info)
  const severityOrder: Record<BudgetVarianceAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    // Then by variance amount (larger overruns first)
    return a.variance_amount - b.variance_amount
  })
}

/**
 * Hook to get budget variance alerts for a project
 */
export function useVarianceAlerts(
  projectId: string | undefined,
  thresholds: BudgetVarianceThresholds = DEFAULT_VARIANCE_THRESHOLDS
): {
  alerts: BudgetVarianceAlert[]
  summary: BudgetVarianceAlertSummary
  isLoading: boolean
  error: Error | null
} {
  const {
    data: budgets,
    isLoading: budgetsLoading,
    error: budgetsError,
  } = useProjectBudgets({ projectId: projectId || '' })

  const {
    data: totals,
    isLoading: totalsLoading,
    error: totalsError,
  } = useProjectBudgetTotals(projectId || '')

  const alerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return []
    return generateVarianceAlerts(budgets, totals || null, thresholds)
  }, [budgets, totals, thresholds])

  const summary = useMemo((): BudgetVarianceAlertSummary => {
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
    const warningAlerts = alerts.filter((a) => a.severity === 'warning')
    const infoAlerts = alerts.filter((a) => a.severity === 'info')

    const overBudgetAlerts = alerts.filter(
      (a) => a.type === 'line_over_budget' || a.type === 'project_over_budget'
    )

    const totalOverrun = overBudgetAlerts.reduce(
      (sum, a) => sum + Math.abs(a.variance_amount),
      0
    )

    return {
      total_alerts: alerts.length,
      critical_count: criticalAlerts.length,
      warning_count: warningAlerts.length,
      info_count: infoAlerts.length,
      total_overrun_amount: totalOverrun,
      lines_over_budget: overBudgetAlerts.filter((a) => a.type === 'line_over_budget').length,
      alerts,
    }
  }, [alerts])

  return {
    alerts,
    summary,
    isLoading: budgetsLoading || totalsLoading,
    error: budgetsError || totalsError || null,
  }
}

/**
 * Hook to get just the alert count (for badges)
 */
export function useVarianceAlertCount(
  projectId: string | undefined,
  thresholds?: BudgetVarianceThresholds
): {
  total: number
  critical: number
  warning: number
  isLoading: boolean
} {
  const { summary, isLoading } = useVarianceAlerts(projectId, thresholds)

  return {
    total: summary.total_alerts,
    critical: summary.critical_count,
    warning: summary.warning_count,
    isLoading,
  }
}

/**
 * Hook to check if a specific budget line has alerts
 */
export function useBudgetLineAlert(
  projectId: string | undefined,
  budgetId: string | undefined
): BudgetVarianceAlert | null {
  const { alerts } = useVarianceAlerts(projectId)

  return useMemo(() => {
    if (!budgetId) return null
    return alerts.find((a) => a.budget_id === budgetId) || null
  }, [alerts, budgetId])
}

export default useVarianceAlerts
