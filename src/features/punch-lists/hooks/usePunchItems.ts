// Hooks for punch item queries and mutations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem } from '@/types/database'

// Fetch all punch items for a project
export function usePunchItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as PunchItem[]
    },
    enabled: !!projectId,
  })
}

// Fetch single punch item
export function usePunchItem(punchItemId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', punchItemId],
    queryFn: async () => {
      if (!punchItemId) throw new Error('Punch item ID required')

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('id', punchItemId)
        .single()

      if (error) throw error
      return data as PunchItem
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
    },
  })
}

// Update punch item mutation
export function useUpdatePunchItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PunchItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('punch_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PunchItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
    },
  })
}

// Delete punch item mutation (soft delete)
export function useDeletePunchItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (punchItemId: string) => {
      const { error } = await supabase
        .from('punch_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', punchItemId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
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
      const updates: Partial<PunchItem> = {
        status: status as any,
      }

      // Track who marked it complete/verified
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
    },
  })
}
