// Photo processing utilities
import imageCompression from 'browser-image-compression'
import exifr from 'exifr'
import type { GPSCoordinates, EXIFData, PhotoMetadata, PhotoUploadOptions, DEFAULT_UPLOAD_OPTIONS } from '../types/photo'

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: PhotoUploadOptions = DEFAULT_UPLOAD_OPTIONS
): Promise<File> {
  try {
    const compressionOptions = {
      maxSizeMB: options.maxSizeMB || 1,
      maxWidthOrHeight: options.maxWidthOrHeight || 1920,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: options.quality || 0.8,
    }

    const compressedFile = await imageCompression(file, compressionOptions)

    // Preserve original filename
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('Error compressing image:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Extract GPS coordinates from image EXIF data
 */
export async function extractGPSData(file: File): Promise<GPSCoordinates | null> {
  try {
    const gpsData = await exifr.gps(file)

    if (!gpsData || typeof gpsData.latitude !== 'number' || typeof gpsData.longitude !== 'number') {
      return null
    }

    return {
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitude: gpsData.altitude,
    }
  } catch (error) {
    console.error('Error extracting GPS data:', error)
    return null
  }
}

/**
 * Extract EXIF metadata from image
 */
export async function extractEXIFData(file: File): Promise<EXIFData | null> {
  try {
    const exif = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: false, // GPS handled separately
      ifd0: true,
      ifd1: false,
      pick: [
        'Make',
        'Model',
        'DateTime',
        'DateTimeOriginal',
        'Orientation',
        'ExposureTime',
        'FNumber',
        'ISO',
        'FocalLength',
        'Flash',
      ],
    })

    if (!exif) {
      return null
    }

    return {
      make: exif.Make,
      model: exif.Model,
      dateTime: exif.DateTime || exif.DateTimeOriginal,
      orientation: exif.Orientation,
      exposureTime: exif.ExposureTime,
      fNumber: exif.FNumber,
      iso: exif.ISO,
      focalLength: exif.FocalLength,
      flash: exif.Flash,
    }
  } catch (error) {
    console.error('Error extracting EXIF data:', error)
    return null
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

/**
 * Generate a thumbnail data URL from image file
 */
export async function generateThumbnail(file: File, maxWidth: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const ratio = img.width / img.height
      const width = Math.min(maxWidth, img.width)
      const height = width / ratio

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Validate if file is a valid image
 */
export function validateImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
  return validTypes.includes(file.type.toLowerCase())
}

/**
 * Validate file size (in MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * Process a photo file and extract all metadata
 */
export async function processPhoto(
  file: File,
  options: PhotoUploadOptions = DEFAULT_UPLOAD_OPTIONS
): Promise<PhotoMetadata> {
  const [gps, exif, dimensions] = await Promise.all([
    options.extractGPS ? extractGPSData(file) : Promise.resolve(null),
    options.extractEXIF ? extractEXIFData(file) : Promise.resolve(null),
    getImageDimensions(file),
  ])

  const metadata: PhotoMetadata = {
    filename: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    capturedAt: exif?.dateTime,
    gps: gps || undefined,
    exif: exif || undefined,
    width: dimensions?.width,
    height: dimensions?.height,
  }

  return metadata
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format GPS coordinates for display
 */
export function formatGPSCoordinates(gps: GPSCoordinates): string {
  const lat = gps.latitude.toFixed(6)
  const lng = gps.longitude.toFixed(6)
  const latDir = gps.latitude >= 0 ? 'N' : 'S'
  const lngDir = gps.longitude >= 0 ? 'E' : 'W'

  return `${Math.abs(parseFloat(lat))}° ${latDir}, ${Math.abs(parseFloat(lng))}° ${lngDir}`
}

/**
 * Get Google Maps URL for GPS coordinates
 */
export function getGoogleMapsURL(gps: GPSCoordinates): string {
  return `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`
}
