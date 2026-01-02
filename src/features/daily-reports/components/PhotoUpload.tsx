// Reusable photo upload component with drag & drop
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { validateImageFile, validateFileSize } from '../utils/photoUtils'
import { toast } from 'sonner'

interface PhotoUploadProps {
  onPhotosSelected: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
  maxSizeMB?: number
  className?: string
}

export function PhotoUpload({
  onPhotosSelected,
  multiple = true,
  disabled = false,
  maxSizeMB = 10,
  className = '',
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {return}

      setIsProcessing(true)

      const validFiles: File[] = []
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!validateImageFile(file)) {
          errors.push(`${file.name}: Invalid file type`)
          continue
        }

        if (!validateFileSize(file, maxSizeMB)) {
          errors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`)
          continue
        }

        validFiles.push(file)
      }

      if (errors.length > 0) {
        errors.forEach((error) => toast.error(error))
      }

      if (validFiles.length > 0) {
        onPhotosSelected(validFiles)
      }

      setIsProcessing(false)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onPhotosSelected, maxSizeMB]
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) {return}

    handleFiles(e.dataTransfer.files)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
        capture="environment" // Use rear camera on mobile
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-input hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={!disabled ? openFilePicker : undefined}
      >
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : (
            <>
              <div className="flex gap-2">
                <Camera className="h-10 w-10 text-disabled" />
                <Upload className="h-10 w-10 text-disabled" />
              </div>
            </>
          )}

          <div>
            <p className="font-medium text-foreground">
              {isProcessing ? 'Processing...' : 'Click or drag photos here'}
            </p>
            <p className="text-sm text-secondary mt-1">
              {multiple ? 'Upload multiple photos' : 'Upload a photo'} (max {maxSizeMB}MB each)
            </p>
          </div>

          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={openFilePicker}>
              <Camera className="h-4 w-4 mr-2" />
              Choose Photos
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
