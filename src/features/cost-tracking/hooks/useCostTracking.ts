/**
 * Cost Tracking React Query Hooks
 *
 * Query and mutation hooks for cost codes, project budgets, and cost transactions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { costTrackingApi } from '@/lib/api/services/cost-tracking'
import { useToast } from '@/components/ui/use-toast'
import type {
  CostCodeFilters,
  ProjectBudgetFilters,
  CostTransactionFilters,
  CreateCostCodeDTO,
  UpdateCostCodeDTO,
  CreateProjectBudgetDTO,
  UpdateProjectBudgetDTO,
  CreateCostTransactionDTO,
  UpdateCostTransactionDTO,
} from '@/types/cost-tracking'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const costTrackingKeys = {
  all: ['cost-tracking'] as const,

  // Cost Codes
  costCodes: () => [...costTrackingKeys.all, 'cost-codes'] as const,
  costCodesList: (filters: CostCodeFilters) => [...costTrackingKeys.costCodes(), 'list', filters] as const,
  costCodesTree: (companyId: string) => [...costTrackingKeys.costCodes(), 'tree', companyId] as const,
  costCodeDetail: (id: string) => [...costTrackingKeys.costCodes(), 'detail', id] as const,

  // Project Budgets
  budgets: () => [...costTrackingKeys.all, 'budgets'] as const,
  budgetsList: (filters: ProjectBudgetFilters) => [...costTrackingKeys.budgets(), 'list', filters] as const,
  budgetDetail: (id: string) => [...costTrackingKeys.budgets(), 'detail', id] as const,
  budgetTotals: (projectId: string) => [...costTrackingKeys.budgets(), 'totals', projectId] as const,
  budgetByDivision: (projectId: string) => [...costTrackingKeys.budgets(), 'by-division', projectId] as const,

  // Cost Transactions
  transactions: () => [...costTrackingKeys.all, 'transactions'] as const,
  transactionsList: (filters: CostTransactionFilters) => [...costTrackingKeys.transactions(), 'list', filters] as const,
  transactionDetail: (id: string) => [...costTrackingKeys.transactions(), 'detail', id] as const,
  transactionTotals: (projectId: string) => [...costTrackingKeys.transactions(), 'totals', projectId] as const,
}

// ============================================================================
// COST CODE HOOKS
// ============================================================================

/**
 * Get all cost codes with filters
 */
export function useCostCodes(filters: CostCodeFilters) {
  return useQuery({
    queryKey: costTrackingKeys.costCodesList(filters),
    queryFn: () => costTrackingApi.costCodes.getCostCodes(filters),
    enabled: !!filters.companyId,
  })
}

/**
 * Get cost codes as hierarchical tree
 */
export function useCostCodesTree(companyId: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.costCodesTree(companyId || ''),
    queryFn: () => costTrackingApi.costCodes.getCostCodesTree(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Get a single cost code
 */
export function useCostCode(id: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.costCodeDetail(id || ''),
    queryFn: () => costTrackingApi.costCodes.getCostCode(id!),
    enabled: !!id,
  })
}

/**
 * Create a cost code
 */
