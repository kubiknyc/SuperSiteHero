// File: /src/lib/api/services/punch-lists.ts
// Punch Lists API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { PunchItem } from '@/types/database'
import type { QueryOptions } from '../types'

export const punchListsApi = {
  /**
   * Fetch all punch items for a project
   */
  async getPunchItemsByProject(
    projectId: string,
    options?: QueryOptions
  ): Promise<PunchItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<PunchItem>('punch_items', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PUNCH_ITEMS_ERROR',
            message: 'Failed to fetch punch items',
          })
    }
  },

  /**
   * Fetch a single punch item by ID
   */
  async getPunchItem(punchItemId: string): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      return await apiClient.selectOne<PunchItem>('punch_items', punchItemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PUNCH_ITEM_ERROR',
            message: 'Failed to fetch punch item',
          })
    }
  },

  /**
   * Create a new punch item
   */
  async createPunchItem(
    data: Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PunchItem> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.insert<PunchItem>('punch_items', {
        ...data,
        marked_complete_by: null,
        verified_by: null,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_PUNCH_ITEM_ERROR',
            message: 'Failed to create punch item',
          })
    }
  },

  /**
   * Update an existing punch item
   */
  async updatePunchItem(
    punchItemId: string,
    updates: Partial<Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      return await apiClient.update<PunchItem>('punch_items', punchItemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PUNCH_ITEM_ERROR',
            message: 'Failed to update punch item',
          })
    }
  },

  /**
   * Delete a punch item (soft delete via deleted_at)
   */
  async deletePunchItem(punchItemId: string): Promise<void> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      await apiClient.update('punch_items', punchItemId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PUNCH_ITEM_ERROR',
            message: 'Failed to delete punch item',
          })
    }
  },

  /**
   * Update punch item status with user tracking
   */
  async updatePunchItemStatus(
    punchItemId: string,
    status: string,
    userId?: string
  ): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      const updates: Partial<PunchItem> = {
        status: status as any,
      }

      // Track who marked it complete/verified
      if (status === 'completed' && userId) {
        updates.marked_complete_by = userId
        updates.marked_complete_at = new Date().toISOString()
      } else if (status === 'verified' && userId) {
        updates.verified_by = userId
        updates.verified_at = new Date().toISOString()
      }

      return await apiClient.update<PunchItem>('punch_items', punchItemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PUNCH_ITEM_STATUS_ERROR',
            message: 'Failed to update punch item status',
          })
    }
  },

  /**
   * Search punch items by title or description
   */
  async searchPunchItems(
    projectId: string,
    query: string
  ): Promise<PunchItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const items = await apiClient.select<PunchItem>('punch_items', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
      })

      const searchLower = query.toLowerCase()
      return items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_PUNCH_ITEMS_ERROR',
            message: 'Failed to search punch items',
          })
    }
  },
}
