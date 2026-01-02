/**
 * Job Costing React Query Hooks
 *
 * Query and mutation hooks for managing cost codes,
 * cost transactions, and job cost analysis.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth'
import type {
  CostCode,
  JobCostSummary,
  CostTypeSummary,
  PurchaseOrder,
  Subcontract,
  CommittedCostSummary,
  CostCodeFilters,
  CommittedCostFilters,
} from '../types/sov'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const jobCostingKeys = {
  all: ['job-costing'] as const,
  costCodes: () => [...jobCostingKeys.all, 'cost-codes'] as const,
  costCodeList: (projectId: string) => [...jobCostingKeys.costCodes(), 'list', projectId] as const,
  costCodeDetail: (id: string) => [...jobCostingKeys.costCodes(), 'detail', id] as const,
  costCodeFiltered: (filters: CostCodeFilters) =>
    [...jobCostingKeys.costCodes(), 'filtered', filters] as const,
  summary: (projectId: string) => [...jobCostingKeys.all, 'summary', projectId] as const,
  transactions: (projectId: string) => [...jobCostingKeys.all, 'transactions', projectId] as const,
  purchaseOrders: (projectId: string) => [...jobCostingKeys.all, 'purchase-orders', projectId] as const,
  subcontracts: (projectId: string) => [...jobCostingKeys.all, 'subcontracts', projectId] as const,
  committedSummary: (projectId: string) =>
    [...jobCostingKeys.all, 'committed-summary', projectId] as const,
  variance: (projectId: string) => [...jobCostingKeys.all, 'variance', projectId] as const,
}

// ============================================================================
// COST CODE HOOKS
// ============================================================================

/**
 * Get all cost codes for a project
 */
export function useCostCodes(projectId: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.costCodeList(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code', { ascending: true })

      if (error) throw error

      return data as CostCode[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get filtered cost codes
 */
export function useFilteredCostCodes(filters: CostCodeFilters) {
  return useQuery({
    queryKey: jobCostingKeys.costCodeFiltered(filters),
    queryFn: async () => {
      let query = supabase.from('cost_codes').select('*').is('deleted_at', null)

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.cost_type) {
        query = query.eq('cost_type', filters.cost_type)
      }
      if (filters.parent_code) {
        query = query.eq('parent_id', filters.parent_code)
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      const { data, error } = await query.order('code', { ascending: true })

      if (error) throw error

      // Filter by variance if requested
      let result = data as CostCode[]
      if (filters.has_variance) {
        result = result.filter((cc) => cc.budget_variance !== 0)
      }

      return result
    },
  })
}

/**
 * Get a single cost code with details
 */
export function useCostCodeDetail(id: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.costCodeDetail(id || ''),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data as CostCode
    },
    enabled: !!id,
  })
}

// ============================================================================
// JOB COST SUMMARY HOOKS
// ============================================================================

/**
 * Get comprehensive job cost summary for a project
 */
