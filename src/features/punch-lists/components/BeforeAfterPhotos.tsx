// File: /src/features/punch-lists/components/BeforeAfterPhotos.tsx
// Component for capturing before/after photos on punch list items
// Prompts users to document the issue (before) and the fix (after)

import { useState, useRef } from 'react'
import { Camera, X, ImagePlus, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export interface PunchPhoto {
  id: string
  url: string
  file?: File
  caption?: string
  type: 'before' | 'after'
  uploadedAt?: string
}

interface BeforeAfterPhotosProps {
  beforePhotos: PunchPhoto[]
  afterPhotos: PunchPhoto[]
  onBeforePhotosChange: (photos: PunchPhoto[]) => void
  onAfterPhotosChange: (photos: PunchPhoto[]) => void
  showAfterSection?: boolean
  requireBeforePhoto?: boolean
  status?: string
  compact?: boolean
}

export function BeforeAfterPhotos({
  beforePhotos,
  afterPhotos,
  onBeforePhotosChange,
  onAfterPhotosChange,
  showAfterSection = false,
  requireBeforePhoto = false,
  status,
  compact = false,
}: BeforeAfterPhotosProps) {
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState<'before' | 'after' | null>(null)

  // Determine if we should prompt for after photos based on status
  const shouldPromptForAfter =
    showAfterSection ||
    status === 'completed' ||
    status === 'ready_for_review' ||
    status === 'verified'

  const handleFileSelect = (
    files: FileList | null,
    type: 'before' | 'after'
  ) => {
    if (!files) {return}

    const newPhotos: PunchPhoto[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
      type,
      uploadedAt: new Date().toISOString(),
    }))

    if (type === 'before') {
      onBeforePhotosChange([...beforePhotos, ...newPhotos])
    } else {
      onAfterPhotosChange([...afterPhotos, ...newPhotos])
    }
  }

  const handleRemovePhoto = (photoId: string, type: 'before' | 'after') => {
    if (type === 'before') {
      const photo = beforePhotos.find((p) => p.id === photoId)
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }
      onBeforePhotosChange(beforePhotos.filter((p) => p.id !== photoId))
    } else {
      const photo = afterPhotos.find((p) => p.id === photoId)
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }
      onAfterPhotosChange(afterPhotos.filter((p) => p.id !== photoId))
    }
  }

  const handleDragOver = (e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault()
    setDragOver(type)
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault()
    setDragOver(null)
    handleFileSelect(e.dataTransfer.files, type)
  }

  const PhotoGrid = ({
    photos,
    type,
  }: {
    photos: PunchPhoto[]
    type: 'before' | 'after'
  }) => (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group aspect-square">
          <img
            src={photo.url}
            alt={`${type} photo`}
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => handleRemovePhoto(photo.id, type)}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )

  const UploadZone = ({
    type,
    inputRef,
  }: {
    type: 'before' | 'after'
    inputRef: React.RefObject<HTMLInputElement>
  }) => (
    <div
      onDragOver={(e) => handleDragOver(e, type)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, type)}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        dragOver === type
          ? 'border-blue-500 bg-blue-50'
          : 'border-input hover:border-gray-400'
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, type)}
      />
      <div className="flex flex-col items-center gap-2">
        {compact ? (
          <Camera className="h-6 w-6 text-disabled" />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-disabled" />
            <span className="text-sm text-muted">
              Click or drag photos here
            </span>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Before Photos Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="font-medium">
            Before Photos
            {requireBeforePhoto && (
              <span className="text-error ml-1">*</span>
            )}
          </Label>
          {requireBeforePhoto && beforePhotos.length === 0 && (
            <span className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          Document the issue before work begins
        </p>

        {beforePhotos.length > 0 && <PhotoGrid photos={beforePhotos} type="before" />}

        <UploadZone type="before" inputRef={beforeInputRef} />
      </div>

      {/* After Photos Section */}
      {shouldPromptForAfter && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="font-medium">After Photos</Label>
            {(status === 'completed' || status === 'ready_for_review') &&
              afterPhotos.length === 0 && (
                <span className="text-xs text-warning flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Recommended
                </span>
              )}
          </div>
          <p className="text-xs text-muted">
            Document the completed work for verification
          </p>

          {afterPhotos.length > 0 && <PhotoGrid photos={afterPhotos} type="after" />}

          <UploadZone type="after" inputRef={afterInputRef} />
        </div>
      )}

      {/* Prompt to add after photos when status changes */}
      {!shouldPromptForAfter && beforePhotos.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Camera className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                Photo Documentation
              </p>
              <p className="text-primary-hover">
                When this item is completed, you'll be prompted to add "after"
                photos to document the fix.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Simpler inline photo button for use in tables/lists
interface PhotoButtonProps {
  photoCount: number
  hasBeforePhotos: boolean
  hasAfterPhotos: boolean
  onClick: () => void
}

export function PhotoStatusButton({
  photoCount,
  hasBeforePhotos,
  hasAfterPhotos,
  onClick,
}: PhotoButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="flex items-center gap-1.5 h-8"
    >
      <Camera className="h-4 w-4" />
      <span>{photoCount}</span>
      <div className="flex gap-0.5">
        <div
          className={`w-2 h-2 rounded-full ${
            hasBeforePhotos ? 'bg-warning' : 'bg-gray-300'
          }`}
          title={hasBeforePhotos ? 'Has before photos' : 'No before photos'}
        />
        <div
          className={`w-2 h-2 rounded-full ${
            hasAfterPhotos ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={hasAfterPhotos ? 'Has after photos' : 'No after photos'}
        />
      </div>
    </Button>
  )
}

// Side-by-side comparison view for before/after photos
interface PhotoComparisonProps {
  beforePhoto?: PunchPhoto
  afterPhoto?: PunchPhoto
}

export function PhotoComparison({ beforePhoto, afterPhoto }: PhotoComparisonProps) {
  if (!beforePhoto && !afterPhoto) {
    return (
      <div className="p-4 bg-surface rounded-lg text-center text-muted">
        No photos available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          Before
        </Label>
        {beforePhoto ? (
          <img
            src={beforePhoto.url}
            alt="Before"
            className="w-full aspect-square object-cover rounded-lg border"
          />
        ) : (
          <div className="w-full aspect-square bg-muted rounded-lg border flex items-center justify-center text-disabled">
            No photo
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          After
        </Label>
        {afterPhoto ? (
          <img
            src={afterPhoto.url}
            alt="After"
            className="w-full aspect-square object-cover rounded-lg border"
          />
        ) : (
          <div className="w-full aspect-square bg-muted rounded-lg border flex items-center justify-center text-disabled">
            No photo
          </div>
        )}
      </div>
    </div>
  )
}
