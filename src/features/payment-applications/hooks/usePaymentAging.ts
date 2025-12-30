/**
 * Payment Aging Hook
 *
 * Calculate payment aging reports and alerts for accounts receivable
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { differenceInDays, parseISO, format, subDays } from 'date-fns'
import {
  AGING_BUCKETS as BUCKETS,
  DEFAULT_AGING_ALERT_CONFIG as DEFAULT_CONFIG,
  type PaymentApplication,
  type AgingBucket,
  type AgingReceivable,
  type PaymentAgingReport,
  type ProjectAgingSummary,
  type AgingAlert,
  type AgingAlertConfig,
  type DSOMetrics,
  type CashFlowForecastItem,
  type PaymentAgingDashboard,
} from '@/types/payment-application'

// ============================================================================
// Query Keys
// ============================================================================

export const paymentAgingKeys = {
  all: ['payment-aging'] as const,
  report: (companyId: string) => [...paymentAgingKeys.all, 'report', companyId] as const,
  reportFiltered: (companyId: string, projectId?: string) =>
    [...paymentAgingKeys.all, 'report', companyId, projectId] as const,
  alerts: (companyId: string) => [...paymentAgingKeys.all, 'alerts', companyId] as const,
  dso: (companyId: string) => [...paymentAgingKeys.all, 'dso', companyId] as const,
  forecast: (companyId: string) => [...paymentAgingKeys.all, 'forecast', companyId] as const,
  dashboard: (companyId: string) => [...paymentAgingKeys.all, 'dashboard', companyId] as const,
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determine aging bucket based on days outstanding
 */
function getAgingBucket(daysOutstanding: number): AgingBucket {
  if (daysOutstanding <= 0) {return 'current'}
  if (daysOutstanding <= 30) {return '1-30'}
  if (daysOutstanding <= 60) {return '31-60'}
  if (daysOutstanding <= 90) {return '61-90'}
  return '90+'
}

/**
 * Get bucket color for styling
 */
export function getBucketColor(bucket: AgingBucket): string {
  const bucketInfo = BUCKETS.find((b) => b.key === bucket)
  return bucketInfo?.color || 'gray'
}

/**
 * Calculate days outstanding from approval date or submission date
 */
function calculateDaysOutstanding(app: PaymentApplication): number {
  // Use approved_at date if available, otherwise submitted_at
  const dateString = app.approved_at || app.submitted_at
  if (!dateString) {return 0}

  const referenceDate = parseISO(dateString)
  return differenceInDays(new Date(), referenceDate)
}

/**
 * Transform payment application to aging receivable
 */
function toAgingReceivable(
  app: PaymentApplication & { project?: { name: string; project_number: string | null } | null }
): AgingReceivable {
  const daysOutstanding = calculateDaysOutstanding(app)
  const amountDue = app.current_payment_due
  const amountReceived = app.payment_received_amount || 0
  const amountOutstanding = amountDue - amountReceived

  return {
    id: app.id,
    project_id: app.project_id,
    project_name: app.project?.name || 'Unknown Project',
    project_number: app.project?.project_number || null,
    application_number: app.application_number,
    display_number: `App #${app.application_number}`,
    period_to: app.period_to,
    submitted_at: app.submitted_at,
    approved_at: app.approved_at,
    status: app.status,
    amount_due: amountDue,
    amount_received: amountReceived,
    amount_outstanding: amountOutstanding > 0 ? amountOutstanding : 0,
    retainage_held: app.total_retainage,
    days_outstanding: daysOutstanding,
    aging_bucket: getAgingBucket(daysOutstanding),
  }
}

/**
 * Calculate bucket summaries from receivables
 */
function calculateBucketSummaries(receivables: AgingReceivable[]): AgingBucketSummary[] {
  const totalOutstanding = receivables.reduce((sum, r) => sum + r.amount_outstanding, 0)

  return BUCKETS.map((bucket) => {
    const bucketReceivables = receivables.filter((r) => r.aging_bucket === bucket.key)
    const amount = bucketReceivables.reduce((sum, r) => sum + r.amount_outstanding, 0)

    return {
      bucket: bucket.key,
      label: bucket.label,
      count: bucketReceivables.length,
      amount,
      percent: totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0,
    }
  })
}

/**
 * Calculate project-level summaries
 */
function calculateProjectSummaries(receivables: AgingReceivable[]): ProjectAgingSummary[] {
  const projectMap = new Map<string, AgingReceivable[]>()

  // Group by project
  receivables.forEach((r) => {
    const existing = projectMap.get(r.project_id) || []
    projectMap.set(r.project_id, [...existing, r])
  })

  // Calculate summaries
  return Array.from(projectMap.entries()).map(([projectId, projectReceivables]) => {
    const first = projectReceivables[0]
    const totalOutstanding = projectReceivables.reduce((sum, r) => sum + r.amount_outstanding, 0)
    const totalRetainage = projectReceivables.reduce((sum, r) => sum + r.retainage_held, 0)
    const days = projectReceivables.map((r) => r.days_outstanding)
    const averageDays =
      projectReceivables.length > 0
        ? days.reduce((sum, d) => sum + d, 0) / projectReceivables.length
        : 0

    const buckets = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    }

    projectReceivables.forEach((r) => {
      buckets[r.aging_bucket] += r.amount_outstanding
    })

    return {
      project_id: projectId,
      project_name: first.project_name,
      project_number: first.project_number,
      total_outstanding: totalOutstanding,
      total_retainage: totalRetainage,
      application_count: projectReceivables.length,
      oldest_days: Math.max(...days, 0),
      average_days: Math.round(averageDays),
      buckets,
    }
  })
}

