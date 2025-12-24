/**
 * PhotoComparison Component
 *
 * Before/After photo comparison with slider and side-by-side views.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  X,
  ArrowLeftRight,
  Columns,
  SplitSquareHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo, PhotoComparison as PhotoComparisonType, CreateComparisonDTO } from '@/types/photo-management'
import { usePhotos, useCreateComparison, useCompleteComparison } from '../hooks/usePhotos'

type ViewMode = 'slider' | 'side-by-side' | 'overlay'

interface PhotoComparisonProps {
  comparison?: PhotoComparisonType
  beforePhoto?: Photo
  afterPhoto?: Photo
  projectId?: string
  onClose?: () => void
}

export function PhotoComparison({
  comparison,
  beforePhoto: initialBefore,
  afterPhoto: initialAfter,
  projectId,
  onClose,
}: PhotoComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('slider')
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [beforePhoto, setBeforePhoto] = useState<Photo | undefined>(initialBefore)
  const [afterPhoto, setAfterPhoto] = useState<Photo | undefined>(initialAfter)
  const [notes, setNotes] = useState(comparison?.description || '')

  const containerRef = useRef<HTMLDivElement>(null)
  const completeComparison = useCompleteComparison()

  // Load photos from comparison if provided
  useEffect(() => {
    if (comparison) {
      setBeforePhoto(comparison.beforePhoto)
      setAfterPhoto(comparison.afterPhoto)
      setNotes(comparison.description || '')
    }
  }, [comparison])

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!isDragging || !containerRef.current) {return}

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      setSliderPosition(Math.max(0, Math.min(100, percentage)))
    },
    [isDragging]
  )

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleComplete = async () => {
    if (comparison && afterPhoto) {
      await completeComparison.mutateAsync({
        id: comparison.id,
        afterPhotoId: afterPhoto.id,
      })
      onClose?.()
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {return 'Unknown date'}
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!beforePhoto || !afterPhoto) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2" className="heading-subsection">Select Photos to Compare</h3>
        <p className="text-sm text-muted-foreground">
          Choose a before and after photo to create a comparison
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold" className="heading-section">
            {comparison?.title || 'Photo Comparison'}
          </h2>
          {comparison?.comparisonType && (
            <Badge variant="outline" className="capitalize">
              {comparison.comparisonType.replace('_', ' ')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'slider' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('slider')}
              title="Slider view"
            >
              <SplitSquareHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('side-by-side')}
              title="Side by side view"
            >
              <Columns className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'overlay' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('overlay')}
              title="Overlay view"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Comparison View */}
      <div className="flex-1 overflow-hidden p-4">
        {viewMode === 'slider' && (
          <SliderView
            beforePhoto={beforePhoto}
            afterPhoto={afterPhoto}
            sliderPosition={sliderPosition}
            containerRef={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        )}

        {viewMode === 'side-by-side' && (
          <SideBySideView
            beforePhoto={beforePhoto}
            afterPhoto={afterPhoto}
          />
        )}

        {viewMode === 'overlay' && (
          <OverlayView
            beforePhoto={beforePhoto}
            afterPhoto={afterPhoto}
            opacity={sliderPosition}
            onOpacityChange={setSliderPosition}
          />
        )}
      </div>

      {/* Footer with dates and notes */}
      <div className="border-t p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-error-light">Before</Badge>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(beforePhoto.capturedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-success-light">After</Badge>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(afterPhoto.capturedAt)}</span>
            </div>
          </div>

          {comparison && comparison.status !== 'completed' && (
            <Button onClick={handleComplete} disabled={!notes}>
              <Save className="h-4 w-4 mr-2" />
              Complete Comparison
            </Button>
          )}
        </div>

        {comparison && (
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the changes observed..."
              className="min-h-[80px]"
              readOnly={comparison.status === 'completed'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Slider View Component
interface SliderViewProps {
  beforePhoto: Photo
  afterPhoto: Photo
  sliderPosition: number
  containerRef: React.RefObject<HTMLDivElement>
  onMouseDown: () => void
  onMouseMove: (e: React.MouseEvent) => void
}

function SliderView({
  beforePhoto,
  afterPhoto,
  sliderPosition,
  containerRef,
  onMouseDown,
  onMouseMove,
}: SliderViewProps) {
  return (
    <div
      ref={containerRef}
      className="relative h-full rounded-lg overflow-hidden cursor-ew-resize select-none"
      onMouseMove={onMouseMove}
    >
      {/* After Image (full width, behind) */}
      <img
        src={afterPhoto.fileUrl}
        alt="After"
        className="absolute inset-0 w-full h-full object-contain bg-black"
        draggable={false}
      />

      {/* Before Image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforePhoto.fileUrl}
          alt="Before"
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{
            width: `${containerRef.current?.offsetWidth || 0}px`,
            maxWidth: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-card cursor-ew-resize shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={onMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-secondary -mr-1" />
          <ChevronRight className="h-4 w-4 text-secondary -ml-1" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-red-500/80 text-white text-sm rounded-full">
        Before
      </div>
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-green-500/80 text-white text-sm rounded-full">
        After
      </div>
    </div>
  )
}

// Side by Side View Component
interface SideBySideViewProps {
  beforePhoto: Photo
  afterPhoto: Photo
}

function SideBySideView({ beforePhoto, afterPhoto }: SideBySideViewProps) {
  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 relative rounded-lg overflow-hidden bg-black">
        <img
          src={beforePhoto.fileUrl}
          alt="Before"
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-red-500/80 text-white text-sm rounded-full">
          Before
        </div>
        <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
          {beforePhoto.caption || beforePhoto.fileName}
        </div>
      </div>
      <div className="flex-1 relative rounded-lg overflow-hidden bg-black">
        <img
          src={afterPhoto.fileUrl}
          alt="After"
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-green-500/80 text-white text-sm rounded-full">
          After
        </div>
        <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
          {afterPhoto.caption || afterPhoto.fileName}
        </div>
      </div>
    </div>
  )
}

// Overlay View Component
interface OverlayViewProps {
  beforePhoto: Photo
  afterPhoto: Photo
  opacity: number
  onOpacityChange: (value: number) => void
}

function OverlayView({
  beforePhoto,
  afterPhoto,
  opacity,
  onOpacityChange,
}: OverlayViewProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 relative rounded-lg overflow-hidden bg-black">
        {/* Before Image */}
        <img
          src={beforePhoto.fileUrl}
          alt="Before"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {/* After Image with opacity */}
        <img
          src={afterPhoto.fileUrl}
          alt="After"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: opacity / 100 }}
        />

        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-red-500/80 text-white text-sm rounded-full">
          Before
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1 bg-green-500/80 text-white text-sm rounded-full">
          After
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground min-w-[60px]">Before</span>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => onOpacityChange(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground min-w-[60px] text-right">After</span>
      </div>
    </div>
  )
}

// Create Comparison Dialog
interface CreateComparisonDialogProps {
  projectId: string
  trigger?: React.ReactNode
}

export function CreateComparisonDialog({
  projectId,
  trigger,
}: CreateComparisonDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [beforePhotoId, setBeforePhotoId] = useState('')
  const [afterPhotoId, setAfterPhotoId] = useState('')
  const [title, setTitle] = useState('')
  const [comparisonType, setComparisonType] = useState<CreateComparisonDTO['comparisonType']>('progress')
  const [notes, setNotes] = useState('')

  const { data: photos } = usePhotos({ projectId })
  const createComparison = useCreateComparison()

  const handleCreate = async () => {
    if (!beforePhotoId || !afterPhotoId || !title) {return}

    await createComparison.mutateAsync({
      projectId,
      beforePhotoId,
      afterPhotoId,
      title,
      comparisonType,
      description: notes || undefined,
    })

    setIsOpen(false)
    // Reset form
    setBeforePhotoId('')
    setAfterPhotoId('')
    setTitle('')
    setComparisonType('progress')
    setNotes('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Comparison
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Photo Comparison</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Foundation Progress"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label>Comparison Type</Label>
            <RadixSelect
              value={comparisonType}
              onValueChange={(v: string) => setComparisonType(v as CreateComparisonDTO['comparisonType'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="issue_resolution">Issue Resolution</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="before_after">Before/After</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Before Photo</Label>
              <RadixSelect value={beforePhotoId} onValueChange={setBeforePhotoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select photo" />
                </SelectTrigger>
                <SelectContent>
                  {photos?.map((photo) => (
                    <SelectItem key={photo.id} value={photo.id}>
                      {photo.caption || photo.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>

            <div className="space-y-2">
              <Label>After Photo</Label>
              <RadixSelect value={afterPhotoId} onValueChange={setAfterPhotoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select photo" />
                </SelectTrigger>
                <SelectContent>
                  {photos
                    ?.filter((p) => p.id !== beforePhotoId)
                    .map((photo) => (
                      <SelectItem key={photo.id} value={photo.id}>
                        {photo.caption || photo.fileName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </RadixSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this comparison..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!beforePhotoId || !afterPhotoId || !title}
          >
            Create Comparison
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PhotoComparison
