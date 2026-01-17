// Hooks for punch item queries and mutations
// Enhanced with subcontractor update support (Milestone 1.1)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { punchListsApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem, PunchItemStatus } from '@/types/database-extensions'
import type { StatusChangeRequest } from '../store/offlinePunchStore'

// Extended punch item type with subcontractor fields
export interface EnhancedPunchItem extends PunchItem {
  subcontractor_notes?: string
  subcontractor_updated_at?: string
  status_change_requested_at?: string
  status_change_request?: StatusChangeRequest
  item_number?: string
  created_by_name?: string
}

// Fetch all punch items for a project
export function usePunchItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', projectId],
    queryFn: async () => {
      if (!projectId) { throw new Error('Project ID required') }

      return punchListsApi.getPunchItemsByProject(projectId)
    },
    enabled: !!projectId,
  })
}

// Fetch single punch item with enhanced fields
export function usePunchItem(punchItemId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', punchItemId],
    queryFn: async () => {
      if (!punchItemId) { throw new Error('Punch item ID required') }

      // Use direct Supabase query to get all fields including subcontractor fields
      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('id', punchItemId)
        .single()

      if (error) { throw error }
      return data as EnhancedPunchItem
    },
    enabled: !!punchItemId,
  })
}

// Fetch punch items with pending status change requests
export function usePunchItemsWithStatusRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', 'status-requests', projectId],
    queryFn: async () => {
      if (!projectId) { throw new Error('Project ID required') }

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .not('status_change_requested_at', 'is', null)
        .is('deleted_at', null)
        .order('status_change_requested_at', { ascending: false })

      if (error) { throw error }
      return data as EnhancedPunchItem[]
    },
    enabled: !!projectId,
  })
}

// Fetch punch items by subcontractor
export function usePunchItemsBySubcontractor(
  projectId: string | undefined,
  subcontractorId: string | undefined
) {
  return useQuery({
    queryKey: ['punch-items', 'subcontractor', projectId, subcontractorId],
    queryFn: async () => {
      if (!projectId || !subcontractorId) {
        throw new Error('Project ID and Subcontractor ID required')
      }

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('subcontractor_id', subcontractorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) { throw error }
      return data as EnhancedPunchItem[]
    },
    enabled: !!projectId && !!subcontractorId,
  })
}

// Fetch proof of completion photos for a punch item
export function useProofOfCompletionPhotos(punchItemId: string | undefined) {
  return useQuery({
    queryKey: ['photos', 'proof-of-completion', punchItemId],
    queryFn: async () => {
      if (!punchItemId) { throw new Error('Punch item ID required') }

      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('punch_item_id', punchItemId)
        .eq('is_proof_of_completion', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) { throw error }
      return data
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
      if (!userProfile?.id) { throw new Error('User not authenticated') }

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

// Approve or reject status change request (GC action)
export function useResolveStatusChangeRequest() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      approve,
      rejectionReason,
    }: {
      punchItemId: string
      approve: boolean
      rejectionReason?: string
    }) => {
      if (!userProfile?.id) { throw new Error('User not authenticated') }

      // Get current punch item to check the requested status
      const { data: punchItem, error: fetchError } = await supabase
        .from('punch_items')
        .select('status_change_request')
        .eq('id', punchItemId)
        .single()

      if (fetchError) { throw fetchError }

      const statusRequest = punchItem.status_change_request as StatusChangeRequest | null

      if (!statusRequest) {
        throw new Error('No status change request found')
      }

      if (approve) {
        // Approve: Update status to requested status and clear request
        const { data, error } = await supabase
          .from('punch_items')
          .update({
            status: statusRequest.requested_status,
            status_change_request: null,
            status_change_requested_at: null,
            // If completing, update completion fields
            ...(statusRequest.requested_status === 'completed' && {
              marked_complete_by: statusRequest.requested_by,
              marked_complete_at: new Date().toISOString(),
            }),
          })
          .eq('id', punchItemId)
          .select()
          .single()

        if (error) { throw error }
        return data
      } else {
        // Reject: Clear request and add rejection notes
        const { data, error } = await supabase
          .from('punch_items')
          .update({
            status_change_request: null,
            status_change_requested_at: null,
            rejection_notes: rejectionReason || 'Status change request rejected',
          })
          .eq('id', punchItemId)
          .select()
          .single()

        if (error) { throw error }
        return data
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', 'status-requests'] })
    },
  })
}

