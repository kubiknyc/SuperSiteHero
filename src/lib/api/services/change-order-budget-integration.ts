/**
 * Change Order → Budget Integration Service
 *
 * Automatically adjusts project budgets when change orders are approved.
 * Creates cost transactions for audit trail.
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'

import { logger } from '../../utils/logger';


// Using extended Database types for tables not yet in generated types
const db: any = supabase

// ============================================================================
// TYPES
// ============================================================================

export interface COBudgetAdjustment {
  cost_code_id: string
  amount: number
  description: string
}

export interface COBudgetAdjustmentResult {
  change_order_id: string
  co_number: number
  project_id: string
  total_adjusted: number
  adjustments: Array<{
    cost_code_id: string
    cost_code: string
    budget_id: string
    amount: number
    transaction_id: string
  }>
  created_budgets: number
  updated_budgets: number
}

// ============================================================================
// BUDGET ADJUSTMENT SERVICE
// ============================================================================

export const changeOrderBudgetIntegration = {
  /**
   * Apply budget adjustments when a change order is approved.
   *
   * This function:
   * 1. Gets all CO items with cost codes
   * 2. For each cost code, finds or creates the project budget
   * 3. Increments approved_changes by the item amount
   * 4. Creates a cost transaction for audit trail
   *
   * @param changeOrderId - The approved change order ID
   * @param approvedAmount - The total approved amount (for validation)
   * @returns Result summary of all adjustments made
   */
  async applyBudgetAdjustments(
    changeOrderId: string,
    approvedAmount: number
  ): Promise<COBudgetAdjustmentResult> {
    // Get the change order with items
    const { data: changeOrder, error: coError } = await db
      .from('change_orders')
      .select(`
        id,
        co_number,
        project_id,
        company_id,
        title,
        approved_amount,
        items:change_order_items(
          id,
          cost_code_id,
          total_amount,
          description,
          cost_code:cost_codes(id, code, name)
        )
      `)
      .eq('id', changeOrderId)
      .single()

    if (coError) {
      throw new ApiErrorClass(`Failed to fetch change order: ${coError.message}`, 'FETCH_ERROR')
    }

    if (!changeOrder) {
      throw new ApiErrorClass('Change order not found', 'NOT_FOUND')
    }

    const result: COBudgetAdjustmentResult = {
      change_order_id: changeOrder.id,
      co_number: changeOrder.co_number,
      project_id: changeOrder.project_id,
      total_adjusted: 0,
      adjustments: [],
      created_budgets: 0,
      updated_budgets: 0,
    }

    // Group items by cost code
    const itemsByCostCode = new Map<string, {
      cost_code_id: string
      cost_code: string
      total: number
      descriptions: string[]
    }>()

    for (const item of changeOrder.items || []) {
      if (!item.cost_code_id || !item.total_amount) {continue}

      const existing = itemsByCostCode.get(item.cost_code_id)
      if (existing) {
        existing.total += item.total_amount
        existing.descriptions.push(item.description || '')
      } else {
        itemsByCostCode.set(item.cost_code_id, {
          cost_code_id: item.cost_code_id,
          cost_code: item.cost_code?.code || 'Unknown',
          total: item.total_amount,
          descriptions: [item.description || ''],
        })
      }
    }

    // If no items have cost codes, create a single adjustment for "unallocated"
    // This ensures the budget impact is still tracked even without cost code breakdown
    if (itemsByCostCode.size === 0 && approvedAmount > 0) {
      // Try to find or create a general/overhead cost code
      const { data: generalCode } = await db
        .from('cost_codes')
        .select('id, code')
        .eq('company_id', changeOrder.company_id)
        .or('code.eq.00-00-00,code.eq.01-00-00,code.ilike.%general%')
        .limit(1)
        .single()

      if (generalCode) {
        itemsByCostCode.set(generalCode.id, {
          cost_code_id: generalCode.id,
          cost_code: generalCode.code,
          total: approvedAmount,
          descriptions: [`CO-${changeOrder.co_number}: ${changeOrder.title} (unallocated)`],
        })
      }
    }

    // Process each cost code
    for (const [costCodeId, data] of itemsByCostCode) {
      // Find existing budget for this project + cost code
      const { data: existingBudget } = await db
        .from('project_budgets')
        .select('id, original_budget, approved_changes')
        .eq('project_id', changeOrder.project_id)
        .eq('cost_code_id', costCodeId)
        .single()

      let budgetId: string

      if (existingBudget) {
        // Update existing budget - increment approved_changes
        const newApprovedChanges = (existingBudget.approved_changes || 0) + data.total

        const { error: updateError } = await db
          .from('project_budgets')
          .update({
            approved_changes: newApprovedChanges,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBudget.id)

        if (updateError) {
          logger.error(`Failed to update budget ${existingBudget.id}:`, updateError)
          continue
        }

        budgetId = existingBudget.id
        result.updated_budgets++
      } else {
        // Create new budget line with the CO amount as approved_changes
        const { data: newBudget, error: createError } = await db
          .from('project_budgets')
          .insert({
            project_id: changeOrder.project_id,
            cost_code_id: costCodeId,
            original_budget: 0, // No original budget - this is all from CO
            approved_changes: data.total,
            committed_cost: 0,
            actual_cost: 0,
            notes: `Created from CO-${changeOrder.co_number}`,
          })
          .select()
          .single()

        if (createError) {
          logger.error(`Failed to create budget for cost code ${costCodeId}:`, createError)
          continue
        }

        budgetId = newBudget.id
        result.created_budgets++
      }

      // Create cost transaction for audit trail
      const { data: transaction, error: txError } = await db
        .from('cost_transactions')
        .insert({
          project_id: changeOrder.project_id,
          cost_code_id: costCodeId,
          transaction_date: new Date().toISOString().split('T')[0],
          description: `CO-${changeOrder.co_number}: ${data.descriptions.join('; ')}`.substring(0, 500),
          transaction_type: 'adjustment',
          source_type: 'change_order',
          source_id: changeOrder.id,
          amount: data.total,
          notes: `Approved change order adjustment`,
        })
        .select()
        .single()

      if (txError) {
        logger.error(`Failed to create transaction:`, txError)
      }

      result.adjustments.push({
        cost_code_id: costCodeId,
        cost_code: data.cost_code,
        budget_id: budgetId,
        amount: data.total,
        transaction_id: transaction?.id || '',
      })

      result.total_adjusted += data.total
    }

    // Log the adjustment in change order history
    await db
      .from('change_order_history')
      .insert({
        change_order_id: changeOrderId,
        action: 'budget_adjusted',
        field_changed: 'budget_integration',
        old_value: null,
        new_value: JSON.stringify({
          total_adjusted: result.total_adjusted,
          adjustments_count: result.adjustments.length,
          created_budgets: result.created_budgets,
          updated_budgets: result.updated_budgets,
        }),
        notes: `Budget automatically adjusted: $${result.total_adjusted.toLocaleString()} across ${result.adjustments.length} cost code(s)`,
      })

    return result
  },

  /**
   * Reverse budget adjustments when a change order is voided or rejected after approval.
   *
   * This is the inverse of applyBudgetAdjustments - it decrements the approved_changes
   * and creates reversal transactions.
   */
  async reverseBudgetAdjustments(changeOrderId: string): Promise<COBudgetAdjustmentResult> {
    // Get the change order with items
    const { data: changeOrder, error: coError } = await db
      .from('change_orders')
      .select(`
        id,
        co_number,
        project_id,
        company_id,
        title,
        approved_amount,
        items:change_order_items(
          id,
          cost_code_id,
          total_amount,
          description,
          cost_code:cost_codes(id, code, name)
        )
      `)
      .eq('id', changeOrderId)
      .single()

    if (coError || !changeOrder) {
      throw new ApiErrorClass('Change order not found', 'NOT_FOUND')
    }

    const result: COBudgetAdjustmentResult = {
      change_order_id: changeOrder.id,
      co_number: changeOrder.co_number,
      project_id: changeOrder.project_id,
      total_adjusted: 0,
      adjustments: [],
      created_budgets: 0,
      updated_budgets: 0,
    }

    // Group items by cost code (same as apply)
    const itemsByCostCode = new Map<string, {
      cost_code_id: string
      cost_code: string
      total: number
    }>()

    for (const item of changeOrder.items || []) {
      if (!item.cost_code_id || !item.total_amount) {continue}

      const existing = itemsByCostCode.get(item.cost_code_id)
      if (existing) {
        existing.total += item.total_amount
      } else {
        itemsByCostCode.set(item.cost_code_id, {
          cost_code_id: item.cost_code_id,
          cost_code: item.cost_code?.code || 'Unknown',
          total: item.total_amount,
        })
      }
    }

    // Process each cost code - DECREMENT this time
    for (const [costCodeId, data] of itemsByCostCode) {
      const { data: existingBudget } = await db
        .from('project_budgets')
        .select('id, approved_changes')
        .eq('project_id', changeOrder.project_id)
        .eq('cost_code_id', costCodeId)
        .single()

      if (!existingBudget) {continue}

      // Decrement approved_changes
      const newApprovedChanges = Math.max(0, (existingBudget.approved_changes || 0) - data.total)

      await db
        .from('project_budgets')
        .update({
          approved_changes: newApprovedChanges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBudget.id)

      // Create reversal transaction
      const { data: transaction } = await db
        .from('cost_transactions')
        .insert({
          project_id: changeOrder.project_id,
          cost_code_id: costCodeId,
          transaction_date: new Date().toISOString().split('T')[0],
          description: `REVERSAL: CO-${changeOrder.co_number} voided/rejected`,
          transaction_type: 'adjustment',
          source_type: 'change_order',
          source_id: changeOrder.id,
          amount: -data.total, // Negative amount for reversal
          notes: `Change order voided or rejected after approval`,
        })
        .select()
        .single()

      result.adjustments.push({
        cost_code_id: costCodeId,
        cost_code: data.cost_code,
        budget_id: existingBudget.id,
        amount: -data.total,
        transaction_id: transaction?.id || '',
      })

      result.total_adjusted -= data.total
      result.updated_budgets++
    }

    // Log the reversal in change order history
    await db
      .from('change_order_history')
      .insert({
        change_order_id: changeOrderId,
        action: 'budget_reversed',
        field_changed: 'budget_integration',
        old_value: null,
        new_value: JSON.stringify({
          total_reversed: Math.abs(result.total_adjusted),
          adjustments_count: result.adjustments.length,
        }),
        notes: `Budget adjustments reversed: $${Math.abs(result.total_adjusted).toLocaleString()}`,
      })

    return result
  },

  /**
   * Check if a change order has already been processed for budget adjustments.
   * This prevents double-counting if the approval is triggered multiple times.
   */
  async hasBeenProcessed(changeOrderId: string): Promise<boolean> {
    const { data } = await db
      .from('change_order_history')
      .select('id')
      .eq('change_order_id', changeOrderId)
      .eq('action', 'budget_adjusted')
      .limit(1)

    return (data?.length || 0) > 0
  },

  /**
   * Get the budget impact summary for a change order (before approval).
   * Useful for showing the user what budget changes will occur.
   */
  async previewBudgetImpact(changeOrderId: string): Promise<{
    items: Array<{
      cost_code_id: string
      cost_code: string
      cost_code_name: string
      amount: number
      current_budget: number
      new_budget: number
    }>
    total: number
    affected_cost_codes: number
    new_budget_lines: number
  }> {
    const { data: changeOrder } = await db
      .from('change_orders')
      .select(`
        id,
        project_id,
        items:change_order_items(
          cost_code_id,
          total_amount,
          cost_code:cost_codes(id, code, name)
        )
      `)
      .eq('id', changeOrderId)
      .single()

    if (!changeOrder) {
      throw new ApiErrorClass('Change order not found', 'NOT_FOUND')
    }

    const preview = {
      items: [] as Array<{
        cost_code_id: string
        cost_code: string
        cost_code_name: string
        amount: number
        current_budget: number
        new_budget: number
      }>,
      total: 0,
      affected_cost_codes: 0,
      new_budget_lines: 0,
    }

    // Group by cost code
    const itemsByCostCode = new Map<string, {
      cost_code_id: string
      cost_code: string
      cost_code_name: string
      total: number
    }>()

    for (const item of changeOrder.items || []) {
      if (!item.cost_code_id || !item.total_amount) {continue}

      const existing = itemsByCostCode.get(item.cost_code_id)
      if (existing) {
        existing.total += item.total_amount
      } else {
        itemsByCostCode.set(item.cost_code_id, {
          cost_code_id: item.cost_code_id,
          cost_code: item.cost_code?.code || 'Unknown',
          cost_code_name: item.cost_code?.name || 'Unknown',
          total: item.total_amount,
        })
      }
    }

    for (const [costCodeId, data] of itemsByCostCode) {
      const { data: existingBudget } = await db
        .from('project_budgets')
        .select('original_budget, approved_changes')
        .eq('project_id', changeOrder.project_id)
        .eq('cost_code_id', costCodeId)
        .single()

      const currentBudget = existingBudget
        ? (existingBudget.original_budget || 0) + (existingBudget.approved_changes || 0)
        : 0

      preview.items.push({
        cost_code_id: costCodeId,
        cost_code: data.cost_code,
        cost_code_name: data.cost_code_name,
        amount: data.total,
        current_budget: currentBudget,
        new_budget: currentBudget + data.total,
      })

      preview.total += data.total
      preview.affected_cost_codes++

      if (!existingBudget) {
        preview.new_budget_lines++
      }
    }

    return preview
  },
}

export default changeOrderBudgetIntegration
