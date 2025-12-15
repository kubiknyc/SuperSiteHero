// File: /src/features/rfis/hooks/useRFIMutations.ts
// RFI mutation hooks WITH automatic toast notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { sendRfiAssignedNotification } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type { WorkflowItem, WorkflowItemComment } from '@/types/database'
import type {
  RFICreateInput,
  RFIUpdateInput,
  RFIStatusChangeInput,
  RFICommentInput,
} from './useRFIs'

// =============================================
// Helper Functions
// =============================================

/**
 * Get user details for notification
 */
async function getUserDetails(userId: string): Promise<{ email: string; name?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (error || !data) {return null}
    return { email: data.email, name: data.full_name || undefined }
  } catch {
    return null
  }
}

/**
 * Get project name
 */
async function getProjectName(projectId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()
    return data?.name || 'Unknown Project'
  } catch {
    return 'Unknown Project'
  }
}

/**
 * Send RFI notifications to assignees
 */
async function sendRfiNotificationsToAssignees(
  rfi: WorkflowItem,
  assignees: string[],
  assignedBy: string,
  projectName: string
): Promise<void> {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

  for (const assigneeId of assignees) {
    try {
      const assigneeDetails = await getUserDetails(assigneeId)
      if (assigneeDetails) {
        await sendRfiAssignedNotification(
          {
            userId: assigneeId,
            email: assigneeDetails.email,
            name: assigneeDetails.name,
          },
          {
            rfiNumber: `RFI-${rfi.number}`,
            subject: rfi.title,
            projectName,
            assignedBy,
            dueDate: rfi.due_date ? new Date(rfi.due_date).toLocaleDateString() : undefined,
            priority: rfi.priority || undefined,
            question: rfi.description || 'No description provided',
            viewUrl: `${appUrl}/rfis/${rfi.id}`,
          }
        )
      }
    } catch (error) {
      logger.error('[RFI] Failed to send RFI assignment notification:', error)
    }
  }
}

/**
 * Get user-friendly status message for RFI status changes
 */
function getStatusChangeMessage(status: string): string {
  const statusMessages: Record<string, string> = {
    pending: 'RFI marked as pending',
    submitted: 'RFI submitted successfully',
    approved: 'RFI approved successfully',
    rejected: 'RFI rejected',
    closed: 'RFI closed successfully',
  }

  return statusMessages[status] || `RFI status updated to "${status}"`
}

/**
 * Extract @mentioned user IDs from comment text
 * Matches patterns like @userId or @user-id-123
 */
function extractMentionedUsers(text: string): string[] {
  const mentionPattern = /@([a-zA-Z0-9-_]+)/g
  const matches = text.matchAll(mentionPattern)
  return Array.from(matches, (match) => match[1])
}

// =============================================
// Mutation Hooks with Notifications
// =============================================

/**
 * Create RFI with automatic toast notifications
 * Success: "RFI #123 created successfully"
 * Error: Shows error message
 *
 * Usage:
 * const createRFI = useCreateRFIWithNotification()
 * await createRFI.mutateAsync({
 *   project_id: projectId,
 *   workflow_type_id: workflowTypeId,
 *   title: 'Foundation detail clarification',
 *   description: 'Need clarification on...',
 *   priority: 'high',
 *   due_date: '2025-12-15',
 *   assignees: [userId1, userId2]
 * })
 */
export function useCreateRFIWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<WorkflowItem, Error, RFICreateInput>({
    mutationFn: async (input) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to create RFI')
      }

      if (!input.project_id) {
        throw new Error('Project ID is required')
      }

      if (!input.workflow_type_id) {
        throw new Error('Workflow type ID is required')
      }

      if (!input.title?.trim()) {
        throw new Error('RFI title is required')
      }

      // Get next number for this workflow type in this project
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', input.project_id)
        .eq('workflow_type_id', input.workflow_type_id)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextNumber = (lastItem?.number || 0) + 1

      // Create RFI with auto-generated number and initial status
      const { data, error } = await supabase
        .from('workflow_items')
        .insert({
          project_id: input.project_id,
          workflow_type_id: input.workflow_type_id,
          number: nextNumber,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          more_information: input.more_information?.trim() || null,
          discipline: input.discipline?.trim() || null,
          priority: input.priority || 'normal',
          due_date: input.due_date || null,
          assignees: input.assignees || [],
          status: 'pending',
          raised_by: userProfile.id,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    successMessage: (data) => `RFI #${data.number} created successfully`,
    errorMessage: (error) => `Failed to create RFI: ${error.message}`,
    onSuccess: async (data, variables) => {
      // Invalidate all RFI-related queries
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })

      // Send email notifications to assignees
      if (variables.assignees && variables.assignees.length > 0) {
        try {
          const projectName = await getProjectName(data.project_id)
          const assignedBy = userProfile?.full_name || userProfile?.email || 'Unknown'

          // Filter out the creator from assignees for notifications
          const assigneesToNotify = variables.assignees.filter(id => id !== userProfile?.id)

          if (assigneesToNotify.length > 0) {
            await sendRfiNotificationsToAssignees(
              data,
              assigneesToNotify,
              assignedBy,
              projectName
            )
          }
        } catch (error) {
          logger.error('[RFI] Failed to send RFI assignment notifications:', error)
        }
      }
    },
  })
}

/**
 * Update RFI with automatic toast notifications
 * Success: "RFI #123 updated successfully"
 * Error: Shows error message
 *
 * Usage:
 * const updateRFI = useUpdateRFIWithNotification()
 * await updateRFI.mutateAsync({
 *   id: rfiId,
 *   updates: {
 *     title: 'Updated title',
 *     priority: 'high',
 *     due_date: '2025-12-20'
 *   }
 * })
 */