// Bulk update punch item statuses
export function useBulkUpdatePunchItemStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemIds,
      status,
    }: {
      punchItemIds: string[]
      status: PunchItemStatus
    }) => {
      if (!userProfile?.id) { throw new Error('User not authenticated') }

      const updates: Partial<PunchItem> = {
        status,
        ...(status === 'completed' && {
          marked_complete_by: userProfile.id,
          marked_complete_at: new Date().toISOString(),
        }),
        ...(status === 'verified' && {
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
        }),
      }

      const { data, error } = await supabase
        .from('punch_items')
        .update(updates)
        .in('id', punchItemIds)
        .select()

      if (error) { throw error }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
    },
  })
}

// =============================================
// GC VERIFICATION HOOKS (Phase 4.2)
// =============================================

/**
 * Fetch punch items awaiting GC verification
 */
export function usePunchItemsAwaitingVerification(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', 'awaiting-verification', projectId],
    queryFn: async () => {
      if (!projectId) { throw new Error('Project ID required') }

      // Use the RPC function from migration
      const { data, error } = await supabase
        .rpc('get_punch_items_awaiting_verification', {
          p_project_id: projectId,
        })

      if (error) { throw error }
      return data as Array<{
        id: string
        title: string
        description: string
        status: string
        priority: string
        subcontractor_id: string
        subcontractor_name: string
        status_change_request: StatusChangeRequest | null
        status_change_requested_at: string | null
        sub_status_updated_at: string | null
        has_proof_photos: boolean
      }>
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Verify subcontractor completion request (GC action)
 */
export function useVerifySubcontractorCompletion() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      approve,
      rejectionReason,
    }: {
      punchItemId: string
      approve: boolean
      rejectionReason?: string
    }) => {
      if (!userProfile?.id) { throw new Error('User not authenticated') }

      // Use the RPC function from migration
      const { data, error } = await supabase
        .rpc('verify_subcontractor_completion', {
          p_punch_item_id: punchItemId,
          p_verified_by: userProfile.id,
          p_approve: approve,
          p_rejection_reason: rejectionReason || null,
        })

      if (error) { throw error }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', 'awaiting-verification'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data?.id] })
    },
  })
}

/**
 * Get subcontractor completion request history for a punch item
 */
export function useSubcontractorCompletionHistory(punchItemId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', 'completion-history', punchItemId],
    queryFn: async () => {
      if (!punchItemId) { throw new Error('Punch item ID required') }

      // Get the punch item with all status-related fields
      const { data: punchItem, error: punchError } = await supabase
        .from('punch_items')
        .select(`
          id,
          status,
          status_change_request,
          status_change_requested_at,
          sub_status_updated_at,
          subcontractor_notes,
          gc_verification_required,
          gc_verified_by,
          gc_verified_at,
          rejection_notes,
          marked_complete_by,
          marked_complete_at
        `)
        .eq('id', punchItemId)
        .single()

      if (punchError) { throw punchError }

      // Get proof of completion photos
      const { data: proofPhotos, error: photoError } = await supabase
        .from('photos')
        .select('id, file_url, file_name, caption, created_at, created_by')
        .eq('punch_item_id', punchItemId)
        .eq('is_proof_of_completion', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (photoError) { throw photoError }

      // Get GC verifier profile if available
      let verifierProfile = null
      if (punchItem.gc_verified_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', punchItem.gc_verified_by)
          .single()
        verifierProfile = profile
      }

      return {
        ...punchItem,
        proof_photos: proofPhotos || [],
        gc_verifier: verifierProfile,
      }
    },
    enabled: !!punchItemId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Batch verify multiple punch items (GC action)
 */
export function useBatchVerifySubcontractorCompletions() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemIds,
      approve,
      rejectionReason,
    }: {
      punchItemIds: string[]
      approve: boolean
      rejectionReason?: string
    }) => {
      if (!userProfile?.id) { throw new Error('User not authenticated') }
      if (punchItemIds.length === 0) { throw new Error('No punch items selected') }

      const results = await Promise.allSettled(
        punchItemIds.map(async (punchItemId) => {
          const { data, error } = await supabase
            .rpc('verify_subcontractor_completion', {
              p_punch_item_id: punchItemId,
              p_verified_by: userProfile.id,
              p_approve: approve,
              p_rejection_reason: rejectionReason || null,
            })

          if (error) { throw error }
          return data
        })
      )

      const successful = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      return { successful, failed, total: punchItemIds.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['punch-items', 'awaiting-verification'] })
    },
  })
}
