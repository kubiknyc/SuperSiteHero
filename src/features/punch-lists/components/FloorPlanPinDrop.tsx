// File: /src/features/punch-lists/components/FloorPlanPinDrop.tsx
// Floor plan pin-drop component for marking punch item locations

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Circle, Image as KonvaImage, Group, Text as KonvaText } from 'react-konva'
import useImage from 'use-image'
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Move, Upload, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/notifications/ToastContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// Pin location data structure
export interface PinLocation {
  x: number  // X coordinate (0-1 normalized)
  y: number  // Y coordinate (0-1 normalized)
  documentId?: string  // Reference to the floor plan document
  pageNumber?: number  // Page number if multi-page PDF
  sheetName?: string   // Human-readable sheet name
}

interface FloorPlanPinDropProps {
  projectId: string
  value?: PinLocation | null
  onChange: (location: PinLocation | null) => void
  disabled?: boolean
}

interface FloorPlan {
  id: string
  name: string
  file_url: string
  document_type: string
}

// Pin marker component
function PinMarker({ x, y, scale, selected }: { x: number; y: number; scale: number; selected?: boolean }) {
  const pinSize = 24 / scale
  const strokeWidth = 2 / scale

  return (
    <Group x={x} y={y}>
      {/* Drop shadow */}
      <Circle
        x={2 / scale}
        y={4 / scale}
        radius={pinSize / 2}
        fill="rgba(0, 0, 0, 0.3)"
      />
      {/* Pin circle */}
      <Circle
        x={0}
        y={0}
        radius={pinSize / 2}
        fill={selected ? '#DC2626' : '#EF4444'}
        stroke={selected ? '#991B1B' : '#B91C1C'}
        strokeWidth={strokeWidth}
      />
      {/* Pin center dot */}
      <Circle
        x={0}
        y={0}
        radius={pinSize / 6}
        fill="white"
      />
      {/* Pin pointer */}
      <Circle
        x={0}
        y={pinSize / 2 + 4 / scale}
        radius={4 / scale}
        fill={selected ? '#DC2626' : '#EF4444'}
      />
    </Group>
  )
}

// Floor plan canvas component
function FloorPlanCanvas({
  imageUrl,
  pinLocation,
  onPinChange,
  readOnly = false,
}: {
  imageUrl: string
  pinLocation: PinLocation | null
  onPinChange: (location: PinLocation | null) => void
  readOnly?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)
  const [image] = useImage(imageUrl, 'anonymous')
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Calculate image dimensions to fit container
  useEffect(() => {
    if (!containerRef.current || !image) {return}

    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = 400

    const imageAspect = image.width / image.height
    const containerAspect = containerWidth / containerHeight

    let newWidth, newHeight
    if (imageAspect > containerAspect) {
      newWidth = containerWidth
      newHeight = containerWidth / imageAspect
    } else {
      newHeight = containerHeight
      newWidth = containerHeight * imageAspect
    }

    setDimensions({ width: newWidth, height: newHeight })
  }, [image])

  // Handle canvas click to place pin
  const handleStageClick = useCallback((e: any) => {
    if (readOnly || isPanning || isDragging) {return}

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) {return}

    // Convert to normalized coordinates (0-1)
    const normalizedX = (pointer.x - position.x) / (dimensions.width * scale)
    const normalizedY = (pointer.y - position.y) / (dimensions.height * scale)

    // Only place pin if within bounds
    if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
      onPinChange({
        x: normalizedX,
        y: normalizedY,
      })
    }
  }, [readOnly, isPanning, isDragging, position, dimensions, scale, onPinChange])

  // Handle wheel zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault()

    const stage = e.target.getStage()
    const oldScale = scale
    const pointer = stage.getPointerPosition()

    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clampedScale = Math.max(0.5, Math.min(3, newScale))

    // Zoom toward mouse pointer
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    }

    setScale(clampedScale)
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }, [scale, position])

  // Handle pan drag
  const handleDragStart = useCallback(() => {
    if (isPanning) {setIsDragging(true)}
  }, [isPanning])

  const handleDragEnd = useCallback((e: any) => {
    if (isPanning) {
      setPosition({
        x: e.target.x(),
        y: e.target.y(),
      })
      setIsDragging(false)
    }
  }, [isPanning])

  // Reset view
  const resetView = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, s * 1.2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, s / 1.2))
  }, [])

  // Calculate pin position in canvas coordinates
  const pinCanvasPosition = pinLocation ? {
    x: pinLocation.x * dimensions.width,
    y: pinLocation.y * dimensions.height,
  } : null

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <Button
          type="button"
          variant={isPanning ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsPanning(!isPanning)}
          title="Pan mode"
        >
          <Move className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={zoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={zoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetView} title="Reset view">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {pinLocation && !readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPinChange(null)}
            className="text-error hover:text-error-dark"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Pin
          </Button>
        )}

        <span className="text-xs text-muted">
          {isPanning ? 'Drag to pan' : 'Click to place pin'}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'border rounded-lg overflow-hidden bg-muted',
          isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        )}
        style={{ height: 400 }}
      >
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={isPanning}
          onClick={handleStageClick}
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* Floor plan image */}
            {image && (
              <KonvaImage
                image={image}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}

            {/* Pin marker */}
            {pinCanvasPosition && (
              <PinMarker
                x={pinCanvasPosition.x}
                y={pinCanvasPosition.y}
                scale={scale}
                selected
              />
            )}
          </Layer>
        </Stage>

        {/* Loading state */}
        {!image && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
          </div>
        )}
      </div>

      {/* Pin location display */}
      {pinLocation && (
        <div className="text-sm text-secondary flex items-center gap-2">
          <MapPin className="h-4 w-4 text-error" />
          <span>Pin placed at ({Math.round(pinLocation.x * 100)}%, {Math.round(pinLocation.y * 100)}%)</span>
        </div>
      )}
    </div>
  )
}

