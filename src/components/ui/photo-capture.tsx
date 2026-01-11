/**
 * Photo Capture Component
 * Allows capturing photos from camera or uploading from device
 * Designed for field use on mobile devices
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Camera,
  Upload,
  X,
  Image,
  Loader2,
  RotateCcw,
  Check,
  SwitchCamera,
  MapPin,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export interface CapturedPhoto {
  id: string
  file: File
  preview: string
  caption?: string
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  }
  timestamp: Date
}

interface PhotoCaptureProps {
  photos: CapturedPhoto[]
  onPhotosChange: (photos: CapturedPhoto[]) => void
  maxPhotos?: number
  disabled?: boolean
  className?: string
  showMetadata?: boolean
}

function generateId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  disabled = false,
  className,
  showMetadata = true,
}: PhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [location, setLocation] = useState<CapturedPhoto['location'] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setLocationError(null)
      },
      (error) => {
        setLocationError(error.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Get location when camera starts
      getCurrentLocation()
    } catch (error) {
      console.error('Failed to access camera:', error)
    }
  }, [facingMode, getCurrentLocation])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setCapturedImage(null)
    setShowCamera(false)
  }, [cameraStream])

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacingMode)

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to switch camera:', error)
    }
  }, [facingMode, cameraStream])

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {return}

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Mirror image if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(imageData)
    setIsCapturing(false)
  }, [facingMode])

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setIsCapturing(true)
  }, [])

  // Confirm captured photo
  const confirmPhoto = useCallback(async () => {
    if (!capturedImage) {return}

    // Convert data URL to File
    const response = await fetch(capturedImage)
    const blob = await response.blob()
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

    const newPhoto: CapturedPhoto = {
      id: generateId(),
      file,
      preview: capturedImage,
      location: location || undefined,
      timestamp: new Date(),
    }

    onPhotosChange([...photos, newPhoto])
    stopCamera()
  }, [capturedImage, location, photos, onPhotosChange, stopCamera])

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) {return}

    const remainingSlots = maxPhotos - photos.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    const newPhotos: CapturedPhoto[] = []

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {return}

      const reader = new FileReader()
      reader.onload = (e) => {
        newPhotos.push({
          id: generateId(),
          file,
          preview: e.target?.result as string,
          timestamp: new Date(),
        })

        if (newPhotos.length === filesToProcess.length) {
          onPhotosChange([...photos, ...newPhotos])
        }
      }
      reader.readAsDataURL(file)
    })
  }, [maxPhotos, photos, onPhotosChange])

  // Remove photo
  const removePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId)
    onPhotosChange(updatedPhotos)
  }, [photos, onPhotosChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  // Start camera when dialog opens
  useEffect(() => {
    if (showCamera && !cameraStream) {
      startCamera()
      setIsCapturing(true)
    }
  }, [showCamera, cameraStream, startCamera])

  const canAddMore = photos.length < maxPhotos && !disabled

  return (
    <div className={cn('space-y-3', className)}>
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square">
              <img
                src={photo.preview}
                alt="Captured"
                className="w-full h-full object-cover rounded-lg"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
              {showMetadata && photo.location && (
                <Badge
                  variant="secondary"
                  className="absolute bottom-1 left-1 text-[10px] px-1 py-0.5 bg-black/50 text-white border-0"
                >
                  <MapPin className="h-2 w-2 mr-0.5" />
                  GPS
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {canAddMore && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCamera(true)}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      )}

      {/* Photo count indicator */}
      <p className="text-xs text-muted-foreground text-center">
        {photos.length} / {maxPhotos} photos
      </p>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>

          <div className="relative">
            {/* Video Feed / Captured Image */}
            <div className="aspect-[4/3] bg-black">
              {isCapturing ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    'w-full h-full object-cover',
                    facingMode === 'user' && 'scale-x-[-1]'
                  )}
                />
              ) : capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Location indicator */}
            {showMetadata && (
              <div className="absolute top-2 left-2">
                {location ? (
                  <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    Location captured
                  </Badge>
                ) : locationError ? (
                  <Badge variant="destructive" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    No GPS
                  </Badge>
                ) : null}
              </div>
            )}

            {/* Timestamp */}
            {showMetadata && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(), 'h:mm a')}
                </Badge>
              </div>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera Controls */}
          <div className="p-4 flex items-center justify-center gap-4">
            {isCapturing ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full h-10 w-10"
                >
                  <SwitchCamera className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={capturePhoto}
                  className="rounded-full h-16 w-16 bg-white hover:bg-gray-100 text-black"
                >
                  <Camera className="h-8 w-8" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stopCamera}
                  className="rounded-full h-10 w-10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
                <Button
                  onClick={confirmPhoto}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Use Photo
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Compact photo capture for forms - shows as a single button with preview
 */
interface CompactPhotoCaptureProps {
  photos: CapturedPhoto[]
  onPhotosChange: (photos: CapturedPhoto[]) => void
  maxPhotos?: number
  disabled?: boolean
  label?: string
}

export function CompactPhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
  label = 'Add Photos',
}: CompactPhotoCaptureProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          disabled={disabled}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {photos.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {photos.length > 0 && (
              <div className="flex -space-x-2">
                {photos.slice(0, 3).map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.preview}
                    alt=""
                    className="h-6 w-6 rounded object-cover border-2 border-background"
                  />
                ))}
                {photos.length > 3 && (
                  <div className="h-6 w-6 rounded bg-muted flex items-center justify-center border-2 border-background">
                    <span className="text-[10px] text-muted-foreground">
                      +{photos.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-3 pt-3 border-t">
            <PhotoCapture
              photos={photos}
              onPhotosChange={onPhotosChange}
              maxPhotos={maxPhotos}
              disabled={disabled}
              showMetadata={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PhotoCapture