export function useJobCostSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.summary(projectId || ''),
    queryFn: async () => {
      if (!projectId) return null

      // Get all cost codes
      const { data: costCodes, error: ccError } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .is('deleted_at', null)

      if (ccError) throw ccError

      // Get project info
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      // Get cost transactions
      const { data: transactions, error: txError } = await supabase
        .from('cost_transactions')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (txError) throw txError

      // Calculate totals by cost code and type
      const costCodeTotals = new Map<
        string,
        { committed: number; actual: number }
      >()

      ;(transactions || []).forEach((tx) => {
        const key = tx.cost_code_id || 'unassigned'
        const current = costCodeTotals.get(key) || { committed: 0, actual: 0 }

        if (tx.transaction_type === 'committed') {
          current.committed += tx.amount
        } else if (tx.transaction_type === 'actual') {
          current.actual += tx.amount
        }

        costCodeTotals.set(key, current)
      })

      // Build summary by type
      const byType: Record<string, CostTypeSummary> = {
        labor: { budget: 0, committed: 0, actual: 0, variance: 0, percent_spent: 0 },
        material: { budget: 0, committed: 0, actual: 0, variance: 0, percent_spent: 0 },
        equipment: { budget: 0, committed: 0, actual: 0, variance: 0, percent_spent: 0 },
        subcontract: { budget: 0, committed: 0, actual: 0, variance: 0, percent_spent: 0 },
        other: { budget: 0, committed: 0, actual: 0, variance: 0, percent_spent: 0 },
      }

      let totalBudget = 0
      let totalRevisedBudget = 0
      let totalCommitted = 0
      let totalActual = 0

      const enrichedCostCodes = (costCodes || []).map((cc) => {
        const txTotals = costCodeTotals.get(cc.id) || { committed: 0, actual: 0 }
        const committed = cc.committed_cost || txTotals.committed
        const actual = cc.actual_cost || txTotals.actual
        const revisedBudget = cc.revised_budget || cc.original_budget
        const variance = revisedBudget - (committed + actual)
        const percentSpent = revisedBudget > 0 ? ((committed + actual) / revisedBudget) * 100 : 0

        // Accumulate by type
        const type = cc.cost_type || 'other'
        byType[type].budget += cc.original_budget
        byType[type].committed += committed
        byType[type].actual += actual

        // Accumulate totals
        totalBudget += cc.original_budget
        totalRevisedBudget += revisedBudget
        totalCommitted += committed
        totalActual += actual

        return {
          ...cc,
          committed_cost: committed,
          actual_cost: actual,
          budget_variance: variance,
          percent_spent: percentSpent,
        } as CostCode
      })

      // Calculate variances for each type
      Object.keys(byType).forEach((type) => {
        const t = byType[type]
        t.variance = t.budget - (t.committed + t.actual)
        t.percent_spent = t.budget > 0 ? ((t.committed + t.actual) / t.budget) * 100 : 0
      })

      // Find top variances
      const sortedByVariance = [...enrichedCostCodes].sort(
        (a, b) => a.budget_variance - b.budget_variance
      )

      const topOverBudget = sortedByVariance.filter((cc) => cc.budget_variance < 0).slice(0, 5)
      const topUnderBudget = sortedByVariance
        .filter((cc) => cc.budget_variance > 0)
        .reverse()
        .slice(0, 5)

      const totalVariance = totalRevisedBudget - (totalCommitted + totalActual)
      const percentComplete =
        totalRevisedBudget > 0 ? ((totalCommitted + totalActual) / totalRevisedBudget) * 100 : 0

      const summary: JobCostSummary = {
        project_id: projectId,
        project_name: project?.name || '',
        total_budget: totalBudget,
        total_revised_budget: totalRevisedBudget,
        total_committed: totalCommitted,
        total_actual: totalActual,
        total_variance: totalVariance,
        percent_complete: percentComplete,
        by_type: byType as JobCostSummary['by_type'],
        top_over_budget: topOverBudget,
        top_under_budget: topUnderBudget,
      }

      return summary
    },
    enabled: !!projectId,
  })
}

/**
 * Get variance analysis for a project
 */
export function useVarianceAnalysis(projectId: string | undefined) {
  const { data: summary, ...rest } = useJobCostSummary(projectId)

  return {
    data: summary
      ? {
          total_budget: summary.total_revised_budget,
          total_spent: summary.total_committed + summary.total_actual,
          total_variance: summary.total_variance,
          variance_percent:
            summary.total_revised_budget > 0
              ? (summary.total_variance / summary.total_revised_budget) * 100
              : 0,
          forecast_at_completion:
            summary.total_revised_budget + Math.abs(Math.min(summary.total_variance, 0)),
          by_type: Object.entries(summary.by_type).map(([type, data]) => ({
            type,
            ...data,
            variance_percent: data.budget > 0 ? (data.variance / data.budget) * 100 : 0,
          })),
          top_issues: summary.top_over_budget,
          top_savings: summary.top_under_budget,
        }
      : null,
    ...rest,
  }
}

// ============================================================================
// COST TRANSACTION HOOKS
// ============================================================================

/**
 * Get cost transactions for a project
 */
