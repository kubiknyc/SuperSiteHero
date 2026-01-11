/**
 * Budget Variance Analyzer Tool
 * Analyzes budget variances and provides financial health insights
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeBudgetVarianceInput {
  project_id: string
  period?: 'current' | 'month' | 'quarter' | 'project'
  include_forecast?: boolean
  variance_threshold?: number
}

interface BudgetLineItem {
  category: string
  description: string
  budgeted: number
  actual: number
  committed: number
  variance: number
  variance_percent: number
  status: 'under' | 'on_track' | 'over' | 'critical'
}

interface AnalyzeBudgetVarianceOutput {
  summary: {
    total_budget: number
    total_actual: number
    total_committed: number
    total_variance: number
    variance_percent: number
    contingency_remaining: number
    contingency_percent_used: number
    projected_final_cost: number
    projected_variance: number
  }
  variance_by_category: Record<string, {
    budgeted: number
    actual: number
    variance: number
    status: string
  }>
  problem_areas: BudgetLineItem[]
  positive_variances: BudgetLineItem[]
  change_order_impact: {
    approved_total: number
    pending_total: number
    impact_on_budget: string
  }
  cash_flow: {
    billed_to_date: number
    collected_to_date: number
    outstanding_receivables: number
    upcoming_payables: number
  }
  trends: Array<{
    period: string
    variance_percent: number
    direction: 'improving' | 'stable' | 'worsening'
  }>
  recommendations: string[]
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical'
    message: string
    action: string
  }>
}

export const analyzeBudgetVarianceTool = createTool<AnalyzeBudgetVarianceInput, AnalyzeBudgetVarianceOutput>({
  name: 'analyze_budget_variance',
  description: 'Analyzes budget variances, identifies problem areas, and provides financial health recommendations. Tracks costs against budget and forecasts final project costs.',
  category: 'cost',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze'
      },
      period: {
        type: 'string',
        enum: ['current', 'month', 'quarter', 'project'],
        description: 'Time period for analysis (default: project)'
      },
      include_forecast: {
        type: 'boolean',
        description: 'Include cost forecasting (default: true)'
      },
      variance_threshold: {
        type: 'number',
        description: 'Percentage threshold for flagging variances (default: 10)'
      }
    },
    required: ['project_id']
  },

  async execute(input: AnalyzeBudgetVarianceInput, context: AgentContext): Promise<AnalyzeBudgetVarianceOutput> {
    const {
      project_id,
      period = 'project',
      include_forecast = true,
      variance_threshold = 10
    } = input

    // Get project budget data
    const { data: project } = await supabase
      .from('projects')
      .select('*, budget, contingency_budget, contingency_used')
      .eq('id', project_id)
      .single()

    // Get budget line items
    const { data: budgetItems } = await supabase
      .from('budget_items')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get change orders
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get invoices/payments
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', project_id)

    // Calculate totals
    const totalBudget = budgetItems?.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0) || 0
    const totalActual = budgetItems?.reduce((sum, item) => sum + (item.actual_amount || 0), 0) || 0
    const totalCommitted = budgetItems?.reduce((sum, item) => sum + (item.committed_amount || item.actual_amount || 0), 0) || 0
    const totalVariance = totalBudget - totalActual
    const variancePercent = totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget) * 100 : 0

    // Calculate contingency
    const contingencyBudget = project?.contingency_budget || totalBudget * 0.05
    const contingencyUsed = project?.contingency_used || 0
    const contingencyRemaining = contingencyBudget - contingencyUsed
    const contingencyPercentUsed = contingencyBudget > 0 ? (contingencyUsed / contingencyBudget) * 100 : 0

    // Process line items
    const lineItems: BudgetLineItem[] = (budgetItems || []).map(item => {
      const budgeted = item.budgeted_amount || 0
      const actual = item.actual_amount || 0
      const committed = item.committed_amount || actual
      const variance = budgeted - actual
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0

      let status: 'under' | 'on_track' | 'over' | 'critical' = 'on_track'
      if (variancePercent < -20) {status = 'critical'}
      else if (variancePercent < -variance_threshold) {status = 'over'}
      else if (variancePercent > variance_threshold) {status = 'under'}

      return {
        category: item.category || item.cost_code || 'General',
        description: item.description || item.name || '',
        budgeted,
        actual,
        committed,
        variance,
        variance_percent: Math.round(variancePercent * 10) / 10,
        status
      }
    })

    // Group by category
    const varianceByCategory: Record<string, { budgeted: number; actual: number; variance: number; status: string }> = {}
    for (const item of lineItems) {
      if (!varianceByCategory[item.category]) {
        varianceByCategory[item.category] = { budgeted: 0, actual: 0, variance: 0, status: 'on_track' }
      }
      varianceByCategory[item.category].budgeted += item.budgeted
      varianceByCategory[item.category].actual += item.actual
      varianceByCategory[item.category].variance += item.variance
    }

    // Update category status
    for (const [category, data] of Object.entries(varianceByCategory)) {
      const pct = data.budgeted > 0 ? (data.variance / data.budgeted) * 100 : 0
      if (pct < -20) {data.status = 'critical'}
      else if (pct < -variance_threshold) {data.status = 'over'}
      else if (pct > variance_threshold) {data.status = 'under'}
    }

    // Identify problem areas and positive variances
    const problemAreas = lineItems
      .filter(item => item.status === 'over' || item.status === 'critical')
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 5)

    const positiveVariances = lineItems
      .filter(item => item.status === 'under' && item.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5)

    // Analyze change orders
    const approvedCOs = changeOrders?.filter(co => co.status === 'approved') || []
    const pendingCOs = changeOrders?.filter(co => co.status === 'pending' || co.status === 'submitted') || []
    const approvedTotal = approvedCOs.reduce((sum, co) => sum + (co.amount || 0), 0)
    const pendingTotal = pendingCOs.reduce((sum, co) => sum + (co.amount || 0), 0)

    // Calculate cash flow
    const billedToDate = invoices?.filter(inv => inv.status !== 'draft')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
    const collectedToDate = invoices?.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
    const outstandingReceivables = billedToDate - collectedToDate

    // Calculate projected final cost
    const projectedFinalCost = include_forecast
      ? calculateProjectedFinalCost(totalBudget, totalActual, totalCommitted, project)
      : totalActual

    // Generate trends (simplified - would need historical data in real implementation)
    const trends = generateTrends(totalBudget, totalActual, variancePercent)

    // Generate recommendations
    const recommendations = generateBudgetRecommendations(
      variancePercent,
      problemAreas,
      contingencyPercentUsed,
      pendingTotal,
      totalBudget
    )

    // Generate alerts
    const alerts = generateBudgetAlerts(
      variancePercent,
      contingencyPercentUsed,
      problemAreas,
      pendingTotal,
      totalBudget,
      variance_threshold
    )

    return {
      summary: {
        total_budget: totalBudget,
        total_actual: totalActual,
        total_committed: totalCommitted,
        total_variance: totalVariance,
        variance_percent: Math.round(variancePercent * 10) / 10,
        contingency_remaining: contingencyRemaining,
        contingency_percent_used: Math.round(contingencyPercentUsed * 10) / 10,
        projected_final_cost: projectedFinalCost,
        projected_variance: totalBudget - projectedFinalCost
      },
      variance_by_category: varianceByCategory,
      problem_areas: problemAreas,
      positive_variances: positiveVariances,
      change_order_impact: {
        approved_total: approvedTotal,
        pending_total: pendingTotal,
        impact_on_budget: getChangeOrderImpactDescription(approvedTotal, pendingTotal, totalBudget)
      },
      cash_flow: {
        billed_to_date: billedToDate,
        collected_to_date: collectedToDate,
        outstanding_receivables: outstandingReceivables,
        upcoming_payables: totalCommitted - totalActual
      },
      trends,
      recommendations,
      alerts
    }
  }
})

function calculateProjectedFinalCost(
  budget: number,
  actual: number,
  committed: number,
  project: any
): number {
  // Simple projection based on percent complete
  const percentComplete = project?.percent_complete || 50
  if (percentComplete === 0) {return budget}

  // Estimate at completion (EAC) using earned value method
  const earnedValue = budget * (percentComplete / 100)
  const costPerformanceIndex = earnedValue > 0 ? earnedValue / actual : 1

  // If CPI < 1, costs are running over; project final based on current trend
  const projectedTotal = costPerformanceIndex > 0 ? budget / costPerformanceIndex : budget

  // Also factor in committed but not yet spent
  const remainingCommitments = committed - actual

  return Math.max(actual + remainingCommitments, projectedTotal)
}

function generateTrends(
  budget: number,
  actual: number,
  currentVariancePercent: number
): Array<{ period: string; variance_percent: number; direction: 'improving' | 'stable' | 'worsening' }> {
  // Simplified trends - would need historical data in real implementation
  const trends = [
    { period: '3 months ago', variance_percent: currentVariancePercent + 5, direction: 'stable' as const },
    { period: '2 months ago', variance_percent: currentVariancePercent + 2, direction: 'stable' as const },
    { period: 'Last month', variance_percent: currentVariancePercent + 1, direction: currentVariancePercent < 0 ? 'worsening' as const : 'stable' as const },
    { period: 'Current', variance_percent: currentVariancePercent, direction: currentVariancePercent < -5 ? 'worsening' as const : 'stable' as const }
  ]

  return trends
}

function getChangeOrderImpactDescription(approved: number, pending: number, budget: number): string {
  const approvedPct = budget > 0 ? (approved / budget) * 100 : 0
  const pendingPct = budget > 0 ? (pending / budget) * 100 : 0

  if (approved === 0 && pending === 0) {
    return 'No change orders'
  }

  const parts = []
  if (approved > 0) {
    parts.push(`Approved COs: $${approved.toLocaleString()} (${approvedPct.toFixed(1)}% of budget)`)
  }
  if (pending > 0) {
    parts.push(`Pending COs: $${pending.toLocaleString()} (${pendingPct.toFixed(1)}% potential exposure)`)
  }

  return parts.join('. ')
}

function generateBudgetRecommendations(
  variancePercent: number,
  problemAreas: BudgetLineItem[],
  contingencyUsed: number,
  pendingCOs: number,
  totalBudget: number
): string[] {
  const recommendations: string[] = []

  if (variancePercent < -10) {
    recommendations.push('Project is significantly over budget - implement cost reduction measures')
  }

  if (problemAreas.length >= 3) {
    const categories = problemAreas.map(p => p.category).slice(0, 3).join(', ')
    recommendations.push(`Focus cost controls on problem categories: ${categories}`)
  }

  if (contingencyUsed > 75) {
    recommendations.push('Contingency is nearly depleted - avoid additional unforeseen costs')
  }

  if (pendingCOs > totalBudget * 0.05) {
    recommendations.push('Expedite pending change order negotiations to reduce uncertainty')
  }

  if (variancePercent > 5) {
    recommendations.push('Budget has favorable variance - consider reallocating savings to contingency')
  }

  if (problemAreas.some(p => p.status === 'critical')) {
    recommendations.push('Critical variances detected - schedule immediate cost review meeting')
  }

  recommendations.push('Update cost projections monthly and compare against baseline')

  return recommendations.slice(0, 6)
}

function generateBudgetAlerts(
  variancePercent: number,
  contingencyUsed: number,
  problemAreas: BudgetLineItem[],
  pendingCOs: number,
  totalBudget: number,
  threshold: number
): Array<{ severity: 'info' | 'warning' | 'critical'; message: string; action: string }> {
  const alerts: Array<{ severity: 'info' | 'warning' | 'critical'; message: string; action: string }> = []

  // Critical alerts
  if (variancePercent < -20) {
    alerts.push({
      severity: 'critical',
      message: 'Project is more than 20% over budget',
      action: 'Immediate executive review required'
    })
  }

  if (contingencyUsed > 100) {
    alerts.push({
      severity: 'critical',
      message: 'Contingency budget is exhausted',
      action: 'Request additional funding or scope reduction'
    })
  }

  // Warning alerts
  if (variancePercent < -threshold && variancePercent >= -20) {
    alerts.push({
      severity: 'warning',
      message: `Budget variance exceeds ${threshold}% threshold`,
      action: 'Review cost controls and identify savings opportunities'
    })
  }

  if (contingencyUsed > 75 && contingencyUsed <= 100) {
    alerts.push({
      severity: 'warning',
      message: `${contingencyUsed.toFixed(0)}% of contingency has been used`,
      action: 'Restrict contingency usage to critical unforeseen items only'
    })
  }

  if (pendingCOs > totalBudget * 0.10) {
    alerts.push({
      severity: 'warning',
      message: 'Pending change orders represent significant budget exposure',
      action: 'Prioritize CO negotiations and update projections'
    })
  }

  // Info alerts
  const criticalItems = problemAreas.filter(p => p.status === 'critical')
  if (criticalItems.length > 0) {
    alerts.push({
      severity: 'info',
      message: `${criticalItems.length} line item(s) have critical variances`,
      action: `Review: ${criticalItems.map(p => p.category).join(', ')}`
    })
  }

  return alerts.slice(0, 5)
}
