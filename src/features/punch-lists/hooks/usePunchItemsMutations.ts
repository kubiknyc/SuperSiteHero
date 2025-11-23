// Punch items mutations with notifications
import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem } from '@/types/database'
import { supabase } from '@/lib/supabase'

export function useCreatePunchItemWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    PunchItem,
    Error,
    Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (punchItem) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('punch_items')
        .insert({
          ...punchItem,
          marked_complete_by: null,
          verified_by: null,
        })
        .select()
        .single()

      if (error) throw error
      return data as PunchItem
    },
    successMessage: (data) => `Punch item "${data.title}" created successfully`,
    errorMessage: (error) => `Failed to create punch item: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
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
      const { data, error } = await supabase
        .from('punch_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PunchItem
    },
    successMessage: (data) => `Punch item "${data.title}" updated successfully`,
    errorMessage: (error) => `Failed to update punch item: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
    },
  })
}

export function useDeletePunchItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (punchItemId) => {
      const { error } = await supabase
        .from('punch_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', punchItemId)

      if (error) throw error
    },
    successMessage: 'Punch item deleted successfully',
    errorMessage: (error) => `Failed to delete punch item: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
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
      const updates: Partial<PunchItem> = {
        status: status as any,
      }

      if (status === 'completed' && userProfile?.id) {
        updates.marked_complete_by = userProfile.id
        updates.marked_complete_at = new Date().toISOString()
      } else if (status === 'verified' && userProfile?.id) {
        updates.verified_by = userProfile.id
        updates.verified_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('punch_items')
        .update(updates as any)
        .eq('id', punchItemId)
        .select()
        .single()

      if (error) throw error
      return data as PunchItem
    },
    successMessage: (data) => `Punch item status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update punch item status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
    },
  })
}
