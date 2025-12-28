// File: /src/features/checklists/components/PhotoGallery.tsx
// Photo gallery display with preview and delete functionality
// Phase: 3.2 - Photo & Signature Capture

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { X, ZoomIn, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PhotoGalleryProps {
  photos: string[]
  onDeletePhoto?: (url: string, index: number) => void
  readOnly?: boolean
  maxPhotos?: number
  minPhotos?: number
}

export function PhotoGallery({
  photos,
  onDeletePhoto,
  readOnly = false,
  maxPhotos,
  minPhotos = 0,
}: PhotoGalleryProps) {
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [downloadTimestamp] = useState(() => Date.now())

  const handleDelete = (url: string, index: number) => {
    // Prevent deletion if it would go below minimum
    if (photos.length <= minPhotos) {
      return
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    setDeletingIndex(index)
    onDeletePhoto?.(url, index)

    // Clear deleting state after a delay
    setTimeout(() => setDeletingIndex(null), 500)
  }

  if (photos.length === 0) {
    return (
      <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
        <Camera className="w-12 h-12 mx-auto text-disabled mb-2" />
        <p className="text-sm text-secondary">No photos yet</p>
        {minPhotos > 0 && (
          <p className="text-xs text-muted mt-1">
            Minimum {minPhotos} photo{minPhotos > 1 ? 's' : ''} required
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Photo count indicator */}
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>
            {photos.length} photo{photos.length > 1 ? 's' : ''}
            {maxPhotos && ` / ${maxPhotos} max`}
          </span>
          {minPhotos > 0 && photos.length < minPhotos && (
            <span className="text-error text-xs">
              {minPhotos - photos.length} more required
            </span>
          )}
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {photos.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={`relative group aspect-square rounded-lg overflow-hidden border transition-opacity ${
                deletingIndex === index ? 'opacity-50' : ''
              }`}
            >
              {/* Photo image */}
              <OptimizedImage
                src={url}
                alt={`Photo ${index + 1}`}
                aspectRatio="square"
                objectFit="cover"
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewPhoto(url)}
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center gap-2">
                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(url)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-full p-2 hover:bg-muted"
                  title="Preview"
                >
                  <ZoomIn className="w-4 h-4 text-secondary" />
                </button>

                {/* Delete button */}
                {!readOnly && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => handleDelete(url, index)}
                    disabled={photos.length <= minPhotos}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-2 ${
                      photos.length <= minPhotos
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-error hover:bg-red-700'
                    }`}
                    title={
                      photos.length <= minPhotos
                        ? `Cannot delete (minimum ${minPhotos} required)`
                        : 'Delete photo'
                    }
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Photo index badge */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-screen preview dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Photo Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewPhoto && (
              <img
                src={previewPhoto}
                alt="Full size preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewPhoto(null)}>
              Close
            </Button>
            {previewPhoto && (
              <a
                href={previewPhoto}
                download={`photo-${downloadTimestamp}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>Download</Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
