// File: /src/features/punch-lists/components/QuickPunchMode.tsx
// Quick Punch Mode - Streamlined punch item creation for field workers
// Goal: tap -> camera -> voice -> done in 30 seconds
// Supports offline mode with automatic sync when back online
// Enhanced with swipe gestures, bulk photo capture, and touch optimization (Milestone 1.1)

import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Camera,
  Mic,
  MicOff,
  X,
  Check,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
  WifiOff,
  ImagePlus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreatePunchItemWithNotification } from '../hooks/usePunchItemsMutations'
import { useVoiceToText } from '@/hooks/useVoiceToText'
import { usePullToRefresh } from '@/hooks/useSwipeGesture'
import { uploadPunchItemPhoto } from '@/lib/storage/punch-item-uploads'
import { compressImages } from '@/lib/utils/imageCompression'
import { toast } from '@/lib/notifications/ToastContext'
import { cn } from '@/lib/utils'
import type { Priority } from '@/types/database'
import { useIsOnline } from '@/stores/offline-store'
import { useOfflinePunchStore, type OfflinePhoto } from '../store/offlinePunchStore'
import { usePunchItemSync } from '../hooks/usePunchItemSync'
import { logger } from '../../../lib/utils/logger';


interface QuickPunchModeProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Common trades for quick selection
const COMMON_TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Drywall',
  'Painting',
  'Flooring',
  'Carpentry',
  'Roofing',
  'Masonry',
  'Fire Protection',
  'General',
  'Other',
]

// Haptic feedback utility
function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore - vibration may not be supported
    }
  }
}

