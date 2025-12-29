// File: /src/lib/api/services/cost-estimates.ts
// API service for cost estimates CRUD operations

import { z } from 'zod'
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
import { logger } from '../../utils/logger';


// ============================================================================
// SECURITY: Server-side validation schemas
// ============================================================================

const UnitCostsSchema = z.record(
  z.string().regex(/^[a-z_]+$/, 'Invalid measurement type format'),
  z.number().min(0).max(999999)
).nullable()

const CostEstimateInsertSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'approved', 'invoiced', 'archived']).optional(),
  unit_costs: UnitCostsSchema.optional(),
  labor_rate: z.number().min(0).max(9999.99).optional(),
  markup_percentage: z.number().min(0).max(100).optional(),
  created_by: z.string().uuid().optional(), // Will be overridden by trigger
})

const CostEstimateUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'approved', 'invoiced', 'archived']).optional(),
  unit_costs: UnitCostsSchema.optional(),
  labor_rate: z.number().min(0).max(9999.99).optional(),
  markup_percentage: z.number().min(0).max(100).optional(),
})

const CostEstimateItemInsertSchema = z.object({
  estimate_id: z.string().uuid(),
  takeoff_item_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  measurement_type: z.string().min(1).max(50),
  quantity: z.number().min(0).max(999999999),
  unit_cost: z.number().min(0).max(999999.99),
  labor_hours: z.number().min(0).max(99999.99).optional(),
  labor_rate: z.number().min(0).max(9999.99).optional(),
  material_cost: z.number().min(0).max(999999999.99).optional(),
  labor_cost: z.number().min(0).max(999999999.99).optional(),
  total_cost: z.number().min(0).max(999999999.99).optional(),
})

const CostEstimateItemUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  measurement_type: z.string().min(1).max(50).optional(),
  quantity: z.number().min(0).max(999999999).optional(),
  unit_cost: z.number().min(0).max(999999.99).optional(),
  labor_hours: z.number().min(0).max(99999.99).optional(),
  labor_rate: z.number().min(0).max(9999.99).optional(),
  material_cost: z.number().min(0).max(999999999.99).optional(),
  labor_cost: z.number().min(0).max(999999999.99).optional(),
  total_cost: z.number().min(0).max(999999999.99).optional(),
})

const MAX_TAKEOFF_ITEMS = 1000 // Rate limiting constant

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

      if (!estimate) {return null}

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
      // SECURITY: Validate input
      const validatedData = CostEstimateInsertSchema.parse(estimate)

      // Note: created_by will be set by database trigger from auth.uid()
      const { data, error } = await (supabase as any)
        .from('cost_estimates')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        // SECURITY: Sanitize error messages
        logger.error('[cost-estimates] Create estimate error:', error)
        throw new ApiErrorClass({
          code: 'CREATE_ESTIMATE_ERROR',
          message: 'Unable to create cost estimate. Please check your input and try again.',
        })
      }

      return data
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: `Invalid input: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
        })
      }
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
      // SECURITY: Validate input
      const validatedData = CostEstimateUpdateSchema.parse(updates)

      const { data, error } = await (supabase as any)
        .from('cost_estimates')
        .update({ ...validatedData, updated_at: new Date().toISOString() })
        .eq('id', estimateId)
        .select()
        .single()

      if (error) {
        logger.error('[cost-estimates] Update estimate error:', error)
        throw new ApiErrorClass({
          code: 'UPDATE_ESTIMATE_ERROR',
          message: 'Unable to update cost estimate. Please check your input and try again.',
        })
      }

      return data
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: `Invalid input: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
        })
      }
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
      // SECURITY: Validate input
      const validatedData = CostEstimateItemInsertSchema.parse(item)

      const { data, error } = await (supabase as any)
        .from('cost_estimate_items')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        logger.error('[cost-estimates] Add item error:', error)
        throw new ApiErrorClass({
          code: 'ADD_ESTIMATE_ITEM_ERROR',
          message: 'Unable to add line item. Please check your input and try again.',
        })
      }

      return data
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: `Invalid input: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
        })
      }
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
      // SECURITY: Validate input
      const validatedData = CostEstimateItemUpdateSchema.parse(updates)

      const { data, error } = await (supabase as any)
        .from('cost_estimate_items')
        .update({ ...validatedData, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        logger.error('[cost-estimates] Update item error:', error)
        throw new ApiErrorClass({
          code: 'UPDATE_ESTIMATE_ITEM_ERROR',
          message: 'Unable to update line item. Please check your input and try again.',
        })
      }

      return data
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: `Invalid input: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
        })
      }
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
      // SECURITY: Rate limiting - prevent resource exhaustion
      if (params.takeoffItemIds.length > MAX_TAKEOFF_ITEMS) {
        throw new ApiErrorClass({
          code: 'RATE_LIMIT_ERROR',
          message: `Cannot process more than ${MAX_TAKEOFF_ITEMS} items at once. Please reduce the number of items.`,
        })
      }

      // SECURITY: Validate unit costs
      const validatedUnitCosts = UnitCostsSchema.parse(params.unitCosts)

      // First, create the estimate
      const estimateData: CostEstimateInsert = {
        project_id: params.projectId,
        name: params.name,
        description: params.description,
        created_by: params.createdBy, // Will be overridden by trigger
        unit_costs: (validatedUnitCosts ?? {}) as Record<string, number>,
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
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...estimateData } = original
      const newEstimate = await this.createEstimate({
        ...estimateData,
        name: newName,
        status: 'draft',
      })

      // Duplicate items
      const newItems: CostEstimateItemInsert[] = original.items.map((item) => {
        const { id: _itemId, estimate_id: _estimateId, created_at: _itemCreatedAt, updated_at: _itemUpdatedAt, ...itemData } = item
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
