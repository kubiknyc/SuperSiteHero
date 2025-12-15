/**
 * Punch Item Update Component
 * Mobile-optimized component for subcontractors to update punch items
 * Milestone 4.2: Punch Item Updates with Photo Proof
 */

import { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Image,
  FileText,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { usePunchItem, useProofOfCompletionPhotos } from '@/features/punch-lists/hooks/usePunchItems'
import { useSubcontractorPunchActions } from '@/features/punch-lists/hooks/useSubcontractorPunchActions'
import { compressImage } from '@/lib/utils/imageCompression'
import { formatDistanceToNow, format } from 'date-fns'
import type { PunchItemStatus } from '@/types/database'

interface PhotoPreview {
  id: string
  file: File
  url: string
}

// Status display configuration
const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  open: {
    label: 'Open',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  ready_for_review: {
    label: 'Ready for Review',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  completed: {
    label: 'Completed',
    icon: <Check className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  verified: {
    label: 'Verified',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500 text-white' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white' },
  low: { label: 'Low', color: 'bg-gray-400 text-white' },
}

export function PunchItemUpdate() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completionReason, setCompletionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState<string | null>(null)

  // Queries
  const { data: punchItem, isLoading, error } = usePunchItem(id)
  const { data: proofPhotos } = useProofOfCompletionPhotos(id)

  // Mutations
  const {
    addNotes,
    requestStatusChange,
    uploadProofPhotos,
    isLoading: isMutating,
    isOnline,
    pendingUpdates,
  } = useSubcontractorPunchActions()

  // Handle photo selection
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newPhotos: PhotoPreview[] = []

    for (const file of files) {
      try {
        // Compress image
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          maxSizeBytes: 1024 * 1024,
          quality: 0.8,
        })

        newPhotos.push({
          id: crypto.randomUUID(),
          file: compressed,
          url: URL.createObjectURL(compressed),
        })
      } catch (err) {
        console.error('Failed to compress image:', err)
        // Use original file if compression fails
        newPhotos.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        })
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Remove photo preview
  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId)
      if (photo) {
        URL.revokeObjectURL(photo.url)
      }
      return prev.filter(p => p.id !== photoId)
    })
  }, [])

  // Handle notes save
  const handleSaveNotes = async () => {
    if (!id || !notes.trim()) return

    try {
      await addNotes(id, notes.trim())
      setNotes('')
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
  }

  // Handle completion request
  const handleRequestCompletion = async () => {
    if (!id) return

    // Require at least one photo
    if (photos.length === 0 && (!proofPhotos || proofPhotos.length === 0)) {
      return
    }

    setIsSubmitting(true)

    try {
      // Upload photos first if any
      if (photos.length > 0) {
        await uploadProofPhotos(id, photos.map(p => p.file))
      }

      // Request status change to completed
      await requestStatusChange(
        id,
        'completed',
        completionReason.trim() || 'Work completed, pending verification'
      )

      // Clean up
      photos.forEach(p => URL.revokeObjectURL(p.url))
      setPhotos([])
      setCompletionReason('')
      setShowCompletionDialog(false)

      // Navigate back
      navigate(-1)
    } catch (err) {
      console.error('Failed to request completion:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Error state
  if (error || !punchItem) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Punch Item Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">
          The punch item you're looking for doesn't exist or you don't have access.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    )
  }

  const status = statusConfig[punchItem.status] || statusConfig.open
  const priority = priorityConfig[punchItem.priority] || priorityConfig.medium
  const hasStatusRequest = !!punchItem.status_change_request
  const gcVerificationPending = punchItem.gc_verification_required && !punchItem.gc_verified_at && hasStatusRequest
  const totalProofPhotos = (proofPhotos?.length || 0) + photos.length

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {punchItem.title}
            </h1>
            <p className="text-xs text-gray-500">
              #{punchItem.item_number || punchItem.id.slice(0, 8)}
            </p>
          </div>
          {!isOnline && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status & Priority */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('gap-1', status.color)}>
            {status.icon}
            {status.label}
          </Badge>
          <Badge className={priority.color}>
            {priority.label}
          </Badge>
          {gcVerificationPending && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              GC Review Pending
            </Badge>
          )}
        </div>

        {/* Pending Updates Banner */}
        {pendingUpdates > 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {pendingUpdates} update(s) pending sync
            </span>
          </div>
        )}

        {/* Status Change Request Banner */}
        {hasStatusRequest && punchItem.status_change_request && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Completion Request Pending
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {punchItem.status_change_request.reason}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Requested {formatDistanceToNow(new Date(punchItem.status_change_request.requested_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {punchItem.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{punchItem.description}</p>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="text-sm">
                {[punchItem.building, punchItem.floor, punchItem.room, punchItem.area]
                  .filter(Boolean)
                  .join(' / ') || punchItem.location_notes || 'No location specified'}
              </div>
            </div>

            {/* Due Date */}
            {punchItem.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className={cn(
                  'text-sm',
                  new Date(punchItem.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-700'
                )}>
                  Due: {format(new Date(punchItem.due_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {/* Assigned By */}
            {punchItem.created_by_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">
                  Assigned by: {punchItem.created_by_name}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proof Photos Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Proof of Completion Photos</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {totalProofPhotos} photo(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Existing proof photos */}
            {proofPhotos && proofPhotos.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Uploaded Photos</p>
                <div className="flex flex-wrap gap-2">
                  {proofPhotos.map((photo: any) => (
                    <button
                      key={photo.id}
                      onClick={() => setShowPhotoViewer(photo.file_url)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={photo.file_url}
                        alt="Proof"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 px-1 py-0.5">
                        <Check className="h-3 w-3 text-white mx-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New photo previews */}
            {photos.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">New Photos (pending upload)</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={photo.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Open file picker without capture
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.multiple = true
                  input.onchange = (e) => handlePhotoSelect(e as any)
                  input.click()
                }}
                className="flex-1 gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your progress or any issues..."
              rows={3}
              className="resize-none mb-2"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveNotes}
              disabled={!notes.trim() || isMutating}
              className="w-full"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Save Notes
            </Button>

            {/* Existing notes */}
            {punchItem.subcontractor_notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Previous Notes</p>
                <p className="text-sm text-gray-700">{punchItem.subcontractor_notes}</p>
                {punchItem.subcontractor_updated_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(punchItem.subcontractor_updated_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action Bar */}
      {!hasStatusRequest && punchItem.status !== 'completed' && punchItem.status !== 'verified' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
          <Button
            onClick={() => setShowCompletionDialog(true)}
            disabled={totalProofPhotos === 0}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            Request Completion
          </Button>
          {totalProofPhotos === 0 && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Add at least one photo to request completion
            </p>
          )}
        </div>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Completion Verification</DialogTitle>
            <DialogDescription>
              Your completion request will be sent to the GC for verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Completion Notes (optional)</Label>
              <Textarea
                value={completionReason}
                onChange={(e) => setCompletionReason(e.target.value)}
                placeholder="Describe the work completed..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Image className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {totalProofPhotos} proof photo(s) attached
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestCompletion}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      <Dialog open={!!showPhotoViewer} onOpenChange={() => setShowPhotoViewer(null)}>
        <DialogContent className="max-w-lg p-0">
          {showPhotoViewer && (
            <img
              src={showPhotoViewer}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PunchItemUpdate
