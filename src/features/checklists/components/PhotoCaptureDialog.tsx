// File: /src/features/checklists/components/PhotoCaptureDialog.tsx
// Photo upload and capture dialog with compression and progress tracking
// Phase: 3.2 - Photo & Signature Capture

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, X, Check, Wifi, WifiOff, Clock, FolderOpen, Pen, FileText } from 'lucide-react'
import { PhotoGallery } from './PhotoGallery'
import { PhotoAnnotationEditor } from './PhotoAnnotationEditor'
import { PhotoWithOcrCard } from './PhotoWithOcrCard'
import {
  validateImageFile,
  compressImage,
  hasCameraSupport,
} from '../utils/imageUtils'
import { uploadChecklistPhoto, deleteChecklistPhoto } from '../utils/storageUtils'
import { extractPhotoMetadata, enrichMetadataWithDeviceGPS } from '../utils/exifUtils'
import { usePhotoQueue } from '../hooks/usePhotoQueue'
import type { PhotoOcrData } from '@/types/ocr'
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
  const [bulkProgress, setBulkProgress] = useState<{
    total: number
    completed: number
    failed: number
  } | null>(null)
  const [annotatingPhoto, setAnnotatingPhoto] = useState<{
    file: File
    dataUrl: string
  } | null>(null)
  const [ocrEnabled, setOcrEnabled] = useState(false)
  const [ocrData, setOcrData] = useState<Record<string, PhotoOcrData>>({})

  // Photo queue integration
  const {
    isOnline,
    isProcessing,
    stats,
    addToQueue,
    responsePhotos,
  } = usePhotoQueue(responseId)

  // Update local photos when uploaded photos arrive from queue
  useEffect(() => {
    const uploadedUrls = responsePhotos
      .filter((p) => p.status === 'uploaded' && p.uploadedUrl)
      .map((p) => p.uploadedUrl!)

    if (uploadedUrls.length > 0) {
      setLocalPhotos((prev) => {
        const combined = [...prev, ...uploadedUrls]
        // Remove duplicates
        return Array.from(new Set(combined))
      })
    }
  }, [responsePhotos])

  // Check if we can accept more photos
  const canAddMore = localPhotos.length < maxPhotos
  const photosRemaining = maxPhotos - localPhotos.length

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {return}

      // Check photo limit
      if (localPhotos.length >= maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos allowed`)
        return
      }

      const filesToUpload = Array.from(files).slice(0, photosRemaining)

      // Initialize bulk progress if uploading multiple files
      if (filesToUpload.length > 1) {
        setBulkProgress({
          total: filesToUpload.length,
          completed: 0,
          failed: 0,
        })
      }

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
          // Extract EXIF metadata before compression
          let metadata = await extractPhotoMetadata(file)

          // Enrich with device GPS if photo doesn't have coordinates
          metadata = await enrichMetadataWithDeviceGPS(metadata)

          // Compress image
          const compressedFile = await compressImage(file)

          // Update progress
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file ? { ...uf, progress: 50 } : uf
            )
          )

          // If offline, queue for later upload
          if (!isOnline) {
            await addToQueue({
              checklistId,
              responseId,
              file: compressedFile,
              metadata,
            })

            // Update progress to 100 (queued)
            setUploadingFiles((prev) =>
              prev.map((uf) =>
                uf.file === file ? { ...uf, progress: 100 } : uf
              )
            )

            // Remove from uploading list after brief delay
            setTimeout(() => {
              setUploadingFiles((prev) => prev.filter((uf) => uf.file !== file))
            }, 500)

            const hasGPS = metadata.latitude !== undefined && metadata.longitude !== undefined

            // Update bulk progress
            if (bulkProgress) {
              setBulkProgress((prev) =>
                prev ? { ...prev, completed: prev.completed + 1 } : null
              )
            } else {
              toast.success(`Photo queued ${hasGPS ? 'with GPS location' : 'for upload when online'}`)
            }
            continue
          }

          // If online, upload immediately
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

          // Update bulk progress
          if (bulkProgress) {
            setBulkProgress((prev) =>
              prev ? { ...prev, completed: prev.completed + 1 } : null
            )
          } else {
            toast.success('Photo uploaded successfully')
          }
        } catch (error) {
          console.error('Photo upload failed:', error)
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file === file
                ? { ...uf, error: 'Upload failed' }
                : uf
            )
          )

          // Update bulk progress
          if (bulkProgress) {
            setBulkProgress((prev) =>
              prev ? { ...prev, failed: prev.failed + 1 } : null
            )
          } else {
            toast.error('Failed to upload photo')
          }
        }
      }

      // Show bulk completion message
      if (bulkProgress) {
        const totalProcessed = bulkProgress.completed + bulkProgress.failed + 1
        if (totalProcessed >= bulkProgress.total) {
          setTimeout(() => {
            toast.success(
              `Bulk upload complete: ${bulkProgress.completed} succeeded${
                bulkProgress.failed > 0 ? `, ${bulkProgress.failed} failed` : ''
              }`
            )
            setBulkProgress(null)
          }, 500)
        }
      }
    },
    [checklistId, responseId, localPhotos.length, maxPhotos, photosRemaining, isOnline, addToQueue, bulkProgress]
  )

  const handleDeletePhoto = async (url: string, index: number) => {
    try {
      // Delete from storage
      await deleteChecklistPhoto(url)

      // Remove from local state
      setLocalPhotos((prev) => prev.filter((_, i) => i !== index))

      // Remove OCR data for this photo
      setOcrData((prev) => {
        const newData = { ...prev }
        delete newData[url]
        return newData
      })

      toast.success('Photo deleted')
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  const handleOcrComplete = (photoUrl: string, data: PhotoOcrData) => {
    setOcrData((prev) => ({
      ...prev,
      [photoUrl]: data,
    }))
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

    if (!canAddMore || disabled) {return}

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
              <span className="text-sm font-normal text-muted">
                (minimum {minPhotos} required)
              </span>
            )}
          </DialogTitle>

          {/* Status and Options */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="outline" className="text-success border-success">
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline - photos will be queued
                </Badge>
              )}

              {/* Queue Stats */}
              {stats && (stats.pending > 0 || stats.uploading > 0) && (
                <Badge variant="outline" className="text-primary border-primary">
                  <Clock className="w-3 h-3 mr-1" />
                  {stats.pending} queued
                  {stats.uploading > 0 && `, ${stats.uploading} uploading`}
                </Badge>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1" />
                  Syncing...
                </Badge>
              )}
            </div>

            {/* OCR Toggle */}
            <Button
              type="button"
              size="sm"
              variant={ocrEnabled ? 'default' : 'outline'}
              onClick={() => setOcrEnabled(!ocrEnabled)}
              className="ml-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              {ocrEnabled ? 'OCR Enabled' : 'Enable OCR'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current photos */}
          {localPhotos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localPhotos.map((photoUrl, index) => (
                <PhotoWithOcrCard
                  key={photoUrl}
                  photoUrl={photoUrl}
                  ocrData={ocrData[photoUrl]}
                  onOcrComplete={(data) => handleOcrComplete(photoUrl, data)}
                  onDelete={disabled ? undefined : () => handleDeletePhoto(photoUrl, index)}
                  showOcrButton={ocrEnabled}
                />
              ))}
            </div>
          )}

          {/* Upload zone */}
          {canAddMore && !disabled && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-input hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera className="w-12 h-12 mx-auto text-disabled mb-3" />
              <p className="text-sm text-secondary mb-2">
                Drop photos here or click to browse
              </p>
              <p className="text-xs text-muted mb-4">
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
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Select Photos
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

                {/* Annotate & Upload button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                          setAnnotatingPhoto({
                            file,
                            dataUrl: e.target?.result as string,
                          })
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  }}
                  disabled={isUploading || !canAddMore}
                >
                  <Pen className="w-4 h-4 mr-2" />
                  Annotate & Upload
                </Button>
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

          {/* Bulk upload progress summary */}
          {bulkProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium text-blue-900" className="heading-subsection">
                  Bulk Upload Progress
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">
                    {bulkProgress.completed + bulkProgress.failed} of {bulkProgress.total} processed
                  </span>
                  <span className="text-secondary">
                    {Math.round(((bulkProgress.completed + bulkProgress.failed) / bulkProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width: `${((bulkProgress.completed + bulkProgress.failed) / bulkProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-secondary">
                  <span className="text-success">
                    ✓ {bulkProgress.completed} succeeded
                  </span>
                  {bulkProgress.failed > 0 && (
                    <span className="text-error">
                      ✗ {bulkProgress.failed} failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-secondary" className="heading-subsection">Uploading...</h3>
              {uploadingFiles.map((uf, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-secondary">{uf.file.name}</span>
                      {uf.error ? (
                        <span className="text-xs text-error">{uf.error}</span>
                      ) : (
                        <span className="text-xs text-muted">{uf.progress}%</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
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
                    <Check className="w-5 h-5 text-success" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Annotation Editor Dialog */}
        {annotatingPhoto && (
          <Dialog open={true} onOpenChange={() => setAnnotatingPhoto(null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Annotate Photo</DialogTitle>
              </DialogHeader>
              <PhotoAnnotationEditor
                imageUrl={annotatingPhoto.dataUrl}
                onSave={async (annotatedImageUrl) => {
                  // Convert data URL back to file
                  const response = await fetch(annotatedImageUrl)
                  const blob = await response.blob()
                  const annotatedFile = new File(
                    [blob],
                    annotatingPhoto.file.name,
                    { type: 'image/png' }
                  )

                  // Upload the annotated photo
                  setAnnotatingPhoto(null)
                  await handleFileSelect(new DataTransfer().files)

                  // Manually trigger upload for this single annotated file
                  const fileList = new DataTransfer()
                  fileList.items.add(annotatedFile)
                  await handleFileSelect(fileList.files)
                }}
                onCancel={() => setAnnotatingPhoto(null)}
              />
            </DialogContent>
          </Dialog>
        )}

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