/**
 * Generate alerts based on aging config
 */
function generateAlerts(
  receivables: AgingReceivable[],
  config: AgingAlertConfig = DEFAULT_CONFIG
): AgingAlert[] {
  const alerts: AgingAlert[] = []

  receivables.forEach((receivable) => {
    if (receivable.amount_outstanding <= 0) {return}

    let severity: 'info' | 'warning' | 'critical'
    let message: string

    if (receivable.days_outstanding >= config.critical_at_days) {
      severity = 'critical'
      message = `Payment ${receivable.display_number} for ${receivable.project_name} is ${receivable.days_outstanding} days overdue. Immediate action required.`
    } else if (receivable.days_outstanding >= config.warn_at_days) {
      severity = 'warning'
      message = `Payment ${receivable.display_number} for ${receivable.project_name} is ${receivable.days_outstanding} days outstanding.`
    } else if (receivable.days_outstanding > 0) {
      severity = 'info'
      message = `Payment ${receivable.display_number} for ${receivable.project_name} is pending (${receivable.days_outstanding} days).`
    } else {
      return // No alert for current items
    }

    alerts.push({
      id: `alert-${receivable.id}`,
      receivable,
      severity,
      message,
      created_at: new Date().toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
    })
  })

  // Sort by severity (critical first) and then by days
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return b.receivable.days_outstanding - a.receivable.days_outstanding
  })
}

/**
 * Calculate DSO metrics
 */
function calculateDSOMetrics(
  receivables: AgingReceivable[],
  totalBilledLast90Days: number
): DSOMetrics {
  const totalOutstanding = receivables.reduce((sum, r) => sum + r.amount_outstanding, 0)

  // DSO = (Accounts Receivable / Total Credit Sales) * Number of Days
  // Using 90-day period
  const currentDSO =
    totalBilledLast90Days > 0 ? Math.round((totalOutstanding / totalBilledLast90Days) * 90) : 0

  // Target DSO for construction is typically 30-45 days
  const targetDSO = 45

  return {
    current_dso: currentDSO,
    target_dso: targetDSO,
    trend: currentDSO < targetDSO ? 'improving' : currentDSO === targetDSO ? 'stable' : 'worsening',
    trend_change_days: 0, // Would need historical data to calculate
    historical: [], // Would need historical data
  }
}

/**
 * Generate cash flow forecast
 */
