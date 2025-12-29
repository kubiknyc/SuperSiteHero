// File: /src/features/checklists/hooks/usePhotoQueue.ts
// React hook for photo queue management with auto-upload

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  queuePhoto,
  getPendingPhotos,
  getPhotosByResponse,
  markPhotoUploaded,
  markPhotoFailed,
  removeQueuedPhoto,
  getQueueStats,
  blobToFile,
  clearUploadedPhotos,
  retryFailedPhotos,
} from '@/lib/offline/photo-queue'
import { uploadChecklistPhoto } from '../utils/storageUtils'
import type { PhotoMetadata } from '@/types/offline'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

/**
 * Hook to manage photo upload queue with automatic sync
 */
export function usePhotoQueue(responseId?: string) {
  const _queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isProcessing, setIsProcessing] = useState(false)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get pending photos
  const { data: pendingPhotos = [], refetch: refetchPending } = useQuery({
    queryKey: ['photo-queue', 'pending'],
    queryFn: getPendingPhotos,
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // Get photos for specific response
  const { data: responsePhotos = [], refetch: refetchResponse } = useQuery({
    queryKey: ['photo-queue', 'response', responseId],
    queryFn: () => (responseId ? getPhotosByResponse(responseId) : Promise.resolve([])),
    enabled: !!responseId,
  })

  // Get queue statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['photo-queue', 'stats'],
    queryFn: getQueueStats,
    refetchInterval: 10000, // Poll every 10 seconds
  })

  // Add photo to queue
  const addToQueue = useMutation({
    mutationFn: async ({
      checklistId,
      responseId,
      file,
      metadata,
    }: {
      checklistId: string
      responseId: string
      file: File
      metadata?: PhotoMetadata
    }) => {
      return await queuePhoto(checklistId, responseId, file, metadata)
    },
    onSuccess: () => {
      refetchPending()
      refetchStats()
      if (responseId) {
        refetchResponse()
      }
      toast.success('Photo queued for upload')
    },
    onError: (error) => {
      logger.error('Failed to queue photo:', error)
      toast.error('Failed to queue photo')
    },
  })

  // Remove photo from queue
  const removeFromQueue = useMutation({
    mutationFn: async (id: string) => {
      await removeQueuedPhoto(id)
    },
    onSuccess: () => {
      refetchPending()
      refetchStats()
      if (responseId) {
        refetchResponse()
      }
    },
    onError: (error) => {
      logger.error('Failed to remove photo:', error)
      toast.error('Failed to remove photo')
    },
  })

  // Process photo queue (upload pending photos)
  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing) {
      logger.log('Skipping queue processing:', { isOnline, isProcessing })
      return
    }

    setIsProcessing(true)

    try {
      const pending = await getPendingPhotos()

      if (pending.length === 0) {
        logger.log('No pending photos to upload')
        setIsProcessing(false)
        return
      }

      logger.log(`Processing ${pending.length} pending photos`)

      for (const photo of pending) {
        try {
          // Convert blob back to File
          const file = blobToFile(photo.file, photo.fileName)

          // Upload to storage
          const uploadedUrl = await uploadChecklistPhoto(
            file,
            photo.checklistId,
            photo.responseId
          )

          // Mark as uploaded
          await markPhotoUploaded(photo.id, uploadedUrl)

          logger.log(`Successfully uploaded photo ${photo.id}`)
        } catch (error) {
          logger.error(`Failed to upload photo ${photo.id}:`, error)
          await markPhotoFailed(photo.id, String(error))
        }
      }

      // Refresh data
      await refetchPending()
      await refetchStats()
      if (responseId) {
        await refetchResponse()
      }

      toast.success(`Uploaded ${pending.length} photo${pending.length > 1 ? 's' : ''}`)
    } catch (error) {
      logger.error('Queue processing error:', error)
      toast.error('Failed to process photo queue')
    } finally {
      setIsProcessing(false)
    }
  }, [isOnline, isProcessing, refetchPending, refetchStats, refetchResponse, responseId])

  // Auto-process queue when online
  useEffect(() => {
    if (isOnline && pendingPhotos.length > 0 && !isProcessing) {
      logger.log('Device is online, processing queue...')
      processQueue()
    }
  }, [isOnline, pendingPhotos.length, isProcessing, processQueue])

  // Clear uploaded photos
  const clearUploaded = useMutation({
    mutationFn: clearUploadedPhotos,
    onSuccess: (count) => {
      refetchPending()
      refetchStats()
      if (responseId) {
        refetchResponse()
      }
      toast.success(`Cleared ${count} uploaded photo${count > 1 ? 's' : ''}`)
    },
    onError: (error) => {
      logger.error('Failed to clear uploaded photos:', error)
      toast.error('Failed to clear uploaded photos')
    },
  })

  // Retry failed photos
  const retryFailed = useMutation({
    mutationFn: retryFailedPhotos,
    onSuccess: (photos) => {
      refetchPending()
      refetchStats()
      if (responseId) {
        refetchResponse()
      }
      toast.success(`Retrying ${photos.length} failed photo${photos.length > 1 ? 's' : ''}`)

      // Process queue after resetting failed photos
      if (isOnline) {
        processQueue()
      }
    },
    onError: (error) => {
      logger.error('Failed to retry photos:', error)
      toast.error('Failed to retry failed photos')
    },
  })

  return {
    // State
    isOnline,
    isProcessing,
    pendingPhotos,
    responsePhotos,
    stats,

    // Actions
    addToQueue: addToQueue.mutateAsync,
    removeFromQueue: removeFromQueue.mutateAsync,
    processQueue,
    clearUploaded: clearUploaded.mutateAsync,
    retryFailed: retryFailed.mutateAsync,

    // Loading states
    isAddingToQueue: addToQueue.isPending,
    isRemoving: removeFromQueue.isPending,
    isClearing: clearUploaded.isPending,
    isRetrying: retryFailed.isPending,
  }
}

/**
 * Get uploaded photo URLs for a response (from queue)
 */
export function useUploadedPhotoUrls(responseId: string): string[] {
  const { data: photos = [] } = useQuery({
    queryKey: ['photo-queue', 'response', responseId, 'uploaded'],
    queryFn: async () => {
      const all = await getPhotosByResponse(responseId)
      return all.filter((p) => p.status === 'uploaded' && p.uploadedUrl)
    },
  })

  return photos.map((p) => p.uploadedUrl!).filter(Boolean)
}
