/**
 * Subcontractor Punch Updates Hook
 * Milestone 4.2: Punch Item Updates with Photo Proof
 *
 * Provides functions for subcontractors to:
 * - View assigned punch items
 * - Request completion status (requires photo proof)
 * - Upload proof of completion photos
 * - Add notes
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { useIsOnline } from '@/stores/offline-store'
import {
  useOfflinePunchStore,
  type StatusChangeRequest,
  type OfflinePhoto,
} from '@/features/punch-lists/store/offlinePunchStore'
import { uploadPunchItemPhoto } from '@/lib/storage/punch-item-uploads'
import { compressImage } from '@/lib/utils/imageCompression'
import { toast } from '@/lib/notifications/ToastContext'
import { logger } from '@/lib/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import type { PunchItemStatus } from '@/types/database'

// Query keys
export const subPunchKeys = {
  all: ['subcontractor', 'punch-items'] as const,
  myItems: (userId: string) => [...subPunchKeys.all, 'my', userId] as const,
  item: (id: string) => [...subPunchKeys.all, 'item', id] as const,
  proofPhotos: (punchItemId: string) => [...subPunchKeys.all, 'proof-photos', punchItemId] as const,
}

// Types
interface SubcontractorPunchItem {
  id: string
  project_id: string
  title: string
  description: string | null
  status: PunchItemStatus
  priority: string
  trade: string | null
  building: string | null
  floor: string | null
  room: string | null
  area: string | null
  location_notes: string | null
  due_date: string | null
  assigned_to: string | null
  subcontractor_id: string | null
  subcontractor_notes: string | null
  subcontractor_updated_at: string | null
  status_change_request: StatusChangeRequest | null
  status_change_requested_at: string | null
  gc_verification_required: boolean
  gc_verified_by: string | null
  gc_verified_at: string | null
  created_at: string
  updated_at: string
  project_name?: string
  has_proof_photos?: boolean
}

interface ProofPhoto {
  id: string
  punch_item_id: string
  file_url: string
  file_name: string
  caption: string | null
  created_at: string
  created_by: string | null
}

// Trigger haptic feedback
function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore
    }
  }
}

/**
 * Get all punch items assigned to the current subcontractor
 */