export function useCreateCostCode() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateCostCodeDTO) => costTrackingApi.costCodes.createCostCode(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.costCodes() })
      toast({
        title: 'Cost code created',
        description: `${data.code} - ${data.name} has been created.`,
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
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCostCodeDTO }) =>
      costTrackingApi.costCodes.updateCostCode(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.costCodes() })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.costCodeDetail(data.id) })
      toast({
        title: 'Cost code updated',
        description: 'Cost code has been updated.',
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
 * Delete a cost code
 */
export function useDeleteCostCode() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => costTrackingApi.costCodes.deleteCostCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.costCodes() })
      toast({
        title: 'Cost code deleted',
        description: 'Cost code has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete cost code.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Seed CSI divisions for a company
 */
export function useSeedCSIDivisions() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (companyId: string) => costTrackingApi.costCodes.seedCSIDivisions(companyId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.costCodes() })
      toast({
        title: 'CSI divisions seeded',
        description: `${count} cost codes have been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to seed CSI divisions.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// PROJECT BUDGET HOOKS
// ============================================================================

/**
 * Get all budgets for a project
 */
export function useProjectBudgets(filters: ProjectBudgetFilters) {
  return useQuery({
    queryKey: costTrackingKeys.budgetsList(filters),
    queryFn: () => costTrackingApi.budgets.getProjectBudgets(filters),
    enabled: !!filters.projectId,
  })
}

/**
 * Get a single budget entry
 */
export function useProjectBudget(id: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.budgetDetail(id || ''),
    queryFn: () => costTrackingApi.budgets.getProjectBudget(id!),
    enabled: !!id,
  })
}

/**
 * Get project budget totals
 */
export function useProjectBudgetTotals(projectId: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.budgetTotals(projectId || ''),
    queryFn: () => costTrackingApi.budgets.getProjectBudgetTotals(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get budget summary by division
 */
export function useBudgetByDivision(projectId: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.budgetByDivision(projectId || ''),
    queryFn: () => costTrackingApi.budgets.getBudgetSummaryByDivision(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a budget entry
 */
export function useCreateProjectBudget() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateProjectBudgetDTO) => costTrackingApi.budgets.createProjectBudget(dto),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      toast({
        title: 'Budget created',
        description: 'Budget entry has been created.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create budget entry.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a budget entry
 */
export function useUpdateProjectBudget() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProjectBudgetDTO }) =>
      costTrackingApi.budgets.updateProjectBudget(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgetDetail(data.id) })
      toast({
        title: 'Budget updated',
        description: 'Budget entry has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update budget entry.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a budget entry
 */
export function useDeleteProjectBudget() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => costTrackingApi.budgets.deleteProjectBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      toast({
        title: 'Budget deleted',
        description: 'Budget entry has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete budget entry.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Bulk create budget entries
 */
export function useBulkCreateBudgets() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ projectId, budgets }: { projectId: string; budgets: Omit<CreateProjectBudgetDTO, 'project_id'>[] }) =>
      costTrackingApi.budgets.bulkCreateBudgets(projectId, budgets),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      toast({
        title: 'Budgets created',
        description: `${data.length} budget entries have been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create budget entries.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// COST TRANSACTION HOOKS
// ============================================================================

/**
 * Get all transactions with filters
 */
export function useCostTransactions(filters: CostTransactionFilters) {
  return useQuery({
    queryKey: costTrackingKeys.transactionsList(filters),
    queryFn: () => costTrackingApi.transactions.getCostTransactions(filters),
    enabled: !!filters.projectId,
  })
}

/**
 * Get a single transaction
 */
export function useCostTransaction(id: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.transactionDetail(id || ''),
    queryFn: () => costTrackingApi.transactions.getCostTransaction(id!),
    enabled: !!id,
  })
}

/**
 * Get transaction totals by type
 */
export function useTransactionTotalsByType(projectId: string | undefined) {
  return useQuery({
    queryKey: costTrackingKeys.transactionTotals(projectId || ''),
    queryFn: () => costTrackingApi.transactions.getTransactionTotalsByType(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a transaction
 */
export function useCreateCostTransaction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateCostTransactionDTO) => costTrackingApi.transactions.createCostTransaction(dto),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })  // Budgets are auto-updated
      toast({
        title: 'Transaction created',
        description: 'Cost transaction has been recorded.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transaction.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a transaction
 */
export function useUpdateCostTransaction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCostTransactionDTO }) =>
      costTrackingApi.transactions.updateCostTransaction(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.transactionDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      toast({
        title: 'Transaction updated',
        description: 'Cost transaction has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transaction.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a transaction
 */
export function useDeleteCostTransaction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => costTrackingApi.transactions.deleteCostTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: costTrackingKeys.budgets() })
      toast({
        title: 'Transaction deleted',
        description: 'Cost transaction has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction.',
        variant: 'destructive',
      })
    },
  })
}
