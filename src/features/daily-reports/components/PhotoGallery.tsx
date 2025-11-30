// Photo gallery display component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <div className="text-center py-8 text-gray-500">
        <FileImage className="h-12 w-12 mx-auto mb-2 text-gray-400" />
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
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              {photo.url || photo.thumbnailUrl ? (
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || photo.metadata.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : photo.localFile ? (
                <img
                  src={URL.createObjectURL(photo.localFile)}
                  alt={photo.metadata.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileImage className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Status Badge */}
              {photo.uploadStatus !== 'uploaded' && !readOnly && (
                <div className="absolute top-2 right-2">
                  <span
                    className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${photo.uploadStatus === 'uploading' ? 'bg-blue-100 text-blue-700' : ''}
                    ${photo.uploadStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${photo.uploadStatus === 'failed' ? 'bg-red-100 text-red-700' : ''}
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
                    <span className="text-xs text-red-600">{captionError}</span>
                  )}
                  <span
                    className={`text-xs ml-auto ${
                      captionCount.isOverLimit
                        ? 'text-red-600 font-semibold'
                        : captionCount.isNearLimit
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {captionCount.count} / 300
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                {photo.caption ? (
                  <p className="text-sm text-gray-700 line-clamp-2">{photo.caption}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No caption</p>
                )}
                {!readOnly && onUpdateCaption && (
                  <button
                    onClick={() => startEditCaption(photo)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
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
            className="max-w-6xl max-h-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedPhoto.metadata.filename}</h3>
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
                  <FileImage className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="p-4 border-t bg-gray-50 space-y-3">
              {selectedPhoto.caption && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Caption</p>
                  <p className="text-sm text-gray-900">{selectedPhoto.caption}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {selectedPhoto.metadata.capturedAt && (
                  <div>
                    <p className="font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Captured
                    </p>
                    <p className="text-gray-900">
                      {format(new Date(selectedPhoto.metadata.capturedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-medium text-gray-600 flex items-center gap-1">
                    <FileImage className="h-4 w-4" />
                    File Size
                  </p>
                  <p className="text-gray-900">{formatFileSize(selectedPhoto.metadata.size)}</p>
                </div>

                {selectedPhoto.metadata.width && selectedPhoto.metadata.height && (
                  <div>
                    <p className="font-medium text-gray-600">Dimensions</p>
                    <p className="text-gray-900">
                      {selectedPhoto.metadata.width} × {selectedPhoto.metadata.height}
                    </p>
                  </div>
                )}

                {selectedPhoto.metadata.gps && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900">{formatGPSCoordinates(selectedPhoto.metadata.gps)}</p>
                      <a
                        href={getGoogleMapsURL(selectedPhoto.metadata.gps)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}

                {selectedPhoto.metadata.exif?.make && selectedPhoto.metadata.exif?.model && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="font-medium text-gray-600">Camera</p>
                    <p className="text-gray-900">
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