// Main component
export function FloorPlanPinDrop({
  projectId,
  value,
  onChange,
  disabled = false,
}: FloorPlanPinDropProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null)
  const [localPin, setLocalPin] = useState<PinLocation | null>(value || null)
  const [loading, setLoading] = useState(false)

  // Fetch floor plans for the project
  useEffect(() => {
    if (!dialogOpen || !projectId) {return}

    const fetchFloorPlans = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, file_url, document_type')
          .eq('project_id', projectId)
          .in('document_type', ['drawing', 'floor_plan', 'site_plan', 'plan'])
          .is('deleted_at', null)
          .order('name')

        if (error) {throw error}
        setFloorPlans(data || [])

        // Auto-select if there's only one, or select previously used
        if (data && data.length === 1) {
          setSelectedFloorPlan(data[0])
        } else if (value?.documentId) {
          const prev = data?.find((d) => d.id === value.documentId)
          if (prev) {setSelectedFloorPlan(prev)}
        }
      } catch (err) {
        console.error('Failed to fetch floor plans:', err)
        toast.error('Failed to load floor plans')
      } finally {
        setLoading(false)
      }
    }

    fetchFloorPlans()
  }, [dialogOpen, projectId, value?.documentId])

  // Sync local pin with value prop
  useEffect(() => {
    setLocalPin(value || null)
  }, [value])

  // Handle pin change
  const handlePinChange = useCallback((pin: PinLocation | null) => {
    if (pin && selectedFloorPlan) {
      setLocalPin({
        ...pin,
        documentId: selectedFloorPlan.id,
        sheetName: selectedFloorPlan.name,
      })
    } else {
      setLocalPin(null)
    }
  }, [selectedFloorPlan])

  // Confirm and close
  const handleConfirm = useCallback(() => {
    onChange(localPin)
    setDialogOpen(false)
    if (localPin) {
      toast.success('Location marked on floor plan')
    }
  }, [localPin, onChange])

  // Clear location
  const handleClear = useCallback(() => {
    setLocalPin(null)
    onChange(null)
  }, [onChange])

  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Floor Plan Location</Label>

      {value ? (
        <div className="flex items-center gap-2 p-3 bg-success-light border border-green-200 rounded-lg">
          <MapPin className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Location marked</p>
            <p className="text-xs text-success">
              {value.sheetName || 'Floor plan'} - ({Math.round(value.x * 100)}%, {Math.round(value.y * 100)}%)
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mark Location on Floor Plan
                </DialogTitle>
              </DialogHeader>
              <FloorPlanDialogContent
                floorPlans={floorPlans}
                selectedFloorPlan={selectedFloorPlan}
                setSelectedFloorPlan={setSelectedFloorPlan}
                localPin={localPin}
                handlePinChange={handlePinChange}
                handleConfirm={handleConfirm}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="text-error hover:text-error-dark"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              disabled={disabled}
            >
              <MapPin className="h-5 w-5 mr-2 text-disabled" />
              <div>
                <p className="font-medium">Mark on Floor Plan</p>
                <p className="text-xs text-muted">Tap to place a pin on a drawing</p>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mark Location on Floor Plan
              </DialogTitle>
            </DialogHeader>
            <FloorPlanDialogContent
              floorPlans={floorPlans}
              selectedFloorPlan={selectedFloorPlan}
              setSelectedFloorPlan={setSelectedFloorPlan}
              localPin={localPin}
              handlePinChange={handlePinChange}
              handleConfirm={handleConfirm}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Dialog content component
function FloorPlanDialogContent({
  floorPlans,
  selectedFloorPlan,
  setSelectedFloorPlan,
  localPin,
  handlePinChange,
  handleConfirm,
  loading,
}: {
  floorPlans: FloorPlan[]
  selectedFloorPlan: FloorPlan | null
  setSelectedFloorPlan: (plan: FloorPlan | null) => void
  localPin: PinLocation | null
  handlePinChange: (pin: PinLocation | null) => void
  handleConfirm: () => void
  loading: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Floor plan selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Select Floor Plan</Label>
        {loading ? (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading floor plans...
          </div>
        ) : floorPlans.length === 0 ? (
          <div className="p-4 bg-warning-light border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <p className="font-medium">No floor plans found</p>
            <p className="text-xs mt-1">Upload floor plans to the Documents section to mark locations.</p>
          </div>
        ) : (
          <select
            value={selectedFloorPlan?.id || ''}
            onChange={(e) => {
              const plan = floorPlans.find((p) => p.id === e.target.value)
              setSelectedFloorPlan(plan || null)
              handlePinChange(null) // Clear pin when switching plans
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select a floor plan...</option>
            {floorPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Floor plan canvas */}
      {selectedFloorPlan && (
        <FloorPlanCanvas
          imageUrl={selectedFloorPlan.file_url}
          pinLocation={localPin}
          onPinChange={handlePinChange}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => handlePinChange(null)}
          disabled={!localPin}
        >
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!localPin}
          className="gap-1"
        >
          <Check className="h-4 w-4" />
          Confirm Location
        </Button>
      </div>
    </div>
  )
}

export default FloorPlanPinDrop
