// File: /src/features/checklists/utils/imageUtils.ts
// Image compression, validation, and optimization utilities for checklist photos
// Phase: 3.2 - Photo & Signature Capture

import imageCompression from 'browser-image-compression'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration for image compression
 */
export interface ImageCompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  quality?: number
}

/**
 * Default compression options
 */
const DEFAULT_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 2, // 2MB max file size
  maxWidthOrHeight: 1920, // Max dimension for photos
  useWebWorker: true, // Use web worker for better performance
  quality: 0.8, // 80% quality for JPEG
}

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

/**
 * Maximum file size in bytes (10MB - before compression)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Compress an image file for optimized upload
 * @param file - The image file to compress
 * @param options - Optional compression settings
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  options?: ImageCompressionOptions
): Promise<File> {
  const compressionOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)

    // Preserve original filename
    const finalFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    })

    logger.log('Image compression complete:', {
      originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      compressedSize: `${(finalFile.size / 1024 / 1024).toFixed(2)}MB`,
      reduction: `${(((file.size - finalFile.size) / file.size) * 100).toFixed(1)}%`,
    })

    return finalFile
  } catch (error) {
    logger.error('Image compression failed:', error)
    throw new Error('Failed to compress image. Please try a different image.')
  }
}

/**
 * Validate an image file
 * @param file - The file to validate
 * @returns Validation result with optional error message
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: JPEG, PNG, WebP, HEIC`,
    }
  }

  // Check file size (before compression)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    }
  }

  return { valid: true }
}

/**
 * Generate a thumbnail preview from an image file
 * @param file - The image file
 * @param maxSize - Maximum width/height for thumbnail (default: 200px)
 * @returns Base64 data URL for preview
 */
export async function generateThumbnail(file: File, maxSize: number = 200): Promise<string> {
  try {
    const thumbnailFile = await imageCompression(file, {
      maxSizeMB: 0.1, // 100KB max for thumbnail
      maxWidthOrHeight: maxSize,
      useWebWorker: true,
    })

    return await imageCompression.getDataUrlFromFile(thumbnailFile)
  } catch (error) {
    logger.error('Thumbnail generation failed:', error)
    // Fallback to original file data URL
    return await imageCompression.getDataUrlFromFile(file)
  }
}

/**
 * Resize image for mobile optimization
 * @param file - The image file
 * @returns Resized File object
 */
export async function resizeImageForMobile(file: File): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 1, // 1MB max for mobile
    maxWidthOrHeight: 1280, // Smaller dimension for mobile
    quality: 0.75,
  })
}

/**
 * Convert data URL to File object
 * @param dataUrl - Base64 data URL
 * @param filename - Desired filename
 * @returns File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

/**
 * Generate a safe filename from original filename
 * @param originalName - Original filename
 * @param prefix - Optional prefix (default: 'photo')
 * @returns Sanitized filename with timestamp
 */
export function generateSafeFilename(originalName: string, prefix: string = 'photo'): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'

  return `${prefix}-${timestamp}-${randomId}.${ext}`
}

/**
 * Check if device has camera support
 * @returns True if camera is likely available
 */
export function hasCameraSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator.mediaDevices?.getUserMedia !== undefined ||
      // Fallback for older browsers
      (navigator as any).getUserMedia !== undefined)
  )
}

/**
 * Get optimal image format based on browser support
 * @returns Preferred image format ('webp' or 'jpeg')
 */
export function getOptimalImageFormat(): 'webp' | 'jpeg' {
  // Check for WebP support
  const canvas = document.createElement('canvas')
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'webp' : 'jpeg'
  }
  return 'jpeg'
}
