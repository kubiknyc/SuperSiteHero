// File: /src/lib/api/services/workflows.ts
// Workflows API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { WorkflowItem, WorkflowType, WorkflowItemComment, WorkflowItemHistory } from '@/types/database'
import { supabase } from '@/lib/supabase'

// Extended type for history with user info
export type WorkflowItemHistoryWithUser = WorkflowItemHistory & {
  changed_by_user?: { full_name: string | null; email: string | null } | null
}

// Type for project user with user details
export type ProjectUserWithDetails = {
  id: string
  user_id: string
  project_id: string
  project_role: string | null
  user: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}
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

  // ==========================================
  // COMMENTS API
  // ==========================================

  /**
   * Fetch all comments for a workflow item
   */
  async getWorkflowItemComments(workflowItemId: string): Promise<WorkflowItemComment[]> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      // Use direct Supabase query for 'is null' filter support
      const { data, error } = await supabase
        .from('workflow_item_comments')
        .select('*')
        .eq('workflow_item_id', workflowItemId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return (data || []) as WorkflowItemComment[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMMENTS_ERROR',
            message: 'Failed to fetch workflow item comments',
          })
    }
  },

  /**
   * Create a new comment on a workflow item
   */
  async createWorkflowItemComment(
    data: Omit<WorkflowItemComment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<WorkflowItemComment> {
    try {
      if (!data.workflow_item_id) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      if (!data.comment?.trim()) {
        throw new ApiErrorClass({
          code: 'COMMENT_REQUIRED',
          message: 'Comment text is required',
        })
      }

      return await apiClient.insert<WorkflowItemComment>('workflow_item_comments', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_COMMENT_ERROR',
            message: 'Failed to create comment',
          })
    }
  },

  /**
   * Update an existing comment
   */
  async updateWorkflowItemComment(
    commentId: string,
    updates: Partial<Pick<WorkflowItemComment, 'comment' | 'mentioned_users'>>
  ): Promise<WorkflowItemComment> {
    try {
      if (!commentId) {
        throw new ApiErrorClass({
          code: 'COMMENT_ID_REQUIRED',
          message: 'Comment ID is required',
        })
      }

      return await apiClient.update<WorkflowItemComment>('workflow_item_comments', commentId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_COMMENT_ERROR',
            message: 'Failed to update comment',
          })
    }
  },

  /**
   * Delete a comment (soft delete)
   */
  async deleteWorkflowItemComment(commentId: string): Promise<void> {
    try {
      if (!commentId) {
        throw new ApiErrorClass({
          code: 'COMMENT_ID_REQUIRED',
          message: 'Comment ID is required',
        })
      }

      // Soft delete by setting deleted_at
      await apiClient.update<WorkflowItemComment>('workflow_item_comments', commentId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_COMMENT_ERROR',
            message: 'Failed to delete comment',
          })
    }
  },

  // ==========================================
  // HISTORY API
  // ==========================================

  /**
   * Fetch history/audit log for a workflow item with user info
   */
  async getWorkflowItemHistory(workflowItemId: string): Promise<WorkflowItemHistoryWithUser[]> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      // Use direct Supabase query for join support
      const { data, error } = await supabase
        .from('workflow_item_history')
        .select(`
          *,
          changed_by_user:users!workflow_item_history_changed_by_fkey(full_name, email)
        `)
        .eq('workflow_item_id', workflowItemId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return (data || []) as WorkflowItemHistoryWithUser[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_HISTORY_ERROR',
            message: 'Failed to fetch workflow item history',
          })
    }
  },

  // ==========================================
  // PROJECT USERS API (for assignee selection)
  // ==========================================

  /**
   * Fetch all users assigned to a project (for assignee selector)
   */
  async getProjectUsers(projectId: string): Promise<ProjectUserWithDetails[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const { data, error } = await supabase
        .from('project_users')
        .select(`
          id,
          user_id,
          project_id,
          project_role,
          user:users!project_users_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('user_id')

      if (error) {throw error}
      return (data || []) as ProjectUserWithDetails[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECT_USERS_ERROR',
            message: 'Failed to fetch project users',
          })
    }
  },

  /**
   * Update assignees on a workflow item
   */
  async updateWorkflowItemAssignees(
    workflowItemId: string,
    assignees: string[]
  ): Promise<WorkflowItem> {
    try {
      if (!workflowItemId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ITEM_ID_REQUIRED',
          message: 'Workflow item ID is required',
        })
      }

      return await apiClient.update<WorkflowItem>('workflow_items', workflowItemId, {
        assignees,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ASSIGNEES_ERROR',
            message: 'Failed to update assignees',
          })
    }
  },
}
