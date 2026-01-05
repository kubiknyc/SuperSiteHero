// File: /src/lib/api/services/rfis.ts
// RFIs (Request for Information) API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import { generateRfiAssignedEmail, generateRfiAnsweredEmail } from '@/lib/email/templates'
import type { WorkflowItem, WorkflowType } from '@/types/database'
import type { QueryOptions } from '../types'
import { logger } from '@/lib/utils/logger'

// Helper to get user details for notifications
async function getUserDetails(userId: string): Promise<{ email: string; full_name: string | null } | null> {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  return data
}

// Helper to get project name
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Unknown Project'
}

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

      if (error) {throw error}
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
    updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>>,
    options?: { currentUserId?: string }
  ): Promise<WorkflowItem> {
    try {
      if (!rfiId) {
        throw new ApiErrorClass({
          code: 'RFI_ID_REQUIRED',
          message: 'RFI ID is required',
        })
      }

      // Get existing RFI to check for assignment changes
      const existingRfi = await this.getRFI(rfiId)
      const wasAssigned = (existingRfi as any).assigned_to
      const newAssignee = (updates as any).assigned_to

      const result = await apiClient.update<WorkflowItem>('workflow_items', rfiId, updates)

      // Send notification if assignee changed
      if (newAssignee && newAssignee !== wasAssigned) {
        this._notifyRfiAssigned(result, options?.currentUserId).catch(err => logger.error('[RFI] Failed to notify:', err))
      }

      return result
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
   * Send email notification when RFI is assigned
   */
  async _notifyRfiAssigned(rfi: WorkflowItem, assignedById?: string): Promise<void> {
    try {
      const assignedTo = (rfi as any).assigned_to
      if (!assignedTo) {return}

      const [assignee, assigner, projectName] = await Promise.all([
        getUserDetails(assignedTo),
        assignedById ? getUserDetails(assignedById) : Promise.resolve(null),
        getProjectName(rfi.project_id),
      ])

      if (!assignee?.email) {return}

      const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
      const { html, text } = generateRfiAssignedEmail({
        recipientName: assignee.full_name || assignee.email.split('@')[0],
        rfiNumber: `RFI-${rfi.number}`,
        subject: rfi.title,
        projectName,
        assignedBy: assigner?.full_name || 'Someone',
        dueDate: rfi.due_date ? new Date(rfi.due_date).toLocaleDateString() : undefined,
        priority: (rfi as any).priority,
        question: rfi.description ?? '',
        viewUrl: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
      })

      await sendEmail({
        to: { email: assignee.email, name: assignee.full_name ?? undefined },
        subject: `RFI Assigned: ${rfi.title}`,
        html,
        text,
        tags: ['rfi', 'assigned'],
      })
    } catch (error) {
      logger.error('[RFI] Failed to send assignment notification:', error)
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

      if (error) {throw error}
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
  async answerRFI(
    rfiId: string,
    answer: string,
    status?: string,
    options?: { answeredById?: string }
  ): Promise<WorkflowItem> {
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

      if (error) {throw error}

      const result = data as WorkflowItem

      // Send notification to RFI creator
      this._notifyRfiAnswered(result, answer, options?.answeredById).catch(err => logger.error('[RFI] Failed to notify:', err))

      return result
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ANSWER_RFI_ERROR',
            message: 'Failed to answer RFI',
          })
    }
  },

  /**
   * Send email notification when RFI is answered
   */
  async _notifyRfiAnswered(rfi: WorkflowItem, answer: string, answeredById?: string): Promise<void> {
    try {
      if (!rfi.created_by) {return}

      const [creator, answerer, projectName] = await Promise.all([
        getUserDetails(rfi.created_by),
        answeredById ? getUserDetails(answeredById) : Promise.resolve(null),
        getProjectName(rfi.project_id),
      ])

      if (!creator?.email) {return}

      const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
      const { html, text } = generateRfiAnsweredEmail({
        recipientName: creator.full_name || creator.email.split('@')[0],
        rfiNumber: `RFI-${rfi.number}`,
        subject: rfi.title,
        projectName,
        answeredBy: answerer?.full_name || 'Someone',
        answeredAt: new Date().toLocaleDateString(),
        question: rfi.description ?? '',
        answer,
        viewUrl: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
      })

      await sendEmail({
        to: { email: creator.email, name: creator.full_name ?? undefined },
        subject: `RFI Answered: ${rfi.title}`,
        html,
        text,
        tags: ['rfi', 'answered'],
      })
    } catch (error) {
      logger.error('[RFI] Failed to send answer notification:', error)
    }
  },
}
