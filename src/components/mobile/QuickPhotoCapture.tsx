// File: src/components/mobile/QuickPhotoCapture.tsx
// Quick photo capture floating action button (FAB) for mobile field workers
// Supports native camera on iOS/Android via Capacitor

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CapturedPhoto } from '@/types/photo-management'
import {
  isNative,
  useCamera,
  useHaptics,
  useGeolocation
} from '@/lib/native'

/**
 * Camera icon component
 */
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

/**
 * Check icon for success feedback
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

interface QuickPhotoCaptureProps {
  /** Called when a photo is captured */
  onPhotoCapture: (photo: CapturedPhoto) => void
  /** Optional project context */
  projectId?: string
  /** Entity type for context (e.g., 'daily_report', 'punch_list') */
  entityType?: string
  /** Entity ID for context */
  entityId?: string
  /** Position of the FAB */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  /** Whether to show the FAB */
  visible?: boolean
  /** Custom class name */
  className?: string
  /** Maximum image dimension for compression */
  maxDimension?: number
  /** Image quality (0-1) */
  quality?: number
  /** Capture GPS location */
  captureLocation?: boolean
}

/**
 * Quick photo capture floating action button (FAB)
 *
 * Features:
 * - Native camera on iOS/Android (via Capacitor)
 * - Falls back to browser camera on web
 * - One-tap photo capture (opens camera directly)
 * - Auto-compress and prepare for upload
 * - Context-aware (knows current page)
 * - GPS location capture
 * - Haptic feedback on capture (native only)
 * - Visual feedback on capture
 *
 * @example
 * ```tsx
 * <QuickPhotoCapture
 *   onPhotoCapture={(photo) => handleNewPhoto(photo)}
 *   projectId={currentProject.id}
 *   entityType="daily_report"
 *   entityId={reportId}
 * />
 * ```
 */
