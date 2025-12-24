// Photo gallery display component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OptimizedImage } from '@/components/ui/optimized-image'
import {
  X,
  MapPin,
  Calendar,
  FileImage,
  Maximize2,
  Edit2,
  Check,
  ExternalLink,
} from 'lucide-react'
import type { DailyReportPhoto } from '../types/photo'
import { formatFileSize, formatGPSCoordinates, getGoogleMapsURL } from '../utils/photoUtils'
import { format } from 'date-fns'
import { getCharacterCount } from '../validation/validationUtils'
import toast from 'react-hot-toast'

interface PhotoGalleryProps {
  photos: DailyReportPhoto[]
  onRemove?: (photoId: string) => void
  onUpdateCaption?: (photoId: string, caption: string) => void
  readOnly?: boolean
}

export function PhotoGallery({ photos, onRemove, onUpdateCaption, readOnly = false }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DailyReportPhoto | null>(null)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [captionError, setCaptionError] = useState<string>('')

  const startEditCaption = (photo: DailyReportPhoto) => {
    setEditingCaption(photo.id)
    setCaptionText(photo.caption || '')
    setCaptionError('')
  }

  const saveCaption = (photoId: string) => {
    // Validate caption length
    if (captionText.length > 300) {
      setCaptionError('Caption must be 300 characters or less')
      toast.error('Caption is too long (max 300 characters)')
      return
    }

    if (onUpdateCaption) {
      onUpdateCaption(photoId, captionText)
      toast.success('Caption updated')
    }
    setEditingCaption(null)
    setCaptionError('')
  }

  const cancelEditCaption = () => {
    setEditingCaption(null)
    setCaptionText('')
    setCaptionError('')
  }

  const captionCount = getCharacterCount(captionText, 300)

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <FileImage className="h-12 w-12 mx-auto mb-2 text-disabled" />
        <p>No photos uploaded</p>
      </div>
    )
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative">
            {/* Photo Thumbnail */}
            <div
              className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              {photo.url || photo.thumbnailUrl ? (
                <OptimizedImage
                  src={photo.thumbnailUrl || photo.url || ''}
                  alt={photo.caption || photo.metadata.filename}
                  aspectRatio="square"
                  objectFit="cover"
                  className="group-hover:scale-105 transition-transform"
                />
              ) : photo.localFile ? (
                <OptimizedImage
                  src={URL.createObjectURL(photo.localFile)}
                  alt={photo.metadata.filename}
                  aspectRatio="square"
                  objectFit="cover"
                  className="group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileImage className="h-12 w-12 text-disabled" />
                </div>
              )}

              {/* Status Badge */}
              {photo.uploadStatus !== 'uploaded' && !readOnly && (
                <div className="absolute top-2 right-2">
                  <span
                    className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${photo.uploadStatus === 'uploading' ? 'bg-info-light text-primary-hover' : ''}
                    ${photo.uploadStatus === 'pending' ? 'bg-warning-light text-yellow-700' : ''}
                    ${photo.uploadStatus === 'failed' ? 'bg-error-light text-error-dark' : ''}
                  `}
                  >
                    {photo.uploadStatus}
                  </span>
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Caption */}
            {editingCaption === photo.id ? (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  <Input
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Add caption..."
                    className={`text-sm ${captionError ? 'border-red-500' : ''}`}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={() => saveCaption(photo.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditCaption}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  {captionError && (
                    <span className="text-xs text-error">{captionError}</span>
                  )}
                  <span
                    className={`text-xs ml-auto ${
                      captionCount.isOverLimit
                        ? 'text-error font-semibold'
                        : captionCount.isNearLimit
                        ? 'text-warning'
                        : 'text-muted'
                    }`}
                  >
                    {captionCount.count} / 300
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                {photo.caption ? (
                  <p className="text-sm text-secondary line-clamp-2">{photo.caption}</p>
                ) : (
                  <p className="text-sm text-disabled italic">No caption</p>
                )}
                {!readOnly && onUpdateCaption && (
                  <button
                    onClick={() => startEditCaption(photo)}
                    className="text-xs text-primary hover:text-primary-hover mt-1"
                  >
                    <Edit2 className="h-3 w-3 inline mr-1" />
                    Edit caption
                  </button>
                )}
              </div>
            )}

            {/* Remove Button */}
            {!readOnly && onRemove && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(photo.id)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Full Size Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="max-w-6xl max-h-full bg-card rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg" className="heading-subsection">{selectedPhoto.metadata.filename}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPhoto(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Photo */}
            <div className="p-4 max-h-[60vh] overflow-auto">
              {selectedPhoto.url || selectedPhoto.localFile ? (
                <img
                  src={selectedPhoto.url || URL.createObjectURL(selectedPhoto.localFile!)}
                  alt={selectedPhoto.caption || selectedPhoto.metadata.filename}
                  className="max-w-full h-auto mx-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <FileImage className="h-24 w-24 text-disabled" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="p-4 border-t bg-surface space-y-3">
              {selectedPhoto.caption && (
                <div>
                  <p className="text-sm font-medium text-secondary">Caption</p>
                  <p className="text-sm text-foreground">{selectedPhoto.caption}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {selectedPhoto.metadata.capturedAt && (
                  <div>
                    <p className="font-medium text-secondary flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Captured
                    </p>
                    <p className="text-foreground">
                      {format(new Date(selectedPhoto.metadata.capturedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-medium text-secondary flex items-center gap-1">
                    <FileImage className="h-4 w-4" />
                    File Size
                  </p>
                  <p className="text-foreground">{formatFileSize(selectedPhoto.metadata.size)}</p>
                </div>

                {selectedPhoto.metadata.width && selectedPhoto.metadata.height && (
                  <div>
                    <p className="font-medium text-secondary">Dimensions</p>
                    <p className="text-foreground">
                      {selectedPhoto.metadata.width} × {selectedPhoto.metadata.height}
                    </p>
                  </div>
                )}

                {selectedPhoto.metadata.gps && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="font-medium text-secondary flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-foreground">{formatGPSCoordinates(selectedPhoto.metadata.gps)}</p>
                      <a
                        href={getGoogleMapsURL(selectedPhoto.metadata.gps)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}

                {selectedPhoto.metadata.exif?.make && selectedPhoto.metadata.exif?.model && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="font-medium text-secondary">Camera</p>
                    <p className="text-foreground">
                      {selectedPhoto.metadata.exif.make} {selectedPhoto.metadata.exif.model}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
