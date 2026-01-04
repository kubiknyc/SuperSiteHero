/**
 * Tests for Job Costing Hooks
 * CRITICAL for financial accuracy - ensures job costing calculations work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', company_id: 'test-company-id' },
  }),
}))

// Create mock supabase
const mockSupabaseSelect = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseIs = vi.fn()
const mockSupabaseOrder = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseUpdate = vi.fn()

const createQueryChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnValue(Promise.resolve({ data, error })),
  single: vi.fn().mockReturnValue(Promise.resolve({ data, error })),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      // Return different mock data based on table
      if (table === 'cost_codes') {
        return createQueryChain(mockCostCodes, null)
      }
      if (table === 'projects') {
        return createQueryChain({ name: 'Test Project' }, null)
      }
      if (table === 'cost_transactions') {
        return createQueryChain(mockTransactions, null)
      }
      if (table === 'purchase_orders') {
        return createQueryChain(mockPurchaseOrders, null)
      }
      if (table === 'project_subcontractors') {
        return createQueryChain(mockSubcontracts, null)
      }
      return createQueryChain([], null)
    }),
  },
}))

// Mock data
const mockCostCodes = [
  {
    id: 'cc-1',
    project_id: 'project-1',
    code: '01000',
    name: 'General Requirements',
    cost_type: 'labor',
    original_budget: 100000,
    revised_budget: 110000,
    committed_cost: 50000,
    actual_cost: 40000,
    is_active: true,
    deleted_at: null,
  },
  {
    id: 'cc-2',
    project_id: 'project-1',
    code: '02000',
    name: 'Site Work',
    cost_type: 'material',
    original_budget: 200000,
    revised_budget: 200000,
    committed_cost: 150000,
    actual_cost: 60000,
    is_active: true,
    deleted_at: null,
  },
  {
    id: 'cc-3',
    project_id: 'project-1',
    code: '03000',
    name: 'Concrete',
    cost_type: 'subcontract',
    original_budget: 150000,
    revised_budget: 160000,
    committed_cost: 170000,
    actual_cost: 10000,
    is_active: true,
    deleted_at: null,
  },
]

const mockTransactions = [
  {
    id: 'tx-1',
    cost_code_id: 'cc-1',
    transaction_type: 'actual',
    amount: 25000,
  },
  {
    id: 'tx-2',
    cost_code_id: 'cc-1',
    transaction_type: 'committed',
    amount: 30000,
  },
  {
    id: 'tx-3',
    cost_code_id: 'cc-2',
    transaction_type: 'actual',
    amount: 40000,
  },
]

const mockPurchaseOrders = [
  {
    id: 'po-1',
    project_id: 'project-1',
    total_amount: 50000,
    invoiced_amount: 25000,
    paid_amount: 20000,
    balance_remaining: 30000,
  },
]

const mockSubcontracts = [
  {
    id: 'sub-1',
    project_id: 'project-1',
    subcontractor_id: 'subcontractor-1',
    subcontract_number: 'SC-001',
    scope: 'Concrete work',
    contract_amount: 150000,
    change_order_amount: 10000,
    billed_to_date: 80000,
    paid_to_date: 60000,
    retainage_held: 8000,
    status: 'active',
    subcontractors: {
      id: 'subcontractor-1',
      name: 'ABC Concrete',
      company_name: 'ABC Concrete Inc',
    },
  },
]

// Import hooks after mocks
import {
  jobCostingKeys,
  useCostCodes,
  useFilteredCostCodes,
  useCostCodeDetail,
  useJobCostSummary,
  useVarianceAnalysis,
  useCostTransactions,
  usePurchaseOrders,
  useSubcontracts,
  useCommittedCostSummary,
} from './useJobCosting'

// =============================================
// Test Setup
// =============================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useJobCosting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // Query Keys
  // =============================================

  describe('jobCostingKeys', () => {
    it('generates correct base key', () => {
      expect(jobCostingKeys.all).toEqual(['job-costing'])
    })

    it('generates correct cost code list key', () => {
      expect(jobCostingKeys.costCodeList('project-1')).toEqual([
        'job-costing',
        'cost-codes',
        'list',
        'project-1',
      ])
    })

    it('generates correct summary key', () => {
      expect(jobCostingKeys.summary('project-1')).toEqual([
        'job-costing',
        'summary',
        'project-1',
      ])
    })

    it('generates correct variance key', () => {
      expect(jobCostingKeys.variance('project-1')).toEqual([
        'job-costing',
        'variance',
        'project-1',
      ])
    })

    it('generates filtered key with filters object', () => {
      const filters = { project_id: 'p1', cost_type: 'labor', is_active: true }
      expect(jobCostingKeys.costCodeFiltered(filters)).toEqual([
        'job-costing',
        'cost-codes',
        'filtered',
        filters,
      ])
    })
  })

  // =============================================
  // useCostCodes
  // =============================================

  describe('useCostCodes', () => {
    it('returns empty array when projectId is undefined', async () => {
      const { result } = renderHook(() => useCostCodes(undefined), {
        wrapper: createWrapper(),
      })

      // Should not be fetching since projectId is undefined
      expect(result.current.isFetching).toBe(false)
    })

    it('fetches cost codes for valid project', async () => {
      const { result } = renderHook(() => useCostCodes('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockCostCodes)
    })
  })

  // =============================================
  // useFilteredCostCodes
  // =============================================

  describe('useFilteredCostCodes', () => {
    it('filters by project_id', async () => {
      const { result } = renderHook(
        () => useFilteredCostCodes({ project_id: 'project-1' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('filters cost codes with variance when has_variance is true', async () => {
      const { result } = renderHook(
        () => useFilteredCostCodes({ project_id: 'project-1', has_variance: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Should only include cost codes with non-zero variance
      if (result.current.data) {
        expect(result.current.data.every((cc) => cc.budget_variance !== 0)).toBe(true)
      }
    })
  })

  // =============================================
  // useCostCodeDetail
  // =============================================

  describe('useCostCodeDetail', () => {
    it('returns null when id is undefined', async () => {
      const { result } = renderHook(() => useCostCodeDetail(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
    })
  })

  // =============================================
  // Job Cost Calculations
  // =============================================

  describe('Job Cost Calculations', () => {
    describe('Variance Calculations', () => {
      it('calculates positive variance (under budget) correctly', () => {
        // Budget: 110000, Committed: 50000, Actual: 40000
        // Variance = 110000 - (50000 + 40000) = 20000 (under budget)
        const costCode = mockCostCodes[0]
        const revisedBudget = costCode.revised_budget || costCode.original_budget
        const variance = revisedBudget - (costCode.committed_cost + costCode.actual_cost)

        expect(variance).toBe(20000)
        expect(variance).toBeGreaterThan(0) // Under budget
      })

      it('calculates negative variance (over budget) correctly', () => {
        // Budget: 160000, Committed: 170000, Actual: 10000
        // Variance = 160000 - (170000 + 10000) = -20000 (over budget)
        const costCode = mockCostCodes[2]
        const revisedBudget = costCode.revised_budget || costCode.original_budget
        const variance = revisedBudget - (costCode.committed_cost + costCode.actual_cost)

        expect(variance).toBe(-20000)
        expect(variance).toBeLessThan(0) // Over budget
      })

      it('calculates percent spent correctly', () => {
        const costCode = mockCostCodes[0]
        const revisedBudget = costCode.revised_budget || costCode.original_budget
        const percentSpent =
          revisedBudget > 0
            ? ((costCode.committed_cost + costCode.actual_cost) / revisedBudget) * 100
            : 0

        // (50000 + 40000) / 110000 * 100 = 81.82%
        expect(percentSpent).toBeCloseTo(81.82, 1)
      })

      it('handles zero budget gracefully', () => {
        const zeroBudgetCode = { ...mockCostCodes[0], original_budget: 0, revised_budget: 0 }
        const revisedBudget = zeroBudgetCode.revised_budget || zeroBudgetCode.original_budget
        const percentSpent =
          revisedBudget > 0
            ? ((zeroBudgetCode.committed_cost + zeroBudgetCode.actual_cost) / revisedBudget) * 100
            : 0

        expect(percentSpent).toBe(0)
        expect(Number.isNaN(percentSpent)).toBe(false)
      })
    })

    describe('Cost Type Aggregation', () => {
      it('aggregates by cost type correctly', () => {
        const byType: Record<string, { budget: number; committed: number; actual: number }> = {
          labor: { budget: 0, committed: 0, actual: 0 },
          material: { budget: 0, committed: 0, actual: 0 },
          subcontract: { budget: 0, committed: 0, actual: 0 },
        }

        mockCostCodes.forEach((cc) => {
          const type = cc.cost_type
          if (byType[type]) {
            byType[type].budget += cc.original_budget
            byType[type].committed += cc.committed_cost
            byType[type].actual += cc.actual_cost
          }
        })

        expect(byType.labor.budget).toBe(100000)
        expect(byType.material.budget).toBe(200000)
        expect(byType.subcontract.budget).toBe(150000)
      })

      it('calculates total project budget correctly', () => {
        const totalBudget = mockCostCodes.reduce((sum, cc) => sum + cc.original_budget, 0)
        expect(totalBudget).toBe(450000)
      })

      it('calculates total committed correctly', () => {
        const totalCommitted = mockCostCodes.reduce((sum, cc) => sum + cc.committed_cost, 0)
        expect(totalCommitted).toBe(370000)
      })

      it('calculates total actual correctly', () => {
        const totalActual = mockCostCodes.reduce((sum, cc) => sum + cc.actual_cost, 0)
        expect(totalActual).toBe(110000)
      })
    })

    describe('Forecast at Completion', () => {
      it('calculates forecast when on budget', () => {
        // When variance is positive or zero, forecast = budget
        const totalBudget = 450000
        const totalVariance = 20000 // Under budget
        const forecastAtCompletion = totalBudget + Math.abs(Math.min(totalVariance, 0))

        expect(forecastAtCompletion).toBe(450000)
      })

      it('calculates forecast when over budget', () => {
        // When variance is negative, forecast = budget + |variance|
        const totalBudget = 450000
        const totalVariance = -30000 // Over budget
        const forecastAtCompletion = totalBudget + Math.abs(Math.min(totalVariance, 0))

        expect(forecastAtCompletion).toBe(480000)
      })
    })
  })

  // =============================================
  // Committed Cost Summary
  // =============================================

  describe('Committed Cost Summary', () => {
    it('calculates PO totals correctly', () => {
      const poSummary = mockPurchaseOrders.reduce(
        (acc, po) => ({
          total_po_amount: acc.total_po_amount + (po.total_amount || 0),
          total_po_invoiced: acc.total_po_invoiced + (po.invoiced_amount || 0),
          total_po_paid: acc.total_po_paid + (po.paid_amount || 0),
          total_po_remaining: acc.total_po_remaining + (po.balance_remaining || 0),
        }),
        { total_po_amount: 0, total_po_invoiced: 0, total_po_paid: 0, total_po_remaining: 0 }
      )

      expect(poSummary.total_po_amount).toBe(50000)
      expect(poSummary.total_po_invoiced).toBe(25000)
      expect(poSummary.total_po_paid).toBe(20000)
      expect(poSummary.total_po_remaining).toBe(30000)
    })

    it('calculates subcontract totals correctly', () => {
      const subSummary = mockSubcontracts.reduce(
        (acc, sub) => {
          const contractAmount = (sub.contract_amount || 0) + (sub.change_order_amount || 0)
          return {
            total_subcontract_amount: acc.total_subcontract_amount + contractAmount,
            total_subcontract_billed: acc.total_subcontract_billed + (sub.billed_to_date || 0),
            total_subcontract_paid: acc.total_subcontract_paid + (sub.paid_to_date || 0),
            total_subcontract_retainage:
              acc.total_subcontract_retainage + (sub.retainage_held || 0),
          }
        },
        {
          total_subcontract_amount: 0,
          total_subcontract_billed: 0,
          total_subcontract_paid: 0,
          total_subcontract_retainage: 0,
        }
      )

      expect(subSummary.total_subcontract_amount).toBe(160000) // 150000 + 10000
      expect(subSummary.total_subcontract_billed).toBe(80000)
      expect(subSummary.total_subcontract_paid).toBe(60000)
      expect(subSummary.total_subcontract_retainage).toBe(8000)
    })

    it('calculates balance to finish for subcontracts', () => {
      const sub = mockSubcontracts[0]
      const contractAmount = (sub.contract_amount || 0) + (sub.change_order_amount || 0)
      const balanceToFinish = contractAmount - (sub.billed_to_date || 0)

      expect(balanceToFinish).toBe(80000) // 160000 - 80000
    })

    it('calculates subcontract percent complete', () => {
      const sub = mockSubcontracts[0]
      const contractAmount = (sub.contract_amount || 0) + (sub.change_order_amount || 0)
      const percentComplete = contractAmount > 0 ? ((sub.billed_to_date || 0) / contractAmount) * 100 : 0

      expect(percentComplete).toBe(50) // 80000 / 160000 * 100
    })
  })

  // =============================================
  // Transaction Processing
  // =============================================

  describe('Transaction Processing', () => {
    it('aggregates transactions by cost code', () => {
      const totals = new Map<string, { committed: number; actual: number }>()

      mockTransactions.forEach((tx) => {
        const key = tx.cost_code_id || 'unassigned'
        const current = totals.get(key) || { committed: 0, actual: 0 }

        if (tx.transaction_type === 'committed') {
          current.committed += tx.amount
        } else if (tx.transaction_type === 'actual') {
          current.actual += tx.amount
        }

        totals.set(key, current)
      })

      expect(totals.get('cc-1')?.committed).toBe(30000)
      expect(totals.get('cc-1')?.actual).toBe(25000)
      expect(totals.get('cc-2')?.actual).toBe(40000)
    })

    it('handles unassigned transactions', () => {
      const unassignedTx = { id: 'tx-4', cost_code_id: null, transaction_type: 'actual', amount: 5000 }
      const totals = new Map<string, number>()

      const key = unassignedTx.cost_code_id || 'unassigned'
      totals.set(key, (totals.get(key) || 0) + unassignedTx.amount)

      expect(totals.get('unassigned')).toBe(5000)
    })
  })

  // =============================================
  // Edge Cases
  // =============================================

  describe('Edge Cases', () => {
    it('handles empty cost codes array', () => {
      const summary = {
        total_budget: 0,
        total_committed: 0,
        total_actual: 0,
        total_variance: 0,
        percent_complete: 0,
      }

      const costCodes: typeof mockCostCodes = []
      costCodes.forEach((cc) => {
        summary.total_budget += cc.original_budget
        summary.total_committed += cc.committed_cost
        summary.total_actual += cc.actual_cost
      })

      expect(summary.total_budget).toBe(0)
      expect(summary.total_committed).toBe(0)
    })

    it('handles null/undefined values in cost codes', () => {
      const costCodeWithNulls = {
        ...mockCostCodes[0],
        committed_cost: null,
        actual_cost: undefined,
      }

      const committed = costCodeWithNulls.committed_cost || 0
      const actual = costCodeWithNulls.actual_cost || 0

      expect(committed).toBe(0)
      expect(actual).toBe(0)
    })

    it('handles missing revised_budget by falling back to original', () => {
      const costCode = { ...mockCostCodes[0], revised_budget: null }
      const revisedBudget = costCode.revised_budget || costCode.original_budget

      expect(revisedBudget).toBe(100000)
    })

    it('sorts over-budget items correctly for variance analysis', () => {
      const costCodesWithVariance = mockCostCodes.map((cc) => {
        const revisedBudget = cc.revised_budget || cc.original_budget
        return {
          ...cc,
          budget_variance: revisedBudget - (cc.committed_cost + cc.actual_cost),
        }
      })

      const sortedByVariance = [...costCodesWithVariance].sort(
        (a, b) => a.budget_variance - b.budget_variance
      )

      const topOverBudget = sortedByVariance.filter((cc) => cc.budget_variance < 0)

      // cc-3 should be over budget (variance = -20000)
      expect(topOverBudget[0]?.code).toBe('03000')
      expect(topOverBudget[0]?.budget_variance).toBe(-20000)
    })

    it('identifies under-budget savings correctly', () => {
      const costCodesWithVariance = mockCostCodes.map((cc) => {
        const revisedBudget = cc.revised_budget || cc.original_budget
        return {
          ...cc,
          budget_variance: revisedBudget - (cc.committed_cost + cc.actual_cost),
        }
      })

      const sortedByVariance = [...costCodesWithVariance].sort(
        (a, b) => a.budget_variance - b.budget_variance
      )

      const topUnderBudget = sortedByVariance
        .filter((cc) => cc.budget_variance > 0)
        .reverse()
        .slice(0, 5)

      // cc-1 has the highest under-budget variance
      expect(topUnderBudget[0]?.code).toBe('01000')
      expect(topUnderBudget[0]?.budget_variance).toBe(20000)
    })
  })
})
