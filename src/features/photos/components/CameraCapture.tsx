/**
 * CameraCapture Component
 *
 * Unified camera capture component for the entire application.
 * Features:
 * - Native camera access via MediaDevices API
 * - GPS location capture
 * - EXIF metadata extraction
 * - Image compression
 * - Preview before upload
 * - Batch capture mode
 * - Offline support
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, Check, RotateCcw, MapPin, Image, Upload, Trash2, Settings, FlipHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  CameraCaptureOptions,
  CapturedPhoto,
  PhotoMetadata,
  GPSCoordinates,
} from '@/types/photo-management'

// =============================================
// Types
// =============================================

interface CameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (photos: CapturedPhoto[]) => void
  options?: CameraCaptureOptions
  projectId: string
  entityType?: string
  entityId?: string
}

type CameraState = 'initializing' | 'ready' | 'capturing' | 'preview' | 'error'

// =============================================
// Helper Functions
// =============================================

async function compressImage(
  file: Blob,
  maxDimension: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
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

      // Create canvas and draw
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = url
  })
}

async function getCurrentGPS(): Promise<GPSCoordinates | null> {
  if (!navigator.geolocation) {return null}

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? undefined,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? undefined,
        })
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

function formatGPS(coords: GPSCoordinates | null): string {
  if (!coords) {return 'No location'}
  const lat = coords.latitude.toFixed(6)
  const lng = coords.longitude.toFixed(6)
  const latDir = coords.latitude >= 0 ? 'N' : 'S'
  const lngDir = coords.longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(parseFloat(lat))}° ${latDir}, ${Math.abs(parseFloat(lng))}° ${lngDir}`
}

function generateId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// =============================================
// Main Component
// =============================================

export function CameraCapture({
  isOpen,
  onClose,
  onCapture,
  options = {},
  projectId,
  entityType,
  entityId,
}: CameraCaptureProps) {
  const {
    facingMode = 'environment',
    resolution = 'high',
    enableGps = true,
    maxPhotos = 10,
    compressionQuality = 80,
    maxDimension = 1920,
  } = options

  // State
  const [state, setState] = useState<CameraState>('initializing')
  const [error, setError] = useState<string | null>(null)
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode)
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [gpsLocation, setGpsLocation] = useState<GPSCoordinates | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get resolution constraints
  const getVideoConstraints = useCallback(() => {
    const constraints: MediaTrackConstraints = {
      facingMode: currentFacingMode,
    }

    switch (resolution) {
      case 'low':
        constraints.width = { ideal: 640 }
        constraints.height = { ideal: 480 }
        break
      case 'medium':
        constraints.width = { ideal: 1280 }
        constraints.height = { ideal: 720 }
        break
      case 'high':
        constraints.width = { ideal: 1920 }
        constraints.height = { ideal: 1080 }
        break
      case 'max':
        constraints.width = { ideal: 4096 }
        constraints.height = { ideal: 2160 }
        break
    }

    return constraints
  }, [currentFacingMode, resolution])

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setState('initializing')
      setError(null)

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Get new stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setState('ready')

      // Get GPS location
      if (enableGps && !gpsLocation) {
        setIsGettingLocation(true)
        const coords = await getCurrentGPS()
        setGpsLocation(coords)
        setIsGettingLocation(false)
      }
    } catch (err) {
      console.error('Camera initialization error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please ensure camera permissions are granted.'
      )
      setState('error')
    }
  }, [getVideoConstraints, enableGps, gpsLocation])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || state !== 'ready') {return}
    if (capturedPhotos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    setState('capturing')

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0)

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) {resolve(b)}
            else {reject(new Error('Failed to create blob'))}
          },
          'image/jpeg',
          0.95
        )
      })

      // Compress if needed
      const compressedBlob = await compressImage(
        blob,
        maxDimension,
        compressionQuality / 100
      )

      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedBlob)

      // Get current GPS (refresh if needed)
      let currentGps = gpsLocation
      if (enableGps && !currentGps) {
        currentGps = await getCurrentGPS()
        setGpsLocation(currentGps)
      }

      // Create captured photo object
      const capturedPhoto: CapturedPhoto = {
        id: generateId(),
        file: compressedBlob,
        previewUrl,
        metadata: {
          fileName: `photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
          fileSize: compressedBlob.size,
          mimeType: 'image/jpeg',
          width: canvas.width,
          height: canvas.height,
          capturedAt: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          gps: currentGps || undefined,
          source: 'camera',
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          deviceOs: navigator.platform,
        },
        status: 'captured',
      }

      setCapturedPhotos((prev) => [...prev, capturedPhoto])
      setState('ready')
    } catch (err) {
      console.error('Capture error:', err)
      setError(err instanceof Error ? err.message : 'Failed to capture photo')
      setState('ready')
    }
  }, [state, capturedPhotos.length, maxPhotos, gpsLocation, enableGps, maxDimension, compressionQuality])

  // Switch camera
  const switchCamera = useCallback(() => {
    setCurrentFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  // Delete captured photo
  const deletePhoto = useCallback((index: number) => {
    setCapturedPhotos((prev) => {
      const photo = prev[index]
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
    setSelectedPhotoIndex(null)
  }, [])

  // Handle done
  const handleDone = useCallback(() => {
    if (capturedPhotos.length > 0) {
      onCapture(capturedPhotos)
    }
    setCapturedPhotos([])
    stopCamera()
    onClose()
  }, [capturedPhotos, onCapture, stopCamera, onClose])

  // Handle close
  const handleClose = useCallback(() => {
    // Clean up preview URLs
    capturedPhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl)
    })
    setCapturedPhotos([])
    stopCamera()
    onClose()
  }, [capturedPhotos, stopCamera, onClose])

  // Initialize camera when dialog opens
  useEffect(() => {
    if (isOpen) {
      initCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, initCamera, stopCamera])

  // Reinitialize when facing mode changes
  useEffect(() => {
    if (isOpen && state === 'ready') {
      initCamera()
    }
  }, [currentFacingMode])

  // Refresh GPS
  const refreshGPS = useCallback(async () => {
    if (!enableGps) {return}
    setIsGettingLocation(true)
    const coords = await getCurrentGPS()
    setGpsLocation(coords)
    setIsGettingLocation(false)
  }, [enableGps])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera
            </DialogTitle>
            <div className="flex items-center gap-2">
              {capturedPhotos.length > 0 && (
                <Badge variant="secondary">
                  {capturedPhotos.length} / {maxPhotos}
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Camera View */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {state === 'initializing' && (
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                <p>Initializing camera...</p>
              </div>
            )}

            {state === 'error' && (
              <div className="text-white text-center p-4">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={initCamera} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            <video
              ref={videoRef}
              className={cn(
                'max-w-full max-h-full object-contain',
                state !== 'ready' && state !== 'capturing' && 'hidden'
              )}
              playsInline
              muted
            />

            {/* Camera overlay */}
            {(state === 'ready' || state === 'capturing') && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner guides */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50" />
              </div>
            )}

            {/* Camera controls */}
            {(state === 'ready' || state === 'capturing') && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                {/* Switch camera */}
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-black/50 border-white/30 text-white hover:bg-black/70"
                  onClick={switchCamera}
                >
                  <FlipHorizontal className="h-5 w-5" />
                </Button>

                {/* Capture button */}
                <button
                  onClick={capturePhoto}
                  disabled={state === 'capturing'}
                  className={cn(
                    'w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all',
                    'bg-card/20 hover:bg-card/30 active:scale-95',
                    state === 'capturing' && 'opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full bg-card',
                      state === 'capturing' && 'animate-pulse'
                    )}
                  />
                </button>

                {/* Placeholder for symmetry */}
                <div className="w-10" />
              </div>
            )}

            {/* GPS indicator */}
            {enableGps && (
              <div
                className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 text-white text-sm cursor-pointer"
                onClick={refreshGPS}
              >
                <MapPin
                  className={cn(
                    'h-4 w-4',
                    isGettingLocation && 'animate-pulse',
                    gpsLocation ? 'text-green-400' : 'text-yellow-400'
                  )}
                />
                <span className="max-w-[200px] truncate">
                  {isGettingLocation ? 'Getting location...' : formatGPS(gpsLocation)}
                </span>
              </div>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Captured photos panel */}
          {capturedPhotos.length > 0 && (
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l bg-muted/30 flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  Captured ({capturedPhotos.length})
                </span>
                {capturedPhotos.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      capturedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
                      setCapturedPhotos([])
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-2">
                <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                  {capturedPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden cursor-pointer',
                        'ring-2 ring-transparent hover:ring-primary/50 transition-all',
                        selectedPhotoIndex === index && 'ring-primary'
                      )}
                      onClick={() =>
                        setSelectedPhotoIndex(selectedPhotoIndex === index ? null : index)
                      }
                    >
                      <img
                        src={photo.previewUrl}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                      <button
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePhoto(index)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {photo.metadata.gps && (
                        <MapPin className="absolute bottom-1 left-1 h-3 w-3 text-green-400 drop-shadow" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected photo details */}
              {selectedPhotoIndex !== null && capturedPhotos[selectedPhotoIndex] && (
                <div className="p-3 border-t space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Size: {(capturedPhotos[selectedPhotoIndex].metadata.fileSize / 1024).toFixed(1)} KB
                    </div>
                    <div>
                      Dimensions: {capturedPhotos[selectedPhotoIndex].metadata.width} x{' '}
                      {capturedPhotos[selectedPhotoIndex].metadata.height}
                    </div>
                    {capturedPhotos[selectedPhotoIndex].metadata.gps && (
                      <div>GPS: {formatGPS(capturedPhotos[selectedPhotoIndex].metadata.gps!)}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Done button */}
              <div className="p-3 border-t">
                <Button className="w-full" onClick={handleDone}>
                  <Check className="h-4 w-4 mr-2" />
                  Done ({capturedPhotos.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Camera Trigger Button
// =============================================

interface CameraTriggerProps {
  onCapture: (photos: CapturedPhoto[]) => void
  projectId: string
  entityType?: string
  entityId?: string
  options?: CameraCaptureOptions
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function CameraTrigger({
  onCapture,
  projectId,
  entityType,
  entityId,
  options,
  className,
  variant = 'default',
  size = 'default',
  children,
}: CameraTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {children || (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Capture Photo
          </>
        )}
      </Button>

      <CameraCapture
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCapture={onCapture}
        options={options}
        projectId={projectId}
        entityType={entityType}
        entityId={entityId}
      />
    </>
  )
}

export default CameraCapture
