// File: /src/features/checklists/utils/storageUtils.ts
// Supabase Storage utilities for checklist photos and signatures
// Phase: 3.2 - Photo & Signature Capture

import { supabase } from '@/lib/supabase'
import { generateSafeFilename, dataUrlToFile } from './imageUtils'
import { logger } from '@/lib/utils/logger'

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  PHOTOS: 'checklist-photos',
  SIGNATURES: 'checklist-signatures',
} as const

/**
 * Generate storage path for checklist files
 * @param checklistId - The checklist execution ID
 * @param responseId - The response ID
 * @param type - Type of file (photo or signature)
 * @returns Storage path string
 */
export function getChecklistStoragePath(
  checklistId: string,
  responseId: string,
  type: 'photo' | 'signature'
): string {
  return `${checklistId}/${responseId}`
}

/**
 * Upload a checklist photo to Supabase Storage
 * @param file - The image file to upload
 * @param checklistId - The checklist execution ID
 * @param responseId - The response ID
 * @returns Public URL of the uploaded file
 */
export async function uploadChecklistPhoto(
  file: File,
  checklistId: string,
  responseId: string
): Promise<string> {
  try {
    const path = getChecklistStoragePath(checklistId, responseId, 'photo')
    const filename = generateSafeFilename(file.name, 'photo')
    const filePath = `${path}/${filename}`

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.PHOTOS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      logger.error('Photo upload error:', error)
      throw new Error(`Failed to upload photo: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.PHOTOS)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    logger.error('Upload checklist photo failed:', error)
    throw error instanceof Error ? error : new Error('Failed to upload photo')
  }
}

/**
 * Upload a signature image to Supabase Storage
 * @param dataUrl - Base64 data URL of the signature
 * @param checklistId - The checklist execution ID
 * @param responseId - The response ID
 * @returns Public URL of the uploaded signature
 */
export async function uploadSignature(
  dataUrl: string,
  checklistId: string,
  responseId: string
): Promise<string> {
  try {
    // Convert data URL to File
    const filename = `signature-${Date.now()}.png`
    const file = dataUrlToFile(dataUrl, filename)

    const path = getChecklistStoragePath(checklistId, responseId, 'signature')
    const filePath = `${path}/${filename}`

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.SIGNATURES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow replacing signatures
      })

    if (error) {
      logger.error('Signature upload error:', error)
      throw new Error(`Failed to upload signature: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.SIGNATURES)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    logger.error('Upload signature failed:', error)
    throw error instanceof Error ? error : new Error('Failed to upload signature')
  }
}

/**
 * Delete a checklist photo from Supabase Storage
 * @param url - Public URL of the photo to delete
 * @returns void
 */
export async function deleteChecklistPhoto(url: string): Promise<void> {
  try {
    // Extract path from URL
    const path = extractPathFromUrl(url, STORAGE_BUCKETS.PHOTOS)

    if (!path) {
      throw new Error('Invalid photo URL')
    }

    const { error } = await supabase.storage.from(STORAGE_BUCKETS.PHOTOS).remove([path])

    if (error) {
      logger.error('Photo delete error:', error)
      throw new Error(`Failed to delete photo: ${error.message}`)
    }
  } catch (error) {
    logger.error('Delete checklist photo failed:', error)
    throw error instanceof Error ? error : new Error('Failed to delete photo')
  }
}

/**
 * Delete a signature from Supabase Storage
 * @param url - Public URL of the signature to delete
 * @returns void
 */
export async function deleteSignature(url: string): Promise<void> {
  try {
    // Extract path from URL
    const path = extractPathFromUrl(url, STORAGE_BUCKETS.SIGNATURES)

    if (!path) {
      throw new Error('Invalid signature URL')
    }

    const { error } = await supabase.storage.from(STORAGE_BUCKETS.SIGNATURES).remove([path])

    if (error) {
      logger.error('Signature delete error:', error)
      throw new Error(`Failed to delete signature: ${error.message}`)
    }
  } catch (error) {
    logger.error('Delete signature failed:', error)
    throw error instanceof Error ? error : new Error('Failed to delete signature')
  }
}

/**
 * Extract storage path from public URL
 * @param url - Public URL from Supabase
 * @param bucket - Bucket name
 * @returns Storage path or null if invalid
 */
function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const bucketSegment = `/object/public/${bucket}/`
    const index = url.indexOf(bucketSegment)

    if (index === -1) {
      return null
    }

    return url.substring(index + bucketSegment.length)
  } catch (error) {
    logger.error('Extract path from URL failed:', error)
    return null
  }
}

/**
 * Get signed URL for private file access
 * @param path - Storage path
 * @param bucket - Bucket name
 * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  path: string,
  bucket: keyof typeof STORAGE_BUCKETS,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const bucketName = STORAGE_BUCKETS[bucket]

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn)

    if (error || !data) {
      throw new Error(`Failed to create signed URL: ${error?.message}`)
    }

    return data.signedUrl
  } catch (error) {
    logger.error('Get signed URL failed:', error)
    throw error instanceof Error ? error : new Error('Failed to get signed URL')
  }
}
