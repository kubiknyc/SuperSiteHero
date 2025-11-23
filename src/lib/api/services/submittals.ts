// File: /src/lib/api/services/submittals.ts
// Submittals API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem, WorkflowType, SubmittalProcurement } from '@/types/database'
import type { QueryOptions } from '../types'

export const submittalsApi = {
  /**
   * Fetch Submittal workflow type ID for the current company
   */
  async getSubmittalWorkflowType(companyId: string): Promise<WorkflowType> {
    try {
      const { data, error } = await supabase
        .from('workflow_types')
        .select('*')
        .eq('company_id', companyId)
        .ilike('name_singular', 'Submittal')
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'SUBMITTAL_TYPE_NOT_FOUND',
          message: 'Submittal workflow type not configured for this company',
        })
      }

      return data as WorkflowType
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SUBMITTAL_TYPE_ERROR',
            message: 'Failed to fetch submittal workflow type',
          })
    }
  },

  /**
   * Fetch all submittals for a project
   */
  async getProjectSubmittals(
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
            code: 'FETCH_SUBMITTALS_ERROR',
            message: 'Failed to fetch submittals',
          })
    }
  },

  /**
   * Fetch a single submittal by ID
   */
  async getSubmittal(submittalId: string): Promise<WorkflowItem> {
    try {
      return await apiClient.selectOne<WorkflowItem>('workflow_items', submittalId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SUBMITTAL_ERROR',
            message: 'Failed to fetch submittal',
          })
    }
  },

  /**
   * Create a new submittal
   */
  async createSubmittal(
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
          message: 'Submittal title is required',
        })
      }

      // Get next number for this submittal type
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
            code: 'CREATE_SUBMITTAL_ERROR',
            message: 'Failed to create submittal',
          })
    }
  },

  /**
   * Update a submittal
   */
  async updateSubmittal(
    submittalId: string,
    updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<WorkflowItem> {
    try {
      return await apiClient.update<WorkflowItem>('workflow_items', submittalId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_SUBMITTAL_ERROR',
            message: 'Failed to update submittal',
          })
    }
  },

  /**
   * Delete a submittal (soft delete)
   */
  async deleteSubmittal(submittalId: string): Promise<void> {
    try {
      await apiClient.delete('workflow_items', submittalId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_SUBMITTAL_ERROR',
            message: 'Failed to delete submittal',
          })
    }
  },

  /**
   * Update submittal approval status
   */
  async updateSubmittalStatus(submittalId: string, status: string): Promise<WorkflowItem> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submittalId)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_SUBMITTAL_STATUS_ERROR',
            message: 'Failed to update submittal status',
          })
    }
  },

  /**
   * Update submittal procurement status
   */
  async updateSubmittalProcurementStatus(
    procurementId: string,
    status: string
  ): Promise<SubmittalProcurement> {
    try {
      const { data, error } = await supabase
        .from('submittal_procurement')
        .update({
          procurement_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', procurementId)
        .select()
        .single()

      if (error) throw error
      return data as SubmittalProcurement
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PROCUREMENT_STATUS_ERROR',
            message: 'Failed to update procurement status',
          })
    }
  },

  /**
   * Create procurement record for submittal
   */
  async createSubmittalProcurement(
    data: Omit<SubmittalProcurement, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SubmittalProcurement> {
    try {
      return await apiClient.insert<SubmittalProcurement>('submittal_procurement', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_PROCUREMENT_ERROR',
            message: 'Failed to create procurement record',
          })
    }
  },
}
