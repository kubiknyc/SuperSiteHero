// File: /src/lib/api/services/takeoffs.ts
// Takeoff Items API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { TakeoffItem } from '@/types/database-extensions'
import type { QueryOptions, QueryFilter } from '../types'

export const takeoffsApi = {
  /**
   * Fetch all takeoff items for a project
   */
  async getTakeoffItemsByProject(
    projectId: string,
    options?: QueryOptions
  ): Promise<TakeoffItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<TakeoffItem>('takeoff_items', {
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
            code: 'FETCH_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to fetch takeoff items',
          })
    }
  },

  /**
   * Fetch all takeoff items for a specific document
   */
  async getTakeoffItemsByDocument(
    documentId: string,
    pageNumber?: number,
    options?: QueryOptions
  ): Promise<TakeoffItem[]> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      const filters: QueryFilter[] = [
        ...(options?.filters || []),
        { column: 'document_id', operator: 'eq', value: documentId },
        { column: 'deleted_at', operator: 'eq', value: null },
      ]

      if (pageNumber !== undefined) {
        filters.push({ column: 'page_number', operator: 'eq', value: pageNumber })
      }

      return await apiClient.select<TakeoffItem>('takeoff_items', {
        ...options,
        filters,
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to fetch takeoff items',
          })
    }
  },

  /**
   * Fetch takeoff items by measurement type
   */
  async getTakeoffItemsByType(
    documentId: string,
    measurementType: string,
    options?: QueryOptions
  ): Promise<TakeoffItem[]> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      return await apiClient.select<TakeoffItem>('takeoff_items', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'document_id', operator: 'eq', value: documentId },
          { column: 'measurement_type', operator: 'eq', value: measurementType },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to fetch takeoff items',
          })
    }
  },

  /**
   * Fetch a single takeoff item by ID
   */
  async getTakeoffItem(takeoffItemId: string): Promise<TakeoffItem> {
    try {
      if (!takeoffItemId) {
        throw new ApiErrorClass({
          code: 'TAKEOFF_ITEM_ID_REQUIRED',
          message: 'Takeoff item ID is required',
        })
      }

      return await apiClient.selectOne<TakeoffItem>('takeoff_items', takeoffItemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TAKEOFF_ITEM_ERROR',
            message: 'Failed to fetch takeoff item',
          })
    }
  },

  /**
   * Create a new takeoff item
   */
  async createTakeoffItem(
    data: Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TakeoffItem> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.document_id) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      return await apiClient.insert<TakeoffItem>('takeoff_items', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TAKEOFF_ITEM_ERROR',
            message: 'Failed to create takeoff item',
          })
    }
  },

  /**
   * Batch create multiple takeoff items
   */
  async batchCreateTakeoffItems(
    items: Array<Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<TakeoffItem[]> {
    try {
      if (!items || items.length === 0) {
        throw new ApiErrorClass({
          code: 'NO_ITEMS_PROVIDED',
          message: 'No takeoff items provided',
        })
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.project_id || !item.document_id) {
          throw new ApiErrorClass({
            code: 'INVALID_ITEM_DATA',
            message: 'All items must have project_id and document_id',
          })
        }
      }

      return await apiClient.insertMany<TakeoffItem>('takeoff_items', items)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_CREATE_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to batch create takeoff items',
          })
    }
  },

  /**
   * Update an existing takeoff item
   */
  async updateTakeoffItem(
    takeoffItemId: string,
    updates: Partial<Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<TakeoffItem> {
    try {
      if (!takeoffItemId) {
        throw new ApiErrorClass({
          code: 'TAKEOFF_ITEM_ID_REQUIRED',
          message: 'Takeoff item ID is required',
        })
      }

      return await apiClient.update<TakeoffItem>('takeoff_items', takeoffItemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TAKEOFF_ITEM_ERROR',
            message: 'Failed to update takeoff item',
          })
    }
  },

  /**
   * Batch update multiple takeoff items
   */
  async batchUpdateTakeoffItems(
    updates: Array<{ id: string; data: Partial<Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>> }>
  ): Promise<void> {
    try {
      if (!updates || updates.length === 0) {
        throw new ApiErrorClass({
          code: 'NO_UPDATES_PROVIDED',
          message: 'No takeoff item updates provided',
        })
      }

      // Process updates in parallel
      await Promise.all(
        updates.map(({ id, data }) => this.updateTakeoffItem(id, data))
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_UPDATE_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to batch update takeoff items',
          })
    }
  },

  /**
   * Soft delete a takeoff item
   */
  async deleteTakeoffItem(takeoffItemId: string): Promise<void> {
    try {
      if (!takeoffItemId) {
        throw new ApiErrorClass({
          code: 'TAKEOFF_ITEM_ID_REQUIRED',
          message: 'Takeoff item ID is required',
        })
      }

      await apiClient.update('takeoff_items', takeoffItemId, { deleted_at: new Date().toISOString() })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TAKEOFF_ITEM_ERROR',
            message: 'Failed to delete takeoff item',
          })
    }
  },

  /**
   * Search takeoff items by query string
   */
  async searchTakeoffItems(
    query: string,
    projectId: string,
    options?: QueryOptions
  ): Promise<TakeoffItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<TakeoffItem>('takeoff_items', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'name', operator: 'ilike', value: `%${query}%` },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_TAKEOFF_ITEMS_ERROR',
            message: 'Failed to search takeoff items',
          })
    }
  },
}
