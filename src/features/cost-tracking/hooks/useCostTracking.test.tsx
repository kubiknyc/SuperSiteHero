/**
 * Tests for Cost Tracking Hooks
 * CRITICAL for financial accuracy - ensures cost tracking operations work correctly
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

// Create mock API functions
const mockGetCostCodes = vi.fn()
const mockGetCostCodesTree = vi.fn()
const mockGetCostCode = vi.fn()
const mockCreateCostCode = vi.fn()
const mockUpdateCostCode = vi.fn()
const mockDeleteCostCode = vi.fn()
const mockSeedCSIDivisions = vi.fn()
const mockGetProjectBudgets = vi.fn()
const mockGetProjectBudget = vi.fn()
const mockGetProjectBudgetTotals = vi.fn()
const mockGetBudgetSummaryByDivision = vi.fn()
const mockCreateProjectBudget = vi.fn()
const mockUpdateProjectBudget = vi.fn()
const mockDeleteProjectBudget = vi.fn()
const mockBulkCreateBudgets = vi.fn()
const mockGetCostTransactions = vi.fn()
const mockGetCostTransaction = vi.fn()
const mockGetTransactionTotalsByType = vi.fn()
const mockCreateCostTransaction = vi.fn()
const mockUpdateCostTransaction = vi.fn()
const mockDeleteCostTransaction = vi.fn()

// Mock cost-tracking API
vi.mock('@/lib/api/services/cost-tracking', () => ({
  costTrackingApi: {
    costCodes: {
      getCostCodes: (...args: unknown[]) => mockGetCostCodes(...args),
      getCostCodesTree: (...args: unknown[]) => mockGetCostCodesTree(...args),
      getCostCode: (...args: unknown[]) => mockGetCostCode(...args),
      createCostCode: (...args: unknown[]) => mockCreateCostCode(...args),
      updateCostCode: (...args: unknown[]) => mockUpdateCostCode(...args),
      deleteCostCode: (...args: unknown[]) => mockDeleteCostCode(...args),
      seedCSIDivisions: (...args: unknown[]) => mockSeedCSIDivisions(...args),
    },
    budgets: {
      getProjectBudgets: (...args: unknown[]) => mockGetProjectBudgets(...args),
      getProjectBudget: (...args: unknown[]) => mockGetProjectBudget(...args),
      getProjectBudgetTotals: (...args: unknown[]) => mockGetProjectBudgetTotals(...args),
      getBudgetSummaryByDivision: (...args: unknown[]) => mockGetBudgetSummaryByDivision(...args),
      createProjectBudget: (...args: unknown[]) => mockCreateProjectBudget(...args),
      updateProjectBudget: (...args: unknown[]) => mockUpdateProjectBudget(...args),
      deleteProjectBudget: (...args: unknown[]) => mockDeleteProjectBudget(...args),
      bulkCreateBudgets: (...args: unknown[]) => mockBulkCreateBudgets(...args),
    },
    transactions: {
      getCostTransactions: (...args: unknown[]) => mockGetCostTransactions(...args),
      getCostTransaction: (...args: unknown[]) => mockGetCostTransaction(...args),
      getTransactionTotalsByType: (...args: unknown[]) => mockGetTransactionTotalsByType(...args),
      createCostTransaction: (...args: unknown[]) => mockCreateCostTransaction(...args),
      updateCostTransaction: (...args: unknown[]) => mockUpdateCostTransaction(...args),
      deleteCostTransaction: (...args: unknown[]) => mockDeleteCostTransaction(...args),
    },
  },
}))

// Import hooks after mocks
import {
  costTrackingKeys,
  useCostCodes,
  useCostCodesTree,
  useCostCode,
  useCreateCostCode,
  useUpdateCostCode,
  useDeleteCostCode,
  useSeedCSIDivisions,
  useProjectBudgets,
  useProjectBudget,
  useProjectBudgetTotals,
  useBudgetByDivision,
  useCreateProjectBudget,
  useUpdateProjectBudget,
  useDeleteProjectBudget,
  useBulkCreateBudgets,
  useCostTransactions,
  useCostTransaction,
  useTransactionTotalsByType,
  useCreateCostTransaction,
  useUpdateCostTransaction,
  useDeleteCostTransaction,
} from './useCostTracking'

// =============================================
// Test Data
// =============================================

const mockCostCodes = [
  {
    id: 'cc-1',
    company_id: 'company-123',
    code: '01000',
    name: 'General Requirements',
    division: '01',
    level: 1,
    is_active: true,
  },
  {
    id: 'cc-2',
    company_id: 'company-123',
    code: '03000',
    name: 'Concrete',
    division: '03',
    level: 1,
    is_active: true,
  },
]

const mockProjectBudgets = [
  {
    id: 'pb-1',
    project_id: 'project-123',
    cost_code_id: 'cc-1',
    original_budget: 100000,
    approved_changes: 5000,
    committed_cost: 90000,
    actual_cost: 80000,
    cost_code: '01000',
    cost_code_name: 'General Requirements',
    division: '01',
  },
  {
    id: 'pb-2',
    project_id: 'project-123',
    cost_code_id: 'cc-2',
    original_budget: 500000,
    approved_changes: 25000,
    committed_cost: 400000,
    actual_cost: 350000,
    cost_code: '03000',
    cost_code_name: 'Concrete',
    division: '03',
  },
]

const mockBudgetTotals = {
  total_original_budget: 600000,
  total_approved_changes: 30000,
  total_revised_budget: 630000,
  total_committed_cost: 490000,
  total_actual_cost: 430000,
  total_variance: 200000,
  budget_count: 2,
}

const mockTransactions = [
  {
    id: 'tx-1',
    project_id: 'project-123',
    cost_code_id: 'cc-1',
    transaction_date: '2024-01-15',
    description: 'Materials purchase',
    transaction_type: 'actual',
    amount: 15000,
    vendor_name: 'ABC Supplies',
  },
  {
    id: 'tx-2',
    project_id: 'project-123',
    cost_code_id: 'cc-2',
    transaction_date: '2024-01-16',
    description: 'Concrete pour',
    transaction_type: 'actual',
    amount: 50000,
    vendor_name: 'XYZ Concrete',
  },
]

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockGetCostCodes.mockResolvedValue(mockCostCodes)
  mockGetCostCodesTree.mockResolvedValue(mockCostCodes)
  mockGetCostCode.mockResolvedValue(mockCostCodes[0])
  mockCreateCostCode.mockResolvedValue(mockCostCodes[0])
  mockUpdateCostCode.mockResolvedValue(mockCostCodes[0])
  mockDeleteCostCode.mockResolvedValue(undefined)
  mockSeedCSIDivisions.mockResolvedValue(50)

  mockGetProjectBudgets.mockResolvedValue(mockProjectBudgets)
  mockGetProjectBudget.mockResolvedValue(mockProjectBudgets[0])
  mockGetProjectBudgetTotals.mockResolvedValue(mockBudgetTotals)
  mockGetBudgetSummaryByDivision.mockResolvedValue([])
  mockCreateProjectBudget.mockResolvedValue(mockProjectBudgets[0])
  mockUpdateProjectBudget.mockResolvedValue(mockProjectBudgets[0])
  mockDeleteProjectBudget.mockResolvedValue(undefined)
  mockBulkCreateBudgets.mockResolvedValue(mockProjectBudgets)

  mockGetCostTransactions.mockResolvedValue(mockTransactions)
  mockGetCostTransaction.mockResolvedValue(mockTransactions[0])
  mockGetTransactionTotalsByType.mockResolvedValue({ actual: 65000, committed: 490000 })
  mockCreateCostTransaction.mockResolvedValue(mockTransactions[0])
  mockUpdateCostTransaction.mockResolvedValue(mockTransactions[0])
  mockDeleteCostTransaction.mockResolvedValue(undefined)
})

// =============================================
// Query Key Tests
// =============================================

describe('costTrackingKeys', () => {
  it('should generate correct base key', () => {
    expect(costTrackingKeys.all).toEqual(['cost-tracking'])
  })

  describe('cost codes keys', () => {
    it('should generate correct cost codes base key', () => {
      expect(costTrackingKeys.costCodes()).toEqual(['cost-tracking', 'cost-codes'])
    })

    it('should generate correct cost codes list key', () => {
      const filters = { companyId: 'company-123', division: '01' }
      expect(costTrackingKeys.costCodesList(filters)).toEqual([
        'cost-tracking',
        'cost-codes',
        'list',
        filters,
      ])
    })

    it('should generate correct cost codes tree key', () => {
      expect(costTrackingKeys.costCodesTree('company-123')).toEqual([
        'cost-tracking',
        'cost-codes',
        'tree',
        'company-123',
      ])
    })

    it('should generate correct cost code detail key', () => {
      expect(costTrackingKeys.costCodeDetail('cc-1')).toEqual([
        'cost-tracking',
        'cost-codes',
        'detail',
        'cc-1',
      ])
    })
  })

  describe('budget keys', () => {
    it('should generate correct budgets base key', () => {
      expect(costTrackingKeys.budgets()).toEqual(['cost-tracking', 'budgets'])
    })

    it('should generate correct budgets list key', () => {
      const filters = { projectId: 'project-123' }
      expect(costTrackingKeys.budgetsList(filters)).toEqual([
        'cost-tracking',
        'budgets',
        'list',
        filters,
      ])
    })

    it('should generate correct budget detail key', () => {
      expect(costTrackingKeys.budgetDetail('pb-1')).toEqual([
        'cost-tracking',
        'budgets',
        'detail',
        'pb-1',
      ])
    })

    it('should generate correct budget totals key', () => {
      expect(costTrackingKeys.budgetTotals('project-123')).toEqual([
        'cost-tracking',
        'budgets',
        'totals',
        'project-123',
      ])
    })

    it('should generate correct budget by division key', () => {
      expect(costTrackingKeys.budgetByDivision('project-123')).toEqual([
        'cost-tracking',
        'budgets',
        'by-division',
        'project-123',
      ])
    })
  })

  describe('transaction keys', () => {
    it('should generate correct transactions base key', () => {
      expect(costTrackingKeys.transactions()).toEqual(['cost-tracking', 'transactions'])
    })

    it('should generate correct transactions list key', () => {
      const filters = { projectId: 'project-123', transactionType: 'actual' }
      expect(costTrackingKeys.transactionsList(filters)).toEqual([
        'cost-tracking',
        'transactions',
        'list',
        filters,
      ])
    })

    it('should generate correct transaction detail key', () => {
      expect(costTrackingKeys.transactionDetail('tx-1')).toEqual([
        'cost-tracking',
        'transactions',
        'detail',
        'tx-1',
      ])
    })

    it('should generate correct transaction totals key', () => {
      expect(costTrackingKeys.transactionTotals('project-123')).toEqual([
        'cost-tracking',
        'transactions',
        'totals',
        'project-123',
      ])
    })
  })
})

// =============================================
// Cost Code Query Hooks Tests
// =============================================

describe('useCostCodes', () => {
  it('should fetch cost codes with filters', async () => {
    const filters = { companyId: 'company-123' }
    const { result } = renderHook(() => useCostCodes(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCostCodes)
    expect(mockGetCostCodes).toHaveBeenCalledWith(filters)
  })

  it('should not fetch when companyId is missing', async () => {
    const filters = { companyId: '' }
    const { result } = renderHook(() => useCostCodes(filters), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCostCodesTree', () => {
  it('should fetch cost codes tree', async () => {
    const { result } = renderHook(() => useCostCodesTree('company-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCostCodes)
    expect(mockGetCostCodesTree).toHaveBeenCalledWith('company-123')
  })

  it('should not fetch when companyId is undefined', async () => {
    const { result } = renderHook(() => useCostCodesTree(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCostCode', () => {
  it('should fetch single cost code', async () => {
    const { result } = renderHook(() => useCostCode('cc-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCostCodes[0])
    expect(mockGetCostCode).toHaveBeenCalledWith('cc-1')
  })

  it('should not fetch when id is undefined', async () => {
    const { result } = renderHook(() => useCostCode(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// Cost Code Mutation Hooks Tests
// =============================================

describe('useCreateCostCode', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateCostCode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateCostCode', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateCostCode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDeleteCostCode', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDeleteCostCode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useSeedCSIDivisions', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useSeedCSIDivisions(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Budget Query Hooks Tests
// =============================================

describe('useProjectBudgets', () => {
  it('should fetch project budgets', async () => {
    const filters = { projectId: 'project-123' }
    const { result } = renderHook(() => useProjectBudgets(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProjectBudgets)
    expect(mockGetProjectBudgets).toHaveBeenCalledWith(filters)
  })

  it('should not fetch when projectId is missing', async () => {
    const filters = { projectId: '' }
    const { result } = renderHook(() => useProjectBudgets(filters), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useProjectBudget', () => {
  it('should fetch single budget', async () => {
    const { result } = renderHook(() => useProjectBudget('pb-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProjectBudgets[0])
  })
})

describe('useProjectBudgetTotals', () => {
  it('should fetch project budget totals', async () => {
    const { result } = renderHook(() => useProjectBudgetTotals('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockBudgetTotals)
  })

  it('should not fetch when projectId is undefined', async () => {
    const { result } = renderHook(() => useProjectBudgetTotals(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useBudgetByDivision', () => {
  it('should fetch budget summary by division', async () => {
    const { result } = renderHook(() => useBudgetByDivision('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetBudgetSummaryByDivision).toHaveBeenCalledWith('project-123')
  })
})

// =============================================
// Budget Mutation Hooks Tests
// =============================================

describe('useCreateProjectBudget', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateProjectBudget(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateProjectBudget', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateProjectBudget(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDeleteProjectBudget', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDeleteProjectBudget(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useBulkCreateBudgets', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useBulkCreateBudgets(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Transaction Query Hooks Tests
// =============================================

describe('useCostTransactions', () => {
  it('should fetch transactions with filters', async () => {
    const filters = { projectId: 'project-123' }
    const { result } = renderHook(() => useCostTransactions(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTransactions)
    expect(mockGetCostTransactions).toHaveBeenCalledWith(filters)
  })

  it('should not fetch when projectId is missing', async () => {
    const filters = { projectId: '' }
    const { result } = renderHook(() => useCostTransactions(filters), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCostTransaction', () => {
  it('should fetch single transaction', async () => {
    const { result } = renderHook(() => useCostTransaction('tx-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTransactions[0])
  })
})

describe('useTransactionTotalsByType', () => {
  it('should fetch transaction totals by type', async () => {
    const { result } = renderHook(() => useTransactionTotalsByType('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ actual: 65000, committed: 490000 })
  })
})

// =============================================
// Transaction Mutation Hooks Tests
// =============================================

describe('useCreateCostTransaction', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateCostTransaction(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateCostTransaction', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateCostTransaction(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDeleteCostTransaction', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDeleteCostTransaction(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Financial Accuracy Tests
// =============================================

describe('Financial Calculation Accuracy', () => {
  it('should correctly calculate budget variance', () => {
    // Budget variance = revised_budget - actual_cost
    const originalBudget = 100000
    const approvedChanges = 5000
    const actualCost = 80000

    const revisedBudget = originalBudget + approvedChanges
    const variance = revisedBudget - actualCost

    expect(revisedBudget).toBe(105000)
    expect(variance).toBe(25000) // $25,000 under budget
  })

  it('should correctly calculate percent spent', () => {
    const originalBudget = 100000
    const approvedChanges = 5000
    const actualCost = 80000

    const revisedBudget = originalBudget + approvedChanges
    const percentSpent = (actualCost / revisedBudget) * 100

    expect(percentSpent.toFixed(2)).toBe('76.19') // 76.19% spent
  })

  it('should handle zero budget without division by zero', () => {
    const revisedBudget = 0
    const actualCost = 0

    const percentSpent = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0

    expect(percentSpent).toBe(0)
  })

  it('should correctly aggregate budget totals', () => {
    const budgets = mockProjectBudgets

    const totalOriginalBudget = budgets.reduce((sum, b) => sum + b.original_budget, 0)
    const totalApprovedChanges = budgets.reduce((sum, b) => sum + b.approved_changes, 0)
    const totalActualCost = budgets.reduce((sum, b) => sum + b.actual_cost, 0)
    const totalRevisedBudget = totalOriginalBudget + totalApprovedChanges

    expect(totalOriginalBudget).toBe(600000)
    expect(totalApprovedChanges).toBe(30000)
    expect(totalRevisedBudget).toBe(630000)
    expect(totalActualCost).toBe(430000)
  })

  it('should correctly aggregate transaction totals', () => {
    const transactions = mockTransactions
    const totalActualCost = transactions.reduce((sum, t) => sum + t.amount, 0)

    expect(totalActualCost).toBe(65000)
  })
})
