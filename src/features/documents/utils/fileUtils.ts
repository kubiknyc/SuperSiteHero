// File: /src/features/documents/utils/fileUtils.ts
// Document file upload and utility functions

import { supabase } from '@/lib/supabase'
import {
  validateFileServer,
  type ServerValidationResult,
} from '@/lib/api/file-validation-service'

export interface FileValidationError {
  valid: false
  error: string
}

export interface FileValidationSuccess {
  valid: true
}

export type FileValidationResult = FileValidationError | FileValidationSuccess

// UUID regex for validating project IDs to prevent path traversal
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 50
): FileValidationResult {
  // Check file size (default 50MB)
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    }
  }

  // Check file type - allow common document and image types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'text/plain',
  ]

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed`,
    }
  }

  return { valid: true }
}

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Generate a unique file name for storage
 * Includes path traversal protection via UUID validation
 */
export function generateStorageFileName(
  projectId: string,
  originalFileName: string,
  timestamp: number = Date.now()
): string {
  // Validate projectId is a valid UUID to prevent path traversal attacks
  if (!UUID_REGEX.test(projectId)) {
    throw new Error('Invalid project ID format')
  }

  const ext = getFileExtension(originalFileName)
  // Sanitize extension to prevent double-extension attacks
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
  const cleanName = originalFileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars
    .substring(0, 50) // Limit name length

  return `${projectId}/${timestamp}-${cleanName}.${cleanExt}`
}

export interface UploadOptions {
  /** Bucket name (default: 'documents') */
  bucketName?: string
  /** Progress callback */
  onProgress?: (progress: number) => void
  /** Enable server-side validation (default: true in production) */
  serverValidation?: boolean
}

/**
 * Upload a file to Supabase Storage
 * Includes both client-side and optional server-side validation
 */
export async function uploadFile(
  file: File,
  projectId: string,
  options: UploadOptions = {}
): Promise<{ path: string; publicUrl: string; serverValidation?: ServerValidationResult }> {
  const {
    bucketName = 'documents',
    onProgress,
    serverValidation = import.meta.env.PROD, // Enable by default in production
  } = options

  // Client-side validation (fast, immediate feedback)
  const clientValidation = validateFile(file)
  if (!clientValidation.valid) {
    throw new Error((clientValidation as FileValidationError).error)
  }

  // Server-side validation (defense-in-depth)
  let serverResult: ServerValidationResult | undefined
  if (serverValidation) {
    try {
      serverResult = await validateFileServer(file, {
        preset: 'documents',
        bucket: bucketName,
      })

      if (!serverResult.valid) {
        throw new Error(serverResult.error || 'Server validation failed')
      }

      // Log warnings if any
      if (serverResult.warnings?.length) {
        console.warn('File validation warnings:', serverResult.warnings)
      }
    } catch (error) {
      // In production, fail if server validation fails
      // In development, log warning and continue
      if (import.meta.env.PROD) {
        throw error
      }
      console.warn('Server validation unavailable, proceeding with client validation only:', error)
    }
  }

  // Generate storage path
  const storagePath = generateStorageFileName(projectId, file.name)

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('Upload failed: No data returned')
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath)

    onProgress?.(100)

    return {
      path: storagePath,
      publicUrl: publicUrlData.publicUrl,
      serverValidation: serverResult,
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to upload file')
  }
}

/**
 * @deprecated Use uploadFile with options object instead
 */
export async function uploadFileLegacy(
  file: File,
  projectId: string,
  bucketName: string = 'documents',
  onProgress?: (progress: number) => void
): Promise<{ path: string; publicUrl: string }> {
  return uploadFile(file, projectId, { bucketName, onProgress, serverValidation: false })
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  storagePath: string,
  bucketName: string = 'documents'
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([storagePath])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to delete file')
  }
}

/**
 * Get a signed URL for downloading a private file
 */
export async function getSignedDownloadUrl(
  storagePath: string,
  bucketName: string = 'documents',
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      throw new Error(`Failed to generate download link: ${error.message}`)
    }

    return data.signedUrl
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to generate download link')
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) {return 'Unknown'}

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Get icon name for file type
 */
export function getFileTypeIcon(
  fileName: string
): 'pdf' | 'doc' | 'sheet' | 'image' | 'file' {
  const ext = getFileExtension(fileName).toLowerCase()

  if (ext === 'pdf') {return 'pdf'}
  if (['doc', 'docx'].includes(ext)) {return 'doc'}
  if (['xls', 'xlsx', 'csv'].includes(ext)) {return 'sheet'}
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'].includes(ext)) {return 'image'}

  return 'file'
}
