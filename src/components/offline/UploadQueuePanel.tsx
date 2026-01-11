/**
 * Upload Queue Panel
 *
 * Shows pending uploads with:
 * - Photo upload queue with thumbnails
 * - Failed upload retry buttons
 * - Cancel upload option
 * - Upload progress per item
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Upload,
  X,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOfflineStore, useIsOnline } from '@/stores/offline-store'
import {
  getAllFromStore,
  putInStore,
  deleteFromStore,
  STORES,
} from '@/lib/offline/indexeddb'
import {
  getAllQueuedPhotos,
  updatePhotoStatus,
  removeQueuedPhoto,
  clearUploadedPhotos as clearUploadedPhotosFromQueue,
} from '@/lib/offline/photo-queue'
import { logger } from '@/lib/utils/logger'
import type { QueuedPhoto, QueuedMutation } from '@/types/offline'

// ============================================================================
// Types
// ============================================================================

interface UploadQueueItem {
  id: string
  type: 'photo' | 'document' | 'file'
  fileName: string
  fileSize: number
  mimeType: string
  thumbnail?: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
  createdAt: number
  retryCount: number
  relatedEntity?: {
    type: string
    id: string
    name?: string
  }
}

interface UploadQueuePanelProps {
  className?: string
  trigger?: React.ReactNode
}

// ============================================================================
// useUploadQueue Hook - Production Implementation
// ============================================================================

// Convert QueuedPhoto to UploadQueueItem format
function photoToUploadItem(photo: QueuedPhoto): UploadQueueItem {
  // Generate a thumbnail URL if the file is available
  let thumbnail: string | undefined
  if (photo.file && photo.mimeType.startsWith('image/')) {
    try {
      thumbnail = URL.createObjectURL(photo.file)
    } catch {
      // File might not be available in some edge cases
    }
  }

  return {
    id: photo.id,
    type: 'photo',
    fileName: photo.fileName,
    fileSize: photo.fileSize,
    mimeType: photo.mimeType,
    thumbnail,
    status: photo.status === 'uploaded' ? 'completed' : photo.status,
    progress: photo.status === 'uploaded' ? 100 : photo.status === 'uploading' ? 50 : 0,
    error: photo.error,
    createdAt: photo.timestamp,
    retryCount: photo.retryCount,
    relatedEntity: {
      type: 'Checklist Response',
      id: photo.responseId,
      name: `Response ${photo.responseId.slice(0, 8)}`,
    },
  }
}

// Convert QueuedMutation (sync queue item) to UploadQueueItem format
function mutationToUploadItem(mutation: QueuedMutation): UploadQueueItem {
  // Check if this mutation contains file data
  const hasFileData = mutation.data &&
    (mutation.data.file || mutation.data.fileData || mutation.data.blob)

  const fileSize = mutation.data?.fileSize ||
    mutation.data?.file?.size ||
    (mutation.data?.blob ? mutation.data.blob.size : 0) ||
    0

  const fileName = mutation.data?.fileName ||
    mutation.data?.file?.name ||
    `${mutation.table}-${mutation.recordId?.slice(0, 8) || 'unknown'}`

  const mimeType = mutation.data?.mimeType ||
    mutation.data?.file?.type ||
    'application/octet-stream'

  let type: 'photo' | 'document' | 'file' = 'file'
  if (mimeType.startsWith('image/')) {type = 'photo'}
  else if (mimeType.includes('pdf') || mimeType.includes('document')) {type = 'document'}

  return {
    id: mutation.id,
    type,
    fileName,
    fileSize,
    mimeType,
    status: mutation.status === 'completed' ? 'completed' :
           mutation.status === 'processing' ? 'uploading' :
           mutation.status,
    progress: mutation.status === 'completed' ? 100 :
             mutation.status === 'processing' ? 50 : 0,
    error: mutation.error,
    createdAt: mutation.timestamp,
    retryCount: mutation.retryCount,
    relatedEntity: mutation.table ? {
      type: mutation.table.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      id: mutation.recordId || mutation.id,
      name: mutation.data?.name || mutation.data?.title,
    } : undefined,
  }
}

// Get all upload queue items from both photo queue and sync queue
async function getUploadQueueItems(): Promise<UploadQueueItem[]> {
  const items: UploadQueueItem[] = []

  try {
    // Get photos from photo queue
    const photos = await getAllQueuedPhotos()
    for (const photo of photos) {
      items.push(photoToUploadItem(photo))
    }

    // Get file-related mutations from sync queue
    const mutations = await getAllFromStore<QueuedMutation>(STORES.SYNC_QUEUE)
    for (const mutation of mutations) {
      // Only include mutations that involve file uploads
      if (mutation.data && (
        mutation.data.file ||
        mutation.data.fileData ||
        mutation.data.blob ||
        mutation.data.attachment ||
        mutation.type === 'create' && (
          mutation.table === 'documents' ||
          mutation.table === 'photos' ||
          mutation.table === 'attachments'
        )
      )) {
        items.push(mutationToUploadItem(mutation))
      }
    }

    // Sort by creation time (newest first)
    items.sort((a, b) => b.createdAt - a.createdAt)

    return items
  } catch (error) {
    logger.error('Failed to get upload queue items:', error)
    return []
  }
}

// Retry a failed upload
async function retryUploadItem(id: string): Promise<void> {
  try {
    // First check if it's in the photo queue
    const photos = await getAllQueuedPhotos()
    const photo = photos.find(p => p.id === id)

    if (photo) {
      await updatePhotoStatus(id, 'pending')
      logger.log(`Retried photo upload: ${id}`)
      return
    }

    // Otherwise check sync queue
    const mutations = await getAllFromStore<QueuedMutation>(STORES.SYNC_QUEUE)
    const mutation = mutations.find(m => m.id === id)

    if (mutation && mutation.status === 'failed') {
      await putInStore(STORES.SYNC_QUEUE, {
        ...mutation,
        status: 'pending',
        retryCount: mutation.retryCount + 1,
        error: undefined,
      })
      logger.log(`Retried sync mutation: ${id}`)
    }
  } catch (error) {
    logger.error('Failed to retry upload:', error)
    throw error
  }
}

// Cancel/remove an upload from the queue
async function cancelUploadItem(id: string): Promise<void> {
  try {
    // First check if it's in the photo queue
    const photos = await getAllQueuedPhotos()
    const photo = photos.find(p => p.id === id)

    if (photo) {
      await removeQueuedPhoto(id)
      logger.log(`Cancelled photo upload: ${id}`)
      return
    }

    // Otherwise check sync queue
    await deleteFromStore(STORES.SYNC_QUEUE, id)
    logger.log(`Cancelled sync mutation: ${id}`)
  } catch (error) {
    logger.error('Failed to cancel upload:', error)
    throw error
  }
}

// Clear all completed uploads
async function clearCompletedUploads(): Promise<number> {
  let count = 0

  try {
    // Clear completed photos
    count += await clearUploadedPhotosFromQueue()

    // Clear completed sync mutations
    const mutations = await getAllFromStore<QueuedMutation>(STORES.SYNC_QUEUE)
    const completed = mutations.filter(m => m.status === 'completed')

    for (const mutation of completed) {
      await deleteFromStore(STORES.SYNC_QUEUE, mutation.id)
      count++
    }

    logger.log(`Cleared ${count} completed uploads`)
    return count
  } catch (error) {
    logger.error('Failed to clear completed uploads:', error)
    throw error
  }
}

function useUploadQueue() {
  const queryClient = useQueryClient()
  const isOnline = useIsOnline()

  // Query upload queue items
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['uploadQueue'],
    queryFn: getUploadQueueItems,
    staleTime: 5 * 1000, // 5 seconds - more frequent updates for upload queue
    refetchInterval: (query) => {
      // Poll more frequently if there are pending/uploading items
      const hasActive = query.state.data?.some(
        item => item.status === 'pending' || item.status === 'uploading'
      )
      return hasActive ? 3000 : 30000 // 3s if active, 30s otherwise
    },
  })

  // Calculate stats from queue
  const stats = useMemo(() => {
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      uploading: queue.filter(item => item.status === 'uploading').length,
      failed: queue.filter(item => item.status === 'failed').length,
      total: queue.length,
      totalSize: queue.reduce((sum, item) => sum + item.fileSize, 0),
    }
  }, [queue])

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: retryUploadItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadQueue'] })
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: cancelUploadItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadQueue'] })
    },
  })

  // Clear completed mutation
  const clearCompletedMutation = useMutation({
    mutationFn: clearCompletedUploads,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadQueue'] })
    },
  })

  // Refetch when coming online
  useEffect(() => {
    if (isOnline) {
      refetch()
    }
  }, [isOnline, refetch])

  // Cleanup thumbnail URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.thumbnail && item.thumbnail.startsWith('blob:')) {
          URL.revokeObjectURL(item.thumbnail)
        }
      })
    }
  }, [queue])

  const retryUpload = useCallback(async (id: string) => {
    await retryMutation.mutateAsync(id)
  }, [retryMutation])

  const cancelUpload = useCallback(async (id: string) => {
    await cancelMutation.mutateAsync(id)
  }, [cancelMutation])

  const clearCompleted = useCallback(async () => {
    await clearCompletedMutation.mutateAsync()
  }, [clearCompletedMutation])

  const retryAllFailed = useCallback(async () => {
    const failedItems = queue.filter(item => item.status === 'failed')
    for (const item of failedItems) {
      await retryMutation.mutateAsync(item.id)
    }
  }, [queue, retryMutation])

  return {
    queue,
    stats,
    isLoading,
    retryUpload,
    cancelUpload,
    clearCompleted,
    retryAllFailed,
    refetch,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 B'}
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(type: string, mimeType: string): React.ComponentType<{ className?: string }> {
  if (type === 'photo' || mimeType.startsWith('image/')) {
    return ImageIcon
  }
  if (mimeType === 'application/pdf' || mimeType.includes('document')) {
    return FileText
  }
  return File
}

// ============================================================================
// Sub-Components
// ============================================================================

function UploadItem({
  item,
  onRetry,
  onCancel,
}: {
  item: UploadQueueItem
  onRetry: (id: string) => void
  onCancel: (id: string) => void
}) {
  const FileIcon = getFileIcon(item.type, item.mimeType)

  const getStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            Pending
          </Badge>
        )
      case 'uploading':
        return (
          <Badge variant="default" className="text-xs bg-primary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Uploading
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="text-xs bg-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
    }
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        item.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or Icon */}
        <div className="relative flex-shrink-0">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.fileName}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          {item.status === 'uploading' && (
            <div className="absolute inset-0 bg-background/80 rounded flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.fileSize)}
              </p>
              {item.relatedEntity && (
                <p className="text-xs text-muted-foreground">
                  {item.relatedEntity.type}: {item.relatedEntity.name || item.relatedEntity.id.slice(0, 8)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </p>
              {item.retryCount > 0 && (
                <p className="text-xs text-warning">
                  Retry attempt {item.retryCount}
                </p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* Progress Bar */}
          {item.status === 'uploading' && (
            <div className="mt-2">
              <Progress value={item.progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{item.progress}%</p>
            </div>
          )}

          {/* Error Message */}
          {item.error && (
            <p className="text-xs text-destructive mt-2">{item.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {item.status === 'failed' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRetry(item.id)}
              title="Retry upload"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {(item.status === 'pending' || item.status === 'failed') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onCancel(item.id)}
              title="Cancel upload"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
      <p className="font-medium text-muted-foreground">No pending uploads</p>
      <p className="text-sm text-muted-foreground">
        Files will appear here when uploading offline
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UploadQueuePanel({ className, trigger }: UploadQueuePanelProps) {
  const { queue, stats, retryUpload, cancelUpload, clearCompleted } = useUploadQueue()
  const isOnline = useOfflineStore(state => state.isOnline)

  const handleRetry = async (id: string) => {
    try {
      await retryUpload(id)
      toast.success('Retry initiated', {
        description: 'Upload will be retried shortly.',
      })
    } catch {
      toast.error('Retry failed', {
        description: 'Could not retry upload. Please try again.',
      })
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelUpload(id)
      toast.success('Upload cancelled', {
        description: 'The upload has been removed from the queue.',
      })
    } catch {
      toast.error('Cancel failed', {
        description: 'Could not cancel upload. Please try again.',
      })
    }
  }

  const handleClearCompleted = async () => {
    try {
      await clearCompleted()
      toast.success('Completed uploads cleared', {
        description: 'Successfully uploaded files have been removed from the queue.',
      })
    } catch {
      toast.error('Clear failed', {
        description: 'Could not clear completed uploads. Please try again.',
      })
    }
  }

  // Group uploads by status
  const uploadsByStatus = useMemo(() => {
    return {
      uploading: queue.filter(item => item.status === 'uploading'),
      pending: queue.filter(item => item.status === 'pending'),
      failed: queue.filter(item => item.status === 'failed'),
      completed: queue.filter(item => item.status === 'completed'),
    }
  }, [queue])

  const getHeaderButton = () => {
    if (stats.uploading > 0) {
      return (
        <Button variant="ghost" size="sm" className="gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Uploading</span>
          <Badge variant="secondary">{stats.uploading}</Badge>
        </Button>
      )
    }

    if (stats.failed > 0) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <Badge variant="destructive">{stats.failed}</Badge>
        </Button>
      )
    }

    if (stats.pending > 0) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 text-warning">
          <Upload className="h-4 w-4" />
          <Badge variant="secondary">{stats.pending}</Badge>
        </Button>
      )
    }

    return (
      <Button variant="ghost" size="sm" className="gap-2">
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Uploads</span>
      </Button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || getHeaderButton()}
      </SheetTrigger>

      <SheetContent className={cn('w-[400px] sm:w-[540px]', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Queue
          </SheetTitle>
          <SheetDescription>
            Manage pending file uploads
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Status Summary */}
            {stats.total > 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-2xl font-bold text-primary">{stats.uploading}</p>
                    <p className="text-xs text-muted-foreground">Uploading</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total size:</span>
                  <span className="font-medium">{formatFileSize(stats.totalSize)}</span>
                </div>

                {!isOnline && stats.pending > 0 && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm text-warning flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Uploads will start when you're back online
                    </p>
                  </div>
                )}

                <Separator />
              </>
            )}

            {/* Uploading Items */}
            {uploadsByStatus.uploading.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Currently Uploading</h4>
                {uploadsByStatus.uploading.map((item) => (
                  <UploadItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}

            {/* Pending Items */}
            {uploadsByStatus.pending.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pending Uploads</h4>
                {uploadsByStatus.pending.map((item) => (
                  <UploadItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}

            {/* Failed Items */}
            {uploadsByStatus.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-destructive">Failed Uploads</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      uploadsByStatus.failed.forEach(item => handleRetry(item.id))
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry All
                  </Button>
                </div>
                {uploadsByStatus.failed.map((item) => (
                  <UploadItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}

            {/* Completed Items */}
            {uploadsByStatus.completed.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-success">Completed</h4>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear completed uploads?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {uploadsByStatus.completed.length} completed upload
                            {uploadsByStatus.completed.length !== 1 ? 's' : ''} from the queue.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearCompleted}>
                            Clear
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {uploadsByStatus.completed.slice(0, 5).map((item) => (
                    <UploadItem
                      key={item.id}
                      item={item}
                      onRetry={handleRetry}
                      onCancel={handleCancel}
                    />
                  ))}
                  {uploadsByStatus.completed.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      And {uploadsByStatus.completed.length - 5} more...
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Empty State */}
            {stats.total === 0 && <EmptyState />}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default UploadQueuePanel
