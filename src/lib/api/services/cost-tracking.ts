// @ts-nocheck
/**
 * Cost Tracking API Service
 *
 * Comprehensive cost tracking with:
 * - CSI MasterFormat cost codes
 * - Project budget management
 * - Cost transaction tracking
 * - Budget summary and analytics
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'

import type {
  CostCode,
  CostCodeWithChildren,
  ProjectBudget,
  ProjectBudgetWithDetails,
  CostTransaction,
  CostTransactionWithDetails,
  CreateCostCodeDTO,
  UpdateCostCodeDTO,
  CreateProjectBudgetDTO,
  UpdateProjectBudgetDTO,
  CreateCostTransactionDTO,
  UpdateCostTransactionDTO,
  CostCodeFilters,
  ProjectBudgetFilters,
  CostTransactionFilters,
  ProjectBudgetTotals,
  BudgetSummaryByDivision,
} from '@/types/cost-tracking'

// Using extended Database types for tables not yet in generated types
// The explicit `: any` type annotation fully bypasses TypeScript type checking for db operations
const db: any = supabase

// Internal types for callback parameters
interface BudgetRow {
  original_budget: number | null
  approved_changes: number | null
  committed_cost: number | null
  actual_cost: number | null
}

interface TransactionRow {
  transaction_type: string
  amount: number | null
}

// ============================================================================
// COST CODES
// ============================================================================

export const costCodesApi = {
  /**
   * Get all cost codes for a company with optional filters
   */
  async getCostCodes(filters: CostCodeFilters): Promise<CostCode[]> {
    let query = db
      .from('cost_codes')
      .select('*')
      .eq('company_id', filters.companyId)
      .is('deleted_at', null)
      .order('code', { ascending: true })

    if (filters.division) {
      query = query.eq('division', filters.division)
    }
    if (filters.level !== undefined) {
      query = query.eq('level', filters.level)
    }
    if (filters.costType) {
      query = query.eq('cost_type', filters.costType)
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }
    if (filters.parentCodeId) {
      query = query.eq('parent_code_id', filters.parentCodeId)
    }
    if (filters.search) {
      query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    return data || []
  },

  /**
   * Get cost codes as hierarchical tree
   */
  async getCostCodesTree(companyId: string): Promise<CostCodeWithChildren[]> {
    const { data, error } = await db
      .from('cost_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('code', { ascending: true })

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    if (!data) {return []}

    // Build tree structure
    const codeMap = new Map<string, CostCodeWithChildren>()
    const roots: CostCodeWithChildren[] = []

    // First pass: create map of all codes
    data.forEach((code: CostCode) => {
      codeMap.set(code.id, { ...code, children: [] })
    })

    // Second pass: build tree
    data.forEach((code: CostCode) => {
      const node = codeMap.get(code.id)!
      if (code.parent_code_id && codeMap.has(code.parent_code_id)) {
        const parent = codeMap.get(code.parent_code_id)!
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  },

  /**
   * Get a single cost code by ID
   */
  async getCostCode(id: string): Promise<CostCode> {
    const { data, error } = await db
      .from('cost_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    return data
  },

  /**
   * Create a new cost code
   */
  async createCostCode(dto: CreateCostCodeDTO): Promise<CostCode> {
    const { data, error } = await db
      .from('cost_codes')
      .insert({
        company_id: dto.company_id,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        parent_code_id: dto.parent_code_id || null,
        level: dto.level || 1,
        division: dto.division || null,
        section: dto.section || null,
        cost_type: dto.cost_type || 'direct',
        is_active: dto.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'CREATE_ERROR')
    }

    return data
  },

  /**
   * Update a cost code
   */
  async updateCostCode(id: string, dto: UpdateCostCodeDTO): Promise<CostCode> {
    const { data, error } = await db
      .from('cost_codes')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR')
    }

    return data
  },

  /**
   * Soft delete a cost code
   */
  async deleteCostCode(id: string): Promise<void> {
    const { error } = await db
      .from('cost_codes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new ApiErrorClass(error.message, 'DELETE_ERROR')
    }
  },

  /**
   * Seed CSI divisions for a company
   */
  async seedCSIDivisions(companyId: string): Promise<number> {
    const { data, error } = await db
      .rpc('seed_csi_divisions_for_company', { p_company_id: companyId })

    if (error) {
      throw new ApiErrorClass(error.message, 'SEED_ERROR')
    }

    return data || 0
  },
}

// ============================================================================
// PROJECT BUDGETS
// ============================================================================

export const projectBudgetsApi = {
  /**
   * Get all budgets for a project with cost code details
   */
  async getProjectBudgets(filters: ProjectBudgetFilters): Promise<ProjectBudgetWithDetails[]> {
    let query = db
      .from('project_budget_summary')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('cost_code', { ascending: true })

    if (filters.costCodeId) {
      query = query.eq('cost_code_id', filters.costCodeId)
    }
    if (filters.division) {
      query = query.eq('division', filters.division)
    }
    if (filters.hasVariance === true) {
      query = query.lt('variance', 0)  // Over budget
    } else if (filters.hasVariance === false) {
      query = query.gte('variance', 0)  // Under budget
    }

    const { data, error } = await query

    if (error) {
      // View might not exist yet, fall back to join query
      return this.getProjectBudgetsWithJoin(filters)
    }

    return data || []
  },

  /**
   * Fallback method using explicit join (if view doesn't exist)
   */
  async getProjectBudgetsWithJoin(filters: ProjectBudgetFilters): Promise<ProjectBudgetWithDetails[]> {
    let query = db
      .from('project_budgets')
      .select(`
        *,
        cost_codes!inner(
          code,
          name,
          division
        )
      `)
      .eq('project_id', filters.projectId)

    if (filters.costCodeId) {
      query = query.eq('cost_code_id', filters.costCodeId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    // Transform to ProjectBudgetWithDetails
    return (data || []).map((item: any) => ({
      ...item,
      cost_code: item.cost_codes.code,
      cost_code_name: item.cost_codes.name,
      division: item.cost_codes.division,
      revised_budget: (item.original_budget || 0) + (item.approved_changes || 0),
      variance: ((item.original_budget || 0) + (item.approved_changes || 0)) - (item.actual_cost || 0),
      percent_spent: item.original_budget + (item.approved_changes || 0) > 0
        ? ((item.actual_cost || 0) / (item.original_budget + (item.approved_changes || 0))) * 100
        : 0,
    }))
  },

  /**
   * Get a single budget entry by ID
   */
  async getProjectBudget(id: string): Promise<ProjectBudgetWithDetails> {
    const { data, error } = await db
      .from('project_budgets')
      .select(`
        *,
        cost_codes(code, name, division)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    const item = data as any
    return {
      ...item,
      cost_code: item.cost_codes.code,
      cost_code_name: item.cost_codes.name,
      division: item.cost_codes.division,
      revised_budget: (item.original_budget || 0) + (item.approved_changes || 0),
      variance: ((item.original_budget || 0) + (item.approved_changes || 0)) - (item.actual_cost || 0),
      percent_spent: item.original_budget + (item.approved_changes || 0) > 0
        ? ((item.actual_cost || 0) / (item.original_budget + (item.approved_changes || 0))) * 100
        : 0,
    }
  },

  /**
   * Get project budget totals
   */
  async getProjectBudgetTotals(projectId: string): Promise<ProjectBudgetTotals> {
    const { data, error } = await db
      .rpc('get_project_budget_totals', { p_project_id: projectId })

    if (error) {
      // Fallback calculation if function doesn't exist
      return this.calculateProjectBudgetTotals(projectId)
    }

    if (!data || data.length === 0) {
      return {
        total_original_budget: 0,
        total_approved_changes: 0,
        total_revised_budget: 0,
        total_committed_cost: 0,
        total_actual_cost: 0,
        total_variance: 0,
        budget_count: 0,
      }
    }

    return data[0]
  },

  /**
   * Fallback method to calculate totals
   */
  async calculateProjectBudgetTotals(projectId: string): Promise<ProjectBudgetTotals> {
    const { data, error } = await db
      .from('project_budgets')
      .select('original_budget, approved_changes, committed_cost, actual_cost')
      .eq('project_id', projectId)

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    const budgets: BudgetRow[] = data || []
    return {
      total_original_budget: budgets.reduce((sum: number, b: BudgetRow) => sum + (b.original_budget || 0), 0),
      total_approved_changes: budgets.reduce((sum: number, b: BudgetRow) => sum + (b.approved_changes || 0), 0),
      total_revised_budget: budgets.reduce((sum: number, b: BudgetRow) => sum + (b.original_budget || 0) + (b.approved_changes || 0), 0),
      total_committed_cost: budgets.reduce((sum: number, b: BudgetRow) => sum + (b.committed_cost || 0), 0),
      total_actual_cost: budgets.reduce((sum: number, b: BudgetRow) => sum + (b.actual_cost || 0), 0),
      total_variance: budgets.reduce((sum: number, b: BudgetRow) => {
        const revised = (b.original_budget || 0) + (b.approved_changes || 0)
        return sum + (revised - (b.actual_cost || 0))
      }, 0),
      budget_count: budgets.length,
    }
  },

  /**
   * Get budget summary grouped by division
   */
  async getBudgetSummaryByDivision(projectId: string): Promise<BudgetSummaryByDivision[]> {
    const { data, error } = await db
      .from('project_budgets')
      .select(`
        original_budget,
        approved_changes,
        actual_cost,
        cost_codes!inner(division, name)
      `)
      .eq('project_id', projectId)

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    // Group by division
    const divisionMap = new Map<string, BudgetSummaryByDivision>()

    ;(data || []).forEach((item: any) => {
      const division = item.cost_codes.division || 'Unknown'
      const existing = divisionMap.get(division) || {
        division,
        division_name: item.cost_codes.name,
        original_budget: 0,
        revised_budget: 0,
        actual_cost: 0,
        variance: 0,
        percent_spent: 0,
      }

      existing.original_budget += item.original_budget || 0
      const revised = (item.original_budget || 0) + (item.approved_changes || 0)
      existing.revised_budget += revised
      existing.actual_cost += item.actual_cost || 0

      divisionMap.set(division, existing)
    })

    // Calculate variance and percent for each division
    return Array.from(divisionMap.values()).map((div) => ({
      ...div,
      variance: div.revised_budget - div.actual_cost,
      percent_spent: div.revised_budget > 0 ? (div.actual_cost / div.revised_budget) * 100 : 0,
    })).sort((a, b) => a.division.localeCompare(b.division))
  },

  /**
   * Create a new budget entry
   */
  async createProjectBudget(dto: CreateProjectBudgetDTO): Promise<ProjectBudget> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await db
      .from('project_budgets')
      .insert({
        project_id: dto.project_id,
        cost_code_id: dto.cost_code_id,
        original_budget: dto.original_budget,
        approved_changes: dto.approved_changes || 0,
        committed_cost: dto.committed_cost || 0,
        actual_cost: dto.actual_cost || 0,
        estimated_cost_at_completion: dto.estimated_cost_at_completion || null,
        notes: dto.notes || null,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'CREATE_ERROR')
    }

    return data
  },

  /**
   * Update a budget entry
   */
  async updateProjectBudget(id: string, dto: UpdateProjectBudgetDTO): Promise<ProjectBudget> {
    const { data, error } = await db
      .from('project_budgets')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR')
    }

    return data
  },

  /**
   * Delete a budget entry
   */
  async deleteProjectBudget(id: string): Promise<void> {
    const { error } = await db
      .from('project_budgets')
      .delete()
      .eq('id', id)

    if (error) {
      throw new ApiErrorClass(error.message, 'DELETE_ERROR')
    }
  },

  /**
   * Bulk create budget entries
   */
  async bulkCreateBudgets(projectId: string, budgets: Omit<CreateProjectBudgetDTO, 'project_id'>[]): Promise<ProjectBudget[]> {
    const { data: user } = await supabase.auth.getUser()

    const inserts = budgets.map((b) => ({
      project_id: projectId,
      cost_code_id: b.cost_code_id,
      original_budget: b.original_budget,
      approved_changes: b.approved_changes || 0,
      committed_cost: b.committed_cost || 0,
      actual_cost: b.actual_cost || 0,
      estimated_cost_at_completion: b.estimated_cost_at_completion || null,
      notes: b.notes || null,
      created_by: user?.user?.id || null,
    }))

    const { data, error } = await db
      .from('project_budgets')
      .insert(inserts)
      .select()

    if (error) {
      throw new ApiErrorClass(error.message, 'CREATE_ERROR')
    }

    return data || []
  },
}

// ============================================================================
// COST TRANSACTIONS
// ============================================================================

export const costTransactionsApi = {
  /**
   * Get all transactions with optional filters
   */
  async getCostTransactions(filters: CostTransactionFilters): Promise<CostTransactionWithDetails[]> {
    let query = db
      .from('cost_transactions')
      .select(`
        *,
        cost_codes(id, code, name, division),
        subcontractors(id, name)
      `)
      .eq('project_id', filters.projectId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })

    if (filters.costCodeId) {
      query = query.eq('cost_code_id', filters.costCodeId)
    }
    if (filters.transactionType) {
      query = query.eq('transaction_type', filters.transactionType)
    }
    if (filters.sourceType) {
      query = query.eq('source_type', filters.sourceType)
    }
    if (filters.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('transaction_date', filters.dateTo)
    }
    if (filters.vendorName) {
      query = query.ilike('vendor_name', `%${filters.vendorName}%`)
    }
    if (filters.subcontractorId) {
      query = query.eq('subcontractor_id', filters.subcontractorId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    return (data || []).map((item: any) => ({
      ...item,
      cost_code: item.cost_codes,
      subcontractor: item.subcontractors,
    }))
  },

  /**
   * Get a single transaction by ID
   */
  async getCostTransaction(id: string): Promise<CostTransactionWithDetails> {
    const { data, error } = await db
      .from('cost_transactions')
      .select(`
        *,
        cost_codes(id, code, name, division),
        subcontractors(id, name),
        users!cost_transactions_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    const item = data as any
    return {
      ...item,
      cost_code: item.cost_codes,
      subcontractor: item.subcontractors,
      created_by_user: item.users,
    }
  },

  /**
   * Create a new transaction
   */
  async createCostTransaction(dto: CreateCostTransactionDTO): Promise<CostTransaction> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await db
      .from('cost_transactions')
      .insert({
        project_id: dto.project_id,
        cost_code_id: dto.cost_code_id,
        transaction_date: dto.transaction_date,
        description: dto.description,
        transaction_type: dto.transaction_type,
        source_type: dto.source_type || null,
        source_id: dto.source_id || null,
        amount: dto.amount,
        vendor_name: dto.vendor_name || null,
        subcontractor_id: dto.subcontractor_id || null,
        invoice_number: dto.invoice_number || null,
        po_number: dto.po_number || null,
        notes: dto.notes || null,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'CREATE_ERROR')
    }

    return data
  },

  /**
   * Update a transaction
   */
  async updateCostTransaction(id: string, dto: UpdateCostTransactionDTO): Promise<CostTransaction> {
    const { data, error } = await db
      .from('cost_transactions')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR')
    }

    return data
  },

  /**
   * Soft delete a transaction
   */
  async deleteCostTransaction(id: string): Promise<void> {
    const { error } = await db
      .from('cost_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new ApiErrorClass(error.message, 'DELETE_ERROR')
    }
  },

  /**
   * Get transaction totals by type for a project
   */
  async getTransactionTotalsByType(projectId: string): Promise<Record<string, number>> {
    const { data, error } = await db
      .from('cost_transactions')
      .select('transaction_type, amount')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR')
    }

    const totals: Record<string, number> = {}
    ;(data || []).forEach((t: TransactionRow) => {
      totals[t.transaction_type] = (totals[t.transaction_type] || 0) + (t.amount || 0)
    })

    return totals
  },
}

// Export combined API
export const costTrackingApi = {
  costCodes: costCodesApi,
  budgets: projectBudgetsApi,
  transactions: costTransactionsApi,
}
