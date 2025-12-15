/**
 * AttachmentsSection
 * Displays and manages file attachments for site instructions
 */

import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  FileImage,
  File,
  Upload,
  Trash2,
  Download,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import {
  useSiteInstructionAttachments,
  useUploadSiteInstructionAttachment,
  useDeleteSiteInstructionAttachment,
  type SiteInstructionAttachment,
} from '../hooks'
import { cn } from '@/lib/utils'

interface AttachmentsSectionProps {
  siteInstructionId: string
  readOnly?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 Bytes'}
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return <FileImage className="w-4 h-4" />
  }
  if (fileType.includes('pdf')) {
    return <FileText className="w-4 h-4" />
  }
  return <File className="w-4 h-4" />
}

interface AttachmentItemProps {
  attachment: SiteInstructionAttachment
  onDelete?: (attachment: SiteInstructionAttachment) => void
  readOnly?: boolean
}

function AttachmentItem({ attachment, onDelete, readOnly }: AttachmentItemProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 p-2 bg-muted rounded">
          {getFileIcon(attachment.file_type)}
        </div>
        <div className="min-w-0">
          <a
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:underline truncate block"
          >
            {attachment.file_name}
          </a>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatFileSize(attachment.file_size)}</span>
            {attachment.uploaded_by_user && (
              <>
                <span>by {attachment.uploaded_by_user.full_name}</span>
              </>
            )}
            <span>{format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}</span>
          </div>
          {attachment.description && (
            <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          asChild
        >
          <a href={attachment.file_url} download={attachment.file_name}>
            <Download className="w-4 h-4" />
          </a>
        </Button>
        {!readOnly && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(attachment)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function AttachmentsSection({ siteInstructionId, readOnly = false }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<SiteInstructionAttachment | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const { data: attachments = [], isLoading } = useSiteInstructionAttachments(siteInstructionId)
  const uploadMutation = useUploadSiteInstructionAttachment()
  const deleteMutation = useDeleteSiteInstructionAttachment()

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {return}

    setUploading(true)
    let successCount = 0
    let errorCount = 0

    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync({
          siteInstructionId,
          file,
        })
        successCount++
      } catch (error) {
        errorCount++
        console.error('Failed to upload file:', file.name, error)
      }
    }

    setUploading(false)

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [siteInstructionId, uploadMutation])

  const handleDelete = async () => {
    if (!attachmentToDelete) {return}

    try {
      await deleteMutation.mutateAsync({
        attachmentId: attachmentToDelete.id,
        siteInstructionId,
        storagePath: attachmentToDelete.storage_path,
      })
      toast.success('Attachment deleted')
    } catch (error) {
      toast.error('Failed to delete attachment')
    }

    setDeleteDialogOpen(false)
    setAttachmentToDelete(null)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (readOnly) {return}

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload, readOnly])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments
            {attachments.length > 0 && (
              <span className="text-muted-foreground font-normal">({attachments.length})</span>
            )}
          </CardTitle>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'space-y-2 transition-colors',
                dragActive && !readOnly && 'bg-primary/5 rounded-lg'
              )}
            >
              {attachments.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-8 border-2 border-dashed rounded-lg',
                    dragActive && !readOnly ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                >
                  <Paperclip className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {readOnly ? 'No attachments' : 'Drag & drop files here or click Upload'}
                  </p>
                </div>
              ) : (
                attachments.map((attachment) => (
                  <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    readOnly={readOnly}
                    onDelete={(a) => {
                      setAttachmentToDelete(a)
                      setDeleteDialogOpen(true)
                    }}
                  />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attachmentToDelete?.file_name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
