/**
 * PhotoPinOverlay Component
 *
 * Drop pins on drawings that link to field photos.
 * Mobile-first design with touch-friendly interactions.
 *
 * Features:
 * - Drop pins on drawings linked to photos
 * - Pin shows thumbnail preview on hover/tap
 * - Click pin to view full photo gallery
 * - Support multiple photos per pin
 * - Capture new photo directly from pin
 * - Sync with existing photo gallery
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Camera,
  Image as ImageIcon,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Loader2,
  Upload,
  Eye,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { CameraCapture } from '@/features/photos/components/CameraCapture'
import type { CapturedPhoto } from '@/types/photo-management'
import type { DrawingPhotoPin, DrawingPhotoPinWithPhotos } from '../types/markup'

// =============================================
// Types
// =============================================

interface PhotoPinOverlayProps {
  /** Document ID */
  documentId: string
  /** Current page number */
  page: number
  /** Container width for coordinate calculation */
  containerWidth: number
  /** Container height for coordinate calculation */
  containerHeight: number
  /** Current zoom level (default: 100) */
  zoom?: number
  /** Existing photo pins */
  pins?: DrawingPhotoPinWithPhotos[]
  /** Enable adding new pins */
  enableAddPin?: boolean
  /** Project ID for photo capture */
  projectId?: string
  /** Called when a pin is added */
  onAddPin?: (pin: Omit<DrawingPhotoPin, 'id' | 'createdAt' | 'createdBy'>) => void
  /** Called when a pin is updated */
  onUpdatePin?: (pinId: string, updates: Partial<DrawingPhotoPin>) => void
  /** Called when a pin is deleted */
  onDeletePin?: (pinId: string) => void
  /** Called when photos are added to a pin */
  onAddPhotos?: (pinId: string, photos: CapturedPhoto[]) => void
  /** Called when a photo is removed from a pin */
  onRemovePhoto?: (pinId: string, photoId: string) => void
  /** Loading state */
  isLoading?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Optional class name */
  className?: string
}

interface PinPhoto {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
  capturedAt?: string
}

// =============================================
// Helper Functions
// =============================================

function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: normalizedX * containerWidth,
    y: normalizedY * containerHeight,
  }
}

function pixelToNormalized(
  pixelX: number,
  pixelY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: pixelX / containerWidth,
    y: pixelY / containerHeight,
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) {return ''}
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================
// Pin Marker Component
// =============================================

interface PinMarkerProps {
  pin: DrawingPhotoPinWithPhotos
  x: number
  y: number
  isSelected: boolean
  onClick: () => void
  onDelete?: () => void
  readOnly?: boolean
}