export function QuickPunchMode({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: QuickPunchModeProps) {
  const createMutation = useCreatePunchItemWithNotification()
  const isOnline = useIsOnline()
  const { addDraft, getPendingCount } = useOfflinePunchStore()
  const { syncNow, pendingCount: syncPendingCount } = usePunchItemSync()

  // Core fields - minimal for speed
  const [description, setDescription] = useState('')
  const [trade, setTrade] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [photos, setPhotos] = useState<OfflinePhoto[]>([])

  // Location fields (collapsible)
  const [showLocation, setShowLocation] = useState(false)
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')

  // Photo capture state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Pull to refresh for syncing
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh(
    async () => {
      if (isOnline && syncPendingCount > 0) {
        await syncNow()
      }
    },
    80
  )

  // Voice input
  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    transcript,
    errorMessage: voiceError,
  } = useVoiceToText({
    interimResults: true,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setDescription((prev) => (prev ? `${prev} ${text}` : text))
        triggerHaptic(10)
      }
    },
    onError: () => {
      toast.error('Voice recognition error. Please try again.')
    },
  })

  // Reset form
  const resetForm = useCallback(() => {
    setDescription('')
    setTrade('')
    setPriority('normal')
    setPhotos([])
    setShowLocation(false)
    setBuilding('')
    setFloor('')
    setRoom('')
    setUploadProgress(0)
  }, [])

  // Handle bulk photo capture with compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {return}

    setIsUploading(true)
    setUploadProgress(0)
    triggerHaptic(10)

    try {
      const fileArray = Array.from(files)

      // Compress all images first
      const compressedFiles = await compressImages(
        fileArray,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          maxSizeBytes: 1024 * 1024, // 1MB
          quality: 0.8,
        },
        (completed, total) => {
          setUploadProgress(Math.round((completed / total) * 50)) // First 50% for compression
        }
      )

      if (isOnline) {
        // Online: Upload to server immediately
        const uploadedPhotos: OfflinePhoto[] = []
        let uploadedCount = 0

        for (const file of compressedFiles) {
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
          const result = await uploadPunchItemPhoto(projectId, tempId, file)

          uploadedPhotos.push({
            id: uuidv4(),
            localUrl: result.url,
            isProofOfCompletion: false,
            createdAt: new Date().toISOString(),
          })

          uploadedCount++
          setUploadProgress(50 + Math.round((uploadedCount / compressedFiles.length) * 50))
        }

        setPhotos((prev) => [...prev, ...uploadedPhotos])
        triggerHaptic([10, 30, 10])
        toast.success(`${uploadedPhotos.length} photo(s) captured`)
      } else {
        // Offline: Store as local blob URLs with file reference
        const localPhotos: OfflinePhoto[] = compressedFiles.map((file) => ({
          id: uuidv4(),
          localUrl: URL.createObjectURL(file),
          file, // Store file for later upload
          isProofOfCompletion: false,
          createdAt: new Date().toISOString(),
        }))

        setPhotos((prev) => [...prev, ...localPhotos])
        setUploadProgress(100)
        triggerHaptic([10, 30, 10])
        toast.success(`${localPhotos.length} photo(s) saved locally`)
      }
    } catch (error) {
      logger.error('Photo capture failed:', error)
      toast.error('Failed to capture photo')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {fileInputRef.current.value = ''}
      if (galleryInputRef.current) {galleryInputRef.current.value = ''}
    }
  }

  // Remove photo
  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      // Revoke object URL if it's a blob
      if (photo?.localUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photo.localUrl)
      }
      return prev.filter((p) => p.id !== photoId)
    })
    triggerHaptic(10)
  }

  // Submit punch item
  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe the issue')
      triggerHaptic([50, 50, 50])
      return
    }

    if (!trade) {
      toast.error('Please select a trade')
      triggerHaptic([50, 50, 50])
      return
    }

    // Generate title from first ~50 chars of description
    const title =
      description.trim().slice(0, 50) + (description.length > 50 ? '...' : '')

    if (isOnline) {
      // Online: Create directly via API
      createMutation.mutate(
        {
          project_id: projectId,
          title,
          description: description.trim(),
          trade,
          priority,
          status: 'open',
          building: building.trim() || null,
          floor: floor.trim() || null,
          room: room.trim() || null,
          area: null,
          location_notes: null,
          number: null,
          location: null,
          punch_list_id: null,
          subcontractor_id: null,
          assigned_to: null,
          due_date: null,
          completed_date: null,
          verified_date: null,
          marked_complete_by: null,
          marked_complete_at: null,
          verified_by: null,
          verified_at: null,
          rejection_notes: null,
          created_by: null,
          deleted_at: null,
        },
        {
          onSuccess: () => {
            triggerHaptic([10, 50, 10])
            toast.success('Punch item created!')
            resetForm()
            onOpenChange(false)
            onSuccess?.()
          },
        }
      )
    } else {
      // Offline: Save to local store for later sync
      addDraft({
        project_id: projectId,
        title,
        description: description.trim(),
        trade,
        priority,
        status: 'open',
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        room: room.trim() || undefined,
        pending_photos: photos.map((p) => p.localUrl),
        offline_photos: photos,
      })

      const pendingCount = getPendingCount()
      triggerHaptic([10, 50, 10])
      toast.success(`Punch item saved offline! (${pendingCount} pending sync)`)
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    }
  }

  // Display value (current + interim transcript)
  const displayDescription =
    isListening && transcript ? `${description} ${transcript}`.trim() : description

  // Show voice not supported message
  useEffect(() => {
    if (!voiceSupported && open) {
      // Only show once per session
      const shownKey = 'voice-not-supported-shown'
      if (!sessionStorage.getItem(shownKey)) {
        toast.info('Voice input not supported in this browser')
        sessionStorage.setItem(shownKey, 'true')
      }
    }
  }, [voiceSupported, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader
          className={cn(
            'p-4 pb-2 text-white shrink-0',
            isOnline ? 'bg-primary' : 'bg-amber-600'
          )}
        >
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg font-semibold">Quick Punch</span>
            {isOnline ? (
              <span className="text-sm font-normal opacity-80">
                Fast field capture
              </span>
            ) : (
              <span className="text-sm font-normal flex items-center gap-1 bg-amber-700 px-2 py-0.5 rounded">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center py-2 bg-blue-50 text-primary text-sm"
            style={{ height: Math.min(pullDistance, 60) }}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : pullDistance >= 80 ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Release to sync
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Pull to sync ({syncPendingCount} pending)
              </>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="p-4 space-y-4 overflow-y-auto flex-1"
          {...pullHandlers}
        >
          {/* Photo Capture - Big, prominent buttons */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4" />
              <Label className="text-sm font-medium">Photo Evidence</Label>
              {photos.length > 0 && (
                <span className="ml-auto text-xs text-muted">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-1 px-1">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative flex-shrink-0">
                    <img
                      src={photo.localUrl}
                      alt="Punch photo"
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress bar */}
            {isUploading && (
              <div className="mb-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1 text-center">
                  Processing... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Photo buttons - touch optimized */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-14 text-base touch-manipulation"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 mr-2" />
                )}
                Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-14 text-base touch-manipulation"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImagePlus className="h-5 w-5 mr-2" />
                Gallery
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </div>

          {/* Description with Voice - touch optimized */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Describe the Issue <span className="text-error">*</span>
              </Label>
              {voiceSupported && (
                <Button
                  type="button"
                  variant={isListening ? 'destructive' : 'outline'}
                  size="default"
                  onClick={() => {
                    triggerHaptic(10)
                    if (isListening) {
                      stopListening()
                    } else {
                      startListening()
                    }
                  }}
                  className={cn(
                    'min-w-[88px] min-h-[44px] touch-manipulation',
                    isListening && 'animate-pulse'
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      Voice
                    </>
                  )}
                </Button>
              )}
            </div>
            <textarea
              id="description"
              value={displayDescription}
              onChange={(e) => !isListening && setDescription(e.target.value)}
              placeholder="Tap Voice button or type description..."
              rows={3}
              disabled={isListening}
              className={cn(
                'w-full px-3 py-3 text-base border rounded-lg resize-none',
                'focus:outline-none focus:ring-2 focus:ring-blue-600',
                'min-h-[88px] touch-manipulation',
                isListening && 'border-red-400 bg-error-light'
              )}
            />
            {isListening && (
              <p className="text-xs text-error mt-1 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Listening... speak now
              </p>
            )}
            {voiceError && !isListening && (
              <p className="text-xs text-warning mt-1">{voiceError}</p>
            )}
          </div>

          {/* Trade Selection - touch optimized */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trade" className="text-sm font-medium">
                Trade <span className="text-error">*</span>
              </Label>
              <Select
                id="trade"
                value={trade}
                onChange={(e) => {
                  setTrade(e.target.value)
                  triggerHaptic(5)
                }}
                className="mt-1 min-h-[44px] text-base"
              >
                <option value="">Select trade...</option>
                {COMMON_TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium">
                Priority
              </Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority)
                  triggerHaptic(5)
                }}
                className="mt-1 min-h-[44px] text-base"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>

          {/* Location (collapsible) - touch optimized */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => {
                setShowLocation(!showLocation)
                triggerHaptic(5)
              }}
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-secondary min-h-[52px] touch-manipulation"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location (optional)
              </span>
              {showLocation ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showLocation && (
              <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="building" className="text-xs">
                    Building
                  </Label>
                  <Input
                    id="building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="A"
                    className="mt-1 min-h-[44px] text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="floor" className="text-xs">
                    Floor
                  </Label>
                  <Input
                    id="floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="2nd"
                    className="mt-1 min-h-[44px] text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="room" className="text-xs">
                    Room
                  </Label>
                  <Input
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="201"
                    className="mt-1 min-h-[44px] text-base"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - touch optimized, fixed at bottom */}
        <div className="p-4 pt-3 border-t bg-surface flex gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[52px] text-base touch-manipulation"
            onClick={() => {
              resetForm()
              onOpenChange(false)
              triggerHaptic(10)
            }}
            disabled={createMutation.isPending}
          >
            <X className="h-5 w-5 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-success hover:bg-green-700 min-h-[52px] text-base touch-manipulation"
            onClick={handleSubmit}
            disabled={
              createMutation.isPending || !description.trim() || !trade
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-1" />
                Create Punch
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuickPunchMode
