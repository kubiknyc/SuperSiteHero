// Punch items mutations with notifications
import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import { punchListsApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { sendPunchItemAssignedNotification } from '@/lib/notifications/notification-service'
import type { PunchItem } from '@/types/database'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

/**
 * Helper to get user details for notifications
 */
async function getUserDetails(userId: string): Promise<{ id: string; email: string; full_name: string } | null> {
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', userId)
    .single()
  return data
}

/**
 * Helper to get project name
 */
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Project'
}

/**
 * Helper to get punch list name
 */
async function getPunchListName(punchListId: string): Promise<string> {
  const { data } = await supabase
    .from('punch_lists')
    .select('name')
    .eq('id', punchListId)
    .single()
  return data?.name || 'Punch List'
}

export function useCreatePunchItemWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    PunchItem,
    Error,
    Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (punchItem) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return punchListsApi.createPunchItem(punchItem)
    },
    successMessage: (data) => `Punch item "${data.title}" created successfully`,
    errorMessage: (error) => `Failed to create punch item: ${error.message}`,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })

      // Send notification to assignee if assigned
      if (data.assignee_id && data.assignee_id !== userProfile?.id) {
        const assignee = await getUserDetails(data.assignee_id)
        if (assignee?.email) {
          const [projectName, punchListName] = await Promise.all([
            getProjectName(data.project_id),
            data.punch_list_id ? getPunchListName(data.punch_list_id) : Promise.resolve('Punch List'),
          ])

          sendPunchItemAssignedNotification(
            {
              userId: assignee.id,
              email: assignee.email,
              name: assignee.full_name,
            },
            {
              itemNumber: data.number || `#${data.id.slice(0, 8)}`,
              description: data.title || data.description || 'No description',
              projectName,
              location: data.location || 'Not specified',
              assignedBy: userProfile?.full_name || 'Team Member',
              dueDate: data.due_date ? new Date(data.due_date).toLocaleDateString() : undefined,
              priority: data.priority || undefined,
              punchListName,
              viewUrl: `${APP_URL}/projects/${data.project_id}/punch-list/${data.id}`,
            }
          ).catch(console.error)
        }
      }
    },
  })
}

export function useUpdatePunchItemWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    PunchItem,
    Error,
    { id: string; updates: Partial<Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>>; previousAssigneeId?: string }
  >({
    mutationFn: async ({ id, updates }) => {
      return punchListsApi.updatePunchItem(id, updates)
    },
    successMessage: (data) => `Punch item "${data.title}" updated successfully`,
    errorMessage: (error) => `Failed to update punch item: ${error.message}`,
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })

      // Check if assignee changed - notify new assignee
      const newAssigneeId = variables.updates.assignee_id
      const previousAssigneeId = variables.previousAssigneeId

      if (newAssigneeId && newAssigneeId !== previousAssigneeId && newAssigneeId !== userProfile?.id) {
        const assignee = await getUserDetails(newAssigneeId)
        if (assignee?.email) {
          const [projectName, punchListName] = await Promise.all([
            getProjectName(data.project_id),
            data.punch_list_id ? getPunchListName(data.punch_list_id) : Promise.resolve('Punch List'),
          ])

          sendPunchItemAssignedNotification(
            {
              userId: assignee.id,
              email: assignee.email,
              name: assignee.full_name,
            },
            {
              itemNumber: data.number || `#${data.id.slice(0, 8)}`,
              description: data.title || data.description || 'No description',
              projectName,
              location: data.location || 'Not specified',
              assignedBy: userProfile?.full_name || 'Team Member',
              dueDate: data.due_date ? new Date(data.due_date).toLocaleDateString() : undefined,
              priority: data.priority || undefined,
              punchListName,
              viewUrl: `${APP_URL}/projects/${data.project_id}/punch-list/${data.id}`,
            }
          ).catch(console.error)
        }
      }
    },
  })
}

export function useDeletePunchItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (punchItemId) => {
      return punchListsApi.deletePunchItem(punchItemId)
    },
    successMessage: 'Punch item deleted successfully',
    errorMessage: (error) => `Failed to delete punch item: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
    },
  })
}

export function useUpdatePunchItemStatusWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    PunchItem,
    Error,
    { punchItemId: string; status: string; creatorId?: string }
  >({
    mutationFn: async ({ punchItemId, status }) => {
      return punchListsApi.updatePunchItemStatus(punchItemId, status, userProfile?.id)
    },
    successMessage: (data) => `Punch item status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update punch item status: ${error.message}`,
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })

      // When marked as completed, notify the creator (if different from current user)
      if (variables.status === 'completed' && variables.creatorId && variables.creatorId !== userProfile?.id) {
        const creator = await getUserDetails(variables.creatorId)
        if (creator?.email) {
          const projectName = await getProjectName(data.project_id)

          // Use in-app notification for status changes (not full email template)
          const { sendNotification } = await import('@/lib/notifications/notification-service')
          sendNotification({
            user_id: creator.id,
            type: 'punch_item_completed',
            title: 'Punch Item Completed',
            message: `Punch item "${data.title || data.description}" has been marked as completed by ${userProfile?.full_name || 'a team member'}.`,
            link: `${APP_URL}/projects/${data.project_id}/punch-list/${data.id}`,
            data: {
              projectName,
              itemNumber: data.number,
              completedBy: userProfile?.full_name,
            },
          }).catch(console.error)
        }
      }
    },
  })
}
