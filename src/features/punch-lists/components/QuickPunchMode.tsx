// File: /src/features/punch-lists/components/QuickPunchMode.tsx
// Quick Punch Mode - Streamlined punch item creation for field workers
// Goal: tap → camera → voice → done in 30 seconds

import { useState, useRef, useCallback } from 'react'
import { Camera, Mic, MicOff, X, Check, MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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
import { uploadPunchItemPhoto } from '@/lib/storage/punch-item-uploads'
import { toast } from '@/lib/notifications/ToastContext'
import { cn } from '@/lib/utils'
import type { Priority } from '@/types/database'

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

export function QuickPunchMode({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: QuickPunchModeProps) {
  const createMutation = useCreatePunchItemWithNotification()

  // Core fields - minimal for speed
  const [description, setDescription] = useState('')
  const [trade, setTrade] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  // Location fields (collapsible)
  const [showLocation, setShowLocation] = useState(false)
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')

  // Photo capture state
  const [isCapturing, setIsCapturing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice input
  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    transcript,
  } = useVoiceToText({
    interimResults: true,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setDescription((prev) => prev ? `${prev} ${text}` : text)
      }
    },
  })

  // Reset form
  const resetForm = useCallback(() => {
    setDescription('')
    setTrade('')
    setPriority('normal')
    setPhotoUrls([])
    setShowLocation(false)
    setBuilding('')
    setFloor('')
    setRoom('')
  }, [])

  // Handle photo capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create a temporary ID for the punch item (will be replaced after creation)
        const tempId = `temp-${Date.now()}`
        const result = await uploadPunchItemPhoto(projectId, tempId, file)
        return result.url
      })

      const urls = await Promise.all(uploadPromises)
      setPhotoUrls((prev) => [...prev, ...urls])
      toast.success(`${urls.length} photo(s) captured`)
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to capture photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Remove photo
  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit punch item
  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe the issue')
      return
    }

    if (!trade) {
      toast.error('Please select a trade')
      return
    }

    // Generate title from first ~50 chars of description
    const title = description.trim().slice(0, 50) + (description.length > 50 ? '...' : '')

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
        // Note: Photos would be attached after creation via a separate API
      },
      {
        onSuccess: () => {
          toast.success('Punch item created!')
          resetForm()
          onOpenChange(false)
          onSuccess?.()
        },
      }
    )
  }

  // Display value (current + interim transcript)
  const displayDescription = isListening && transcript
    ? `${description} ${transcript}`.trim()
    : description

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 bg-blue-600 text-white">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg font-semibold">Quick Punch</span>
            <span className="text-sm font-normal opacity-80">Fast field capture</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Photo Capture - Big, prominent button */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4" />
              <Label className="text-sm font-medium">Photo Evidence</Label>
            </div>

            {/* Photo thumbnails */}
            {photoUrls.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-16 text-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-6 w-6 mr-2" />
                  {photoUrls.length > 0 ? 'Add More Photos' : 'Take Photo'}
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </div>

          {/* Description with Voice */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Describe the Issue <span className="text-red-500">*</span>
              </Label>
              {voiceSupported && (
                <Button
                  type="button"
                  variant={isListening ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(isListening && 'animate-pulse')}
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
                'w-full px-3 py-2 text-base border rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-blue-600',
                isListening && 'border-red-400 bg-red-50'
              )}
            />
            {isListening && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Listening... speak now
              </p>
            )}
          </div>

          {/* Trade Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trade" className="text-sm font-medium">
                Trade <span className="text-red-500">*</span>
              </Label>
              <Select
                id="trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="mt-1"
              >
                <option value="">Select trade...</option>
                {COMMON_TRADES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>

          {/* Location (collapsible) */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowLocation(!showLocation)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700"
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
                  <Label htmlFor="building" className="text-xs">Building</Label>
                  <Input
                    id="building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="A"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="floor" className="text-xs">Floor</Label>
                  <Input
                    id="floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="2nd"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="room" className="text-xs">Room</Label>
                  <Input
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="201"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-2 border-t bg-gray-50 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
            disabled={createMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !description.trim() || !trade}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Create Punch
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
