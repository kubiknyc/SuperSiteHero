// Punch items mutations with notifications
import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import { punchListsApi } from '@/lib/api'
import type { PunchItem } from '@/types/database'

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
    },
  })
}

export function useUpdatePunchItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    PunchItem,
    Error,
    { id: string; updates: Partial<Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      return punchListsApi.updatePunchItem(id, updates)
    },
    successMessage: (data) => `Punch item "${data.title}" updated successfully`,
    errorMessage: (error) => `Failed to update punch item: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
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
    { punchItemId: string; status: string }
  >({
    mutationFn: async ({ punchItemId, status }) => {
      return punchListsApi.updatePunchItemStatus(punchItemId, status, userProfile?.id)
    },
    successMessage: (data) => `Punch item status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update punch item status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
    },
  })
}
