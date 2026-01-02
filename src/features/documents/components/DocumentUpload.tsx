// File: /src/features/documents/components/DocumentUpload.tsx
// Document upload component with drag-drop support

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, X, FileIcon } from 'lucide-react'
import { Card, CardContent, Button, NativeSelect, Label } from '@/components/ui'
import { useCreateDocumentWithNotification } from '@/features/documents/hooks/useDocumentsMutations'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/features/documents/utils/fileUtils'
import { documentsApi } from '@/lib/api/services/documents'
import toast from 'react-hot-toast'
import type { Document, DocumentType } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


interface DocumentUploadProps {
  projectId: string
  folderId: string | null
  onUploadSuccess: (document: Document) => void
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'general', label: 'General Document' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'specification', label: 'Specification' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'scope', label: 'Scope of Work' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
]

/**
 * DocumentUpload Component
 *
 * File upload component with drag-and-drop support for document management.
 *
 * Features:
 * - Drag and drop zone with visual feedback
 * - File input button as fallback
 * - Display selected file name and size
 * - Document type selection
 * - Loading state during upload
 * - Automatic toast notifications on success/error
 *
 * Usage:
 * ```tsx
 * <DocumentUpload
 *   projectId={projectId}
 *   folderId={currentFolderId}
 *   onUploadSuccess={(doc) => logger.log('Uploaded:', doc)}
 * />
 * ```
 */
export function DocumentUpload({
  projectId,
  folderId,
  onUploadSuccess,
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('general')
  const [versionNotes, setVersionNotes] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createDocument = useCreateDocumentWithNotification()

  // Handle drag over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
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
    fileInputRef.current?.click()
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {return}

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Extract file name without extension
      const fileName = selectedFile.name
      const lastDotIndex = fileName.lastIndexOf('.')
      const nameWithoutExtension =
        lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName

      // Check if a document with the same name already exists
      const existingDocument = await documentsApi.findDocumentByName(
        projectId,
        nameWithoutExtension,
        folderId
      )

      // Upload file to Supabase Storage
      const { publicUrl } = await uploadFile(
        selectedFile,
        projectId,
        'documents',
        (progress) => setUploadProgress(progress)
      )

      if (existingDocument) {
        // Document exists - create a new version
        const newVersion = await documentsApi.createDocumentVersion(
          existingDocument.id,
          publicUrl,
          versionNotes || `Updated version of ${nameWithoutExtension}`
        )

        onUploadSuccess(newVersion)
        toast.success(`New version created! Now at v${newVersion.version}`)

        // Reset form
        setSelectedFile(null)
        setDocumentType('general')
        setVersionNotes('')
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        // New document - create it
        const documentData = {
          project_id: projectId,
          folder_id: folderId,
          name: nameWithoutExtension,
          description: null as string | null,
          document_type: documentType,
          discipline: null as string | null,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          version: '1.0',
          revision: null as string | null,
          is_latest_version: true,
          supersedes_document_id: null as string | null,
          drawing_number: null as string | null,
          specification_section: null as string | null,
          issue_date: null as string | null,
          received_date: new Date().toISOString(),
          status: 'current' as const,
          is_pinned: false,
          requires_approval: false,
          deleted_at: null as string | null,
          created_by: null as string | null, // Will be set by mutation hook
        }

        createDocument.mutate(documentData as any, {
          onSuccess: (document) => {
            onUploadSuccess(document)
            toast.success('Document uploaded successfully!')
            // Reset form
            setSelectedFile(null)
            setDocumentType('general')
            setVersionNotes('')
            setUploadProgress(0)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          },
          onError: (error) => {
            toast.error('Failed to create document record')
            logger.error('Document creation error:', error)
          },
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      toast.error(errorMessage)
      logger.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null)
    setDocumentType('general')
    setVersionNotes('')
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

  return (
    <Card>
      <CardContent className="p-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          aria-label="File input"
        />

        {/* Drag and drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-input hover:border-gray-400 hover:bg-surface',
            selectedFile && 'bg-surface'
          )}
          onClick={!selectedFile ? handleBrowseClick : undefined}
          role="button"
          tabIndex={0}
          aria-label="Drop zone for file upload"
        >
          {!selectedFile ? (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-disabled" />
              <p className="text-lg font-medium text-secondary mb-2">
                Drag and drop a file here
              </p>
              <p className="text-sm text-muted mb-4">or</p>
              <Button type="button" onClick={(e) => {
                e.stopPropagation()
                handleBrowseClick()
              }}>
                Browse Files
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileIcon className="w-10 h-10 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted">
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
                aria-label="Remove selected file"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Document type selector - shown when file is selected */}
        {selectedFile && (
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <NativeSelect
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label htmlFor="version-notes">
                Version Notes <span className="text-muted text-sm">(optional)</span>
              </Label>
              <textarea
                id="version-notes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-muted mt-1">
                Add notes about this upload. If uploading a new version, these notes will be saved with the version history.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
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
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {/* Upload progress/status */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-secondary mt-2 text-center">
              Uploading document... {uploadProgress}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
