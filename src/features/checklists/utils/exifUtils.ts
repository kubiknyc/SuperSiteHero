// File: /src/features/checklists/utils/exifUtils.ts
// EXIF metadata extraction utilities for photos

import exifr from 'exifr'
import type { PhotoMetadata } from '@/types/offline'

/**
 * Extract EXIF metadata from an image file
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    // Parse all available EXIF data
    const exif = await exifr.parse(file)

    if (!exif) {
      console.warn('No EXIF data found in image')
      return {}
    }

    const metadata: PhotoMetadata = {}

    // GPS coordinates
    if (exif.latitude !== undefined && exif.longitude !== undefined) {
      metadata.latitude = exif.latitude
      metadata.longitude = exif.longitude
    }

    // GPS altitude
    if (exif.GPSAltitude !== undefined) {
      metadata.altitude = exif.GPSAltitude
    }

    // Photo timestamp
    if (exif.DateTimeOriginal) {
      metadata.timestamp = new Date(exif.DateTimeOriginal)
    } else if (exif.DateTime) {
      metadata.timestamp = new Date(exif.DateTime)
    }

    // Camera make and model
    if (exif.Make) {
      metadata.make = String(exif.Make).trim()
    }
    if (exif.Model) {
      metadata.model = String(exif.Model).trim()
    }

    // Image orientation (1-8, describes how to rotate)
    if (exif.Orientation !== undefined) {
      metadata.orientation = exif.Orientation
    }

    // Image dimensions
    if (exif.ExifImageWidth !== undefined) {
      metadata.width = exif.ExifImageWidth
    } else if (exif.ImageWidth !== undefined) {
      metadata.width = exif.ImageWidth
    }

    if (exif.ExifImageHeight !== undefined) {
      metadata.height = exif.ExifImageHeight
    } else if (exif.ImageHeight !== undefined) {
      metadata.height = exif.ImageHeight
    }

    // Camera settings
    if (exif.FocalLength !== undefined) {
      metadata.focalLength = exif.FocalLength
    }

    if (exif.ExposureTime !== undefined) {
      metadata.exposureTime = exif.ExposureTime
    }

    if (exif.FNumber !== undefined) {
      metadata.fNumber = exif.FNumber
    }

    if (exif.ISO !== undefined) {
      metadata.iso = exif.ISO
    } else if (exif.ISOSpeedRatings !== undefined) {
      metadata.iso = exif.ISOSpeedRatings
    }

    console.log('Extracted EXIF metadata:', metadata)
    return metadata
  } catch (error) {
    console.error('Failed to extract EXIF metadata:', error)
    return {}
  }
}

/**
 * Check if a file has GPS coordinates
 */
export async function hasGPSData(file: File): Promise<boolean> {
  try {
    const gps = await exifr.gps(file)
    return !!(gps && gps.latitude !== undefined && gps.longitude !== undefined)
  } catch {
    return false
  }
}

/**
 * Extract only GPS coordinates from an image
 */
export async function extractGPSCoordinates(
  file: File
): Promise<{ latitude: number; longitude: number; altitude?: number } | null> {
  try {
    const gps = await exifr.gps(file)

    if (!gps || gps.latitude === undefined || gps.longitude === undefined) {
      return null
    }

    // Try to get altitude from full EXIF data
    let altitude: number | undefined
    try {
      const fullExif = await exifr.parse(file)
      if (fullExif && fullExif.GPSAltitude !== undefined) {
        altitude = fullExif.GPSAltitude
      }
    } catch {
      // Altitude not available
    }

    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      altitude,
    }
  } catch (error) {
    console.error('Failed to extract GPS coordinates:', error)
    return null
  }
}

/**
 * Extract only timestamp from an image
 */
export async function extractPhotoTimestamp(file: File): Promise<Date | null> {
  try {
    const exif = await exifr.parse(file, { pick: ['DateTimeOriginal', 'DateTime'] })

    if (!exif) {
      return null
    }

    if (exif.DateTimeOriginal) {
      return new Date(exif.DateTimeOriginal)
    }

    if (exif.DateTime) {
      return new Date(exif.DateTime)
    }

    return null
  } catch (error) {
    console.error('Failed to extract photo timestamp:', error)
    return null
  }
}

/**
 * Format GPS coordinates for display
 */
export function formatGPSCoordinates(
  latitude: number,
  longitude: number
): {
  lat: string
  lng: string
  mapsUrl: string
} {
  const latDir = latitude >= 0 ? 'N' : 'S'
  const lngDir = longitude >= 0 ? 'E' : 'W'

  const latAbs = Math.abs(latitude)
  const lngAbs = Math.abs(longitude)

  return {
    lat: `${latAbs.toFixed(6)}° ${latDir}`,
    lng: `${lngAbs.toFixed(6)}° ${lngDir}`,
    mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
  }
}

/**
 * Format exposure time for display (e.g., "1/125s")
 */
export function formatExposureTime(exposureTime: number): string {
  if (exposureTime >= 1) {
    return `${exposureTime.toFixed(1)}s`
  }

  const denominator = Math.round(1 / exposureTime)
  return `1/${denominator}s`
}

/**
 * Format f-number for display (e.g., "f/2.8")
 */
export function formatFNumber(fNumber: number): string {
  return `f/${fNumber.toFixed(1)}`
}

/**
 * Check if browser supports geolocation API
 */
export function supportsGeolocation(): boolean {
  return 'geolocation' in navigator
}

/**
 * Get current device GPS coordinates
 */
export async function getCurrentGPSCoordinates(): Promise<{
  latitude: number
  longitude: number
  accuracy: number
} | null> {
  if (!supportsGeolocation()) {
    console.warn('Geolocation API not supported')
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        console.error('Failed to get current location:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

/**
 * Add current GPS location to metadata if photo doesn't have it
 */
export async function enrichMetadataWithDeviceGPS(
  metadata: PhotoMetadata
): Promise<PhotoMetadata> {
  // If photo already has GPS data, don't override
  if (metadata.latitude !== undefined && metadata.longitude !== undefined) {
    return metadata
  }

  // Try to get device GPS coordinates
  const deviceGPS = await getCurrentGPSCoordinates()

  if (deviceGPS) {
    return {
      ...metadata,
      latitude: deviceGPS.latitude,
      longitude: deviceGPS.longitude,
    }
  }

  return metadata
}
