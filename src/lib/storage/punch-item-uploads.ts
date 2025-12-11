/**
 * Punch Item Photo Upload Utilities
 *
 * Handles photo uploads to Supabase Storage for punch items
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

export interface UploadedPhoto {
  url: string
  path: string
  name: string
  type: string
  size: number
}

/**
 * Upload a photo for a punch item
 * File path format: {projectId}/punch-items/{punchItemId}/{timestamp}-{random}.{ext}
 */
export async function uploadPunchItemPhoto(
  projectId: string,
  punchItemId: string,
  file: File
): Promise<UploadedPhoto> {
  // Validate file size (20MB limit for photos)
  const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Photo size exceeds 20MB limit. File: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`)
  }

  // Generate unique file name
  const fileExt = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const fileName = `${timestamp}-${random}.${fileExt}`

  // Construct file path: projectId/punch-items/punchItemId/fileName
  const filePath = `${projectId}/punch-items/${punchItemId}/${fileName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    logger.error('Photo upload error:', error)
    throw new Error(`Failed to upload photo: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath)

  return {
    url: urlData.publicUrl,
    path: filePath,
    name: file.name,
    type: file.type,
    size: file.size,
  }
}

/**
 * Upload multiple photos for a punch item
 */
export async function uploadPunchItemPhotos(
  projectId: string,
  punchItemId: string,
  files: File[]
): Promise<UploadedPhoto[]> {
  return Promise.all(
    files.map((file) => uploadPunchItemPhoto(projectId, punchItemId, file))
  )
}

/**
 * Delete a punch item photo
 */
export async function deletePunchItemPhoto(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('project-files')
    .remove([filePath])

  if (error) {
    logger.error('Photo delete error:', error)
    throw new Error(`Failed to delete photo: ${error.message}`)
  }
}

/**
 * Get a signed URL for a punch item photo (for private buckets)
 */
export async function getSignedPhotoUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    logger.error('Signed URL error:', error)
    throw new Error(`Failed to get signed URL: ${error.message}`)
  }

  return data.signedUrl
}