export function useUpdateRFIWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { id: string; updates: RFIUpdateInput }
  >({
    mutationFn: async ({ id, updates }) => {
      if (!id) {
        throw new Error('RFI ID is required')
      }

      // Filter out undefined values and trim strings
      const cleanedUpdates: Partial<WorkflowItem> = {}

      if (updates.title !== undefined) {
        cleanedUpdates.title = updates.title.trim() || 'Untitled'
      }
      if (updates.description !== undefined) {
        cleanedUpdates.description = updates.description.trim() || null
      }
      if (updates.more_information !== undefined) {
        cleanedUpdates.more_information = updates.more_information.trim() || null
      }
      if (updates.priority !== undefined) {
        cleanedUpdates.priority = updates.priority
      }
      if (updates.due_date !== undefined) {
        cleanedUpdates.due_date = updates.due_date || null
      }
      if (updates.assignees !== undefined) {
        cleanedUpdates.assignees = updates.assignees
      }
      if (updates.resolution !== undefined) {
        cleanedUpdates.resolution = updates.resolution.trim() || null
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update(cleanedUpdates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    successMessage: (data) => `RFI #${data.number} updated successfully`,
    errorMessage: (error) => `Failed to update RFI: ${error.message}`,
    onSuccess: (data) => {
      // Invalidate specific RFI and list queries
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] })
    },
  })
}

/**
 * Change RFI status with automatic toast notifications
 * Success: Dynamic message based on new status
 * - "RFI marked as pending"
 * - "RFI submitted successfully"
 * - "RFI approved successfully"
 * - "RFI rejected"
 * - "RFI closed successfully"
 * Error: Shows error message
 *
 * Updates status and sets appropriate dates:
 * - 'submitted': set opened_date if null
 * - 'approved', 'rejected': no date change
 * - 'closed': set closed_date
 *
 * Usage:
 * const changeStatus = useChangeRFIStatusWithNotification()
 * await changeStatus.mutateAsync({ rfiId, newStatus: 'submitted' })
 */
export function useChangeRFIStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<WorkflowItem, Error, RFIStatusChangeInput>({
    mutationFn: async ({ rfiId, newStatus }) => {
      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      if (!newStatus) {
        throw new Error('New status is required')
      }

      // Validate status value
      const validStatuses = ['pending', 'submitted', 'approved', 'rejected', 'closed']
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
      }

      // Prepare update with status-specific date logic
      const updates: Partial<WorkflowItem> = {
        status: newStatus,
      }

      // Set appropriate dates based on new status
      if (newStatus === 'submitted') {
        // Get current RFI to check if opened_date is already set
        const { data: currentRFI } = await supabase
          .from('workflow_items')
          .select('opened_date')
          .eq('id', rfiId)
          .single()

        if (currentRFI && !currentRFI.opened_date) {
          updates.opened_date = new Date().toISOString()
        }
      } else if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates as any)
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    successMessage: (data) => getStatusChangeMessage(data.status),
    errorMessage: (error) => `Failed to update RFI status: ${error.message}`,
    onSuccess: (data) => {
      // Invalidate all related queries including history
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id, 'history'] })
    },
  })
}

/**
 * Add comment to RFI with automatic toast notifications
 * Success: "Comment added successfully"
 * Error: Shows error message
 *
 * Automatically extracts @mentioned users from comment text
 * Pattern: @userId or @user-id-123
 *
 * Usage:
 * const addComment = useAddRFICommentWithNotification()
 * await addComment.mutateAsync({
 *   rfiId,
 *   comment: 'This is resolved. @userId1 please verify.',
 *   mentioned_users: [userId1] // optional, auto-extracted if not provided
 * })
 */
export function useAddRFICommentWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<WorkflowItemComment, Error, RFICommentInput>({
    mutationFn: async ({ rfiId, comment, mentioned_users }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to add comment')
      }

      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      if (!comment?.trim()) {
        throw new Error('Comment text is required')
      }

      // Extract mentioned users from comment text if not explicitly provided
      const mentionedUsersList =
        mentioned_users && mentioned_users.length > 0
          ? mentioned_users
          : extractMentionedUsers(comment)

      const { data, error } = await supabase
        .from('workflow_item_comments')
        .insert({
          workflow_item_id: rfiId,
          comment: comment.trim(),
          mentioned_users: mentionedUsersList,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItemComment
    },
    successMessage: 'Comment added successfully',
    errorMessage: (error) => `Failed to add comment: ${error.message}`,
    onSuccess: (data) => {
      // Invalidate comments query for this RFI
      queryClient.invalidateQueries({ queryKey: ['rfis', data.workflow_item_id, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.workflow_item_id] })
    },
  })
}

/**
 * Delete RFI with automatic toast notifications (soft delete)
 * Success: "RFI deleted successfully"
 * Error: Shows error message
 *
 * Usage:
 * const deleteRFI = useDeleteRFIWithNotification()
 * await deleteRFI.mutateAsync(rfiId)
 */
export function useDeleteRFIWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (rfiId) => {
      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      const { error } = await supabase
        .from('workflow_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rfiId)

      if (error) {throw error}
    },
    successMessage: 'RFI deleted successfully',
    errorMessage: (error) => `Failed to delete RFI: ${error.message}`,
    onSuccess: () => {
      // Invalidate all RFI queries to remove deleted item
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
    },
  })
}
