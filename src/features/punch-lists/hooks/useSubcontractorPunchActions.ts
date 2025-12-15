// File: /src/features/punch-lists/hooks/useSubcontractorPunchActions.ts
// Hook for subcontractor punch item actions with offline support
// Milestone 1.1: Enhanced Punch List Mobile UX

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { useIsOnline } from '@/stores/offline-store'
import {
  useOfflinePunchStore,
  type StatusChangeRequest,
  type OfflinePhoto,
} from '../store/offlinePunchStore'
import { uploadPunchItemPhoto } from '@/lib/storage/punch-item-uploads'
import { compressImage } from '@/lib/utils/imageCompression'
import { toast } from '@/lib/notifications/ToastContext'
import { logger } from '@/lib/utils/logger'
import type { PunchItemStatus } from '@/types/database'

/**
 * Trigger haptic feedback on supported devices
 */
function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore - vibration may not be supported
    }
  }
}

interface SubcontractorUpdateInput {
  punchItemId: string
  notes?: string
  statusChangeRequest?: {
    requested_status: PunchItemStatus
    reason: string
  }
  proofPhotos?: File[]
}

interface UseSubcontractorPunchActionsReturn {
  /** Add notes to a punch item as a subcontractor */
  addNotes: (punchItemId: string, notes: string) => Promise<void>
  /** Request a status change (pending GC approval) */
  requestStatusChange: (
    punchItemId: string,
    requestedStatus: PunchItemStatus,
    reason: string
  ) => Promise<void>
  /** Upload proof of completion photos */
  uploadProofPhotos: (punchItemId: string, files: File[]) => Promise<void>
  /** Combined update function */
  submitUpdate: (input: SubcontractorUpdateInput) => Promise<void>
  /** Loading state */
  isLoading: boolean
  /** Whether currently online */
  isOnline: boolean
  /** Number of pending offline updates */
  pendingUpdates: number
}

/**
 * Hook for subcontractor-specific punch item actions
 * Supports offline mode with automatic sync when online
 */
