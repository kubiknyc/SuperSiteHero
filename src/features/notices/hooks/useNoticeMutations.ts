// File: /src/features/notices/hooks/useNoticeMutations.ts
// React Query mutation hooks for Notice operations with automatic notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import { noticesApi } from '@/lib/api/services/notices'
import { noticeKeys } from './useNotices'
import type { Notice, NoticeCreateInput, NoticeUpdateInput, NoticeResponseInput } from '../types'

// =============================================
// Helper Functions
// =============================================

/**
 * Get user-friendly status message for notice status changes
 */
function getStatusChangeMessage(status: string): string {
  const statusMessages: Record<string, string> = {
    draft: 'Notice saved as draft',
    sent: 'Notice marked as sent',
    received: 'Notice marked as received',
    acknowledged: 'Notice acknowledged',
    pending_response: 'Notice marked as pending response',
    responded: 'Notice marked as responded',
    closed: 'Notice closed',
  }

  return statusMessages[status] || `Notice status updated to "${status}"`
}

// =============================================
// Mutation Hooks with Notifications
// =============================================

/**
 * Create notice with automatic toast notifications
 * Success: "Notice created successfully"
 * Error: Shows error message
 *
 * Usage:
 * const createNotice = useCreateNoticeWithNotification()
 * await createNotice.mutateAsync({
 *   project_id: projectId,
 *   notice_type: 'delay',
 *   subject: 'Weather delay notice',
 *   direction: 'outgoing',
 *   notice_date: '2025-01-15',
 * })
 */
export function useCreateNoticeWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<Notice, Error, NoticeCreateInput>({
    mutationFn: async (input) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to create notice')
      }

      if (!input.project_id) {
        throw new Error('Project ID is required')
      }

      if (!input.subject?.trim()) {
        throw new Error('Notice subject is required')
      }

      return noticesApi.createNotice(input, userProfile.id)
    },
    successMessage: 'Notice created successfully',
    errorMessage: (error) => `Failed to create notice: ${error.message}`,
    onSuccess: (data) => {
      // Invalidate all notice-related queries
      queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      queryClient.invalidateQueries({ queryKey: noticeKeys.list(data.project_id) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.stats(data.project_id) })
    },
  })
}

/**
 * Update notice with automatic toast notifications
 * Success: "Notice updated successfully"
 * Error: Shows error message
 *
 * Usage:
 * const updateNotice = useUpdateNoticeWithNotification()
 * await updateNotice.mutateAsync({
 *   id: noticeId,
 *   updates: { subject: 'Updated subject' }
 * })
 */
export function useUpdateNoticeWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Notice,
    Error,
    { id: string; updates: NoticeUpdateInput }
  >({
    mutationFn: async ({ id, updates }) => {
      if (!id) {
        throw new Error('Notice ID is required')
      }

      return noticesApi.updateNotice(id, updates)
    },
    successMessage: 'Notice updated successfully',
    errorMessage: (error) => `Failed to update notice: ${error.message}`,
    onSuccess: (data) => {
      // Invalidate specific notice and list queries
      queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      queryClient.invalidateQueries({ queryKey: noticeKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.list(data.project_id) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.stats(data.project_id) })
    },
  })
}

/**
 * Delete notice with automatic toast notifications (soft delete)
 * Success: "Notice deleted successfully"
 * Error: Shows error message
 *
 * Usage:
 * const deleteNotice = useDeleteNoticeWithNotification()
 * await deleteNotice.mutateAsync({ id: noticeId, projectId })
 */
export function useDeleteNoticeWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, { id: string; projectId: string }>({
    mutationFn: async ({ id }) => {
      if (!id) {
        throw new Error('Notice ID is required')
      }

      return noticesApi.deleteNotice(id)
    },
    successMessage: 'Notice deleted successfully',
    errorMessage: (error) => `Failed to delete notice: ${error.message}`,
    onSuccess: (_, variables) => {
      // Invalidate all notice queries to remove deleted item
      queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      queryClient.invalidateQueries({ queryKey: noticeKeys.list(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.stats(variables.projectId) })
    },
  })
}

/**
 * Update notice status with automatic toast notifications
 * Success: Dynamic message based on new status
 * Error: Shows error message
 *
 * Usage:
 * const updateStatus = useUpdateNoticeStatusWithNotification()
 * await updateStatus.mutateAsync({ id: noticeId, status: 'sent', projectId })
 */
export function useUpdateNoticeStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Notice,
    Error,
    { id: string; status: string; projectId: string }
  >({
    mutationFn: async ({ id, status }) => {
      if (!id) {
        throw new Error('Notice ID is required')
      }

      if (!status) {
        throw new Error('Status is required')
      }

      return noticesApi.updateNoticeStatus(id, status)
    },
    successMessage: (data) => getStatusChangeMessage(data.status || ''),
    errorMessage: (error) => `Failed to update notice status: ${error.message}`,
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      queryClient.invalidateQueries({ queryKey: noticeKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.list(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.stats(variables.projectId) })
    },
  })
}

/**
 * Record response to notice with automatic toast notifications
 * Success: "Response recorded successfully"
 * Error: Shows error message
 *
 * Usage:
 * const recordResponse = useRecordNoticeResponseWithNotification()
 * await recordResponse.mutateAsync({
 *   id: noticeId,
 *   projectId,
 *   response: {
 *     response_date: '2025-01-20',
 *     response_status: 'submitted',
 *     response_document_url: 'https://...'
 *   }
 * })
 */
export function useRecordNoticeResponseWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Notice,
    Error,
    { id: string; projectId: string; response: NoticeResponseInput }
  >({
    mutationFn: async ({ id, response }) => {
      if (!id) {
        throw new Error('Notice ID is required')
      }

      if (!response.response_date) {
        throw new Error('Response date is required')
      }

      return noticesApi.recordResponse(id, response)
    },
    successMessage: 'Response recorded successfully',
    errorMessage: (error) => `Failed to record response: ${error.message}`,
    onSuccess: (data, variables) => {
      // Invalidate all related queries including overdue
      queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      queryClient.invalidateQueries({ queryKey: noticeKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.list(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.stats(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: noticeKeys.overdue(variables.projectId) })
    },
  })
}

/**
 * Upload document for notice with automatic toast notifications
 * Success: "Document uploaded successfully"
 * Error: Shows error message
 *
 * Usage:
 * const uploadDoc = useUploadNoticeDocumentWithNotification()
 * const url = await uploadDoc.mutateAsync({
 *   projectId,
 *   noticeId,
 *   file,
 *   type: 'notice'
 * })
 */
export function useUploadNoticeDocumentWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    string,
    Error,
    { projectId: string; noticeId: string; file: File; type: 'notice' | 'response' }
  >({
    mutationFn: async ({ projectId, noticeId, file, type }) => {
      if (!projectId || !noticeId) {
        throw new Error('Project ID and Notice ID are required')
      }

      if (!file) {
        throw new Error('File is required')
      }

      return noticesApi.uploadDocument(projectId, noticeId, file, type)
    },
    successMessage: 'Document uploaded successfully',
    errorMessage: (error) => `Failed to upload document: ${error.message}`,
    onSuccess: (_, variables) => {
      // Invalidate notice detail to refresh document URL
      queryClient.invalidateQueries({ queryKey: noticeKeys.detail(variables.noticeId) })
    },
  })
}
