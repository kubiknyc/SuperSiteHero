// Hooks for punch item queries and mutations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { punchListsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem } from '@/types/database'

// Fetch all punch items for a project
export function usePunchItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      return punchListsApi.getPunchItemsByProject(projectId)
    },
    enabled: !!projectId,
  })
}

// Fetch single punch item
export function usePunchItem(punchItemId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', punchItemId],
    queryFn: async () => {
      if (!punchItemId) {throw new Error('Punch item ID required')}

      return punchListsApi.getPunchItem(punchItemId)
    },
    enabled: !!punchItemId,
  })
}

// Create punch item mutation
export function useCreatePunchItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (punchItem: Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return punchListsApi.createPunchItem(punchItem)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
    },
  })
}

// Update punch item mutation
export function useUpdatePunchItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PunchItem> & { id: string }) => {
      return punchListsApi.updatePunchItem(id, updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
    },
  })
}

// Delete punch item mutation (soft delete)
export function useDeletePunchItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (punchItemId: string) => {
      return punchListsApi.deletePunchItem(punchItemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
    },
  })
}

// Update punch item status
export function useUpdatePunchItemStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      status,
    }: {
      punchItemId: string
      status: string
    }) => {
      return punchListsApi.updatePunchItemStatus(punchItemId, status, userProfile?.id)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id], exact: false })
    },
  })
}