export function useSubcontractorPunchActions(): UseSubcontractorPunchActionsReturn {
  const isOnline = useIsOnline()
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  const {
    addSubcontractorNotes,
    requestStatusChange: queueStatusChange,
    addProofOfCompletionPhoto,
    getPendingSubcontractorUpdates,
  } = useOfflinePunchStore()

  // Mutation for online notes update
  const notesMutation = useMutation({
    mutationFn: async ({
      punchItemId,
      notes,
    }: {
      punchItemId: string
      notes: string
    }) => {
      const { data, error } = await supabase
        .from('punch_items')
        .update({
          subcontractor_notes: notes,
          subcontractor_updated_at: new Date().toISOString(),
        })
        .eq('id', punchItemId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      triggerHaptic([10, 30, 10])
    },
  })

  // Mutation for online status change request
  const statusChangeMutation = useMutation({
    mutationFn: async ({
      punchItemId,
      request,
    }: {
      punchItemId: string
      request: StatusChangeRequest
    }) => {
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

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', data.id] })
      triggerHaptic([10, 50, 10, 50, 10])
    },
  })

  // Mutation for uploading proof photos
  const photoMutation = useMutation({
    mutationFn: async ({
      punchItemId,
      projectId,
      files,
    }: {
      punchItemId: string
      projectId: string
      files: File[]
    }) => {
      const uploadedUrls: string[] = []

      for (const file of files) {
        // Compress image before upload
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          maxSizeBytes: 1024 * 1024, // 1MB
          quality: 0.8,
        })

        const result = await uploadPunchItemPhoto(projectId, punchItemId, compressed)
        uploadedUrls.push(result.url)

        // Create photo record with is_proof_of_completion flag
        const { error } = await supabase.from('photos').insert({
          project_id: projectId,
          punch_item_id: punchItemId,
          file_name: compressed.name,
          file_url: result.url,
          is_proof_of_completion: true,
          source: 'subcontractor',
          created_by: userProfile?.id,
        })

        if (error) {
          logger.warn('Failed to create photo record:', error)
        }
      }

      // Update punch item timestamp
      await supabase
        .from('punch_items')
        .update({ subcontractor_updated_at: new Date().toISOString() })
        .eq('id', punchItemId)

      return uploadedUrls
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', variables.punchItemId] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      triggerHaptic([10, 30, 10])
    },
  })

  // Add notes
  const addNotes = useCallback(
    async (punchItemId: string, notes: string) => {
      if (!notes.trim()) {
        toast.error('Please enter notes')
        return
      }

      if (isOnline) {
        try {
          await notesMutation.mutateAsync({ punchItemId, notes })
          toast.success('Notes added successfully')
        } catch (error) {
          logger.error('Failed to add notes:', error)
          toast.error('Failed to add notes')
          throw error
        }
      } else {
        // Queue for offline sync
        addSubcontractorNotes(punchItemId, undefined, notes)
        triggerHaptic(10)
        toast.success('Notes saved offline - will sync when online')
      }
    },
    [isOnline, notesMutation, addSubcontractorNotes]
  )

  // Request status change
  const requestStatusChange = useCallback(
    async (punchItemId: string, requestedStatus: PunchItemStatus, reason: string) => {
      if (!reason.trim()) {
        toast.error('Please provide a reason for the status change request')
        return
      }

      const request: StatusChangeRequest = {
        requested_status: requestedStatus,
        reason: reason.trim(),
        requested_by: userProfile?.id || 'unknown',
        requested_at: new Date().toISOString(),
      }

      if (isOnline) {
        try {
          await statusChangeMutation.mutateAsync({ punchItemId, request })
          toast.success('Status change requested - pending GC approval')
        } catch (error) {
          logger.error('Failed to request status change:', error)
          toast.error('Failed to request status change')
          throw error
        }
      } else {
        // Queue for offline sync
        queueStatusChange(punchItemId, undefined, request)
        triggerHaptic([10, 30, 10])
        toast.success('Status change request saved offline - will sync when online')
      }
    },
    [isOnline, statusChangeMutation, queueStatusChange, userProfile?.id]
  )

  // Upload proof photos
  const uploadProofPhotos = useCallback(
    async (punchItemId: string, files: File[]) => {
      if (files.length === 0) {
        toast.error('Please select at least one photo')
        return
      }

      if (isOnline) {
        // Get project ID from punch item
        const { data: punchItem } = await supabase
          .from('punch_items')
          .select('project_id')
          .eq('id', punchItemId)
          .single()

        if (!punchItem) {
          toast.error('Punch item not found')
          return
        }

        try {
          toast.loading('Uploading photos...')
          await photoMutation.mutateAsync({
            punchItemId,
            projectId: punchItem.project_id,
            files,
          })
          toast.dismiss()
          toast.success(`${files.length} proof photo(s) uploaded`)
        } catch (error) {
          toast.dismiss()
          logger.error('Failed to upload photos:', error)
          toast.error('Failed to upload photos')
          throw error
        }
      } else {
        // Store photos for offline upload
        for (const file of files) {
          const localUrl = URL.createObjectURL(file)
          const offlinePhoto: OfflinePhoto = {
            id: uuidv4(),
            localUrl,
            file,
            isProofOfCompletion: true,
            createdAt: new Date().toISOString(),
          }
          addProofOfCompletionPhoto(punchItemId, undefined, offlinePhoto)
        }
        triggerHaptic(10)
        toast.success(`${files.length} photo(s) saved offline - will upload when online`)
      }
    },
    [isOnline, photoMutation, addProofOfCompletionPhoto]
  )

  // Combined update function
  const submitUpdate = useCallback(
    async (input: SubcontractorUpdateInput) => {
      const { punchItemId, notes, statusChangeRequest, proofPhotos } = input

      try {
        // Process notes
        if (notes) {
          await addNotes(punchItemId, notes)
        }

        // Process status change request
        if (statusChangeRequest) {
          await requestStatusChange(
            punchItemId,
            statusChangeRequest.requested_status,
            statusChangeRequest.reason
          )
        }

        // Process proof photos
        if (proofPhotos && proofPhotos.length > 0) {
          await uploadProofPhotos(punchItemId, proofPhotos)
        }
      } catch (error) {
        logger.error('Failed to submit update:', error)
        throw error
      }
    },
    [addNotes, requestStatusChange, uploadProofPhotos]
  )

  const isLoading =
    notesMutation.isPending ||
    statusChangeMutation.isPending ||
    photoMutation.isPending

  const pendingUpdates = getPendingSubcontractorUpdates().length

  return {
    addNotes,
    requestStatusChange,
    uploadProofPhotos,
    submitUpdate,
    isLoading,
    isOnline,
    pendingUpdates,
  }
}

export default useSubcontractorPunchActions
