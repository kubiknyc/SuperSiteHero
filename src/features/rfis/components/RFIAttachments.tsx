// File: /src/features/rfis/components/RFIAttachments.tsx
// Component for managing RFI file attachments with upload and download

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
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
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Loader2,
  Paperclip,
  X,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useRFIAttachments,
  useUploadRFIAttachment,
  useDeleteRFIAttachment,
  useGetRFIAttachmentUrl,
  formatFileSize,
  getFileExtension,
  type RFIAttachment,
} from '../hooks/useRFIAttachments'
import { logger } from '../../../lib/utils/logger';


export interface RFIAttachmentsProps {
  rfiId: string
  projectId: string
  canUpload?: boolean
  canDelete?: boolean
}

/**
 * Get icon component for file type
 */
function getFileIcon(fileName: string) {
  const ext = getFileExtension(fileName).toLowerCase()

  if (['pdf'].includes(ext)) {
    return FileText
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'].includes(ext)) {
    return FileImage
  }
  return File
}

/**
 * RFIAttachments Component
 *
 * Displays attached files for an RFI with upload and download functionality.
 * Supports drag-and-drop file uploads.
 *
 * @example
 * ```tsx
 * <RFIAttachments
 *   rfiId={rfi.id}
 *   projectId={rfi.project_id}
 *   canUpload={true}
 *   canDelete={true}
 * />
 * ```
 */
export function RFIAttachments({
  rfiId,
  projectId,
  canUpload = true,
  canDelete = true,
}: RFIAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<RFIAttachment | null>(null)

  // Queries and mutations
  const { data: attachments, isLoading: isLoadingAttachments } = useRFIAttachments(rfiId)
  const uploadAttachment = useUploadRFIAttachment()
  const deleteAttachment = useDeleteRFIAttachment()
  const getDownloadUrl = useGetRFIAttachmentUrl()

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (canUpload) {setIsDragging(true)}
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!canUpload) {return}

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setShowUploadForm(true)
    }
  }

  // File input change handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setShowUploadForm(true)
    }
  }

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile) {return}

    try {
      await uploadAttachment.mutateAsync({
        rfiId,
        projectId,
        file: selectedFile,
        description: description.trim() || undefined,
      })

      // Reset form
      setSelectedFile(null)
      setDescription('')
      setShowUploadForm(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      logger.error('Upload failed:', error)
    }
  }

  // Cancel upload handler
  const handleCancelUpload = () => {
    setSelectedFile(null)
    setDescription('')
    setShowUploadForm(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Download handler
  const handleDownload = async (attachment: RFIAttachment) => {
    try {
      const url = await getDownloadUrl.mutateAsync(attachment.id)
      window.open(url, '_blank')
    } catch (error) {
      logger.error('Failed to get download URL:', error)
    }
  }

  // Delete handler
  const handleDeleteClick = (attachment: RFIAttachment) => {
    setAttachmentToDelete(attachment)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!attachmentToDelete) {return}

    try {
      await deleteAttachment.mutateAsync({
        attachmentId: attachmentToDelete.id,
        rfiId,
      })
    } catch (error) {
      logger.error('Failed to delete attachment:', error)
    } finally {
      setShowDeleteDialog(false)
      setAttachmentToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
          {attachments && attachments.length > 0 && (
            <span className="text-sm font-normal text-muted">
              ({attachments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {canUpload && (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-4 transition-colors',
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-input hover:border-gray-400'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {showUploadForm && selectedFile ? (
              // Upload form
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface rounded-md">
                  {(() => {
                    const Icon = getFileIcon(selectedFile.name)
                    return <Icon className="h-8 w-8 text-disabled" />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelUpload}
                    disabled={uploadAttachment.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachment-description">Description (optional)</Label>
                  <Input
                    id="attachment-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this attachment..."
                    disabled={uploadAttachment.isPending}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelUpload}
                    disabled={uploadAttachment.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadAttachment.isPending}
                  >
                    {uploadAttachment.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Upload
                  </Button>
                </div>
              </div>
            ) : (
              // Drop zone
              <div className="text-center">
                <Upload className="h-8 w-8 text-disabled mx-auto mb-2" />
                <p className="text-sm text-secondary mb-2">
                  Drag and drop files here, or{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-muted">
                  PDF, Word, Excel, Images (max 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.tiff,.txt"
                />
              </div>
            )}
          </div>
        )}

        {/* Attachments List */}
        {isLoadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-disabled animate-spin" />
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="divide-y">
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.file_name)
              const isDownloading = getDownloadUrl.isPending
              const isDeleting = deleteAttachment.isPending

              return (
                <div
                  key={attachment.id}
                  className="py-3 flex items-center gap-3 group"
                >
                  <div className="flex-shrink-0 p-2 bg-muted rounded-md">
                    <Icon className="h-5 w-5 text-secondary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>
                        {attachment.uploaded_at
                          ? format(new Date(attachment.uploaded_at), 'MMM d, yyyy')
                          : 'Unknown date'}
                      </span>
                    </div>
                    {attachment.description && (
                      <p className="text-xs text-secondary mt-1 truncate">
                        {attachment.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      disabled={isDownloading}
                      title="Download"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(attachment)}
                        disabled={isDeleting}
                        title="Delete"
                        className="text-error hover:text-error-dark hover:bg-error-light"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted">No attachments yet</p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{attachmentToDelete?.file_name}"? This action cannot be undone.
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
      </CardContent>
    </Card>
  )
}