export function useCostTransactions(projectId: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.transactions(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('cost_transactions')
        .select(`
          *,
          cost_codes (
            code,
            name,
            cost_type
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      if (error) throw error

      return data
    },
    enabled: !!projectId,
  })
}

// ============================================================================
// COMMITTED COST HOOKS
// ============================================================================

/**
 * Get purchase orders for a project
 */
export function usePurchaseOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.purchaseOrders(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      // This assumes a purchase_orders table exists
      // If not, return empty array
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('date_issued', { ascending: false })

        if (error) {
          console.warn('Purchase orders table may not exist:', error)
          return []
        }

        return data as PurchaseOrder[]
      } catch {
        return []
      }
    },
    enabled: !!projectId,
  })
}

/**
 * Get subcontracts for a project
 */
export function useSubcontracts(projectId: string | undefined) {
  return useQuery({
    queryKey: jobCostingKeys.subcontracts(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      // Get subcontracts from the subcontractors table with project association
      try {
        const { data, error } = await supabase
          .from('project_subcontractors')
          .select(`
            *,
            subcontractors (
              id,
              name,
              company_name
            )
          `)
          .eq('project_id', projectId)

        if (error) {
          console.warn('Subcontracts data may not be available:', error)
          return []
        }

        return (data || []).map((ps) => ({
          id: ps.id,
          project_id: ps.project_id,
          subcontractor_id: ps.subcontractor_id,
          subcontractor_name: ps.subcontractors?.company_name || ps.subcontractors?.name || '',
          subcontract_number: ps.subcontract_number || '',
          scope_description: ps.scope || '',
          spec_sections: [],
          original_amount: ps.contract_amount || 0,
          change_orders_amount: ps.change_order_amount || 0,
          current_contract_amount: (ps.contract_amount || 0) + (ps.change_order_amount || 0),
          billed_to_date: ps.billed_to_date || 0,
          paid_to_date: ps.paid_to_date || 0,
          retainage_held: ps.retainage_held || 0,
          balance_to_finish:
            (ps.contract_amount || 0) + (ps.change_order_amount || 0) - (ps.billed_to_date || 0),
          percent_complete:
            (ps.contract_amount || 0) > 0
              ? ((ps.billed_to_date || 0) /
                  ((ps.contract_amount || 0) + (ps.change_order_amount || 0))) *
                100
              : 0,
          status: ps.status || 'pending',
          start_date: ps.start_date,
          end_date: ps.end_date,
          cost_codes: [],
          sov_line_item_ids: [],
          created_at: ps.created_at,
          updated_at: ps.updated_at,
          created_by: ps.created_by,
        })) as Subcontract[]
      } catch {
        return []
      }
    },
    enabled: !!projectId,
  })
}

/**
 * Get committed cost summary
 */
export function useCommittedCostSummary(projectId: string | undefined) {
  const { data: purchaseOrders } = usePurchaseOrders(projectId)
  const { data: subcontracts } = useSubcontracts(projectId)

  return useQuery({
    queryKey: jobCostingKeys.committedSummary(projectId || ''),
    queryFn: async (): Promise<CommittedCostSummary | null> => {
      if (!projectId) return null

      const pos = purchaseOrders || []
      const subs = subcontracts || []

      const poSummary = pos.reduce(
        (acc, po) => ({
          total_po_amount: acc.total_po_amount + (po.total_amount || 0),
          total_po_invoiced: acc.total_po_invoiced + (po.invoiced_amount || 0),
          total_po_paid: acc.total_po_paid + (po.paid_amount || 0),
          total_po_remaining: acc.total_po_remaining + (po.balance_remaining || 0),
          po_count: acc.po_count + 1,
        }),
        {
          total_po_amount: 0,
          total_po_invoiced: 0,
          total_po_paid: 0,
          total_po_remaining: 0,
          po_count: 0,
        }
      )

      const subSummary = subs.reduce(
        (acc, sub) => ({
          total_subcontract_amount: acc.total_subcontract_amount + (sub.current_contract_amount || 0),
          total_subcontract_billed: acc.total_subcontract_billed + (sub.billed_to_date || 0),
          total_subcontract_paid: acc.total_subcontract_paid + (sub.paid_to_date || 0),
          total_subcontract_retainage: acc.total_subcontract_retainage + (sub.retainage_held || 0),
          total_subcontract_remaining: acc.total_subcontract_remaining + (sub.balance_to_finish || 0),
          subcontract_count: acc.subcontract_count + 1,
        }),
        {
          total_subcontract_amount: 0,
          total_subcontract_billed: 0,
          total_subcontract_paid: 0,
          total_subcontract_retainage: 0,
          total_subcontract_remaining: 0,
          subcontract_count: 0,
        }
      )

      return {
        project_id: projectId,
        ...poSummary,
        ...subSummary,
        total_committed: poSummary.total_po_amount + subSummary.total_subcontract_amount,
        total_invoiced: poSummary.total_po_invoiced + subSummary.total_subcontract_billed,
        total_paid: poSummary.total_po_paid + subSummary.total_subcontract_paid,
        total_open: poSummary.total_po_remaining + subSummary.total_subcontract_remaining,
      }
    },
    enabled: !!projectId && (!!purchaseOrders || !!subcontracts),
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a cost code
 */
export function useCreateCostCode() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (
      data: Omit<CostCode, 'id' | 'created_at' | 'updated_at' | 'budget_variance' | 'percent_spent'>
    ) => {
      const { data: costCode, error } = await supabase
        .from('cost_codes')
        .insert({
          ...data,
          company_id: user?.company_id,
          created_by: user?.id,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return costCode as CostCode
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.costCodeList(data.project_id) })
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.summary(data.project_id) })
      toast({
        title: 'Cost Code Created',
        description: `Cost code ${data.code} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cost code.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a cost code
 */
export function useUpdateCostCode() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<CostCode>
    }) => {
      const { data: costCode, error } = await supabase
        .from('cost_codes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return costCode as CostCode
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.costCodeList(data.project_id) })
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.costCodeDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.summary(data.project_id) })
      toast({
        title: 'Cost Code Updated',
        description: 'The cost code has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cost code.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Add a cost transaction
 */
export function useAddCostTransaction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      project_id: string
      cost_code_id?: string
      transaction_type: 'budget' | 'committed' | 'actual' | 'forecast'
      amount: number
      description?: string
      reference_type?: string
      reference_id?: string
      reference_number?: string
      transaction_date: string
      vendor_id?: string
      vendor_name?: string
    }) => {
      const { data: transaction, error } = await supabase
        .from('cost_transactions')
        .insert({
          ...data,
          company_id: user?.company_id,
          created_by: user?.id,
          posting_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return transaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.transactions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.summary(data.project_id) })
      toast({
        title: 'Transaction Added',
        description: 'The cost transaction has been recorded.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Import budget from estimate
 */
export function useImportBudgetFromEstimate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      estimateId,
    }: {
      projectId: string
      estimateId: string
    }) => {
      // Get estimate line items
      const { data: estimateItems, error: fetchError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)

      if (fetchError) throw fetchError

      // Create cost codes from estimate items
      const costCodes = await Promise.all(
        (estimateItems || []).map(async (item) => {
          const { data: costCode, error } = await supabase
            .from('cost_codes')
            .insert({
              project_id: projectId,
              company_id: user?.company_id,
              code: item.cost_code || item.item_number,
              name: item.description,
              original_budget: item.total_amount || 0,
              revised_budget: item.total_amount || 0,
              cost_type: item.cost_type || 'other',
              created_by: user?.id,
              is_active: true,
            })
            .select()
            .single()

          if (error) throw error
          return costCode
        })
      )

      return { projectId, count: costCodes.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.costCodeList(data.projectId) })
      queryClient.invalidateQueries({ queryKey: jobCostingKeys.summary(data.projectId) })
      toast({
        title: 'Budget Imported',
        description: `${data.count} cost codes have been created from the estimate.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import budget.',
        variant: 'destructive',
      })
    },
  })
}
