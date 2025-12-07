// File: /src/lib/api/services/cost-estimates.ts
// API service for cost estimates CRUD operations

import { supabase } from '@/lib/supabase'
import type {
  CostEstimate,
  CostEstimateInsert,
  CostEstimateUpdate,
  CostEstimateItem,
  CostEstimateItemInsert,
  CostEstimateItemUpdate,
} from '@/types/database-extensions'
import { ApiErrorClass } from '../errors'

export interface CostEstimateWithItems extends CostEstimate {
  items: CostEstimateItem[]
}

export const costEstimatesApi = {
  /**
   * Get all cost estimates for a project
   */
  async getProjectEstimates(projectId: string): Promise<CostEstimate[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimates')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ESTIMATES_ERROR',
          message: error.message,
        })
      }

      return data ?? []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ESTIMATES_ERROR',
            message: 'Failed to fetch cost estimates',
          })
    }
  },

  /**
   * Get a single cost estimate with its line items
   */
  async getEstimateById(estimateId: string): Promise<CostEstimateWithItems | null> {
    try {
      const { data: estimate, error: estimateError } = await (supabase as any)
        .from('cost_estimates')
        .select('*')
        .eq('id', estimateId)
        .is('deleted_at', null)
        .single()

      if (estimateError) {
        throw new ApiErrorClass({
          code: 'FETCH_ESTIMATE_ERROR',
          message: estimateError.message,
        })
      }

      if (!estimate) return null

      const { data: items, error: itemsError } = await (supabase as any)
        .from('cost_estimate_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        throw new ApiErrorClass({
          code: 'FETCH_ESTIMATE_ITEMS_ERROR',
          message: itemsError.message,
        })
      }

      return {
        ...estimate,
        items: items ?? [],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ESTIMATE_ERROR',
            message: 'Failed to fetch cost estimate',
          })
    }
  },

  /**
   * Create a new cost estimate
   */
  async createEstimate(estimate: CostEstimateInsert): Promise<CostEstimate> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimates')
        .insert(estimate)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_ESTIMATE_ERROR',
          message: error.message,
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_ESTIMATE_ERROR',
            message: 'Failed to create cost estimate',
          })
    }
  },

  /**
   * Update a cost estimate
   */
  async updateEstimate(
    estimateId: string,
    updates: CostEstimateUpdate
  ): Promise<CostEstimate> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', estimateId)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_ESTIMATE_ERROR',
          message: error.message,
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ESTIMATE_ERROR',
            message: 'Failed to update cost estimate',
          })
    }
  },

  /**
   * Delete a cost estimate (soft delete)
   */
  async deleteEstimate(estimateId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('cost_estimates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', estimateId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_ESTIMATE_ERROR',
          message: error.message,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_ESTIMATE_ERROR',
            message: 'Failed to delete cost estimate',
          })
    }
  },

  /**
   * Get all line items for an estimate
   */
  async getEstimateItems(estimateId: string): Promise<CostEstimateItem[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimate_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ESTIMATE_ITEMS_ERROR',
          message: error.message,
        })
      }

      return data ?? []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ESTIMATE_ITEMS_ERROR',
            message: 'Failed to fetch estimate items',
          })
    }
  },

  /**
   * Add a line item to an estimate
   */
  async addEstimateItem(item: CostEstimateItemInsert): Promise<CostEstimateItem> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimate_items')
        .insert(item)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'ADD_ESTIMATE_ITEM_ERROR',
          message: error.message,
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ADD_ESTIMATE_ITEM_ERROR',
            message: 'Failed to add estimate item',
          })
    }
  },

  /**
   * Update an estimate line item
   */
  async updateEstimateItem(
    itemId: string,
    updates: CostEstimateItemUpdate
  ): Promise<CostEstimateItem> {
    try {
      const { data, error } = await (supabase as any)
        .from('cost_estimate_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_ESTIMATE_ITEM_ERROR',
          message: error.message,
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ESTIMATE_ITEM_ERROR',
            message: 'Failed to update estimate item',
          })
    }
  },

  /**
   * Delete an estimate line item
   */
  async deleteEstimateItem(itemId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('cost_estimate_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_ESTIMATE_ITEM_ERROR',
          message: error.message,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_ESTIMATE_ITEM_ERROR',
            message: 'Failed to delete estimate item',
          })
    }
  },

  /**
   * Create an estimate from takeoff items
   */
  async createEstimateFromTakeoff(params: {
    projectId: string
    name: string
    description?: string
    takeoffItemIds: string[]
    unitCosts: Record<string, number>
    laborRate?: number
    markupPercentage?: number
    createdBy: string
  }): Promise<CostEstimateWithItems> {
    try {
      // First, create the estimate
      const estimateData: CostEstimateInsert = {
        project_id: params.projectId,
        name: params.name,
        description: params.description,
        created_by: params.createdBy,
        unit_costs: params.unitCosts,
        labor_rate: params.laborRate ?? 0,
        markup_percentage: params.markupPercentage ?? 0,
      }

      const estimate = await this.createEstimate(estimateData)

      // Then, get the takeoff items and create estimate items
      const { data: takeoffItems, error: takeoffError } = await supabase
        .from('takeoff_items')
        .select('*')
        .in('id', params.takeoffItemIds)

      if (takeoffError) {
        throw new ApiErrorClass({
          code: 'FETCH_TAKEOFF_ITEMS_ERROR',
          message: takeoffError.message,
        })
      }

      // Create estimate items from takeoff items
      const estimateItems: CostEstimateItemInsert[] = (takeoffItems ?? []).map((item) => {
        const unitCost = params.unitCosts[item.measurement_type] ?? 0
        const quantity = item.quantity ?? 0
        const materialCost = quantity * unitCost
        const laborCost = 0 // Can be calculated based on labor hours if needed

        return {
          estimate_id: estimate.id,
          takeoff_item_id: item.id,
          name: item.name,
          measurement_type: item.measurement_type,
          quantity: quantity,
          unit_cost: unitCost,
          labor_hours: 0,
          labor_rate: params.laborRate ?? 0,
          material_cost: materialCost,
          labor_cost: laborCost,
          total_cost: materialCost + laborCost,
        }
      })

      if (estimateItems.length > 0) {
        const { data: items, error: itemsError } = await (supabase as any)
          .from('cost_estimate_items')
          .insert(estimateItems)
          .select()

        if (itemsError) {
          throw new ApiErrorClass({
            code: 'CREATE_ESTIMATE_ITEMS_ERROR',
            message: itemsError.message,
          })
        }

        return {
          ...estimate,
          items: items ?? [],
        }
      }

      return {
        ...estimate,
        items: [],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_ESTIMATE_FROM_TAKEOFF_ERROR',
            message: 'Failed to create estimate from takeoff',
          })
    }
  },

  /**
   * Duplicate an existing estimate
   */
  async duplicateEstimate(estimateId: string, newName: string): Promise<CostEstimateWithItems> {
    try {
      // Get the original estimate with items
      const original = await this.getEstimateById(estimateId)

      if (!original) {
        throw new ApiErrorClass({
          code: 'ESTIMATE_NOT_FOUND',
          message: 'Original estimate not found',
        })
      }

      // Create new estimate (without id, created_at, updated_at)
      const { id, created_at, updated_at, ...estimateData } = original
      const newEstimate = await this.createEstimate({
        ...estimateData,
        name: newName,
        status: 'draft',
      })

      // Duplicate items
      const newItems: CostEstimateItemInsert[] = original.items.map((item) => {
        const { id, estimate_id, created_at, updated_at, ...itemData } = item
        return {
          ...itemData,
          estimate_id: newEstimate.id,
        }
      })

      if (newItems.length > 0) {
        const { data: items, error: itemsError } = await (supabase as any)
          .from('cost_estimate_items')
          .insert(newItems)
          .select()

        if (itemsError) {
          throw new ApiErrorClass({
            code: 'DUPLICATE_ITEMS_ERROR',
            message: itemsError.message,
          })
        }

        return {
          ...newEstimate,
          items: items ?? [],
        }
      }

      return {
        ...newEstimate,
        items: [],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_ESTIMATE_ERROR',
            message: 'Failed to duplicate estimate',
          })
    }
  },
}
