// File: /src/features/documents/components/DocumentUpload.tsx
// Document upload component with drag-drop support

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, X, FileIcon } from 'lucide-react'
import { Card, CardContent, Button, Select, Label } from '@/components/ui'
import { useCreateDocumentWithNotification } from '@/features/documents/hooks/useDocumentsMutations'
import { cn } from '@/lib/utils'
import type { Document, DocumentType } from '@/types/database'

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
 *   onUploadSuccess={(doc) => console.log('Uploaded:', doc)}
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
  const [isDragging, setIsDragging] = useState(false)
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
    if (!selectedFile) return

    // Extract file name without extension
    const fileName = selectedFile.name
    const lastDotIndex = fileName.lastIndexOf('.')
    const nameWithoutExtension =
      lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName

    // In a real implementation, this would upload to Supabase Storage
    // For now, we use a placeholder URL
    const placeholderUrl = `https://storage.example.com/documents/${projectId}/${selectedFile.name}`

    const documentData = {
      project_id: projectId,
      folder_id: folderId,
      name: nameWithoutExtension,
      description: null as string | null,
      document_type: documentType,
      discipline: null as string | null,
      file_url: placeholderUrl,
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
        // Reset form
        setSelectedFile(null)
        setDocumentType('general')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
    })
  }

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null)
    setDocumentType('general')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
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
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
            selectedFile && 'bg-gray-50'
          )}
          onClick={!selectedFile ? handleBrowseClick : undefined}
          role="button"
          tabIndex={0}
          aria-label="Drop zone for file upload"
        >
          {!selectedFile ? (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag and drop a file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <Button type="button" onClick={handleBrowseClick}>
                Browse Files
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileIcon className="w-10 h-10 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
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
              <Select
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createDocument.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={createDocument.isPending}
              >
                {createDocument.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {/* Upload progress/status */}
        {createDocument.isPending && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Uploading document...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
