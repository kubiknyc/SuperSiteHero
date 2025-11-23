// File: /src/lib/api/services/change-orders.ts
// Change Orders API service

import { supabase } from '@/lib/supabase'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Database } from '@/types/database'

// Type aliases
type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row']
type WorkflowItemComment = Database['public']['Tables']['workflow_item_comments']['Row']

export type ChangeOrderWithRelations = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
  }
  raised_by_user?: {
    first_name: string
    last_name: string
  }
  bids?: (ChangeOrderBid & {
    subcontractor?: {
      company_name: string
    }
  })[]
}

export type ChangeOrderDetailWithRelations = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
    statuses: any
    priorities: any
  }
  raised_by_user?: {
    first_name: string
    last_name: string
    email: string
  }
  created_by_user?: {
    first_name: string
    last_name: string
  }
  comments?: (WorkflowItemComment & {
    created_by_user?: {
      first_name: string
      last_name: string
    }
  })[]
  bids?: (ChangeOrderBid & {
    subcontractor?: {
      company_name: string
      contact_name: string | null
      email: string | null
      phone: string | null
    }
  })[]
}

export const changeOrdersApi = {
  /**
   * Get the change order workflow type ID for a company
   */
  async getChangeOrderWorkflowType(companyId: string) {
    try {
      const { data, error } = await supabase
        .from('workflow_types')
        .select('id, name_singular, prefix')
        .eq('company_id', companyId)
        .ilike('name_singular', '%change%order%')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOW_TYPE_ERROR',
            message: 'Failed to get change order workflow type',
          })
    }
  },

  /**
   * Fetch all change orders for a project
   */
  async getProjectChangeOrders(
    projectId: string,
    companyId: string
  ): Promise<ChangeOrderWithRelations[]> {
    try {
      // Get the change order workflow type ID
      const workflowType = await this.getChangeOrderWorkflowType(companyId)
      if (!workflowType) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_TYPE_NOT_FOUND',
          message: 'Change order workflow type not found',
        })
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix),
          raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name),
          bids:change_order_bids(
            id,
            subcontractor_id,
            bid_status,
            lump_sum_cost,
            is_awarded,
            subcontractor:subcontractors(company_name)
          )
        `)
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowType.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ChangeOrderWithRelations[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CHANGE_ORDERS_ERROR',
            message: 'Failed to fetch change orders',
          })
    }
  },

  /**
   * Fetch a single change order by ID
   */
  async getChangeOrder(changeOrderId: string): Promise<ChangeOrderDetailWithRelations> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix, statuses, priorities),
          raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name, email),
          created_by_user:users!workflow_items_created_by_fkey(first_name, last_name),
          comments:workflow_item_comments(
            *,
            created_by_user:users!workflow_item_comments_created_by_fkey(first_name, last_name)
          ),
          bids:change_order_bids(
            *,
            subcontractor:subcontractors(company_name, contact_name, email, phone)
          )
        `)
        .eq('id', changeOrderId)
        .single()

      if (error) throw error
      return data as ChangeOrderDetailWithRelations
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CHANGE_ORDER_ERROR',
            message: 'Failed to fetch change order',
          })
    }
  },

  /**
   * Create a new change order
   */
  async createChangeOrder(
    projectId: string,
    workflowTypeId: string,
    userId: string,
    data: {
      title: string
      description?: string
      priority?: string
      cost_impact?: number
      schedule_impact?: string
      assignees?: string[]
    }
  ): Promise<WorkflowItem> {
    try {
      // Get next number for this workflow type in this project
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .order('number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (lastItem?.number || 0) + 1

      const insertData = {
        project_id: projectId,
        workflow_type_id: workflowTypeId,
        title: data.title,
        description: data.description || null,
        priority: data.priority || 'normal',
        cost_impact: data.cost_impact || null,
        schedule_impact: data.schedule_impact || null,
        assignees: data.assignees || [],
        number: nextNumber,
        status: 'draft',
        created_by: userId,
        raised_by: userId,
      }

      const { data: newChangeOrder, error } = await supabase
        .from('workflow_items')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return newChangeOrder
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_CHANGE_ORDER_ERROR',
            message: 'Failed to create change order',
          })
    }
  },

  /**
   * Update a change order
   */
  async updateChangeOrder(
    changeOrderId: string,
    updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<WorkflowItem> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates)
        .eq('id', changeOrderId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CHANGE_ORDER_ERROR',
            message: 'Failed to update change order',
          })
    }
  },

  /**
   * Delete a change order (soft delete)
   */
  async deleteChangeOrder(changeOrderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflow_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', changeOrderId)

      if (error) throw error
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_CHANGE_ORDER_ERROR',
            message: 'Failed to delete change order',
          })
    }
  },

  /**
   * Add a comment to a change order
   */
  async addComment(
    workflowItemId: string,
    userId: string,
    comment: string
  ): Promise<WorkflowItemComment> {
    try {
      const { data, error } = await supabase
        .from('workflow_item_comments')
        .insert({
          workflow_item_id: workflowItemId,
          comment,
          mentioned_users: [],
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ADD_COMMENT_ERROR',
            message: 'Failed to add comment',
          })
    }
  },

  /**
   * Request bids from subcontractors
   */
  async requestBids(
    workflowItemId: string,
    projectId: string,
    subcontractorIds: string[],
    userId: string
  ): Promise<ChangeOrderBid[]> {
    try {
      const bids = subcontractorIds.map((subcontractorId) => ({
        workflow_item_id: workflowItemId,
        project_id: projectId,
        subcontractor_id: subcontractorId,
        bid_status: 'requested',
        is_awarded: false,
        submitted_by: userId,
      }))

      const { data, error } = await supabase
        .from('change_order_bids')
        .insert(bids)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REQUEST_BIDS_ERROR',
            message: 'Failed to request bids',
          })
    }
  },

  /**
   * Award a bid
   */
  async awardBid(bidId: string, userId: string): Promise<ChangeOrderBid> {
    try {
      // Get the bid to find workflow_item_id
      const { data: bid, error: bidError } = await supabase
        .from('change_order_bids')
        .select('workflow_item_id')
        .eq('id', bidId)
        .single()

      if (bidError) throw bidError
      if (!bid) {
        throw new ApiErrorClass({
          code: 'BID_NOT_FOUND',
          message: 'Bid not found',
        })
      }

      // Unmark all other bids for this CO
      await supabase
        .from('change_order_bids')
        .update({ is_awarded: false })
        .eq('workflow_item_id', bid.workflow_item_id)

      // Award this bid
      const { data, error } = await supabase
        .from('change_order_bids')
        .update({
          is_awarded: true,
          bid_status: 'awarded',
          awarded_at: new Date().toISOString(),
          awarded_by: userId,
        })
        .eq('id', bidId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'AWARD_BID_ERROR',
            message: 'Failed to award bid',
          })
    }
  },

  /**
   * Change change order status
   */
  async changeStatus(changeOrderId: string, newStatus: string): Promise<WorkflowItem> {
    try {
      return await this.updateChangeOrder(changeOrderId, { status: newStatus })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CHANGE_STATUS_ERROR',
            message: 'Failed to change status',
          })
    }
  },
}
