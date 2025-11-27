// File: /src/features/checklists/components/PhotoCaptureDialog.tsx
// Photo upload and capture dialog with compression and progress tracking
// Phase: 3.2 - Photo & Signature Capture

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, Check } from 'lucide-react'
import { PhotoGallery } from './PhotoGallery'
import {
  validateImageFile,
  compressImage,
  hasCameraSupport,
} from '../utils/imageUtils'
import { uploadChecklistPhoto, deleteChecklistPhoto } from '../utils/storageUtils'
import toast from 'react-hot-toast'

interface PhotoCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checklistId: string
  responseId: string
  currentPhotos: string[]
  minPhotos?: number
  maxPhotos?: number
  onPhotosUpdated: (photoUrls: string[]) => void
  disabled?: boolean
}

interface UploadingFile {
  file: File
  progress: number
  error?: string
}

export function PhotoCaptureDialog({
  open,
  onOpenChange,
  checklistId,
  responseId,
  currentPhotos,
  minPhotos = 0,
  maxPhotos = 5,
  onPhotosUpdated,
  disabled = false,
}: PhotoCaptureDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [localPhotos, setLocalPhotos] = useState<string[]>(currentPhotos)

  // Check if we can accept more photos
  const canAddMore = localPhotos.length < maxPhotos
  const photosRemaining = maxPhotos - localPhotos.length

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      // Check photo limit
      if (localPhotos.length >= maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos allowed`)
        return
      }

      const filesToUpload = Array.from(files).slice(0, photosRemaining)

      // Validate all files first
      for (const file of filesToUpload) {
        const validation = validateImageFile(file)
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid file')
          continue
        }

        // Add to uploading state
        setUploadingFiles((prev) => [
          ...prev,
          { file, progress: 0 },
        ])

        try {
          // Compress image
          const compressedFile = await compressImage(file)

          // Update progress
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file ? { ...uf, progress: 50 } : uf
            )
          )

          // Upload to storage
          const photoUrl = await uploadChecklistPhoto(
            compressedFile,
            checklistId,
            responseId
          )

          // Update progress
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file ? { ...uf, progress: 100 } : uf
            )
          )

          // Add to local photos
          setLocalPhotos((prev) => [...prev, photoUrl])

          // Remove from uploading list after brief delay
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((uf) => uf.file !== file))
          }, 500)
        } catch (error) {
          console.error('Photo upload failed:', error)
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file
                ? { ...uf, error: 'Upload failed' }
                : uf
            )
          )
          toast.error('Failed to upload photo')
        }
      }
    },
    [checklistId, responseId, localPhotos.length, maxPhotos, photosRemaining]
  )

  const handleDeletePhoto = async (url: string, index: number) => {
    try {
      // Delete from storage
      await deleteChecklistPhoto(url)

      // Remove from local state
      setLocalPhotos((prev) => prev.filter((_, i) => i !== index))

      toast.success('Photo deleted')
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  const handleSave = () => {
    // Check minimum photos requirement
    if (localPhotos.length < minPhotos) {
      toast.error(`At least ${minPhotos} photo${minPhotos > 1 ? 's' : ''} required`)
      return
    }

    // Update parent component
    onPhotosUpdated(localPhotos)
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset to original photos
    setLocalPhotos(currentPhotos)
    setUploadingFiles([])
    onOpenChange(false)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (!canAddMore || disabled) return

    handleFileSelect(e.dataTransfer.files)
  }

  // File input handlers
  const handleBrowseClick = () => {
    if (canAddMore && !disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleCameraClick = () => {
    if (canAddMore && !disabled) {
      cameraInputRef.current?.click()
    }
  }

  const isUploading = uploadingFiles.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Manage Photos
            {minPhotos > 0 && (
              <span className="text-sm font-normal text-gray-500">
                (minimum {minPhotos} required)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current photos */}
          {localPhotos.length > 0 && (
            <PhotoGallery
              photos={localPhotos}
              onDeletePhoto={handleDeletePhoto}
              readOnly={disabled}
              maxPhotos={maxPhotos}
              minPhotos={minPhotos}
            />
          )}

          {/* Upload zone */}
          {canAddMore && !disabled && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drop photos here or click to browse
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {photosRemaining} photo{photosRemaining > 1 ? 's' : ''} remaining
                (max {maxPhotos})
              </p>

              <div className="flex gap-2 justify-center">
                {/* Browse files button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBrowseClick}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>

                {/* Camera capture button (mobile only) */}
                {hasCameraSupport() && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraClick}
                    disabled={isUploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          )}

          {/* Upload progress */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Uploading...</h3>
              {uploadingFiles.map((uf, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{uf.file.name}</span>
                      {uf.error ? (
                        <span className="text-xs text-red-600">{uf.error}</span>
                      ) : (
                        <span className="text-xs text-gray-500">{uf.progress}%</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          uf.error
                            ? 'bg-red-500'
                            : uf.progress === 100
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                  </div>
                  {uf.progress === 100 && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={localPhotos.length < minPhotos || isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Photos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
