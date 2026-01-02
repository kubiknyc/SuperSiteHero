// File: /src/features/notices/components/NoticeDocumentUpload.tsx
// Document upload component for notice attachments

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, X, FileIcon, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { useUploadNoticeDocumentWithNotification } from '../hooks'

interface NoticeDocumentUploadProps {
  projectId: string
  noticeId: string
  type: 'notice' | 'response'
  currentUrl?: string | null
  onUploadComplete: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

/**
 * NoticeDocumentUpload Component
 *
 * Simple file upload for notice or response documents.
 * Supports drag-and-drop and file browser.
 */
export function NoticeDocumentUpload({
  projectId,
  noticeId,
  type,
  currentUrl,
  onUploadComplete,
  onRemove,
  disabled = false,
  className,
}: NoticeDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadNoticeDocumentWithNotification()

  // Handle drag over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  // Handle drag leave
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  // Handle drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) {return}

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  // Handle browse button click
  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {return}

    try {
      const url = await uploadMutation.mutateAsync({
        projectId,
        noticeId,
        file: selectedFile,
        type,
      })

      onUploadComplete(url)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (_error) {
      logger.error('Upload error:', error)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Get file name from URL
  const getFileNameFromUrl = (url: string): string => {
    const parts = url.split('/')
    return parts[parts.length - 1] || 'Document'
  }

  const isUploading = uploadMutation.isPending

  // If there's a current document, show it
  if (currentUrl && !selectedFile) {
    return (
      <div className={cn('border rounded-lg p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileIcon className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium text-foreground text-sm">
                {getFileNameFromUrl(currentUrl)}
              </p>
              <p className="text-xs text-muted">
                {type === 'notice' ? 'Notice Document' : 'Response Document'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            {onRemove && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-error hover:text-error-dark"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {!disabled && (
          <div className="mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBrowseClick}
            >
              Replace Document
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        disabled={disabled}
      />

      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-input hover:border-gray-400 hover:bg-surface',
          selectedFile && 'bg-surface',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && !selectedFile && 'cursor-pointer'
        )}
        onClick={!selectedFile && !disabled ? handleBrowseClick : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Drop zone for ${type} document upload`}
      >
        {!selectedFile ? (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3 text-disabled" />
            <p className="text-sm font-medium text-secondary mb-1">
              Drag and drop {type === 'notice' ? 'notice' : 'response'} document
            </p>
            <p className="text-xs text-muted mb-3">PDF, Word, Excel, or Images</p>
            <Button type="button" size="sm" onClick={(e) => {
              e.stopPropagation()
              handleBrowseClick()
            }} disabled={disabled}>
              Browse Files
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileIcon className="w-8 h-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleCancel()
              }}
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons when file is selected */}
      {selectedFile && (
        <div className="flex justify-end gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      )}
    </div>
  )
}
