// File: /src/features/submittals/hooks/useSubmittalMutations.ts
// Submittal mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { submittalsApi } from '@/lib/api/services/submittals'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowItem, SubmittalProcurement } from '@/types/database'

/**
 * Create a new submittal with automatic success/error notifications
 */
export function useCreateSubmittalWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at' | 'number'>
  >({
    mutationFn: async (submittal) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      return submittalsApi.createSubmittal({
        ...submittal,
        created_by: userProfile.id,
      })
    },
    successMessage: (data) => `Submittal #${data.number} created successfully`,
    errorMessage: (error) => `Failed to create submittal: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
      queryClient.invalidateQueries({ queryKey: ['submittals', data.project_id] })
    },
  })
}

/**
 * Update a submittal with automatic success/error notifications
 */
export function useUpdateSubmittalWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { id: string; updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      return submittalsApi.updateSubmittal(id, updates)
    },
    successMessage: (data) => `Submittal #${data.number} updated successfully`,
    errorMessage: (error) => `Failed to update submittal: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
      queryClient.invalidateQueries({ queryKey: ['submittals', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['submittals', data.id] })
    },
  })
}

/**
 * Delete a submittal with automatic success/error notifications
 */
export function useDeleteSubmittalWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (submittalId) => {
      return submittalsApi.deleteSubmittal(submittalId)
    },
    successMessage: 'Submittal deleted successfully',
    errorMessage: (error) => `Failed to delete submittal: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
    },
  })
}

/**
 * Update submittal approval status with automatic notifications
 */
export function useUpdateSubmittalStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { submittalId: string; status: string }
  >({
    mutationFn: async ({ submittalId, status }) => {
      return submittalsApi.updateSubmittalStatus(submittalId, status)
    },
    successMessage: (data) => `Submittal status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update submittal status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
      queryClient.invalidateQueries({ queryKey: ['submittals', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['submittals', data.id] })
    },
  })
}

/**
 * Update submittal procurement status with automatic notifications
 */
export function useUpdateSubmittalProcurementStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    SubmittalProcurement,
    Error,
    { procurementId: string; status: string }
  >({
    mutationFn: async ({ procurementId, status }) => {
      return submittalsApi.updateSubmittalProcurementStatus(procurementId, status)
    },
    successMessage: (data) => `Procurement status updated to "${data.procurement_status}"`,
    errorMessage: (error) => `Failed to update procurement status: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
    },
  })
}
