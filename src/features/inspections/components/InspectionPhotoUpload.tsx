// File: /src/features/inspections/components/InspectionPhotoUpload.tsx
// Component for uploading photos to an inspection

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, Upload, X, Loader2, ImagePlus } from 'lucide-react'
import { useToast } from '@/lib/notifications/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { PHOTO_TYPES, type PhotoType } from '../types/photo'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

interface InspectionPhotoUploadProps {
  inspectionId: string
  onUploadComplete?: () => void
  className?: string
}

export function InspectionPhotoUpload({
  inspectionId,
  onUploadComplete,
  className,
}: InspectionPhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [photoType, setPhotoType] = useState<PhotoType>('general')
  const [locationDescription, setLocationDescription] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()
  const { userProfile } = useAuth()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) {return}

    // Validate files
    const validFiles: File[] = []
    const newPreviews: string[] = []

    for (const file of files) {
      // Check type
      if (!ALLOWED_TYPES.includes(file.type)) {
        showError('Invalid File', `${file.name} is not a supported image type`)
        continue
      }

      // Check size
      if (file.size > MAX_FILE_SIZE) {
        showError('File Too Large', `${file.name} exceeds 10MB limit`)
        continue
      }

      validFiles.push(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        setPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      setIsDialogOpen(true)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [showError])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {return}

    setIsUploading(true)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${inspectionId}/${Date.now()}_${i}.${fileExt}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(fileName)

        // Create database record
        const { error: dbError } = await supabase
          .from('inspection_photos')
          .insert({
            inspection_id: inspectionId,
            url: publicUrl,
            storage_path: fileName,
            caption: caption || null,
            photo_type: photoType,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            location_description: locationDescription || null,
            uploaded_by: userProfile?.id,
            display_order: i,
          })

        if (dbError) {
          throw new Error(`Failed to save photo record: ${dbError.message}`)
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['inspection-photos', inspectionId] })

      success('Photos Uploaded', `${selectedFiles.length} photo(s) uploaded successfully`)

      // Reset state
      setSelectedFiles([])
      setPreviews([])
      setCaption('')
      setPhotoType('general')
      setLocationDescription('')
      setIsDialogOpen(false)

      onUploadComplete?.()
    } catch (err) {
      showError('Upload Failed', err instanceof Error ? err.message : 'Failed to upload photos')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFiles([])
    setPreviews([])
    setCaption('')
    setPhotoType('general')
    setLocationDescription('')
    setIsDialogOpen(false)
  }

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          Add Photos
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Upload Photos
            </DialogTitle>
            <DialogDescription>
              Add photos to this inspection. You can add captions and categorize them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photo Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                      {selectedFiles[index]?.name}
                    </div>
                  </div>
                ))}

                {/* Add More Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Add More</span>
                </button>
              </div>
            )}

            {/* Photo Type */}
            <div className="space-y-2">
              <Label>Photo Type</Label>
              <Select value={photoType} onValueChange={(v) => setPhotoType(v as PhotoType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span>{type.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption (Optional)</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for these photos..."
                rows={2}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="e.g., Floor 3, Column A2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={uploadPhotos} disabled={isUploading || selectedFiles.length === 0}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default InspectionPhotoUpload
