/**
 * Image Compression Utilities
 * Client-side image compression for mobile photo uploads
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  maxSizeBytes?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  maxSizeBytes: 1024 * 1024, // 1MB
  quality: 0.8,
  mimeType: 'image/jpeg',
}

/**
 * Compress an image file using Canvas API
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed File
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // If file is already small enough and correct type, return as-is
  if (file.size <= opts.maxSizeBytes && file.type === opts.mimeType) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width
        width = opts.maxWidth
      }

      if (height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height
        height = opts.maxHeight
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw image with white background (for transparency handling)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Start with initial quality and reduce if needed
      let quality = opts.quality
      const attemptCompression = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'))
              return
            }

            // If still too large and quality can be reduced, try again
            if (blob.size > opts.maxSizeBytes && quality > 0.3) {
              quality -= 0.1
              attemptCompression()
              return
            }

            // Create new file with compressed data
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'),
              {
                type: opts.mimeType,
                lastModified: Date.now(),
              }
            )

            resolve(compressedFile)
          },
          opts.mimeType,
          quality
        )
      }

      attemptCompression()
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Create object URL from file
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compress multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to array of compressed Files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const results: File[] = []
  let completed = 0

  for (const file of files) {
    try {
      const compressed = await compressImage(file, options)
      results.push(compressed)
    } catch (error) {
      // If compression fails, use original file
      console.warn(`Compression failed for ${file.name}, using original:`, error)
      results.push(file)
    }

    completed++
    onProgress?.(completed, files.length)
  }

  return results
}

/**
 * Get image dimensions from file
 * @param file - Image file
 * @returns Promise resolving to { width, height }
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Create a thumbnail from an image file
 * @param file - Image file
 * @param maxSize - Maximum dimension (width or height)
 * @returns Promise resolving to data URL string
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Scale to fit within maxSize
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(img.src)
      resolve(dataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert base64 data URL to File object
 * @param dataUrl - Base64 data URL
 * @param fileName - Desired file name
 * @returns File object
 */
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], fileName, { type: mime })
}

/**
 * Convert blob to base64 data URL
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL string
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
