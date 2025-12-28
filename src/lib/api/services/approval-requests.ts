/**
 * Approval Requests API Service
 *
 * Manages approval request lifecycle (create, query, cancel)
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { sendApprovalRequestNotification, type NotificationRecipient } from '@/lib/notifications/notification-service'
import type {
  ApprovalRequest,
  ApprovalStatus,
  CreateApprovalRequestInput,
  ApprovalRequestFilters,
  EntityApprovalStatus,
  PendingApprovalsSummary,
  WorkflowEntityType,
} from '@/types/approval-workflow'
import { logger } from '../../utils/logger';


// Note: Using extended Database types from database-extensions.ts
// Once migration 023 is applied to remote database, regenerate types and switch back to database.ts
const db = supabase as any

export const approvalRequestsApi = {
  /**
   * Fetch approval requests with optional filters
   */
  async getRequests(filters?: ApprovalRequestFilters): Promise<ApprovalRequest[]> {
    try {
      let query = db
        .from('approval_requests')
        .select(`
          *,
          workflow:approval_workflows(
            id,
            name,
            workflow_type,
            steps:approval_steps(*)
          ),
          initiator:users!approval_requests_initiated_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .order('initiated_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      if (filters?.initiated_by) {
        query = query.eq('initiated_by', filters.initiated_by)
      }

      const { data, error } = await query

      if (error) {throw error}

      // If filtering by pending_for_user, we need to filter in JS
      // since it requires checking step approvers
      let requests = (data || []) as ApprovalRequest[]

      if (filters?.pending_for_user) {
        const userId = filters.pending_for_user
        requests = requests.filter((request) => {
          if (request.status !== 'pending') {return false}
          const currentStep = request.workflow?.steps?.find(
            (s) => s.step_order === request.current_step
          )
          return currentStep?.approver_ids?.includes(userId) ?? false
        })
      }

      return requests
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_REQUESTS_ERROR',
            message: 'Failed to fetch approval requests',
            details: error,
          })
    }
  },

  /**
   * Fetch a single approval request with full details
   */
  async getRequest(requestId: string): Promise<ApprovalRequest> {
    try {
      if (!requestId) {
        throw new ApiErrorClass({
          code: 'REQUEST_ID_REQUIRED',
          message: 'Request ID is required',
        })
      }

      const { data, error } = await db
        .from('approval_requests')
        .select(`
          *,
          workflow:approval_workflows(
            id,
            name,
            description,
            workflow_type,
            steps:approval_steps(*)
          ),
          initiator:users!approval_requests_initiated_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          actions:approval_actions(
            *,
            user:users!approval_actions_user_id_fkey(
              id,
              full_name,
              email,
              avatar_url
            ),
            step:approval_steps(*),
            delegated_user:users!approval_actions_delegated_to_fkey(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('id', requestId)
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'REQUEST_NOT_FOUND',
          message: 'Approval request not found',
        })
      }

      // Sort actions by created_at
      if (data.actions) {
        data.actions.sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }

      // Sort steps by step_order
      if (data.workflow?.steps) {
        data.workflow.steps.sort((a: any, b: any) => a.step_order - b.step_order)
      }

      return data as ApprovalRequest
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_REQUEST_ERROR',
            message: 'Failed to fetch approval request',
            details: error,
          })
    }
  },

  /**
   * Get pending approvals for a user with summary counts
   */
  async getPendingForUser(userId: string): Promise<PendingApprovalsSummary> {
    try {
      if (!userId) {
        throw new ApiErrorClass({
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        })
      }

      const requests = await this.getRequests({
        status: 'pending',
        pending_for_user: userId,
      })

      // Calculate counts by type
      const byType: Record<WorkflowEntityType, number> = {
        document: 0,
        submittal: 0,
        rfi: 0,
        change_order: 0,
      }

      requests.forEach((request) => {
        if (request.entity_type in byType) {
          byType[request.entity_type]++
        }
      })

      return {
        total: requests.length,
        by_type: byType,
        requests,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PENDING_ERROR',
            message: 'Failed to fetch pending approvals',
            details: error,
          })
    }
  },

  /**
   * Create a new approval request
   */
  async createRequest(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    try {
      // Validate input
      if (!input.workflow_id) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ID_REQUIRED',
          message: 'Workflow ID is required',
        })
      }

      if (!input.entity_type) {
        throw new ApiErrorClass({
          code: 'ENTITY_TYPE_REQUIRED',
          message: 'Entity type is required',
        })
      }

      if (!input.entity_id) {
        throw new ApiErrorClass({
          code: 'ENTITY_ID_REQUIRED',
          message: 'Entity ID is required',
        })
      }

      if (!input.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      // Check if entity already has an active request
      const existing = await this.getEntityStatus(input.entity_type, input.entity_id)
      if (existing.has_active_request) {
        throw new ApiErrorClass({
          code: 'REQUEST_EXISTS',
          message: 'An approval request already exists for this item',
        })
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to create an approval request',
        })
      }

      // Create request
      const { data, error } = await db
        .from('approval_requests')
        .insert({
          workflow_id: input.workflow_id,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          project_id: input.project_id,
          initiated_by: user.id,
          current_step: 1,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {throw error}

      // Fetch full request with relations to get workflow details
      const fullRequest = await this.getRequest(data.id)

      // Send email notification to first step approvers
      try {
        const firstStep = fullRequest.workflow?.steps?.find((s) => s.step_order === 1)
        if (firstStep?.approver_ids?.length) {
          // Fetch approver user details
          const { data: approvers } = await db
            .from('users')
            .select('id, email, full_name')
            .in('id', firstStep.approver_ids)

          if (approvers?.length) {
            const recipients: NotificationRecipient[] = approvers.map((u: any) => ({
              userId: u.id,
              email: u.email,
              name: u.full_name,
            }))

            // Get project name
            const { data: project } = await db
              .from('projects')
              .select('name')
              .eq('id', input.project_id)
              .single()

            await sendApprovalRequestNotification(recipients, {
              entityType: input.entity_type,
              entityName: `${input.entity_type.replace('_', ' ')} #${input.entity_id.slice(0, 8)}`,
              projectName: project?.name || 'Unknown Project',
              initiatedBy: user.email || 'Unknown',
              stepName: firstStep.name || `Step ${firstStep.step_order}`,
              approvalUrl: `${import.meta.env.VITE_APP_URL || ''}/approvals/${data.id}`,
            })
          }
        }
      } catch (notifyError) {
        // Log but don't fail the request creation
        logger.error('[ApprovalRequests] Failed to send notification:', notifyError)
      }

      return fullRequest
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_REQUEST_ERROR',
            message: 'Failed to create approval request',
            details: error,
          })
    }
  },

  /**
   * Cancel an approval request
   * Only the initiator can cancel
   */
  async cancelRequest(requestId: string): Promise<ApprovalRequest> {
    try {
      if (!requestId) {
        throw new ApiErrorClass({
          code: 'REQUEST_ID_REQUIRED',
          message: 'Request ID is required',
        })
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to cancel a request',
        })
      }

      // Verify request exists and user is initiator
      const request = await this.getRequest(requestId)
      if (request.initiated_by !== user.id) {
        throw new ApiErrorClass({
          code: 'NOT_AUTHORIZED',
          message: 'Only the initiator can cancel this request',
        })
      }

      if (request.status !== 'pending') {
        throw new ApiErrorClass({
          code: 'INVALID_STATUS',
          message: 'Only pending requests can be cancelled',
        })
      }

      // Update status
      const { error } = await db
        .from('approval_requests')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) {throw error}

      // Return updated request
      return this.getRequest(requestId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CANCEL_REQUEST_ERROR',
            message: 'Failed to cancel approval request',
            details: error,
          })
    }
  },

  /**
   * Get approval status for a specific entity
   */
  async getEntityStatus(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<EntityApprovalStatus> {
    try {
      if (!entityType || !entityId) {
        throw new ApiErrorClass({
          code: 'ENTITY_PARAMS_REQUIRED',
          message: 'Entity type and ID are required',
        })
      }

      const { data, error } = await db
        .from('approval_requests')
        .select(`
          *,
          workflow:approval_workflows(
            id,
            name,
            workflow_type
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('initiated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {throw error}

      if (!data) {
        return {
          has_active_request: false,
          request: undefined,
          status: null,
          can_submit: true,
        }
      }

      const isActive = data.status === 'pending'
      const isApproved = data.status === 'approved' || data.status === 'approved_with_conditions'

      return {
        has_active_request: isActive,
        request: data as ApprovalRequest,
        status: data.status as ApprovalStatus,
        conditions: data.conditions || null,
        can_submit: !isActive && !isApproved,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ENTITY_STATUS_ERROR',
            message: 'Failed to fetch entity approval status',
            details: error,
          })
    }
  },

  /**
   * Check if a user can approve a specific request
   */
  async canUserApprove(requestId: string, userId: string): Promise<boolean> {
    try {
      if (!requestId || !userId) {
        return false
      }

      const request = await this.getRequest(requestId)

      if (request.status !== 'pending') {
        return false
      }

      const currentStep = request.workflow?.steps?.find(
        (s) => s.step_order === request.current_step
      )

      return currentStep?.approver_ids?.includes(userId) ?? false
    } catch {
      return false
    }
  },
}