export function useMyPunchItems() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorPunchItem[]>({
    queryKey: subPunchKeys.myItems(userProfile?.id || ''),
    queryFn: async () => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      // First get the user's email to find their subcontractor associations
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userProfile.id)
        .single()

      if (!profile?.email) {
        return []
      }

      // Get subcontractor IDs associated with this email
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', profile.email)

      if (!contacts || contacts.length === 0) {
        return []
      }

      const contactIds = contacts.map(c => c.id)

      const { data: subcontractors } = await supabase
        .from('subcontractors')
        .select('id')
        .in('contact_id', contactIds)
        .is('deleted_at', null)

      if (!subcontractors || subcontractors.length === 0) {
        return []
      }

      const subcontractorIds = subcontractors.map(s => s.id)

      // Get punch items assigned to these subcontractors
      const { data, error } = await supabase
        .from('punch_items')
        .select(`
          *,
          projects(name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Transform data and check for proof photos
      const items = await Promise.all(
        (data || []).map(async (item: any) => {
          // Check if item has proof photos
          const { count } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('punch_item_id', item.id)
            .eq('is_proof_of_completion', true)

          return {
            ...item,
            project_name: item.projects?.name,
            has_proof_photos: (count || 0) > 0,
          }
        })
      )

      return items
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Get proof of completion photos for a punch item
 */
export function useProofPhotos(punchItemId: string | undefined) {
  return useQuery<ProofPhoto[]>({
    queryKey: subPunchKeys.proofPhotos(punchItemId || ''),
    queryFn: async () => {
      if (!punchItemId) {
        return []
      }

      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('punch_item_id', punchItemId)
        .eq('is_proof_of_completion', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    },
    enabled: !!punchItemId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Request completion status for a punch item
 */
export function useRequestCompletion() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const isOnline = useIsOnline()
  const { requestStatusChange: queueStatusChange } = useOfflinePunchStore()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      reason,
    }: {
      punchItemId: string
      reason: string
    }) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const request: StatusChangeRequest = {
        requested_status: 'completed',
        reason: reason.trim() || 'Work completed, pending GC verification',
        requested_by: userProfile.id,
        requested_at: new Date().toISOString(),
      }

      if (isOnline) {
        // Verify proof photos exist before allowing completion request
        const { count, error: countError } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('punch_item_id', punchItemId)
          .eq('is_proof_of_completion', true)

        if (countError) {
          throw countError
        }

        if (!count || count === 0) {
          throw new Error('Photo proof is required before requesting completion')
        }

        // Submit status change request
        const { data, error } = await supabase
          .from('punch_items')
          .update({
            status_change_request: request,
            status_change_requested_at: new Date().toISOString(),
            subcontractor_updated_at: new Date().toISOString(),
          })
          .eq('id', punchItemId)
          .select()
          .single()

        if (error) {
          throw error
        }

        return data
      } else {
        // Queue for offline sync
        queueStatusChange(punchItemId, undefined, request)
        triggerHaptic([10, 30, 10])
        return { id: punchItemId, offline: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subPunchKeys.all })
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      triggerHaptic([10, 50, 10, 50, 10])
      toast.success('Completion request submitted - pending GC verification')
    },
    onError: (error) => {
      logger.error('Failed to request completion:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to request completion')
    },
  })
}

/**
 * Upload proof of completion photos
 */
export function useUploadProofPhotos() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const isOnline = useIsOnline()
  const { addProofOfCompletionPhoto } = useOfflinePunchStore()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      projectId,
      files,
    }: {
      punchItemId: string
      projectId: string
      files: File[]
    }) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      if (files.length === 0) {
        throw new Error('No files selected')
      }

      const uploadedPhotos: ProofPhoto[] = []

      for (const file of files) {
        // Compress image
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          maxSizeBytes: 1024 * 1024,
          quality: 0.8,
        })

        if (isOnline) {
          // Upload to storage
          const result = await uploadPunchItemPhoto(projectId, punchItemId, compressed)

          // Create photo record
          const { data, error } = await supabase
            .from('photos')
            .insert({
              project_id: projectId,
              punch_item_id: punchItemId,
              file_name: compressed.name,
              file_url: result.url,
              is_proof_of_completion: true,
              source: 'subcontractor',
              created_by: userProfile.id,
            })
            .select()
            .single()

          if (error) {
            logger.warn('Failed to create photo record:', error)
          } else {
            uploadedPhotos.push(data)
          }
        } else {
          // Store for offline upload
          const localUrl = URL.createObjectURL(compressed)
          const offlinePhoto: OfflinePhoto = {
            id: uuidv4(),
            localUrl,
            file: compressed,
            isProofOfCompletion: true,
            createdAt: new Date().toISOString(),
          }
          addProofOfCompletionPhoto(punchItemId, undefined, offlinePhoto)
        }
      }

      // Update punch item timestamp
      if (isOnline) {
        await supabase
          .from('punch_items')
          .update({ subcontractor_updated_at: new Date().toISOString() })
          .eq('id', punchItemId)
      }

      return uploadedPhotos
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subPunchKeys.proofPhotos(variables.punchItemId) })
      queryClient.invalidateQueries({ queryKey: subPunchKeys.all })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      triggerHaptic([10, 30, 10])

      if (isOnline) {
        toast.success(`${variables.files.length} proof photo(s) uploaded`)
      } else {
        toast.success(`${variables.files.length} photo(s) saved offline`)
      }
    },
    onError: (error) => {
      logger.error('Failed to upload photos:', error)
      toast.error('Failed to upload photos')
    },
  })
}

/**
 * Add notes to a punch item
 */
export function useAddSubcontractorNote() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const isOnline = useIsOnline()
  const { addSubcontractorNotes } = useOfflinePunchStore()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      notes,
    }: {
      punchItemId: string
      notes: string
    }) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      if (!notes.trim()) {
        throw new Error('Notes cannot be empty')
      }

      if (isOnline) {
        const { data, error } = await supabase
          .from('punch_items')
          .update({
            subcontractor_notes: notes.trim(),
            subcontractor_updated_at: new Date().toISOString(),
          })
          .eq('id', punchItemId)
          .select()
          .single()

        if (error) {
          throw error
        }

        return data
      } else {
        // Queue for offline sync
        addSubcontractorNotes(punchItemId, undefined, notes.trim())
        return { id: punchItemId, offline: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subPunchKeys.all })
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      triggerHaptic([10, 30, 10])

      if (isOnline) {
        toast.success('Notes saved')
      } else {
        toast.success('Notes saved offline')
      }
    },
    onError: (error) => {
      logger.error('Failed to save notes:', error)
      toast.error('Failed to save notes')
    },
  })
}

/**
 * Combined hook for all subcontractor punch item actions
 */
export function useSubcontractorPunchUpdates() {
  const isOnline = useIsOnline()
  const { getPendingSubcontractorUpdates } = useOfflinePunchStore()

  const myPunchItemsQuery = useMyPunchItems()
  const requestCompletionMutation = useRequestCompletion()
  const uploadPhotosMutation = useUploadProofPhotos()
  const addNoteMutation = useAddSubcontractorNote()

  const pendingUpdates = getPendingSubcontractorUpdates().length

  return {
    // Queries
    punchItems: myPunchItemsQuery.data || [],
    isLoading: myPunchItemsQuery.isLoading,
    isError: myPunchItemsQuery.isError,
    error: myPunchItemsQuery.error,
    refetch: myPunchItemsQuery.refetch,

    // Mutations
    requestCompletion: requestCompletionMutation.mutateAsync,
    uploadProofPhotos: uploadPhotosMutation.mutateAsync,
    addNote: addNoteMutation.mutateAsync,

    // State
    isOnline,
    pendingUpdates,
    isMutating:
      requestCompletionMutation.isPending ||
      uploadPhotosMutation.isPending ||
      addNoteMutation.isPending,
  }
}

export default useSubcontractorPunchUpdates
