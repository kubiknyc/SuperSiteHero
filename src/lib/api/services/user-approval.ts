/**
 * User Approval API Service
 *
 * Handles pending user approvals for company administrators
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { logger } from '../../utils/logger';


export interface PendingUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
  approval_status: 'pending' | 'approved' | 'rejected'
}

export interface ApproveUserResponse {
  success: boolean
  message: string
  userId: string
}

export interface RejectUserResponse {
  success: boolean
  message: string
  userId: string
}

export const userApprovalApi = {
  /**
   * Get all pending users for the current user's company
   */
  async getPendingUsers(): Promise<PendingUser[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-pending-users', {
        method: 'POST',
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_PENDING_USERS_FAILED',
          message: error.message || 'Failed to fetch pending users',
        })
      }

      return data?.users || []
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}

      logger.error('Error fetching pending users:', error)
      throw new ApiErrorClass({
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred while fetching pending users',
      })
    }
  },

  /**
   * Approve a pending user
   */
  async approveUser(userId: string): Promise<ApproveUserResponse> {
    if (!userId) {
      throw new ApiErrorClass({
        code: 'USER_ID_REQUIRED',
        message: 'User ID is required',
      })
    }

    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        method: 'POST',
        body: { userId },
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'APPROVE_USER_FAILED',
          message: error.message || 'Failed to approve user',
        })
      }

      if (!data.success) {
        throw new ApiErrorClass({
          code: 'APPROVE_USER_FAILED',
          message: data.error || 'Failed to approve user',
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}

      logger.error('Error approving user:', error)
      throw new ApiErrorClass({
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred while approving user',
      })
    }
  },

  /**
   * Reject a pending user with optional reason
   */
  async rejectUser(userId: string, reason?: string): Promise<RejectUserResponse> {
    if (!userId) {
      throw new ApiErrorClass({
        code: 'USER_ID_REQUIRED',
        message: 'User ID is required',
      })
    }

    try {
      const { data, error} = await supabase.functions.invoke('reject-user', {
        method: 'POST',
        body: { userId, reason },
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'REJECT_USER_FAILED',
          message: error.message || 'Failed to reject user',
        })
      }

      if (!data.success) {
        throw new ApiErrorClass({
          code: 'REJECT_USER_FAILED',
          message: data.error || 'Failed to reject user',
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}

      logger.error('Error rejecting user:', error)
      throw new ApiErrorClass({
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred while rejecting user',
      })
    }
  },
}
