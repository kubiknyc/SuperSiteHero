/**
 * Cash Flow Projection React Query Hooks
 *
 * Query and mutation hooks for managing cash flow projections
 * and S-curve analysis.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  differenceInMonths,
} from 'date-fns'
import type {
  CashFlowMonth,
  CashFlowProjection,
  CashFlowFilters,
} from '../types/sov'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const cashFlowKeys = {
  all: ['cash-flow'] as const,
  projection: (projectId: string) => [...cashFlowKeys.all, 'projection', projectId] as const,
  monthly: (projectId: string, month: string) =>
    [...cashFlowKeys.all, 'monthly', projectId, month] as const,
  sCurve: (projectId: string) => [...cashFlowKeys.all, 's-curve', projectId] as const,
  filters: (filters: CashFlowFilters) => [...cashFlowKeys.all, 'filtered', filters] as const,
  multiProject: (projectIds: string[]) =>
    [...cashFlowKeys.all, 'multi-project', projectIds.join(',')] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get cash flow projection for a project
 */
export function useCashFlowProjection(projectId: string | undefined, options?: CashFlowFilters) {
  const monthsForward = options?.months_forward ?? 6
  const monthsBack = options?.months_back ?? 3

  return useQuery({
    queryKey: cashFlowKeys.projection(projectId || ''),
    queryFn: async (): Promise<CashFlowProjection | null> => {
      if (!projectId) return null

      // Get project info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, budget, start_date, target_end_date')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Get SOV data
      const { data: sov } = await supabase
        .from('schedule_of_values')
        .select(`
          *,
          sov_line_items (*)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      // Get payment applications
      const { data: applications } = await supabase
        .from('aia_g702_applications')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('period_to', { ascending: true })

      // Get cost transactions
      const { data: transactions } = await supabase
        .from('cost_transactions')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      // Build monthly projections
      const now = new Date()
      const startMonth = subMonths(startOfMonth(now), monthsBack)
      const endMonth = addMonths(startOfMonth(now), monthsForward)

      const months: CashFlowMonth[] = []
      let currentMonth = startMonth
      let projectedCumulative = 0
      let actualCumulative = 0

      // Calculate contract value from SOV or project budget
      const contractValue =
        sov?.current_contract_sum ||
        sov?.original_contract_sum ||
        project.budget ||
        0

      // Calculate total project duration in months
      const projectStart = project.start_date
        ? parseISO(project.start_date)
        : startMonth
      const projectEnd = project.target_end_date
        ? parseISO(project.target_end_date)
        : addMonths(projectStart, 12)
      const totalProjectMonths = differenceInMonths(projectEnd, projectStart) || 12

      // Calculate planned monthly billing (simple linear distribution)
      const plannedMonthlyBilling = contractValue / totalProjectMonths

      while (currentMonth <= endMonth) {
        const monthStr = format(currentMonth, 'yyyy-MM')
        const monthLabel = format(currentMonth, 'MMM yyyy')
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)

        // Calculate actual billings from payment applications
        const monthApplications = (applications || []).filter((app) => {
          const periodTo = parseISO(app.period_to)
          return isWithinInterval(periodTo, { start: monthStart, end: monthEnd })
        })

        const actualBillings = monthApplications.reduce(
          (sum, app) => sum + (app.current_payment_due || 0),
          0
        )

        // Calculate actual collections (paid applications)
        const paidApplications = monthApplications.filter((app) => app.status === 'paid')
        const actualCollections = paidApplications.reduce(
          (sum, app) => sum + (app.current_payment_due || 0),
          0
        )

        // Calculate actual disbursements from cost transactions
        const monthTransactions = (transactions || []).filter((tx) => {
          if (!tx.transaction_date) return false
          const txDate = parseISO(tx.transaction_date)
          return isWithinInterval(txDate, { start: monthStart, end: monthEnd })
        })

        const actualDisbursements = monthTransactions
          .filter((tx) => tx.transaction_type === 'actual')
          .reduce((sum, tx) => sum + (tx.amount || 0), 0)

        // Calculate projected values
        const isPast = currentMonth < now
        const monthIndex = differenceInMonths(currentMonth, projectStart)
        const isInProjectPeriod = monthIndex >= 0 && monthIndex < totalProjectMonths

        // Use S-curve distribution (simplified bell curve)
        const sPosition = isInProjectPeriod ? monthIndex / totalProjectMonths : 0
        const sCurveMultiplier = isInProjectPeriod
          ? Math.sin(sPosition * Math.PI) * 1.5 // Peak in the middle
          : 0

        const projectedBillings = isPast
          ? actualBillings
          : isInProjectPeriod
          ? plannedMonthlyBilling * Math.max(sCurveMultiplier, 0.5)
          : 0

        // Assume 30-day payment terms
        const projectedCollections = isPast ? actualCollections : projectedBillings * 0.95 // 95% collection rate

        // Assume costs are 70-80% of billings
        const projectedDisbursements = isPast
          ? actualDisbursements
          : projectedBillings * 0.75

        const projectedNet = projectedCollections - projectedDisbursements
        const actualNet = actualCollections - actualDisbursements

        projectedCumulative += projectedNet
        if (isPast) {
          actualCumulative += actualNet
        }

        // Calculate percent complete
        const plannedPercentComplete = isInProjectPeriod
          ? ((monthIndex + 1) / totalProjectMonths) * 100
          : monthIndex >= totalProjectMonths
          ? 100
          : 0

        const actualPercentComplete = isPast
          ? contractValue > 0
            ? (actualBillings / contractValue) * 100
            : 0
          : 0

        months.push({
          month: monthStr,
          month_label: monthLabel,
          projected_billings: projectedBillings,
          actual_billings: isPast ? actualBillings : 0,
          projected_collections: projectedCollections,
          actual_collections: isPast ? actualCollections : 0,
          projected_disbursements: projectedDisbursements,
          actual_disbursements: isPast ? actualDisbursements : 0,
          projected_net: projectedNet,
          actual_net: isPast ? actualNet : 0,
          projected_cumulative: projectedCumulative,
          actual_cumulative: isPast ? actualCumulative : 0,
          planned_percent_complete: plannedPercentComplete,
          actual_percent_complete: actualPercentComplete,
          earned_value: (actualPercentComplete / 100) * contractValue,
        })

        currentMonth = addMonths(currentMonth, 1)
      }

      // Calculate totals
      const historicalMonths = months.filter(
        (m) => parseISO(m.month + '-01') < now
      )
      const futureMonths = months.filter(
        (m) => parseISO(m.month + '-01') >= now
      )

      const totalActualBillings = historicalMonths.reduce(
        (sum, m) => sum + m.actual_billings,
        0
      )
      const totalProjectedBillings =
        totalActualBillings +
        futureMonths.reduce((sum, m) => sum + m.projected_billings, 0)
      const totalCollected = historicalMonths.reduce(
        (sum, m) => sum + m.actual_collections,
        0
      )
      const totalDisbursed = historicalMonths.reduce(
        (sum, m) => sum + m.actual_disbursements,
        0
      )

      // S-Curve / Earned Value Metrics
      const currentMonthData = months.find(
        (m) => m.month === format(now, 'yyyy-MM')
      )

      const plannedValueToDate = currentMonthData
        ? (currentMonthData.planned_percent_complete / 100) * contractValue
        : 0
      const earnedValueToDate = currentMonthData?.earned_value || 0
      const actualCostToDate = totalDisbursed

      const scheduleVariance = earnedValueToDate - plannedValueToDate
      const costVariance = earnedValueToDate - actualCostToDate
      const schedulePerformanceIndex =
        plannedValueToDate > 0 ? earnedValueToDate / plannedValueToDate : 1
      const costPerformanceIndex =
        actualCostToDate > 0 ? earnedValueToDate / actualCostToDate : 1

      // Forecast calculations
      const estimateAtCompletion =
        costPerformanceIndex > 0
          ? contractValue / costPerformanceIndex
          : contractValue
      const estimateToComplete = estimateAtCompletion - actualCostToDate
      const varianceAtCompletion = contractValue - estimateAtCompletion

      return {
        project_id: projectId,
        project_name: project.name,
        contract_value: contractValue,
        total_projected_billings: totalProjectedBillings,
        total_actual_billings: totalActualBillings,
        total_collected: totalCollected,
        total_disbursed: totalDisbursed,
        months,
        planned_value_to_date: plannedValueToDate,
        earned_value_to_date: earnedValueToDate,
        actual_cost_to_date: actualCostToDate,
        schedule_variance: scheduleVariance,
        cost_variance: costVariance,
        schedule_performance_index: schedulePerformanceIndex,
        cost_performance_index: costPerformanceIndex,
        estimate_at_completion: estimateAtCompletion,
        estimate_to_complete: estimateToComplete,
        variance_at_completion: varianceAtCompletion,
      }
    },
    enabled: !!projectId,
  })
}

/**
 * Get S-Curve data for a project
 */
export function useSCurve(projectId: string | undefined) {
  const { data: projection, ...rest } = useCashFlowProjection(projectId, {
    project_id: projectId || '',
    months_forward: 12,
    months_back: 6,
  })

  return {
    data: projection
      ? {
          months: projection.months.map((m) => ({
            month: m.month,
            label: m.month_label,
            planned: m.planned_percent_complete,
            actual: m.actual_percent_complete,
            earned_value: m.earned_value,
          })),
          metrics: {
            spi: projection.schedule_performance_index,
            cpi: projection.cost_performance_index,
            sv: projection.schedule_variance,
            cv: projection.cost_variance,
            eac: projection.estimate_at_completion,
            etc: projection.estimate_to_complete,
            vac: projection.variance_at_completion,
          },
        }
      : null,
    ...rest,
  }
}

/**
 * Get cash flow for multiple projects (portfolio view)
 */
export function useMultiProjectCashFlow(projectIds: string[] | undefined) {
  return useQuery({
    queryKey: cashFlowKeys.multiProject(projectIds || []),
    queryFn: async () => {
      if (!projectIds || projectIds.length === 0) return []

      const projections = await Promise.all(
        projectIds.map(async (projectId) => {
          // Get project info
          const { data: project } = await supabase
            .from('projects')
            .select('id, name, budget, start_date, target_end_date')
            .eq('id', projectId)
            .single()

          // Get SOV summary
          const { data: sovSummary } = await supabase
            .from('sov_summary')
            .select('*')
            .eq('project_id', projectId)
            .single()

          // Get applications summary
          const { data: applications } = await supabase
            .from('aia_g702_applications')
            .select('status, current_payment_due')
            .eq('project_id', projectId)
            .is('deleted_at', null)

          const totalBilled = (applications || [])
            .filter((a) => ['submitted', 'approved', 'paid'].includes(a.status))
            .reduce((sum, a) => sum + (a.current_payment_due || 0), 0)

          const totalPaid = (applications || [])
            .filter((a) => a.status === 'paid')
            .reduce((sum, a) => sum + (a.current_payment_due || 0), 0)

          const totalPending = (applications || [])
            .filter((a) => ['submitted', 'approved'].includes(a.status))
            .reduce((sum, a) => sum + (a.current_payment_due || 0), 0)

          return {
            project_id: projectId,
            project_name: project?.name || 'Unknown',
            contract_value: sovSummary?.current_contract_sum || project?.budget || 0,
            percent_complete: sovSummary?.overall_percent_complete || 0,
            total_billed: totalBilled,
            total_paid: totalPaid,
            total_pending: totalPending,
            outstanding_ar: totalBilled - totalPaid,
          }
        })
      )

      return projections
    },
    enabled: !!projectIds && projectIds.length > 0,
  })
}

/**
 * Get cash flow comparison (budget vs actual)
 */
export function useCashFlowComparison(projectId: string | undefined) {
  const { data: projection, ...rest } = useCashFlowProjection(projectId)

  return {
    data: projection
      ? {
          variance_summary: {
            billing_variance:
              projection.total_actual_billings - projection.total_projected_billings,
            billing_variance_percent:
              projection.total_projected_billings > 0
                ? ((projection.total_actual_billings - projection.total_projected_billings) /
                    projection.total_projected_billings) *
                  100
                : 0,
            collection_rate:
              projection.total_actual_billings > 0
                ? (projection.total_collected / projection.total_actual_billings) * 100
                : 0,
            disbursement_rate:
              projection.total_collected > 0
                ? (projection.total_disbursed / projection.total_collected) * 100
                : 0,
          },
          monthly_comparison: projection.months.map((m) => ({
            month: m.month,
            label: m.month_label,
            projected_billings: m.projected_billings,
            actual_billings: m.actual_billings,
            billing_variance: m.actual_billings - m.projected_billings,
            projected_net: m.projected_net,
            actual_net: m.actual_net,
            net_variance: m.actual_net - m.projected_net,
          })),
          cumulative_comparison: projection.months.map((m) => ({
            month: m.month,
            label: m.month_label,
            projected: m.projected_cumulative,
            actual: m.actual_cumulative,
            variance: m.actual_cumulative - m.projected_cumulative,
          })),
        }
      : null,
    ...rest,
  }
}

/**
 * Get forecast to complete
 */
export function useForecastToComplete(projectId: string | undefined) {
  const { data: projection, ...rest } = useCashFlowProjection(projectId)

  return {
    data: projection
      ? {
          contract_value: projection.contract_value,
          earned_to_date: projection.earned_value_to_date,
          remaining_value:
            projection.contract_value - projection.earned_value_to_date,
          percent_complete:
            projection.contract_value > 0
              ? (projection.earned_value_to_date / projection.contract_value) * 100
              : 0,
          estimate_at_completion: projection.estimate_at_completion,
          estimate_to_complete: projection.estimate_to_complete,
          projected_profit: projection.variance_at_completion,
          projected_margin:
            projection.estimate_at_completion > 0
              ? (projection.variance_at_completion / projection.estimate_at_completion) * 100
              : 0,
          cost_performance_index: projection.cost_performance_index,
          schedule_performance_index: projection.schedule_performance_index,
          is_over_budget: projection.cost_performance_index < 1,
          is_behind_schedule: projection.schedule_performance_index < 1,
        }
      : null,
    ...rest,
  }
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get month options for date selection
 */
export function useMonthOptions(monthsBack: number = 12, monthsForward: number = 12) {
  const now = new Date()
  const options: Array<{ value: string; label: string }> = []

  for (let i = -monthsBack; i <= monthsForward; i++) {
    const month = addMonths(now, i)
    options.push({
      value: format(month, 'yyyy-MM'),
      label: format(month, 'MMMM yyyy'),
    })
  }

  return options
}
