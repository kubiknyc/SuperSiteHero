// File: /src/lib/api/services/rfisOptimized.ts
// Optimized RFIs API service with selective field fetching

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem, WorkflowType } from '@/types/database'
import type { QueryOptions } from '../types'

/**
 * Field selections for different RFI views
 */
const RFI_FIELD_SELECTIONS = {
  // Minimal fields for list views
  list: 'id, project_id, workflow_type_id, title, reference_number, number, status, priority, due_date, created_at, raised_by',

  // Extended fields for card views
  card: `
    id, project_id, workflow_type_id, title, reference_number, number, status, priority,
    due_date, created_at, raised_by, description, assignees,
    raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name)
  `,

  // Complete fields for detail views
  detail: `
    *,
    raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name, email),
    created_by_user:users!workflow_items_created_by_fkey(first_name, last_name),
    attachments:workflow_item_attachments(id, file_name, file_size, created_at),
    comments:workflow_item_comments(
      id, comment, created_at,
      created_by_user:users!workflow_item_comments_created_by_fkey(first_name, last_name)
    )
  `,
}

/**
 * RFI essential fields type
 */
interface RFIEssential {
  id: string
  project_id: string
  workflow_type_id: string
  title: string
  reference_number: string | null
  number: number
  status: string
  priority: string
  due_date: string | null
  created_at: string
  raised_by: string | null
}

/**
 * RFI card view type
 */
interface RFICard extends RFIEssential {
  description: string | null
  assignees: string[]
  raised_by_user?: {
    first_name: string
    last_name: string
  }
}

/**
 * Cache for RFI workflow types (per company)
 */
