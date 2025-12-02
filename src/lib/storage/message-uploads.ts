/**
 * Message Attachment Upload Utilities
 *
 * Handles file uploads to Supabase Storage for message attachments
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

export interface UploadedFile {
  url: string
  path: string
  name: string
  type: string
  size: number
}

/**
 * Upload a file attachment for a message
 * File path format: {conversationId}/{userId}/{timestamp}-{random}.{ext}
 */
export async function uploadMessageAttachment(
  conversationId: string,
  userId: string,
  file: File
): Promise<UploadedFile> {
  // Validate file size (50MB limit)
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit. File: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  // Generate unique file name
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const fileName = `${timestamp}-${random}.${fileExt}`

  // Construct file path: conversationId/userId/fileName
  const filePath = `${conversationId}/${userId}/${fileName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    logger.error('File upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL (even though bucket is private, we need the path)
  const { data: urlData } = supabase.storage
    .from('message-attachments')
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
 * Upload multiple files
 */
export async function uploadMessageAttachments(
  conversationId: string,
  userId: string,
  files: File[]
): Promise<UploadedFile[]> {
  const uploadPromises = files.map((file) =>
    uploadMessageAttachment(conversationId, userId, file)
  )

  return Promise.all(uploadPromises)
}

/**
 * Delete a message attachment
 */
export async function deleteMessageAttachment(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('message-attachments')
    .remove([filePath])

  if (error) {
    logger.error('File deletion error:', error)
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Delete multiple attachments
 */
export async function deleteMessageAttachments(filePaths: string[]): Promise<void> {
  const { error } = await supabase.storage
    .from('message-attachments')
    .remove(filePaths)

  if (error) {
    logger.error('Bulk file deletion error:', error)
    throw new Error(`Failed to delete files: ${error.message}`)
  }
}

/**
 * Get signed URL for private file access (for future use)
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('message-attachments')
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}
