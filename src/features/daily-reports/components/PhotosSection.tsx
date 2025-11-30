// Photos section for daily reports
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { PhotoUpload } from './PhotoUpload'
import { PhotoGallery } from './PhotoGallery'
import type { DailyReportPhoto } from '../types/photo'
import { compressImage, processPhoto, generateThumbnail } from '../utils/photoUtils'
import toast from 'react-hot-toast'

interface PhotosSectionProps {
  expanded: boolean
  onToggle: () => void
  photos: DailyReportPhoto[]
  onAddPhotos: (photos: DailyReportPhoto[]) => void
  onRemovePhoto: (photoId: string) => void
  onUpdateCaption: (photoId: string, caption: string) => void
  disabled?: boolean
}

export function PhotosSection({
  expanded,
  onToggle,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onUpdateCaption,
  disabled = false,
}: PhotosSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePhotosSelected = async (files: File[]) => {
    setIsProcessing(true)

    try {
      const processedPhotos: DailyReportPhoto[] = []

      for (const file of files) {
        try {
          // Compress image
          const compressedFile = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            quality: 0.8,
          })

          // Extract metadata
          const metadata = await processPhoto(compressedFile, {
            extractGPS: true,
            extractEXIF: true,
          })

          // Generate thumbnail
          const thumbnailUrl = await generateThumbnail(compressedFile, 200)

          // Create photo object
          const photo: DailyReportPhoto = {
            id: crypto.randomUUID(),
            caption: '',
            metadata,
            localFile: compressedFile,
            thumbnailUrl,
            uploadStatus: 'pending',
          }

          processedPhotos.push(photo)
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
          toast.error(`Failed to process ${file.name}`)
        }
      }

      if (processedPhotos.length > 0) {
        onAddPhotos(processedPhotos)
        toast.success(`Added ${processedPhotos.length} photo${processedPhotos.length > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Error processing photos:', error)
      toast.error('Failed to process photos')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <CardTitle className="text-base">Photos</CardTitle>
            <CardDescription>
              Progress documentation with GPS metadata
              {photos.length > 0 && ` (${photos.length} photo${photos.length !== 1 ? 's' : ''})`}
            </CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-6 border-t pt-6">
          {/* Photo Upload */}
          {!disabled && (
            <PhotoUpload
              onPhotosSelected={handlePhotosSelected}
              multiple
              maxSizeMB={10}
              disabled={isProcessing}
            />
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <PhotoGallery
              photos={photos}
              onRemove={!disabled ? onRemovePhoto : undefined}
              onUpdateCaption={!disabled ? onUpdateCaption : undefined}
              readOnly={disabled}
            />
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center text-sm text-gray-600">
              Processing photos...
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
