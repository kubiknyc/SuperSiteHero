// File: /src/lib/api/services/rfis.ts
// RFIs (Request for Information) API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem, WorkflowType } from '@/types/database'
import type { QueryOptions } from '../types'

export const rfisApi = {
  /**
   * Fetch RFI workflow type ID for the current company
   */
  async getRFIWorkflowType(companyId: string): Promise<WorkflowType> {
    try {
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
   * Fetch all RFIs for a project
   */
  async getProjectRFIs(
    projectId: string,
    workflowTypeId: string,
    options?: QueryOptions
  ): Promise<WorkflowItem[]> {
    try {
      return await apiClient.select<WorkflowItem>('workflow_items', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'workflow_type_id', operator: 'eq', value: workflowTypeId },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
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
   * Fetch a single RFI by ID
   */
  async getRFI(rfiId: string): Promise<WorkflowItem> {
    try {
      return await apiClient.selectOne<WorkflowItem>('workflow_items', rfiId)
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
   * Create a new RFI
   */
  async createRFI(
    data: Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at' | 'number'>
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

      if (!data.title) {
        throw new ApiErrorClass({
          code: 'TITLE_REQUIRED',
          message: 'RFI title is required',
        })
      }

      // Get next number for this RFI type
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', data.project_id)
        .eq('workflow_type_id', data.workflow_type_id)
        .order('number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (lastItem?.number || 0) + 1

      return await apiClient.insert<WorkflowItem>('workflow_items', {
        ...data,
        number: nextNumber,
        status: 'draft',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_RFI_ERROR',
            message: 'Failed to create RFI',
          })
    }
  },

  /**
   * Update an existing RFI
   */
  async updateRFI(
    rfiId: string,
    updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<WorkflowItem> {
    try {
      if (!rfiId) {
        throw new ApiErrorClass({
          code: 'RFI_ID_REQUIRED',
          message: 'RFI ID is required',
        })
      }

      return await apiClient.update<WorkflowItem>('workflow_items', rfiId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_RFI_ERROR',
            message: 'Failed to update RFI',
          })
    }
  },

  /**
   * Delete an RFI (soft delete)
   */
  async deleteRFI(rfiId: string): Promise<void> {
    try {
      if (!rfiId) {
        throw new ApiErrorClass({
          code: 'RFI_ID_REQUIRED',
          message: 'RFI ID is required',
        })
      }

      await apiClient.delete('workflow_items', rfiId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_RFI_ERROR',
            message: 'Failed to delete RFI',
          })
    }
  },

  /**
   * Update RFI status with workflow transitions
   */
  async updateRFIStatus(rfiId: string, status: string): Promise<WorkflowItem> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfiId)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_RFI_STATUS_ERROR',
            message: 'Failed to update RFI status',
          })
    }
  },

  /**
   * Add an answer/resolution to an RFI
   */
  async answerRFI(rfiId: string, answer: string, status?: string): Promise<WorkflowItem> {
    try {
      const updates: any = {
        resolution: answer,
        updated_at: new Date().toISOString(),
      }

      if (status) {
        updates.status = status
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates)
        .eq('id', rfiId)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ANSWER_RFI_ERROR',
            message: 'Failed to answer RFI',
          })
    }
  },
}
