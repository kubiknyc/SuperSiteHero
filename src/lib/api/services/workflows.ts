// File: /src/lib/api/services/workflows.ts
// Workflows API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { WorkflowItem, WorkflowType } from '@/types/database'
import type { QueryOptions } from '../types'

export const workflowsApi = {
  /**
   * Fetch all workflow items for a project
   */
  async getWorkflowItemsByProject(
    projectId: string,
    workflowTypeId?: string,
    options?: QueryOptions
  ): Promise<WorkflowItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const filters = [
        { column: 'project_id', operator: 'eq' as const, value: projectId },
      ]

      if (workflowTypeId) {
        filters.push({ column: 'workflow_type_id', operator: 'eq' as const, value: workflowTypeId })
      }

      return await apiClient.select<WorkflowItem>('workflow_items', {
        ...options,
        filters,
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOW_ITEMS_ERROR',
            message: 'Failed to fetch workflow items',
          })
    }
  },

  /**
   * Fetch a single workflow item by ID
   */
  async getWorkflowItem(workflowItemId: string): Promise<WorkflowItem> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      return await apiClient.selectOne<WorkflowItem>('workflow_items', workflowItemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOW_ITEM_ERROR',
            message: 'Failed to fetch workflow item',
          })
    }
  },

  /**
   * Create a new workflow item
   */
  async createWorkflowItem(
    data: Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowItem> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.workflow_type_id) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_TYPE_ID_REQUIRED',
          message: 'Workflow type ID is required',
        })
      }

      return await apiClient.insert<WorkflowItem>('workflow_items', {
        ...data,
        status: data.status || 'open',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_WORKFLOW_ITEM_ERROR',
            message: 'Failed to create workflow item',
          })
    }
  },

  /**
   * Update an existing workflow item
   */
  async updateWorkflowItem(
    workflowItemId: string,
    updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<WorkflowItem> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      return await apiClient.update<WorkflowItem>('workflow_items', workflowItemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_WORKFLOW_ITEM_ERROR',
            message: 'Failed to update workflow item',
          })
    }
  },

  /**
   * Delete a workflow item
   */
  async deleteWorkflowItem(workflowItemId: string): Promise<void> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      await apiClient.delete('workflow_items', workflowItemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_WORKFLOW_ITEM_ERROR',
            message: 'Failed to delete workflow item',
          })
    }
  },

  /**
   * Update workflow item status
   */
  async updateWorkflowItemStatus(
    workflowItemId: string,
    status: string
  ): Promise<WorkflowItem> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      return await apiClient.update<WorkflowItem>('workflow_items', workflowItemId, {
        status,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_WORKFLOW_ITEM_STATUS_ERROR',
            message: 'Failed to update workflow item status',
          })
    }
  },

  /**
   * Fetch all workflow types for a company
   */
  async getWorkflowTypes(companyId: string): Promise<WorkflowType[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      return await apiClient.select<WorkflowType>('workflow_types', {
        filters: [{ column: 'company_id', operator: 'eq', value: companyId }],
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOW_TYPES_ERROR',
            message: 'Failed to fetch workflow types',
          })
    }
  },

  /**
   * Get default workflow types for a company
   */
  async getDefaultWorkflowTypes(companyId: string): Promise<WorkflowType[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      return await apiClient.select<WorkflowType>('workflow_types', {
        filters: [
          { column: 'company_id', operator: 'eq', value: companyId },
          { column: 'is_default', operator: 'eq', value: true },
        ],
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DEFAULT_WORKFLOW_TYPES_ERROR',
            message: 'Failed to fetch default workflow types',
          })
    }
  },

  /**
   * Search workflow items by title, description, or reference number
   */
  async searchWorkflowItems(
    projectId: string,
    query: string
  ): Promise<WorkflowItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const items = await apiClient.select<WorkflowItem>('workflow_items', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
      })

      const searchLower = query.toLowerCase()
      return items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.reference_number?.toLowerCase().includes(searchLower)
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_WORKFLOW_ITEMS_ERROR',
            message: 'Failed to search workflow items',
          })
    }
  },
}