const rfiTypeCache = new Map<string, { type: WorkflowType; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export const rfisApiOptimized = {
  /**
   * Get RFI workflow type with caching
   */
  async getRFIWorkflowType(companyId: string): Promise<WorkflowType> {
    try {
      // Check cache first
      const cached = rfiTypeCache.get(companyId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.type
      }

      const { data, error } = await supabase
        .from('workflow_types')
        .select('*')
        .eq('company_id', companyId)
        .ilike('name_singular', 'RFI')
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'RFI_TYPE_NOT_FOUND',
          message: 'RFI workflow type not configured for this company',
        })
      }

      // Cache the result
      rfiTypeCache.set(companyId, {
        type: data as WorkflowType,
        timestamp: Date.now(),
      })

      return data as WorkflowType
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RFI_TYPE_ERROR',
            message: 'Failed to fetch RFI workflow type',
          })
    }
  },

  /**
   * Fetch RFIs with optimized field selection
   */
  async getProjectRFIsOptimized(
    projectId: string,
    workflowTypeId: string,
    options?: QueryOptions & {
      viewType?: 'list' | 'card' | 'detail'
      limit?: number
      offset?: number
    }
  ): Promise<RFIEssential[] | RFICard[] | WorkflowItem[]> {
    try {
      const viewType = options?.viewType || 'list'
      const fields = RFI_FIELD_SELECTIONS[viewType]

      let query = supabase
        .from('workflow_items')
        .select(fields)
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          if (filter.operator === 'eq') {
            query = query.eq(filter.column, filter.value)
          } else if (filter.operator === 'neq') {
            query = query.neq(filter.column, filter.value)
          } else if (filter.operator === 'gt') {
            query = query.gt(filter.column, filter.value)
          } else if (filter.operator === 'gte') {
            query = query.gte(filter.column, filter.value)
          } else if (filter.operator === 'lt') {
            query = query.lt(filter.column, filter.value)
          } else if (filter.operator === 'lte') {
            query = query.lte(filter.column, filter.value)
          } else if (filter.operator === 'like') {
            query = query.like(filter.column, filter.value)
          } else if (filter.operator === 'ilike') {
            query = query.ilike(filter.column, filter.value)
          } else if (filter.operator === 'in') {
            query = query.in(filter.column, filter.value as any[])
          }
        }
      }

      // Apply sorting
      const orderBy = options?.orderBy || { column: 'created_at', ascending: false }
      query = query.order(orderBy.column, { ascending: orderBy.ascending })

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: error.message || 'Failed to fetch RFIs',
        })
      }

      if (!data || !Array.isArray(data)) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: 'Invalid response format',
        })
      }

      return data as unknown as RFIEssential[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RFIS_ERROR',
            message: 'Failed to fetch RFIs',
          })
    }
  },

  /**
   * Fetch single RFI with full details
   */
  async getRFIOptimized(rfiId: string): Promise<WorkflowItem> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .select(RFI_FIELD_SELECTIONS.detail)
        .eq('id', rfiId)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: error.message || 'Failed to fetch RFI',
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: 'RFI not found',
        })
      }

      return data as unknown as WorkflowItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RFI_ERROR',
            message: 'Failed to fetch RFI',
          })
    }
  },

  /**
   * Batch fetch RFIs by IDs (optimized for related items)
   */
  async getBatchRFIs(
    rfiIds: string[],
    viewType: 'list' | 'card' = 'list'
  ): Promise<RFIEssential[] | RFICard[]> {
    try {
      if (rfiIds.length === 0) return []

      const fields = RFI_FIELD_SELECTIONS[viewType]
      const { data, error } = await supabase
        .from('workflow_items')
        .select(fields)
        .in('id', rfiIds)

      if (error) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: error.message || 'Failed to batch fetch RFIs',
        })
      }

      if (!data || !Array.isArray(data)) {
        throw new ApiErrorClass({
          code: 'RFI_FETCH_ERROR',
          message: 'Invalid response format',
        })
      }

      return data as unknown as (RFIEssential[] | RFICard[])
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_FETCH_RFIS_ERROR',
            message: 'Failed to batch fetch RFIs',
          })
    }
  },

  /**
   * Get RFI summary statistics (cached)
   */
  async getRFISummary(
    projectId: string,
    workflowTypeId: string
  ): Promise<{
    total: number
    open: number
    pending: number
    answered: number
    closed: number
  }> {
    try {
      const { data, error, count } = await supabase
        .from('workflow_items')
        .select('status', { count: 'exact', head: false })
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)

      if (error) throw error

      const summary = {
        total: count || 0,
        open: 0,
        pending: 0,
        answered: 0,
        closed: 0,
      }

      if (data) {
        for (const item of data) {
          switch (item.status) {
            case 'open':
            case 'draft':
              summary.open++
              break
            case 'pending':
            case 'in_review':
              summary.pending++
              break
            case 'answered':
            case 'resolved':
              summary.answered++
              break
            case 'closed':
            case 'completed':
              summary.closed++
              break
          }
        }
      }

      return summary
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RFI_SUMMARY_ERROR',
            message: 'Failed to fetch RFI summary',
          })
    }
  },

  /**
   * Search RFIs with optimized query
   */
  async searchRFIsOptimized(
    projectId: string,
    query: string,
    options?: {
      limit?: number
      viewType?: 'list' | 'card'
    }
  ): Promise<RFIEssential[] | RFICard[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const viewType = options?.viewType || 'list'
      const fields = RFI_FIELD_SELECTIONS[viewType]

      // Use full-text search if available
      const { data, error } = await supabase
        .from('workflow_items')
        .select(fields)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,reference_number.ilike.%${query}%`)
        .limit(options?.limit || 20)
        .order('created_at', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'RFI_SEARCH_ERROR',
          message: error.message || 'Failed to search RFIs',
        })
      }

      if (!data || !Array.isArray(data)) {
        throw new ApiErrorClass({
          code: 'RFI_SEARCH_ERROR',
          message: 'Invalid response format',
        })
      }

      return data as unknown as (RFIEssential[] | RFICard[])
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_RFIS_ERROR',
            message: 'Failed to search RFIs',
          })
    }
  },

  /**
   * Clear RFI type cache (call when workflow types are updated)
   */
  clearRFITypeCache(companyId?: string): void {
    if (companyId) {
      rfiTypeCache.delete(companyId)
    } else {
      rfiTypeCache.clear()
    }
  },
}