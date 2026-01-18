// File: /src/lib/api/services/material-lists.ts
// Material Lists API service for procurement lists from takeoffs

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type {
  MaterialList,
  MaterialListInsert,
  MaterialListUpdate,
  MaterialListItem,
  MaterialListExport,
  MaterialListStatus,
  ExportFormat,
} from '@/types/drawing-sheets'
import type { QueryOptions } from '../types'

export interface MaterialListFilters {
  status?: MaterialListStatus
  takeoffId?: string
}

export const materialListsApi = {
  /**
   * Fetch all material lists for a project
   */
  async getProjectMaterialLists(
    projectId: string,
    filters?: MaterialListFilters,
    options?: QueryOptions
  ): Promise<MaterialList[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const queryFilters = [
        { column: 'project_id', operator: 'eq' as const, value: projectId },
        { column: 'deleted_at', operator: 'eq' as const, value: null },
      ]

      if (filters?.status) {
        queryFilters.push({
          column: 'status',
          operator: 'eq' as const,
          value: filters.status,
        })
      }

      if (filters?.takeoffId) {
        queryFilters.push({
          column: 'takeoff_id',
          operator: 'eq' as const,
          value: filters.takeoffId,
        })
      }

      return await apiClient.select<MaterialList>('material_lists', {
        ...options,
        filters: [...(options?.filters || []), ...queryFilters],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MATERIAL_LISTS_ERROR',
            message: 'Failed to fetch material lists',
          })
    }
  },

  /**
   * Fetch a single material list by ID
   */
  async getMaterialList(listId: string): Promise<MaterialList> {
    try {
      if (!listId) {
        throw new ApiErrorClass({
          code: 'LIST_ID_REQUIRED',
          message: 'Material list ID is required',
        })
      }

      return await apiClient.selectOne<MaterialList>('material_lists', listId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MATERIAL_LIST_ERROR',
            message: 'Failed to fetch material list',
          })
    }
  },

  /**
   * Create a new material list
   */
  async createMaterialList(list: MaterialListInsert): Promise<MaterialList> {
    try {
      if (!list.project_id || !list.company_id) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'project_id and company_id are required',
        })
      }

      if (!list.name?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'Material list name is required',
        })
      }

      return await apiClient.insert<MaterialList>('material_lists', {
        ...list,
        name: list.name.trim(),
        status: list.status || 'draft',
        items: list.items || [],
        waste_factors: list.waste_factors || {},
        totals: list.totals || { by_category: {}, total_items: 0, total_line_items: 0 },
        export_history: list.export_history || [],
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_MATERIAL_LIST_ERROR',
            message: 'Failed to create material list',
          })
    }
  },

  /**
   * Update a material list
   */
  async updateMaterialList(
    listId: string,
    updates: MaterialListUpdate
  ): Promise<MaterialList> {
    try {
      if (!listId) {
        throw new ApiErrorClass({
          code: 'LIST_ID_REQUIRED',
          message: 'Material list ID is required',
        })
      }

      // Clean the name if provided
      if (updates.name !== undefined) {
        updates.name = updates.name?.trim() || 'Untitled Material List'
      }

      return await apiClient.update<MaterialList>('material_lists', listId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_MATERIAL_LIST_ERROR',
            message: 'Failed to update material list',
          })
    }
  },

  /**
   * Soft delete a material list
   */
  async deleteMaterialList(listId: string): Promise<void> {
    try {
      if (!listId) {
        throw new ApiErrorClass({
          code: 'LIST_ID_REQUIRED',
          message: 'Material list ID is required',
        })
      }

      await apiClient.update<MaterialList>('material_lists', listId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_MATERIAL_LIST_ERROR',
            message: 'Failed to delete material list',
          })
    }
  },

  /**
   * Update material list status
   */
  async updateStatus(
    listId: string,
    status: MaterialListStatus
  ): Promise<MaterialList> {
    try {
      return await this.updateMaterialList(listId, { status })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_STATUS_ERROR',
            message: 'Failed to update material list status',
          })
    }
  },

  /**
   * Add items to a material list
   */
  async addItems(
    listId: string,
    newItems: MaterialListItem[]
  ): Promise<MaterialList> {
    try {
      // Get current list
      const list = await this.getMaterialList(listId)

      // Combine existing and new items
      const items = [...list.items, ...newItems]

      // Recalculate totals
      const totals = this.calculateTotals(items)

      return await this.updateMaterialList(listId, { items, totals })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ADD_ITEMS_ERROR',
            message: 'Failed to add items to material list',
          })
    }
  },

  /**
   * Update a specific item in a material list
   */
  async updateItem(
    listId: string,
    itemId: string,
    updates: Partial<MaterialListItem>
  ): Promise<MaterialList> {
    try {
      const list = await this.getMaterialList(listId)

      const items = list.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )

      // Recalculate totals
      const totals = this.calculateTotals(items)

      return await this.updateMaterialList(listId, { items, totals })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ITEM_ERROR',
            message: 'Failed to update material list item',
          })
    }
  },

  /**
   * Remove an item from a material list
   */
  async removeItem(listId: string, itemId: string): Promise<MaterialList> {
    try {
      const list = await this.getMaterialList(listId)

      const items = list.items.filter((item) => item.id !== itemId)

      // Recalculate totals
      const totals = this.calculateTotals(items)

      return await this.updateMaterialList(listId, { items, totals })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REMOVE_ITEM_ERROR',
            message: 'Failed to remove item from material list',
          })
    }
  },

  /**
   * Update waste factors and recalculate order quantities
   */
  async updateWasteFactors(
    listId: string,
    wasteFactors: Record<string, number>
  ): Promise<MaterialList> {
    try {
      const list = await this.getMaterialList(listId)

      // Recalculate order quantities based on new waste factors
      const items = list.items.map((item) => {
        const wasteFactor = item.category
          ? wasteFactors[item.category] ?? item.waste_factor
          : item.waste_factor

        return {
          ...item,
          waste_factor: wasteFactor,
          order_quantity: Math.ceil(item.quantity * (1 + wasteFactor)),
        }
      })

      // Recalculate totals
      const totals = this.calculateTotals(items)

      return await this.updateMaterialList(listId, {
        items,
        waste_factors: wasteFactors,
        totals,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_WASTE_FACTORS_ERROR',
            message: 'Failed to update waste factors',
          })
    }
  },

  /**
   * Record an export in the history
   */
  async recordExport(
    listId: string,
    exportRecord: Omit<MaterialListExport, 'exported_at'>
  ): Promise<MaterialList> {
    try {
      const list = await this.getMaterialList(listId)

      const exportHistory = [
        ...list.export_history,
        {
          ...exportRecord,
          exported_at: new Date().toISOString(),
        },
      ]

      // Update status to 'exported' if it was 'finalized'
      const status = list.status === 'finalized' ? 'exported' : list.status

      return await this.updateMaterialList(listId, { export_history: exportHistory, status })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'RECORD_EXPORT_ERROR',
            message: 'Failed to record export',
          })
    }
  },

  /**
   * Finalize a material list (locks it from further edits)
   */
  async finalize(listId: string): Promise<MaterialList> {
    try {
      return await this.updateStatus(listId, 'finalized')
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FINALIZE_ERROR',
            message: 'Failed to finalize material list',
          })
    }
  },

  /**
   * Mark a material list as ordered
   */
  async markAsOrdered(listId: string): Promise<MaterialList> {
    try {
      return await this.updateStatus(listId, 'ordered')
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'MARK_ORDERED_ERROR',
            message: 'Failed to mark material list as ordered',
          })
    }
  },

  /**
   * Duplicate a material list
   */
  async duplicate(
    listId: string,
    newName?: string
  ): Promise<MaterialList> {
    try {
      const original = await this.getMaterialList(listId)

      return await this.createMaterialList({
        project_id: original.project_id,
        company_id: original.company_id,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        status: 'draft',
        takeoff_id: original.takeoff_id,
        items: original.items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
        })),
        waste_factors: original.waste_factors,
        totals: original.totals,
        created_by: original.created_by,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_ERROR',
            message: 'Failed to duplicate material list',
          })
    }
  },

  // =============================================
  // HELPER METHODS
  // =============================================

  /**
   * Calculate totals for a material list based on items
   */
  calculateTotals(items: MaterialListItem[]) {
    const byCategory: Record<string, number> = {}
    let totalItems = 0
    let totalLineItems = items.length

    for (const item of items) {
      totalItems += item.order_quantity
      if (item.category) {
        byCategory[item.category] = (byCategory[item.category] || 0) + item.order_quantity
      }
    }

    return {
      by_category: byCategory,
      total_items: totalItems,
      total_line_items: totalLineItems,
    }
  },

  /**
   * Apply waste factor to a quantity
   */
  applyWasteFactor(quantity: number, wasteFactor: number): number {
    return Math.ceil(quantity * (1 + wasteFactor))
  },
}
