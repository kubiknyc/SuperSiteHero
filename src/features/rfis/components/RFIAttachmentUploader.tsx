// File: /src/features/rfis/components/RFIAttachmentUploader.tsx
// Component for uploading attachments to an RFI

import { useState, useCallback, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Loader2,
  X,
  FileText,
  Image,
  Paperclip,
  MessageSquare,
  Camera,
  Pencil,
} from 'lucide-react'
import { useUploadRFIAttachment, useDeleteRFIAttachment } from '../hooks/useDedicatedRFIs'
import { RFI_ATTACHMENT_TYPES, type RFIAttachmentType } from '@/types/rfi'
import { cn } from '@/lib/utils'

interface RFIAttachmentUploaderProps {
  rfiId: string
  existingAttachments?: Array<{
    id: string
    file_name: string | null
    file_type: string | null
    file_size: number | null
    file_url: string | null
    attachment_type: RFIAttachmentType
    uploaded_by_user?: { full_name: string }
    created_at: string
  }>
  onUploadComplete?: () => void
}

// Attachment type configuration
const ATTACHMENT_TYPE_CONFIG: Record<RFIAttachmentType, { icon: React.ComponentType<any>; color: string }> = {
  question: { icon: MessageSquare, color: 'text-blue-600' },
  response: { icon: FileText, color: 'text-green-600' },
  general: { icon: Paperclip, color: 'text-slate-600' },
  sketch: { icon: Pencil, color: 'text-purple-600' },
  photo: { icon: Camera, color: 'text-amber-600' },
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) {return 'Unknown size'}
  if (bytes < 1024) {return `${bytes} B`}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`}
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string | null) {
  if (!fileType) {return FileText}
  if (fileType.startsWith('image/')) {return Image}
  return FileText
}

export function RFIAttachmentUploader({
  rfiId,
  existingAttachments = [],
  onUploadComplete,
}: RFIAttachmentUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [attachmentType, setAttachmentType] = useState<RFIAttachmentType>('general')
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null)

  const uploadAttachment = useUploadRFIAttachment()
  const deleteAttachment = useDeleteRFIAttachment()

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) {return}
    const newFiles = Array.from(files)
    setSelectedFiles((prev) => [...prev, ...newFiles])
  }, [])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload all selected files
  const handleUpload = async () => {
    for (const file of selectedFiles) {
      setUploadingFiles((prev) => new Set(prev).add(file.name))

      try {
        await uploadAttachment.mutateAsync({
          rfiId,
          file,
          attachmentType,
        })
      } catch (_error) {
        // Error handled by React Query
      } finally {
        setUploadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(file.name)
          return next
        })
      }
    }

    setSelectedFiles([])
    onUploadComplete?.()
  }

  // Delete an existing attachment
  const handleDeleteClick = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!attachmentToDelete) return

    try {
      await deleteAttachment.mutateAsync({ attachmentId: attachmentToDelete, rfiId })
    } catch (_error) {
      // Error handled by React Query
    } finally {
      setShowDeleteDialog(false)
      setAttachmentToDelete(null)
    }
  }

  const isUploading = uploadingFiles.size > 0

  return (
    <div className="space-y-4">
      {/* Existing Attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Existing Attachments</Label>
          <div className="space-y-2">
            {existingAttachments.map((attachment) => {
              const config = ATTACHMENT_TYPE_CONFIG[attachment.attachment_type]
              const Icon = config?.icon || FileText
              const FileIcon = getFileIcon(attachment.file_type)

              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file_name || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.file_size)}</span>
                        <Badge variant="outline" className="text-xs">
                          <Icon className={cn('h-3 w-3 mr-1', config?.color)} />
                          {RFI_ATTACHMENT_TYPES.find(t => t.value === attachment.attachment_type)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attachment.file_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(attachment.id)}
                      disabled={deleteAttachment.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="attachmentType" className="text-sm font-medium">
              Attachment Type
            </Label>
            <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as RFIAttachmentType)}>
              <SelectTrigger id="attachmentType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RFI_ATTACHMENT_TYPES.map((type) => {
                  const config = ATTACHMENT_TYPE_CONFIG[type.value]
                  const Icon = config.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', config.color)} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports images, PDFs, and documents
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <Label className="text-sm font-medium">Files to Upload</Label>
              {selectedFiles.map((file, index) => {
                const FileIcon = getFileIcon(file.type)
                const isFileUploading = uploadingFiles.has(file.name)

                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isFileUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    {!isFileUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}

              <Button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full mt-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default RFIAttachmentUploader