function PinMarker({
  pin,
  x,
  y,
  isSelected,
  onClick,
  onDelete,
  readOnly,
}: PinMarkerProps) {
  const [showPreview, setShowPreview] = useState(false)
  const photoCount = pin.photos?.length || 0
  const firstPhoto = pin.photos?.[0]

  return (
    <TooltipProvider>
      <Popover open={showPreview} onOpenChange={setShowPreview}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                onClick={onClick}
                onMouseEnter={() => setShowPreview(true)}
                onMouseLeave={() => setShowPreview(false)}
                className={cn(
                  'absolute transform -translate-x-1/2 -translate-y-full',
                  'transition-all duration-150 ease-out',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                  'cursor-pointer z-10',
                  isSelected && 'scale-125 z-20'
                )}
                style={{
                  left: x,
                  top: y,
                  filter: isSelected
                    ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
                aria-label={`Photo pin with ${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
              >
                {/* Pin shape */}
                <div className="relative">
                  <svg
                    width="36"
                    height="44"
                    viewBox="0 0 36 44"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Pin shadow */}
                    <ellipse cx="18" cy="42" rx="7" ry="2" fill="rgba(0,0,0,0.2)" />
                    {/* Pin body */}
                    <path
                      d="M18 0C8.059 0 0 8.059 0 18c0 9.941 18 26 18 26s18-16.059 18-26C36 8.059 27.941 0 18 0z"
                      fill="#3B82F6"
                    />
                    {/* Photo thumbnail circle */}
                    <circle cx="18" cy="16" r="10" fill="white" />
                  </svg>

                  {/* Thumbnail or icon */}
                  <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full overflow-hidden bg-gray-100">
                    {firstPhoto?.thumbnailUrl || firstPhoto?.url ? (
                      <img
                        src={firstPhoto.thumbnailUrl || firstPhoto.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-full h-full p-0.5 text-gray-500" />
                    )}
                  </div>

                  {/* Photo count badge */}
                  {photoCount > 0 && (
                    <div
                      className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                    >
                      {photoCount}
                    </div>
                  )}

                  {/* Label */}
                  {pin.label && (
                    <div
                      className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      {pin.label}
                    </div>
                  )}
                </div>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>

          <TooltipContent side="top" className="p-2" sideOffset={8}>
            <div className="text-sm">
              <p className="font-medium">{pin.label || 'Photo Pin'}</p>
              <p className="text-muted-foreground">
                {photoCount} photo{photoCount !== 1 ? 's' : ''}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Preview popover on hover */}
        <PopoverContent
          className="w-64 p-2"
          side="top"
          sideOffset={12}
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          {photoCount > 0 ? (
            <div className="space-y-2">
              {/* Thumbnail grid */}
              <div className="grid grid-cols-3 gap-1">
                {pin.photos?.slice(0, 6).map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded overflow-hidden bg-gray-100"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {photoCount > 6 && (
                  <div className="aspect-square rounded bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    +{photoCount - 6}
                  </div>
                )}
              </div>

              {/* Label and actions */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {pin.label || 'Photo Pin'}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {!readOnly && onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photos yet</p>
              <p className="text-xs">Click to add photos</p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}

// =============================================
// Photo Gallery Dialog
// =============================================

interface PhotoGalleryDialogProps {
  isOpen: boolean
  onClose: () => void
  pin: DrawingPhotoPinWithPhotos
  onAddPhotos?: (photos: CapturedPhoto[]) => void
  onRemovePhoto?: (photoId: string) => void
  onUpdateLabel?: (label: string) => void
  projectId?: string
  readOnly?: boolean
}

function PhotoGalleryDialog({
  isOpen,
  onClose,
  pin,
  onAddPhotos,
  onRemovePhoto,
  onUpdateLabel,
  projectId,
  readOnly,
}: PhotoGalleryDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [label, setLabel] = useState(pin.label || '')
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photos = pin.photos || []
  const currentPhoto = photos[currentIndex]

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }

  const handleCameraCapture = (capturedPhotos: CapturedPhoto[]) => {
    setShowCamera(false)
    if (onAddPhotos && capturedPhotos.length > 0) {
      onAddPhotos(capturedPhotos)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !onAddPhotos) {return}

    // Convert files to CapturedPhoto format
    const capturedPhotos: CapturedPhoto[] = Array.from(files).map((file) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        source: 'upload' as const,
      },
      status: 'captured' as const,
    }))

    onAddPhotos(capturedPhotos)
    e.target.value = '' // Reset input
  }

  const handleSaveLabel = () => {
    if (onUpdateLabel) {
      onUpdateLabel(label)
    }
    setIsEditingLabel(false)
  }

  // Reset index when pin changes
  useEffect(() => {
    setCurrentIndex(0)
    setLabel(pin.label || '')
  }, [pin.id, pin.label])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {isEditingLabel ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-8 w-48"
                      placeholder="Enter label..."
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveLabel}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLabel(pin.label || '')
                        setIsEditingLabel(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DialogTitle>{pin.label || 'Photo Pin'}</DialogTitle>
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => setIsEditingLabel(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="secondary">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {photos.length > 0 ? (
              <>
                {/* Main photo display */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                  {currentPhoto && (
                    <img
                      src={currentPhoto.url}
                      alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}

                  {/* Navigation arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Photo counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {photos.length}
                  </div>

                  {/* Delete button */}
                  {!readOnly && onRemovePhoto && currentPhoto && (
                    <button
                      onClick={() => {
                        onRemovePhoto(currentPhoto.id)
                        if (currentIndex >= photos.length - 1 && currentIndex > 0) {
                          setCurrentIndex(currentIndex - 1)
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Photo details */}
                {currentPhoto && (
                  <div className="px-4 py-2 bg-muted/30 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        {currentPhoto.caption && (
                          <p className="font-medium">{currentPhoto.caption}</p>
                        )}
                        {currentPhoto.capturedAt && (
                          <p className="text-sm text-muted-foreground">
                            {formatDate(currentPhoto.capturedAt)}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={currentPhoto.url} download>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                  <div className="px-4 py-2 bg-muted/50 border-t overflow-x-auto">
                    <div className="flex gap-2">
                      {photos.map((photo, idx) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={cn(
                            'w-16 h-16 rounded overflow-hidden shrink-0 border-2 transition-colors',
                            currentIndex === idx
                              ? 'border-primary'
                              : 'border-transparent hover:border-primary/50'
                          )}
                        >
                          <img
                            src={photo.thumbnailUrl || photo.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No Photos</h3>
                  <p className="text-muted-foreground mb-4">
                    Add photos to this pin
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add photo buttons */}
          {!readOnly && (
            <DialogFooter className="px-4 py-3 border-t">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </Button>
                {projectId && (
                  <Button onClick={() => setShowCamera(true)}>
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Camera capture dialog */}
      {showCamera && projectId && (
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
          projectId={projectId}
          options={{
            enableGps: true,
            maxPhotos: 10,
            resolution: 'high',
          }}
        />
      )}
    </>
  )
}

// =============================================
// Main Component
// =============================================

export function PhotoPinOverlay({
  documentId,
  page,
  containerWidth,
  containerHeight,
  zoom = 100,
  pins = [],
  enableAddPin = false,
  projectId,
  onAddPin,
  onUpdatePin,
  onDeletePin,
  onAddPhotos,
  onRemovePhoto,
  isLoading = false,
  readOnly = false,
  className,
}: PhotoPinOverlayProps) {
  const [addPinMode, setAddPinMode] = useState(false)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [showPins, setShowPins] = useState(true)
  const [showGallery, setShowGallery] = useState(false)

  const scale = zoom / 100

  // Filter pins for current page
  const currentPagePins = useMemo(() => {
    return pins.filter((pin) => pin.page === page)
  }, [pins, page])

  const selectedPin = useMemo(() => {
    return currentPagePins.find((pin) => pin.id === selectedPinId)
  }, [currentPagePins, selectedPinId])

  // Handle overlay click for adding new pins
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enableAddPin || !addPinMode || !onAddPin) {return}

      const rect = e.currentTarget.getBoundingClientRect()
      const pixelX = (e.clientX - rect.left) / scale
      const pixelY = (e.clientY - rect.top) / scale

      const normalized = pixelToNormalized(
        pixelX,
        pixelY,
        containerWidth,
        containerHeight
      )

      onAddPin({
        documentId,
        page,
        position: { x: normalized.x, y: normalized.y },
        photoIds: [],
      })

      setAddPinMode(false)
    },
    [
      enableAddPin,
      addPinMode,
      onAddPin,
      documentId,
      page,
      containerWidth,
      containerHeight,
      scale,
    ]
  )

  const handlePinClick = useCallback((pinId: string) => {
    setSelectedPinId(pinId)
    setShowGallery(true)
  }, [])

  const handleDeletePin = useCallback(
    (pinId: string) => {
      if (onDeletePin) {
        onDeletePin(pinId)
      }
      if (selectedPinId === pinId) {
        setSelectedPinId(null)
        setShowGallery(false)
      }
    },
    [onDeletePin, selectedPinId]
  )

  const totalPhotos = currentPagePins.reduce(
    (acc, pin) => acc + (pin.photos?.length || 0),
    0
  )

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        addPinMode && 'cursor-crosshair',
        className
      )}
    >
      {/* Pin markers layer */}
      {showPins && (
        <div
          className={cn(
            'absolute inset-0',
            addPinMode ? 'pointer-events-auto' : 'pointer-events-none'
          )}
          onClick={handleOverlayClick}
        >
          {!isLoading &&
            currentPagePins.map((pin) => {
              const pixelPos = normalizedToPixel(
                pin.position.x,
                pin.position.y,
                containerWidth * scale,
                containerHeight * scale
              )

              return (
                <div key={pin.id} className="pointer-events-auto">
                  <PinMarker
                    pin={pin}
                    x={pixelPos.x}
                    y={pixelPos.y}
                    isSelected={selectedPinId === pin.id}
                    onClick={() => handlePinClick(pin.id)}
                    onDelete={
                      !readOnly ? () => handleDeletePin(pin.id) : undefined
                    }
                    readOnly={readOnly}
                  />
                </div>
              )
            })}
        </div>
      )}

      {/* Controls panel */}
      <div className="absolute top-2 left-2 pointer-events-auto z-30">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="shadow-lg gap-2">
              <Camera className="w-4 h-4" />
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs">
                  {currentPagePins.length} pin{currentPagePins.length !== 1 ? 's' : ''} ({totalPhotos} photos)
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <div className="font-medium text-sm">Photo Pins</div>

              {/* Show/Hide toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm">Show Pins</span>
                </div>
                <Switch
                  checked={showPins}
                  onCheckedChange={setShowPins}
                  aria-label="Toggle photo pins"
                />
              </div>

              {/* Add pin button */}
              {enableAddPin && !readOnly && onAddPin && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    <Button
                      variant={addPinMode ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => setAddPinMode(!addPinMode)}
                    >
                      {addPinMode ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Photo Pin
                        </>
                      )}
                    </Button>
                    {addPinMode && (
                      <p className="text-xs text-muted-foreground text-center">
                        Click on the drawing to place a photo pin
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Pin list */}
              {currentPagePins.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Pins on this page:
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {currentPagePins.map((pin) => (
                        <button
                          key={pin.id}
                          onClick={() => handlePinClick(pin.id)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-muted transition-colors',
                            selectedPinId === pin.id && 'bg-muted'
                          )}
                        >
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            {pin.photos?.[0] ? (
                              <img
                                src={pin.photos[0].thumbnailUrl || pin.photos[0].url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {pin.label || 'Photo Pin'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pin.photos?.length || 0} photos
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Add pin mode indicator */}
      {addPinMode && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-auto z-30">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">
              Click to place photo pin
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddPinMode(false)}
              className="ml-2 h-6 px-2 text-primary-foreground hover:bg-primary-foreground/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Photo gallery dialog */}
      {selectedPin && (
        <PhotoGalleryDialog
          isOpen={showGallery}
          onClose={() => {
            setShowGallery(false)
            setSelectedPinId(null)
          }}
          pin={selectedPin}
          onAddPhotos={
            onAddPhotos
              ? (photos) => onAddPhotos(selectedPin.id, photos)
              : undefined
          }
          onRemovePhoto={
            onRemovePhoto
              ? (photoId) => onRemovePhoto(selectedPin.id, photoId)
              : undefined
          }
          onUpdateLabel={
            onUpdatePin
              ? (label) => onUpdatePin(selectedPin.id, { label })
              : undefined
          }
          projectId={projectId}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}

export default PhotoPinOverlay
