/**
 * Approval Actions API Service
 *
 * Handles actions on approval requests (approve, reject, delegate, comment)
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ApprovalActionRecord,
  ApprovalActionType,
  ApprovalRequest,
} from '@/types/approval-workflow'

// Note: Using extended Database types from database-extensions.ts
// Once migration 023 is applied to remote database, regenerate types and switch back to database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const approvalActionsApi = {
  /**
   * Approve the current step of a request
   */
  async approve(requestId: string, comment?: string): Promise<ApprovalRequest> {
    return this._performAction(requestId, 'approve', { comment })
  },

  /**
   * Approve with conditions
   */
  async approveWithConditions(
    requestId: string,
    conditions: string,
    comment?: string
  ): Promise<ApprovalRequest> {
    if (!conditions?.trim()) {
      throw new ApiErrorClass({
        code: 'CONDITIONS_REQUIRED',
        message: 'Conditions are required for approval with conditions',
      })
    }

    return this._performAction(requestId, 'approve_with_conditions', {
      comment,
      conditions: conditions.trim(),
    })
  },

  /**
   * Reject the request
   */
  async reject(requestId: string, comment: string): Promise<ApprovalRequest> {
    if (!comment?.trim()) {
      throw new ApiErrorClass({
        code: 'COMMENT_REQUIRED',
        message: 'A comment is required when rejecting',
      })
    }

    return this._performAction(requestId, 'reject', { comment: comment.trim() })
  },

  /**
   * Delegate approval to another user
   */
  async delegate(
    requestId: string,
    toUserId: string,
    comment?: string
  ): Promise<ApprovalRequest> {
    if (!toUserId) {
      throw new ApiErrorClass({
        code: 'DELEGATE_USER_REQUIRED',
        message: 'A user to delegate to is required',
      })
    }

    return this._performAction(requestId, 'delegate', {
      comment,
      delegated_to: toUserId,
    })
  },

  /**
   * Add a comment without taking action
   */
  async addComment(requestId: string, comment: string): Promise<ApprovalActionRecord> {
    if (!comment?.trim()) {
      throw new ApiErrorClass({
        code: 'COMMENT_REQUIRED',
        message: 'Comment text is required',
      })
    }

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
        message: 'You must be logged in to add a comment',
      })
    }

    // Get request to find current step
    const { data: request, error: requestError } = await db
      .from('approval_requests')
      .select(`
        *,
        workflow:approval_workflows(
          steps:approval_steps(*)
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError) throw requestError
    if (!request) {
      throw new ApiErrorClass({
        code: 'REQUEST_NOT_FOUND',
        message: 'Approval request not found',
      })
    }

    // Find current step
    const currentStep = request.workflow?.steps?.find(
      (s: any) => s.step_order === request.current_step
    )

    if (!currentStep) {
      throw new ApiErrorClass({
        code: 'STEP_NOT_FOUND',
        message: 'Current approval step not found',
      })
    }

    // Insert comment action
    const { data: action, error: actionError } = await db
      .from('approval_actions')
      .insert({
        request_id: requestId,
        step_id: currentStep.id,
        user_id: user.id,
        action: 'comment',
        comment: comment.trim(),
      })
      .select(`
        *,
        user:users!approval_actions_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (actionError) throw actionError

    // TODO: Trigger email notification when Email Integration is implemented

    return action as ApprovalActionRecord
  },

  /**
   * Get action history for a request
   */
  async getHistory(requestId: string): Promise<ApprovalActionRecord[]> {
    try {
      if (!requestId) {
        throw new ApiErrorClass({
          code: 'REQUEST_ID_REQUIRED',
          message: 'Request ID is required',
        })
      }

      const { data, error } = await db
        .from('approval_actions')
        .select(`
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
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []) as ApprovalActionRecord[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_HISTORY_ERROR',
            message: 'Failed to fetch approval history',
            details: error,
          })
    }
  },

  /**
   * Internal method to perform approval actions
   */
  async _performAction(
    requestId: string,
    action: ApprovalActionType,
    options: {
      comment?: string
      conditions?: string
      delegated_to?: string
    } = {}
  ): Promise<ApprovalRequest> {
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
          message: 'You must be logged in to perform this action',
        })
      }

      // Fetch request with workflow steps
      const { data: request, error: requestError } = await db
        .from('approval_requests')
        .select(`
          *,
          workflow:approval_workflows(
            id,
            name,
            steps:approval_steps(*)
          )
        `)
        .eq('id', requestId)
        .single()

      if (requestError) throw requestError
      if (!request) {
        throw new ApiErrorClass({
          code: 'REQUEST_NOT_FOUND',
          message: 'Approval request not found',
        })
      }

      if (request.status !== 'pending') {
        throw new ApiErrorClass({
          code: 'INVALID_STATUS',
          message: 'This request is no longer pending',
        })
      }

      // Sort steps
      const steps = (request.workflow?.steps || []).sort(
        (a: any, b: any) => a.step_order - b.step_order
      )

      // Find current step
      const currentStep = steps.find(
        (s: any) => s.step_order === request.current_step
      )

      if (!currentStep) {
        throw new ApiErrorClass({
          code: 'STEP_NOT_FOUND',
          message: 'Current approval step not found',
        })
      }

      // Check if user can approve (except for comments)
      if (action !== 'comment') {
        const canApprove = currentStep.approver_ids?.includes(user.id)
        if (!canApprove) {
          throw new ApiErrorClass({
            code: 'NOT_AUTHORIZED',
            message: 'You are not authorized to approve this step',
          })
        }
      }

      // Record the action
      const { error: actionError } = await db
        .from('approval_actions')
        .insert({
          request_id: requestId,
          step_id: currentStep.id,
          user_id: user.id,
          action,
          comment: options.comment || null,
          conditions: options.conditions || null,
          delegated_to: options.delegated_to || null,
        })

      if (actionError) throw actionError

      // Update request status based on action
      let newStatus = request.status
      let newStep = request.current_step
      let completedAt: string | null = null

      if (action === 'approve' || action === 'approve_with_conditions') {
        // Check if this is the last step
        const isLastStep = currentStep.step_order >= steps.length

        if (isLastStep) {
          // Workflow complete
          newStatus = action === 'approve_with_conditions'
            ? 'approved_with_conditions'
            : 'approved'
          completedAt = new Date().toISOString()
        } else {
          // Move to next step
          newStep = request.current_step + 1
        }
      } else if (action === 'reject') {
        newStatus = 'rejected'
        completedAt = new Date().toISOString()
      } else if (action === 'delegate') {
        // Add delegated user to current step approvers (in memory - actual logic may vary)
        // For now, delegation just records the action; the delegated user
        // would need to be added to approver_ids via a separate update
        // This is a simplified implementation
      }

      // Update request if status or step changed
      if (newStatus !== request.status || newStep !== request.current_step) {
        const updateData: any = {
          status: newStatus,
          current_step: newStep,
        }

        if (completedAt) {
          updateData.completed_at = completedAt
        }

        if (action === 'approve_with_conditions' && options.conditions) {
          updateData.conditions = options.conditions
        }

        const { error: updateError } = await db
          .from('approval_requests')
          .update(updateData)
          .eq('id', requestId)

        if (updateError) throw updateError
      }

      // TODO: Trigger email notification when Email Integration is implemented

      // Fetch and return updated request
      const { data: updatedRequest, error: fetchError } = await db
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
            )
          )
        `)
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      return updatedRequest as ApprovalRequest
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ACTION_ERROR',
            message: `Failed to ${action} request`,
            details: error,
          })
    }
  },
}