export function QuickPhotoCapture({
  onPhotoCapture,
  projectId,
  entityType,
  entityId,
  position = 'bottom-right',
  visible = true,
  className,
  maxDimension = 1920,
  quality = 0.8,
  captureLocation = true,
}: QuickPhotoCaptureProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isCapturing, setIsCapturing] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [pendingCount, setPendingCount] = React.useState(0)

  // Native hooks
  const { capture: nativeCapture } = useCamera()
  const { impact, notification } = useHaptics()
  const { getCurrentPosition } = useGeolocation()

  // Get GPS location (works on both native and web)
  const getLocation = React.useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!captureLocation) return null

    try {
      const position = await getCurrentPosition()
      if (position) {
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      }
    } catch {
      // Fall back to browser geolocation
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              })
            },
            () => resolve(null),
            { timeout: 5000, maximumAge: 60000 }
          )
        })
      }
    }
    return null
  }, [captureLocation, getCurrentPosition])

  // Compress image (for browser-captured images)
  const compressImage = React.useCallback(
    async (file: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
          URL.revokeObjectURL(url)

          let { width, height } = img

          // Calculate new dimensions
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob'))
              }
            },
            'image/jpeg',
            quality
          )
        }

        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load image'))
        }

        img.src = url
      })
    },
    [maxDimension, quality]
  )

  // Convert data URL to File
  const dataUrlToFile = React.useCallback((dataUrl: string, fileName: string): File => {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], fileName, { type: mime })
  }, [])

  // Handle native camera capture
  const handleNativeCapture = React.useCallback(async () => {
    setIsCapturing(true)

    try {
      // Haptic feedback when starting capture
      await impact('light')

      const photo = await nativeCapture({
        quality: Math.round(quality * 100),
        source: 'camera',
        saveToGallery: false,
      })

      if (!photo || !photo.dataUrl) {
        setIsCapturing(false)
        return
      }

      // Get location
      const location = await getLocation()

      // Convert to File
      const fileName = `photo-${Date.now()}.${photo.format || 'jpeg'}`
      const file = dataUrlToFile(photo.dataUrl, fileName)

      const capturedPhoto: CapturedPhoto = {
        id: `quick-photo-${Date.now()}`,
        file,
        previewUrl: photo.dataUrl,
        metadata: {
          fileName,
          fileSize: file.size,
          mimeType: `image/${photo.format || 'jpeg'}`,
          capturedAt: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          source: 'camera',
          gps: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
          } : undefined,
          deviceOs: isNative() ? 'native' : navigator.userAgent,
        },
        status: 'captured',
      }

      onPhotoCapture(capturedPhoto)

      // Success haptic feedback
      await notification('success')

      // Show success UI
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)
    } catch (err) {
      console.error('Error capturing photo:', err)
      // Error haptic feedback
      await notification('error')
    } finally {
      setIsCapturing(false)
    }
  }, [nativeCapture, quality, getLocation, dataUrlToFile, onPhotoCapture, impact, notification])

  // Handle browser file selection (fallback)
  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      setIsCapturing(true)
      setPendingCount(files.length)

      try {
        const location = await getLocation()

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setPendingCount(files.length - i)

          try {
            const compressedBlob = await compressImage(file)
            const compressedFile = new File([compressedBlob], file.name, {
              type: 'image/jpeg',
            })

            const capturedPhoto: CapturedPhoto = {
              id: `quick-photo-${Date.now()}-${i}`,
              file: compressedFile,
              previewUrl: URL.createObjectURL(compressedBlob),
              metadata: {
                fileName: file.name,
                fileSize: compressedBlob.size,
                mimeType: 'image/jpeg',
                capturedAt: new Date().toISOString(),
                uploadedAt: new Date().toISOString(),
                source: 'camera',
                gps: location
                  ? {
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }
                  : undefined,
                deviceOs: navigator.userAgent,
              },
              status: 'captured',
            }

            onPhotoCapture(capturedPhoto)
          } catch (err) {
            console.error('Error processing photo:', err)
          }
        }

        // Show success feedback
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1500)
      } finally {
        setIsCapturing(false)
        setPendingCount(0)
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [onPhotoCapture, getLocation, compressImage]
  )

  // Trigger camera - use native on mobile, file input on web
  const triggerCamera = React.useCallback(() => {
    if (isNative()) {
      handleNativeCapture()
    } else {
      fileInputRef.current?.click()
    }
  }, [handleNativeCapture])

  if (!visible) return null

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  }

  return (
    <>
      {/* Hidden file input (browser fallback) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Floating action button */}
      <div
        className={cn(
          'fixed z-50 safe-area-bottom',
          positionClasses[position],
          className
        )}
      >
        <Button
          type="button"
          size="lg"
          onClick={triggerCamera}
          disabled={isCapturing}
          className={cn(
            'h-16 w-16 rounded-full shadow-lg',
            'bg-blue-600 hover:bg-blue-700 text-white',
            'flex items-center justify-center',
            'transition-all duration-200',
            isCapturing && 'animate-pulse',
            showSuccess && 'bg-green-600 hover:bg-green-600'
          )}
          aria-label="Take photo"
        >
          {showSuccess ? (
            <CheckIcon className="h-7 w-7" />
          ) : isCapturing ? (
            <span className="text-sm font-bold">{pendingCount || '...'}</span>
          ) : (
            <CameraIcon className="h-7 w-7" />
          )}
        </Button>

        {/* Context indicator */}
        {entityType && (
          <span
            className={cn(
              'absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium',
              'bg-gray-800 text-white rounded-full',
              'shadow-sm'
            )}
          >
            {entityType.replace('_', ' ')}
          </span>
        )}
      </div>
    </>
  )
}

/**
 * Hook for using quick photo capture functionality
 */
export function useQuickPhoto(options: {
  maxDimension?: number
  quality?: number
  captureLocation?: boolean
} = {}) {
  const { maxDimension = 1920, quality = 0.8, captureLocation = true } = options
  const [photos, setPhotos] = React.useState<CapturedPhoto[]>([])

  const addPhoto = React.useCallback((photo: CapturedPhoto) => {
    setPhotos((prev) => [...prev, photo])
  }, [])

  const removePhoto = React.useCallback((photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl)
      }
      return prev.filter((p) => p.id !== photoId)
    })
  }, [])

  const clearPhotos = React.useCallback(() => {
    photos.forEach((photo) => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl)
      }
    })
    setPhotos([])
  }, [photos])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      })
    }
  }, [photos])

  return {
    photos,
    addPhoto,
    removePhoto,
    clearPhotos,
    photoCount: photos.length,
    QuickPhotoCaptureProps: {
      onPhotoCapture: addPhoto,
      maxDimension,
      quality,
      captureLocation,
    },
  }
}

export default QuickPhotoCapture
