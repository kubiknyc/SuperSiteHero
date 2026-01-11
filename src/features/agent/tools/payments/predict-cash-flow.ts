/**
 * Predict Cash Flow Tool
 * Predicts project cash flow by analyzing schedule of values, commitments, and payment terms
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface PredictCashFlowInput {
  project_id: string
  forecast_months?: number
  include_pending_changes?: boolean
}

interface MonthlyForecast {
  period: string
  month_start: string
  month_end: string
  projected_income: {
    from_sov_progress: number
    from_change_orders: number
    retention_held: number
    total_billable: number
    expected_collections: number
  }
  projected_expenses: {
    subcontractor_payments: number
    material_costs: number
    labor_costs: number
    equipment_costs: number
    other_expenses: number
    total_expenses: number
  }
  net_cash_flow: number
  cumulative_cash_position: number
  confidence_level: 'high' | 'medium' | 'low'
}

interface CashFlowSummary {
  total_projected_income: number
  total_projected_expenses: number
  total_net_cash_flow: number
  average_monthly_cash_flow: number
  lowest_cash_position: number
  lowest_cash_month: string
  peak_cash_requirement: number
  retention_receivable: number
  estimated_retention_release: string | null
  days_sales_outstanding: number
  days_payables_outstanding: number
}

interface RiskPeriod {
  period: string
  risk_type: 'negative_cash_flow' | 'high_payables' | 'delayed_receivables' | 'retention_impact'
  severity: 'low' | 'medium' | 'high' | 'critical'
  amount_at_risk: number
  description: string
  contributing_factors: string[]
}

interface PredictCashFlowOutput {
  monthly_forecast: MonthlyForecast[]
  cash_flow_summary: CashFlowSummary
  risk_periods: RiskPeriod[]
  recommendations: string[]
}

interface SOVLineItem {
  id: string
  description: string
  scheduled_value: number
  work_completed_percent: number
  completed_to_date: number
  balance_to_finish: number
  retention_percent: number
}

interface Commitment {
  id: string
  vendor_name: string
  total_amount: number
  amount_paid: number
  amount_remaining: number
  payment_terms_days: number
  scheduled_payments: Array<{
    due_date: string
    amount: number
    status: string
  }>
}

export const predictCashFlowTool = createTool<PredictCashFlowInput, PredictCashFlowOutput>({
  name: 'predict_cash_flow',
  displayName: 'Predict Cash Flow',
  description: 'Predicts project cash flow by projecting income from schedule of values and completion, estimating expenses from commitments and subcontractor schedules, accounting for retention and payment terms, and generating weekly/monthly cash flow forecast.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze'
      },
      forecast_months: {
        type: 'number',
        description: 'Number of months to forecast (default: 3)'
      },
      include_pending_changes: {
        type: 'boolean',
        description: 'Include pending change orders in projections (default: false)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const {
      project_id,
      forecast_months = 3,
      include_pending_changes = false
    } = input

    const startTime = Date.now()

    // Get project data
    const { data: project } = await supabase
      .from('projects')
      .select('*, percent_complete, contract_value, start_date, end_date, retention_percent')
      .eq('id', project_id)
      .single()

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    // Get schedule of values
    const { data: sovItems } = await supabase
      .from('schedule_of_values')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get commitments (subcontracts, purchase orders)
    const { data: commitments } = await supabase
      .from('commitments')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get change orders
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get invoices for payment history analysis
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })

    // Get payments made
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', project_id)

    // Calculate payment terms metrics
    const paymentMetrics = calculatePaymentMetrics(invoices || [], payments || [])

    // Process SOV items
    const processedSOV: SOVLineItem[] = (sovItems || []).map(item => ({
      id: item.id,
      description: item.description || item.name || '',
      scheduled_value: item.scheduled_value || item.amount || 0,
      work_completed_percent: item.percent_complete || item.completed_percent || 0,
      completed_to_date: item.completed_to_date || (item.scheduled_value || 0) * ((item.percent_complete || 0) / 100),
      balance_to_finish: item.balance_to_finish || (item.scheduled_value || 0) - ((item.scheduled_value || 0) * ((item.percent_complete || 0) / 100)),
      retention_percent: item.retention_percent || project.retention_percent || 10
    }))

    // Process commitments
    const processedCommitments: Commitment[] = (commitments || []).map(c => ({
      id: c.id,
      vendor_name: c.vendor_name || c.name || 'Unknown Vendor',
      total_amount: c.total_amount || c.amount || 0,
      amount_paid: c.amount_paid || c.paid_amount || 0,
      amount_remaining: (c.total_amount || c.amount || 0) - (c.amount_paid || c.paid_amount || 0),
      payment_terms_days: c.payment_terms_days || c.payment_terms || 30,
      scheduled_payments: c.scheduled_payments || []
    }))

    // Calculate change order impacts
    const approvedCOs = changeOrders?.filter(co => co.status === 'approved') || []
    const pendingCOs = changeOrders?.filter(co =>
      co.status === 'pending' || co.status === 'submitted'
    ) || []

    const approvedCOValue = approvedCOs.reduce((sum, co) => sum + (co.amount || 0), 0)
    const pendingCOValue = include_pending_changes
      ? pendingCOs.reduce((sum, co) => sum + (co.amount || 0), 0)
      : 0

    // Generate monthly forecasts
    const monthlyForecast = generateMonthlyForecast(
      project,
      processedSOV,
      processedCommitments,
      approvedCOValue,
      pendingCOValue,
      forecast_months,
      paymentMetrics
    )

    // Calculate summary
    const cashFlowSummary = calculateCashFlowSummary(
      monthlyForecast,
      project,
      paymentMetrics
    )

    // Identify risk periods
    const riskPeriods = identifyRiskPeriods(
      monthlyForecast,
      processedCommitments,
      cashFlowSummary
    )

    // Generate recommendations
    const recommendations = generateRecommendations(
      monthlyForecast,
      riskPeriods,
      cashFlowSummary,
      paymentMetrics
    )

    const output: PredictCashFlowOutput = {
      monthly_forecast: monthlyForecast,
      cash_flow_summary: cashFlowSummary,
      risk_periods: riskPeriods,
      recommendations
    }

    return {
      success: true,
      data: output,
      metadata: {
        executionTimeMs: Date.now() - startTime
      }
    }
  },

  formatOutput(output) {
    const { monthly_forecast, cash_flow_summary, risk_periods } = output

    const criticalRisks = risk_periods.filter(r => r.severity === 'critical').length
    const highRisks = risk_periods.filter(r => r.severity === 'high').length

    const status = criticalRisks > 0 ? 'error' :
      highRisks > 0 ? 'warning' : 'success'

    const lowestCash = formatCurrency(cash_flow_summary.lowest_cash_position)
    const netFlow = formatCurrency(cash_flow_summary.total_net_cash_flow)

    return {
      title: 'Cash Flow Forecast',
      summary: `${monthly_forecast.length}-month forecast: Net ${netFlow}, Lowest point: ${lowestCash}`,
      icon: 'dollar-sign',
      status,
      details: [
        { label: 'Projected Income', value: formatCurrency(cash_flow_summary.total_projected_income), type: 'text' },
        { label: 'Projected Expenses', value: formatCurrency(cash_flow_summary.total_projected_expenses), type: 'text' },
        { label: 'Net Cash Flow', value: netFlow, type: 'text' },
        { label: 'Lowest Position', value: `${lowestCash} (${cash_flow_summary.lowest_cash_month})`, type: 'text' },
        { label: 'Risk Periods', value: `${criticalRisks} critical, ${highRisks} high`, type: 'badge' },
        { label: 'Retention Receivable', value: formatCurrency(cash_flow_summary.retention_receivable), type: 'text' },
        { label: 'DSO', value: `${cash_flow_summary.days_sales_outstanding} days`, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePaymentMetrics(
  invoices: Array<{ created_at?: string; paid_at?: string; status?: string; amount?: number }>,
  payments: Array<{ paid_date?: string; amount?: number }>
): { dso: number; dpo: number; avgCollectionDays: number } {
  // Calculate Days Sales Outstanding
  let totalDays = 0
  let paidCount = 0

  for (const invoice of invoices) {
    if (invoice.paid_at && invoice.created_at) {
      const created = new Date(invoice.created_at)
      const paid = new Date(invoice.paid_at)
      const days = Math.floor((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      if (days > 0 && days < 180) {
        totalDays += days
        paidCount++
      }
    }
  }

  const dso = paidCount > 0 ? Math.round(totalDays / paidCount) : 45 // Default 45 days

  // Estimate DPO from payment patterns (simplified)
  const dpo = 30 // Default to 30 days

  return {
    dso,
    dpo,
    avgCollectionDays: dso
  }
}

function generateMonthlyForecast(
  project: {
    contract_value?: number
    percent_complete?: number
    retention_percent?: number
    end_date?: string
  },
  sovItems: SOVLineItem[],
  commitments: Commitment[],
  approvedCOValue: number,
  pendingCOValue: number,
  months: number,
  paymentMetrics: { dso: number; dpo: number; avgCollectionDays: number }
): MonthlyForecast[] {
  const forecast: MonthlyForecast[] = []
  const now = new Date()
  const projectEndDate = project.end_date ? new Date(project.end_date) : null

  // Calculate total remaining work
  const totalScheduledValue = sovItems.reduce((sum, item) => sum + item.scheduled_value, 0)
  const totalCompleted = sovItems.reduce((sum, item) => sum + item.completed_to_date, 0)
  const totalRemaining = totalScheduledValue - totalCompleted + approvedCOValue + pendingCOValue

  // Calculate total remaining commitments
  const totalCommitmentsRemaining = commitments.reduce((sum, c) => sum + c.amount_remaining, 0)

  // Estimate monthly progress rate
  const currentPercent = project.percent_complete || (totalCompleted / totalScheduledValue * 100) || 0
  const remainingPercent = 100 - currentPercent
  const monthsToCompletion = projectEndDate
    ? Math.max(1, Math.ceil((projectEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : months

  const monthlyProgressRate = remainingPercent / monthsToCompletion
  const retentionPercent = project.retention_percent || 10

  let cumulativeCash = 0

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const periodName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Project income for this month
    const progressThisMonth = Math.min(monthlyProgressRate, remainingPercent - (monthlyProgressRate * i))
    const sovProgress = (totalRemaining * progressThisMonth) / 100
    const coIncome = i === 0 ? (approvedCOValue * 0.3) : 0 // CO income front-loaded
    const retentionHeld = sovProgress * (retentionPercent / 100)
    const totalBillable = sovProgress + coIncome - retentionHeld

    // Adjust for collection timing (DSO)
    const collectionFactor = i === 0 ? 0.5 : 0.9 // First month slower collections
    const expectedCollections = totalBillable * collectionFactor

    // Project expenses for this month
    const subPaymentPct = commitments.length > 0 ? progressThisMonth / 100 : 0.3
    const subPayments = totalCommitmentsRemaining * subPaymentPct
    const materialCosts = sovProgress * 0.25 // Estimate 25% materials
    const laborCosts = sovProgress * 0.35 // Estimate 35% labor
    const equipmentCosts = sovProgress * 0.08 // Estimate 8% equipment
    const otherExpenses = sovProgress * 0.05 // Estimate 5% other
    const totalExpenses = subPayments + materialCosts + laborCosts + equipmentCosts + otherExpenses

    const netCashFlow = expectedCollections - totalExpenses
    cumulativeCash += netCashFlow

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (i >= 2) confidence = 'medium'
    if (i >= 4) confidence = 'low'

    forecast.push({
      period: periodName,
      month_start: monthStart.toISOString().split('T')[0],
      month_end: monthEnd.toISOString().split('T')[0],
      projected_income: {
        from_sov_progress: Math.round(sovProgress),
        from_change_orders: Math.round(coIncome),
        retention_held: Math.round(retentionHeld),
        total_billable: Math.round(totalBillable),
        expected_collections: Math.round(expectedCollections)
      },
      projected_expenses: {
        subcontractor_payments: Math.round(subPayments),
        material_costs: Math.round(materialCosts),
        labor_costs: Math.round(laborCosts),
        equipment_costs: Math.round(equipmentCosts),
        other_expenses: Math.round(otherExpenses),
        total_expenses: Math.round(totalExpenses)
      },
      net_cash_flow: Math.round(netCashFlow),
      cumulative_cash_position: Math.round(cumulativeCash),
      confidence_level: confidence
    })
  }

  return forecast
}

function calculateCashFlowSummary(
  forecast: MonthlyForecast[],
  project: { retention_percent?: number; end_date?: string },
  paymentMetrics: { dso: number; dpo: number; avgCollectionDays: number }
): CashFlowSummary {
  const totalIncome = forecast.reduce((sum, m) => sum + m.projected_income.expected_collections, 0)
  const totalExpenses = forecast.reduce((sum, m) => sum + m.projected_expenses.total_expenses, 0)
  const netCashFlow = totalIncome - totalExpenses
  const avgMonthly = forecast.length > 0 ? netCashFlow / forecast.length : 0

  // Find lowest cash position
  let lowestCash = Infinity
  let lowestMonth = ''
  let peakRequirement = 0

  for (const month of forecast) {
    if (month.cumulative_cash_position < lowestCash) {
      lowestCash = month.cumulative_cash_position
      lowestMonth = month.period
    }
    if (month.projected_expenses.total_expenses > peakRequirement) {
      peakRequirement = month.projected_expenses.total_expenses
    }
  }

  // Calculate total retention held
  const retentionReceivable = forecast.reduce(
    (sum, m) => sum + m.projected_income.retention_held,
    0
  )

  // Estimate retention release date (typically 30-60 days after project completion)
  const retentionRelease = project.end_date
    ? new Date(new Date(project.end_date).getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null

  return {
    total_projected_income: Math.round(totalIncome),
    total_projected_expenses: Math.round(totalExpenses),
    total_net_cash_flow: Math.round(netCashFlow),
    average_monthly_cash_flow: Math.round(avgMonthly),
    lowest_cash_position: Math.round(lowestCash === Infinity ? 0 : lowestCash),
    lowest_cash_month: lowestMonth,
    peak_cash_requirement: Math.round(peakRequirement),
    retention_receivable: Math.round(retentionReceivable),
    estimated_retention_release: retentionRelease,
    days_sales_outstanding: paymentMetrics.dso,
    days_payables_outstanding: paymentMetrics.dpo
  }
}

function identifyRiskPeriods(
  forecast: MonthlyForecast[],
  commitments: Commitment[],
  summary: CashFlowSummary
): RiskPeriod[] {
  const risks: RiskPeriod[] = []

  for (const month of forecast) {
    // Check for negative cash flow
    if (month.net_cash_flow < 0) {
      const severity = month.net_cash_flow < -50000 ? 'critical' :
        month.net_cash_flow < -25000 ? 'high' :
        month.net_cash_flow < -10000 ? 'medium' : 'low'

      risks.push({
        period: month.period,
        risk_type: 'negative_cash_flow',
        severity,
        amount_at_risk: Math.abs(month.net_cash_flow),
        description: `Projected negative cash flow of ${formatCurrency(month.net_cash_flow)}`,
        contributing_factors: identifyNegativeFlowFactors(month)
      })
    }

    // Check for high payables relative to collections
    if (month.projected_expenses.total_expenses > month.projected_income.expected_collections * 1.5) {
      risks.push({
        period: month.period,
        risk_type: 'high_payables',
        severity: 'medium',
        amount_at_risk: month.projected_expenses.total_expenses - month.projected_income.expected_collections,
        description: 'Expenses significantly exceed expected collections',
        contributing_factors: ['Subcontractor payment schedule', 'Material procurement timing']
      })
    }

    // Check cumulative position
    if (month.cumulative_cash_position < 0) {
      const severity = month.cumulative_cash_position < -100000 ? 'critical' :
        month.cumulative_cash_position < -50000 ? 'high' : 'medium'

      risks.push({
        period: month.period,
        risk_type: 'negative_cash_flow',
        severity,
        amount_at_risk: Math.abs(month.cumulative_cash_position),
        description: `Cumulative cash position goes negative: ${formatCurrency(month.cumulative_cash_position)}`,
        contributing_factors: ['Accumulated cash flow deficit', 'May require working capital financing']
      })
    }

    // Check retention impact
    if (month.projected_income.retention_held > month.net_cash_flow * 0.5 && month.net_cash_flow > 0) {
      risks.push({
        period: month.period,
        risk_type: 'retention_impact',
        severity: 'low',
        amount_at_risk: month.projected_income.retention_held,
        description: `Retention withheld (${formatCurrency(month.projected_income.retention_held)}) impacts available cash`,
        contributing_factors: ['Standard retention terms', 'Consider negotiating reduction']
      })
    }
  }

  // Sort by severity and return top risks
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return risks.slice(0, 10)
}

function identifyNegativeFlowFactors(month: MonthlyForecast): string[] {
  const factors: string[] = []

  if (month.projected_expenses.subcontractor_payments > month.projected_income.expected_collections * 0.5) {
    factors.push('High subcontractor payment obligations')
  }
  if (month.projected_income.retention_held > month.projected_income.from_sov_progress * 0.1) {
    factors.push('Retention reducing available cash')
  }
  if (month.projected_expenses.material_costs > month.projected_income.expected_collections * 0.3) {
    factors.push('Significant material procurement costs')
  }
  if (month.projected_income.expected_collections < month.projected_income.total_billable * 0.7) {
    factors.push('Delayed receivable collections')
  }

  if (factors.length === 0) {
    factors.push('General timing mismatch between income and expenses')
  }

  return factors
}

function generateRecommendations(
  forecast: MonthlyForecast[],
  risks: RiskPeriod[],
  summary: CashFlowSummary,
  paymentMetrics: { dso: number; dpo: number; avgCollectionDays: number }
): string[] {
  const recommendations: string[] = []

  // Check for negative periods
  const negativeMonths = forecast.filter(m => m.net_cash_flow < 0)
  if (negativeMonths.length > 0) {
    recommendations.push(
      `Prepare for ${negativeMonths.length} month(s) with negative cash flow - ensure adequate credit line or reserves`
    )
  }

  // DSO recommendations
  if (paymentMetrics.dso > 45) {
    recommendations.push(
      `Collection cycle is ${paymentMetrics.dso} days - implement faster invoicing and follow-up procedures`
    )
  }

  // Retention recommendations
  if (summary.retention_receivable > summary.total_projected_income * 0.15) {
    recommendations.push(
      'Significant retention tied up - consider negotiating partial release upon milestone completion'
    )
  }

  // Critical risk periods
  const criticalRisks = risks.filter(r => r.severity === 'critical')
  if (criticalRisks.length > 0) {
    recommendations.push(
      `Address ${criticalRisks.length} critical risk period(s) - review billing schedule and payment terms`
    )
  }

  // Peak requirement
  if (summary.peak_cash_requirement > summary.average_monthly_cash_flow * 3) {
    recommendations.push(
      'Peak monthly expense is high - consider phasing major purchases or negotiating extended payment terms'
    )
  }

  // Lowest position
  if (summary.lowest_cash_position < 0) {
    recommendations.push(
      `Cash position expected to go negative in ${summary.lowest_cash_month} - arrange financing or accelerate collections`
    )
  }

  // Positive recommendations
  if (summary.total_net_cash_flow > 0 && risks.length === 0) {
    recommendations.push(
      'Cash flow projection is healthy - maintain current billing and collection practices'
    )
  }

  // General best practices
  if (recommendations.length < 4) {
    recommendations.push('Submit pay applications promptly at each billing cycle')
    recommendations.push('Monitor actual vs projected cash flow weekly and adjust forecast')
  }

  return recommendations.slice(0, 8)
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  const formatted = absAmount >= 1000000
    ? `$${(absAmount / 1000000).toFixed(1)}M`
    : absAmount >= 1000
    ? `$${(absAmount / 1000).toFixed(0)}K`
    : `$${absAmount.toFixed(0)}`

  return amount < 0 ? `-${formatted}` : formatted
}