function generateCashFlowForecast(receivables: AgingReceivable[]): CashFlowForecastItem[] {
  const forecast: CashFlowForecastItem[] = []
  const today = new Date()

  // Group by expected payment date (estimate based on aging)
  // Current: expect payment in 7 days
  // 1-30: expect payment in 14 days
  // 31-60: expect payment in 30 days
  // 61-90+: uncertain

  const currentItems = receivables.filter((r) => r.aging_bucket === 'current')
  const days1to30 = receivables.filter((r) => r.aging_bucket === '1-30')
  const days31to60 = receivables.filter((r) => r.aging_bucket === '31-60')
  const overdue = receivables.filter(
    (r) => r.aging_bucket === '61-90' || r.aging_bucket === '90+'
  )

  if (currentItems.length > 0) {
    const date = format(subDays(today, -7), 'yyyy-MM-dd')
    forecast.push({
      date,
      expected_receipts: currentItems.reduce((sum, r) => sum + r.amount_outstanding, 0),
      confidence: 'high',
      source_applications: currentItems.map((r) => r.id),
    })
  }

  if (days1to30.length > 0) {
    const date = format(subDays(today, -14), 'yyyy-MM-dd')
    forecast.push({
      date,
      expected_receipts: days1to30.reduce((sum, r) => sum + r.amount_outstanding, 0),
      confidence: 'medium',
      source_applications: days1to30.map((r) => r.id),
    })
  }

  if (days31to60.length > 0) {
    const date = format(subDays(today, -30), 'yyyy-MM-dd')
    forecast.push({
      date,
      expected_receipts: days31to60.reduce((sum, r) => sum + r.amount_outstanding, 0),
      confidence: 'low',
      source_applications: days31to60.map((r) => r.id),
    })
  }

  if (overdue.length > 0) {
    const date = format(subDays(today, -45), 'yyyy-MM-dd')
    forecast.push({
      date,
      expected_receipts: overdue.reduce((sum, r) => sum + r.amount_outstanding, 0),
      confidence: 'low',
      source_applications: overdue.map((r) => r.id),
    })
  }

  return forecast.sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch and calculate payment aging report
 */
export function usePaymentAgingReport(projectId?: string) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: paymentAgingKeys.reportFiltered(companyId || '', projectId),
    queryFn: async (): Promise<PaymentAgingReport> => {
      // Fetch all non-paid payment applications
      let query = supabase
        .from('payment_applications')
        .select(
          `
          *,
          project:projects(name, project_number)
        `
        )
        .eq('company_id', companyId!)
        .in('status', ['submitted', 'under_review', 'approved'])
        .is('deleted_at', null)
        .order('approved_at', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data: applications, error } = await query

      if (error) {
        throw new Error(`Failed to fetch payment applications: ${error.message}`)
      }

      // Transform to aging receivables
      const receivables = (applications || [])
        .map(
          (app) =>
            toAgingReceivable(
              app as PaymentApplication & {
                project?: { name: string; project_number: string | null } | null
              }
            )
        )
        .filter((r) => r.amount_outstanding > 0)

      // Calculate metrics
      const totalOutstanding = receivables.reduce((sum, r) => sum + r.amount_outstanding, 0)
      const totalRetainage = receivables.reduce((sum, r) => sum + r.retainage_held, 0)
      const days = receivables.map((r) => r.days_outstanding)
      const averageDays =
        receivables.length > 0 ? Math.round(days.reduce((sum, d) => sum + d, 0) / receivables.length) : 0

      // Calculate weighted average (weighted by amount)
      const weightedSum = receivables.reduce(
        (sum, r) => sum + r.days_outstanding * r.amount_outstanding,
        0
      )
      const weightedAverage =
        totalOutstanding > 0 ? Math.round(weightedSum / totalOutstanding) : 0

      return {
        as_of_date: format(new Date(), 'yyyy-MM-dd'),
        company_id: companyId!,
        total_outstanding: totalOutstanding,
        total_retainage: totalRetainage,
        total_receivables: receivables.length,
        buckets: calculateBucketSummaries(receivables),
        receivables,
        average_days_outstanding: averageDays,
        weighted_average_days: weightedAverage,
        oldest_receivable_days: Math.max(...days, 0),
        by_project: calculateProjectSummaries(receivables),
      }
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get aging alerts
 */
export function usePaymentAgingAlerts(config?: AgingAlertConfig) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id
  const { data: report } = usePaymentAgingReport()

  return useQuery({
    queryKey: paymentAgingKeys.alerts(companyId || ''),
    queryFn: (): AgingAlert[] => {
      if (!report) {return []}
      return generateAlerts(report.receivables, config)
    },
    enabled: !!companyId && !!report,
  })
}

/**
 * Get DSO metrics
 */
export function useDSOMetrics() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id
  const { data: report } = usePaymentAgingReport()

  return useQuery({
    queryKey: paymentAgingKeys.dso(companyId || ''),
    queryFn: async (): Promise<DSOMetrics> => {
      if (!report) {
        return {
          current_dso: 0,
          target_dso: 45,
          trend: 'stable',
          trend_change_days: 0,
          historical: [],
        }
      }

      // Get total billed in last 90 days
      const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')
      const { data: recentApps } = await supabase
        .from('payment_applications')
        .select('current_payment_due')
        .eq('company_id', companyId!)
        .gte('submitted_at', ninetyDaysAgo)
        .is('deleted_at', null)

      const totalBilledLast90Days =
        recentApps?.reduce((sum, app) => sum + (app.current_payment_due || 0), 0) || 0

      return calculateDSOMetrics(report.receivables, totalBilledLast90Days)
    },
    enabled: !!companyId && !!report,
  })
}

/**
 * Get cash flow forecast
 */
export function useCashFlowForecast() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id
  const { data: report } = usePaymentAgingReport()

  return useQuery({
    queryKey: paymentAgingKeys.forecast(companyId || ''),
    queryFn: (): CashFlowForecastItem[] => {
      if (!report) {return []}
      return generateCashFlowForecast(report.receivables)
    },
    enabled: !!companyId && !!report,
  })
}

/**
 * Get complete aging dashboard data
 */
export function usePaymentAgingDashboard() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id
  const { data: report } = usePaymentAgingReport()
  const { data: alerts } = usePaymentAgingAlerts()
  const { data: dsoMetrics } = useDSOMetrics()
  const { data: forecast } = useCashFlowForecast()

  return useQuery({
    queryKey: paymentAgingKeys.dashboard(companyId || ''),
    queryFn: (): PaymentAgingDashboard | null => {
      if (!report) {return null}
      return {
        report,
        alerts: alerts || [],
        dso_metrics: dsoMetrics || {
          current_dso: 0,
          target_dso: 45,
          trend: 'stable',
          trend_change_days: 0,
          historical: [],
        },
        forecast: forecast || [],
      }
    },
    enabled: !!companyId && !!report,
  })
}

// ============================================================================
// Export
// ============================================================================

export default {
  keys: paymentAgingKeys,
  usePaymentAgingReport,
  usePaymentAgingAlerts,
  useDSOMetrics,
  useCashFlowForecast,
  usePaymentAgingDashboard,
  getBucketColor,
}
