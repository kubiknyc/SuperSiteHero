/**
 * File Validation Service
 *
 * Client-side service that calls the server-side validation Edge Function
 * for defense-in-depth file upload security.
 */

import { supabase } from '@/lib/supabase'

export interface ServerValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
  fileInfo?: {
    filename: string
    size: number
    sizeFormatted: string
    detectedMimeType: string
    signatureValid: boolean
  }
  auditId?: string
}

export type ValidationPreset = 'documents' | 'images' | 'pdfs' | 'avatar'

export interface ServerValidationOptions {
  /** Validation preset to use */
  preset?: ValidationPreset
  /** Target bucket name (for audit logging) */
  bucket?: string
  /** Custom max size in bytes (overrides preset) */
  maxSize?: number
}

/**
 * Validate a file using the server-side Edge Function
 *
 * This provides defense-in-depth security by validating files server-side
 * in addition to client-side validation. Use this before uploading files
 * to Supabase Storage for enhanced security.
 *
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Validation result from server
 *
 * @example
 * ```ts
 * const result = await validateFileServer(file, { preset: 'documents', bucket: 'project-files' })
 * if (!result.valid) {
 *   throw new Error(result.error)
 * }
 * // Proceed with upload
 * ```
 */
export async function validateFileServer(
  file: File,
  options: ServerValidationOptions = {}
): Promise<ServerValidationResult> {
  const formData = new FormData()
  formData.append('file', file)

  if (options.preset) {
    formData.append('preset', options.preset)
  }
  if (options.bucket) {
    formData.append('bucket', options.bucket)
  }
  if (options.maxSize) {
    formData.append('maxSize', options.maxSize.toString())
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-file-upload`,
    {
      method: 'POST',
      headers: {
        Authorization: session?.access_token
          ? `Bearer ${session.access_token}`
          : '',
      },
      body: formData,
    }
  )

  const result: ServerValidationResult = await response.json()
  return result
}

/**
 * Validate multiple files using the server-side Edge Function
 *
 * @param files - Files to validate
 * @param options - Validation options (applied to all files)
 * @returns Map of file to validation result
 */
export async function validateFilesServer(
  files: File[] | FileList,
  options: ServerValidationOptions = {}
): Promise<Map<File, ServerValidationResult>> {
  const fileArray = Array.from(files)
  const results = new Map<File, ServerValidationResult>()

  // Validate files in parallel (with concurrency limit)
  const CONCURRENCY = 3
  for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
    const batch = fileArray.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((file) => validateFileServer(file, options))
    )
    batch.forEach((file, index) => {
      results.set(file, batchResults[index])
    })
  }

  return results
}

/**
 * Check if server-side validation is available
 * (Edge Function is deployed and accessible)
 */
export async function isServerValidationAvailable(): Promise<boolean> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-file-upload`,
      {
        method: 'OPTIONS',
      }
    )
    return response.ok
  } catch {
    return false
  }
}
