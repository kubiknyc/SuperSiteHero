// File: /src/lib/offline/photo-queue.ts
// Photo queue operations for offline photo upload management

import { v4 as uuidv4 } from 'uuid'
import type { QueuedPhoto, PhotoMetadata } from '@/types/offline'
import {
  getDatabase,
  STORES,
  addToStore,
  putInStore,
  deleteFromStore,
  getByIndex,
  getAllFromStore,
  getFromStore,
} from './indexeddb'
import { logger } from '@/lib/utils/logger'

/**
 * Add a photo to the upload queue
 */
export async function queuePhoto(
  checklistId: string,
  responseId: string,
  file: File,
  metadata?: PhotoMetadata
): Promise<QueuedPhoto> {
  const queuedPhoto: QueuedPhoto = {
    id: uuidv4(),
    checklistId,
    responseId,
    file: new Blob([file], { type: file.type }),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    metadata,
  }

  await addToStore(STORES.PHOTO_QUEUE, queuedPhoto)
  logger.log(`Queued photo ${queuedPhoto.id} for upload`, metadata ? 'with metadata' : '')

  return queuedPhoto
}

/**
 * Get all pending photos in the queue
 */
export async function getPendingPhotos(): Promise<QueuedPhoto[]> {
  return await getByIndex<QueuedPhoto>(STORES.PHOTO_QUEUE, 'status', 'pending')
}

/**
 * Get all photos for a specific response
 */
export async function getPhotosByResponse(responseId: string): Promise<QueuedPhoto[]> {
  return await getByIndex<QueuedPhoto>(STORES.PHOTO_QUEUE, 'responseId', responseId)
}

/**
 * Get all photos for a specific checklist
 */
export async function getPhotosByChecklist(checklistId: string): Promise<QueuedPhoto[]> {
  return await getByIndex<QueuedPhoto>(STORES.PHOTO_QUEUE, 'checklistId', checklistId)
}

/**
 * Get a specific queued photo by ID
 */
export async function getQueuedPhoto(id: string): Promise<QueuedPhoto | undefined> {
  return await getFromStore<QueuedPhoto>(STORES.PHOTO_QUEUE, id)
}

/**
 * Update a queued photo's status
 */
export async function updatePhotoStatus(
  id: string,
  status: QueuedPhoto['status'],
  error?: string,
  uploadedUrl?: string
): Promise<void> {
  const photo = await getQueuedPhoto(id)
  if (!photo) {
    throw new Error(`Queued photo ${id} not found`)
  }

  const updates: Partial<QueuedPhoto> = {
    ...photo,
    status,
    error,
    uploadedUrl,
  }

  if (status === 'uploading') {
    updates.retryCount = (photo.retryCount || 0) + 1
  }

  await putInStore(STORES.PHOTO_QUEUE, updates as QueuedPhoto)
  logger.log(`Updated photo ${id} status to ${status}`)
}

/**
 * Mark a photo as uploaded successfully
 */
export async function markPhotoUploaded(id: string, uploadedUrl: string): Promise<void> {
  await updatePhotoStatus(id, 'uploaded', undefined, uploadedUrl)
}

/**
 * Mark a photo upload as failed
 */
export async function markPhotoFailed(id: string, error: string): Promise<void> {
  await updatePhotoStatus(id, 'failed', error)
}

/**
 * Remove a photo from the queue
 */
export async function removeQueuedPhoto(id: string): Promise<void> {
  await deleteFromStore(STORES.PHOTO_QUEUE, id)
  logger.log(`Removed photo ${id} from queue`)
}

/**
 * Get count of pending photos
 */
export async function getPendingPhotoCount(): Promise<number> {
  const pending = await getPendingPhotos()
  return pending.length
}

/**
 * Get all photos in the queue (any status)
 */
export async function getAllQueuedPhotos(): Promise<QueuedPhoto[]> {
  return await getAllFromStore<QueuedPhoto>(STORES.PHOTO_QUEUE)
}

/**
 * Clear all uploaded photos from the queue
 */
export async function clearUploadedPhotos(): Promise<number> {
  const uploaded = await getByIndex<QueuedPhoto>(STORES.PHOTO_QUEUE, 'status', 'uploaded')

  for (const photo of uploaded) {
    await removeQueuedPhoto(photo.id)
  }

  logger.log(`Cleared ${uploaded.length} uploaded photos from queue`)
  return uploaded.length
}

/**
 * Retry failed photo uploads
 */
export async function retryFailedPhotos(): Promise<QueuedPhoto[]> {
  const failed = await getByIndex<QueuedPhoto>(STORES.PHOTO_QUEUE, 'status', 'failed')

  for (const photo of failed) {
    // Only retry if retry count is less than 3
    if (photo.retryCount < 3) {
      await updatePhotoStatus(photo.id, 'pending')
    }
  }

  logger.log(`Reset ${failed.length} failed photos to pending`)
  return failed
}

/**
 * Get upload queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number
  pending: number
  uploading: number
  failed: number
  uploaded: number
  totalSize: number
}> {
  const all = await getAllQueuedPhotos()

  const stats = {
    total: all.length,
    pending: 0,
    uploading: 0,
    failed: 0,
    uploaded: 0,
    totalSize: 0,
  }

  for (const photo of all) {
    stats.totalSize += photo.fileSize

    switch (photo.status) {
      case 'pending':
        stats.pending++
        break
      case 'uploading':
        stats.uploading++
        break
      case 'failed':
        stats.failed++
        break
      case 'uploaded':
        stats.uploaded++
        break
    }
  }

  return stats
}

/**
 * Convert blob back to File for upload
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type })
}
