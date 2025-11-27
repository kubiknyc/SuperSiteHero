// File: /src/features/documents/components/DrawingCanvas.tsx
// Konva-based drawing canvas for document markup and annotations

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Text as KonvaText, Transformer, Shape } from 'react-konva'
import type Konva from 'konva'
import { Button } from '@/components/ui/button'
import {
  MousePointer2,
  ArrowUpRight,
  Square,
  Circle as CircleIcon,
  Type,
  Pencil,
  Eraser,
  Trash2,
  Undo,
  Redo,
  Cloud,
  Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentMarkups, useCreateMarkup, useUpdateMarkup, useDeleteMarkup } from '../hooks/useMarkups'
import type { DocumentMarkup } from '@/lib/api/services/markups'
import toast from 'react-hot-toast'
import { MarkupFilterPanel, type MarkupFilter, type MarkupType } from './MarkupFilterPanel'

type Tool = 'select' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'cloud' | 'eraser'

interface DrawingCanvasProps {
  documentId: string
  projectId: string
  pageNumber?: number | null
  backgroundImageUrl?: string
  width?: number
  height?: number
  readOnly?: boolean
  onSave?: () => void
  currentUserId?: string  // For "show my markups only" filter
}

interface ShapeData {
  id: string
  type: 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'cloud'
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
  fill?: string
  stroke: string
  strokeWidth: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  pointerLength?: number
  pointerWidth?: number
  numBumps?: number // For cloud shape
  createdBy?: string  // User ID who created this markup
}

/**
 * Generate cloud shape path points
 * Creates a cloud/callout bubble using bezier curves
 */
function generateCloudPath(
  width: number,
  height: number,
  numBumps: number = 8
): string {
  if (width === 0 || height === 0) return ''

  const absWidth = Math.abs(width)
  const absHeight = Math.abs(height)
  const offsetX = width < 0 ? width : 0
  const offsetY = height < 0 ? height : 0

  const bumpRadius = Math.min(absWidth, absHeight) / (numBumps / 2)
  const path: string[] = []

  // Start at bottom left
  path.push(`M ${offsetX + bumpRadius} ${offsetY + absHeight}`)

  // Bottom edge bumps
  const bottomBumps = Math.max(2, Math.floor(absWidth / bumpRadius / 1.5))
  for (let i = 0; i < bottomBumps; i++) {
    const x1 = offsetX + (i + 0.5) * (absWidth / bottomBumps)
    const x2 = offsetX + (i + 1) * (absWidth / bottomBumps)
    const cy = offsetY + absHeight + bumpRadius * 0.3
    path.push(`Q ${x1} ${cy} ${x2} ${offsetY + absHeight}`)
  }

  // Right edge bumps
  const rightBumps = Math.max(2, Math.floor(absHeight / bumpRadius / 1.5))
  for (let i = 0; i < rightBumps; i++) {
    const y1 = offsetY + absHeight - (i + 0.5) * (absHeight / rightBumps)
    const y2 = offsetY + absHeight - (i + 1) * (absHeight / rightBumps)
    const cx = offsetX + absWidth + bumpRadius * 0.3
    path.push(`Q ${cx} ${y1} ${offsetX + absWidth} ${y2}`)
  }

  // Top edge bumps
  for (let i = 0; i < bottomBumps; i++) {
    const x1 = offsetX + absWidth - (i + 0.5) * (absWidth / bottomBumps)
    const x2 = offsetX + absWidth - (i + 1) * (absWidth / bottomBumps)
    const cy = offsetY - bumpRadius * 0.3
    path.push(`Q ${x1} ${cy} ${x2} ${offsetY}`)
  }

  // Left edge bumps
  for (let i = 0; i < rightBumps; i++) {
    const y1 = offsetY + (i + 0.5) * (absHeight / rightBumps)
    const y2 = offsetY + (i + 1) * (absHeight / rightBumps)
    const cx = offsetX - bumpRadius * 0.3
    path.push(`Q ${cx} ${y1} ${offsetX} ${y2}`)
  }

  path.push('Z')
  return path.join(' ')
}

/**
 * Hook to detect if device is mobile/touch
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isTouchDevice && isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * DrawingCanvas Component
 *
 * A Konva-based canvas for drawing annotations on documents.
 * Supports arrows, rectangles, circles, text, and freehand drawing.
 */
export function DrawingCanvas({
  documentId,
  projectId,
  pageNumber = null,
  backgroundImageUrl,
  width = 800,
  height = 600,
  readOnly = false,
  onSave,
  currentUserId,
}: DrawingCanvasProps) {
  // Mobile detection
  const isMobile = useIsMobile()
  const effectiveReadOnly = readOnly || isMobile

  // Tool state
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#FF0000')
  const [strokeWidth, setStrokeWidth] = useState(2)

  // Drawing state
  const [shapes, setShapes] = useState<ShapeData[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<ShapeData | null>(null)

  // History for undo/redo
  const [history, setHistory] = useState<ShapeData[][]>([])
  const [historyStep, setHistoryStep] = useState(0)

  // Filter state for layer visibility
  const [filter, setFilter] = useState<MarkupFilter>({
    showMyMarkupsOnly: false,
    creatorIds: [],
    types: ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'],
    dateRange: { start: null, end: null },
    hiddenLayers: [],
  })

  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)

  // React Query hooks
  const { data: existingMarkups, isLoading } = useDocumentMarkups(documentId, pageNumber)
  const createMarkup = useCreateMarkup()
  const updateMarkup = useUpdateMarkup()
  const deleteMarkup = useDeleteMarkup()

  // Ref for debounced save operations
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Extract unique creators from existing markups for layer visibility
  const creators = useMemo(() => {
    if (!existingMarkups) return []
    const uniqueCreators = new Map<string, { id: string; name: string }>()
    existingMarkups.forEach(markup => {
      if (markup.created_by && !uniqueCreators.has(markup.created_by)) {
        uniqueCreators.set(markup.created_by, {
          id: markup.created_by,
          name: markup.creator?.full_name || markup.creator?.email || 'Unknown User',
        })
      }
    })
    return Array.from(uniqueCreators.values())
  }, [existingMarkups])

  // Calculate markup counts by type for the filter panel
  const markupCounts = useMemo(() => {
    const counts: Record<MarkupType, number> = {
      arrow: 0, rectangle: 0, circle: 0, text: 0, freehand: 0, cloud: 0
    }
    shapes.forEach(shape => {
      if (shape.type in counts) counts[shape.type as MarkupType]++
    })
    return counts
  }, [shapes])

  // Filter shapes based on active filters
  const filteredShapes = useMemo(() => {
    return shapes.filter(shape => {
      // Filter by type
      if (!filter.types.includes(shape.type as MarkupType)) return false
      // Filter by hidden layers (by creator)
      if (shape.createdBy && filter.hiddenLayers.includes(shape.createdBy)) return false
      // Filter by "my markups only"
      if (filter.showMyMarkupsOnly && currentUserId && shape.createdBy !== currentUserId) return false
      return true
    })
  }, [shapes, filter, currentUserId])

  // Load existing markups from database
  useEffect(() => {
    if (existingMarkups && existingMarkups.length > 0) {
      const loadedShapes: ShapeData[] = existingMarkups.map(markup => ({
        id: markup.id,
        type: markup.markup_type as ShapeData['type'],
        ...markup.markup_data,
        stroke: markup.markup_data.stroke || color,
        strokeWidth: markup.markup_data.strokeWidth || strokeWidth,
        createdBy: markup.created_by || undefined,
      }))
      setShapes(loadedShapes)
      setHistory([loadedShapes])
      setHistoryStep(0)
    }
  }, [existingMarkups])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
    }
  }, [])

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedShapeId && transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(`#${selectedShapeId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      }
    }
  }, [selectedShapeId])

  // Handle mouse down - start drawing
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (effectiveReadOnly || tool === 'select') return

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    setIsDrawing(true)

    const newShape: ShapeData = {
      id: `shape-${Date.now()}`,
      type: tool as ShapeData['type'],
      x: pos.x,
      y: pos.y,
      stroke: color,
      strokeWidth: strokeWidth,
    }

    if (tool === 'freehand') {
      newShape.points = [0, 0]
    } else if (tool === 'arrow') {
      newShape.points = [0, 0, 0, 0]
      newShape.pointerLength = 10
      newShape.pointerWidth = 10
    } else if (tool === 'rectangle') {
      newShape.width = 0
      newShape.height = 0
      newShape.fill = 'transparent'
    } else if (tool === 'circle') {
      newShape.radius = 0
      newShape.fill = 'transparent'
    } else if (tool === 'text') {
      newShape.text = 'Double-click to edit'
      newShape.fill = color
    } else if (tool === 'cloud') {
      newShape.width = 0
      newShape.height = 0
      newShape.fill = 'transparent'
      newShape.numBumps = 8
    }

    setCurrentShape(newShape)
  }

  // Handle mouse move - update current shape
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !currentShape || effectiveReadOnly) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    const updatedShape = { ...currentShape }

    if (tool === 'freehand' && updatedShape.points) {
      const newPoints = updatedShape.points.concat([
        pos.x - updatedShape.x,
        pos.y - updatedShape.y,
      ])
      updatedShape.points = newPoints
    } else if (tool === 'arrow' && updatedShape.points) {
      updatedShape.points = [
        0,
        0,
        pos.x - updatedShape.x,
        pos.y - updatedShape.y,
      ]
    } else if (tool === 'rectangle') {
      updatedShape.width = pos.x - updatedShape.x
      updatedShape.height = pos.y - updatedShape.y
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - updatedShape.x, 2) + Math.pow(pos.y - updatedShape.y, 2)
      )
      updatedShape.radius = radius
    } else if (tool === 'cloud') {
      updatedShape.width = pos.x - updatedShape.x
      updatedShape.height = pos.y - updatedShape.y
    }

    setCurrentShape(updatedShape)
  }

  // Handle mouse up - finish drawing
  const handleMouseUp = () => {
    if (!isDrawing || !currentShape || effectiveReadOnly) return

    setIsDrawing(false)

    // Add shape to shapes array
    const newShapes = [...shapes, currentShape]
    setShapes(newShapes)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    setCurrentShape(null)

    // Auto-save to database
    saveShapeToDatabase(currentShape)
  }

  // Save a shape to the database
  const saveShapeToDatabase = async (shape: ShapeData) => {
    try {
      const markupData: DocumentMarkup['markup_data'] = {
        x: shape.x,
        y: shape.y,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
      }

      if (shape.width !== undefined) markupData.width = shape.width
      if (shape.height !== undefined) markupData.height = shape.height
      if (shape.radius !== undefined) markupData.radius = shape.radius
      if (shape.points) markupData.points = shape.points
      if (shape.text) markupData.text = shape.text
      if (shape.fill) markupData.fill = shape.fill
      if (shape.rotation) markupData.rotation = shape.rotation
      if (shape.scaleX) markupData.scaleX = shape.scaleX
      if (shape.scaleY) markupData.scaleY = shape.scaleY
      if (shape.pointerLength) markupData.pointerLength = shape.pointerLength
      if (shape.pointerWidth) markupData.pointerWidth = shape.pointerWidth
      if (shape.numBumps) markupData.numBumps = shape.numBumps

      await createMarkup.mutateAsync({
        document_id: documentId,
        project_id: projectId,
        page_number: pageNumber,
        markup_type: shape.type,
        markup_data: markupData,
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
      })
    } catch (error) {
      console.error('Failed to save markup:', error)
      toast.error('Failed to save annotation')
    }
  }

  // Debounced save for transform operations (drag, resize)
  const debouncedUpdateShape = useCallback((shapeId: string, updates: Partial<ShapeData>) => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current)
    }

    pendingSaveRef.current = setTimeout(async () => {
      const markup = existingMarkups?.find(m => m.id === shapeId)
      if (markup) {
        try {
          await updateMarkup.mutateAsync({
            id: markup.id,
            markup_data: {
              ...markup.markup_data,
              ...updates,
            },
          })
        } catch (error) {
          console.error('Failed to update markup:', error)
        }
      }
      pendingSaveRef.current = null
    }, 500) // 500ms debounce
  }, [existingMarkups, updateMarkup])

  // Handle drag end - save position changes
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id()
    const node = e.target

    // Update local state
    setShapes(prevShapes =>
      prevShapes.map(shape =>
        shape.id === id
          ? { ...shape, x: node.x(), y: node.y() }
          : shape
      )
    )

    // Debounced save to database
    debouncedUpdateShape(id, {
      x: node.x(),
      y: node.y(),
    })
  }, [debouncedUpdateShape])

  // Handle transform end - save scale, rotation changes
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const id = node.id()

    // Get transform values
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation()

    // Update local state
    setShapes(prevShapes =>
      prevShapes.map(shape =>
        shape.id === id
          ? {
              ...shape,
              x: node.x(),
              y: node.y(),
              scaleX,
              scaleY,
              rotation,
              // For rectangles and circles, also update width/height/radius
              ...(shape.type === 'rectangle' && shape.width
                ? { width: Math.max(5, shape.width * scaleX) }
                : {}),
              ...(shape.type === 'rectangle' && shape.height
                ? { height: Math.max(5, shape.height * scaleY) }
                : {}),
              ...(shape.type === 'circle' && shape.radius
                ? { radius: Math.max(5, shape.radius * scaleX) }
                : {}),
            }
          : shape
      )
    )

    // Reset scale to 1 after absorbing it into width/height/radius
    node.scaleX(1)
    node.scaleY(1)

    // Debounced save to database
    debouncedUpdateShape(id, {
      x: node.x(),
      y: node.y(),
      rotation,
      scaleX,
      scaleY,
    })
  }, [debouncedUpdateShape])

  // Handle shape selection
  const handleShapeClick = (shapeId: string) => {
    if (tool === 'select') {
      setSelectedShapeId(shapeId)
    } else if (tool === 'eraser') {
      handleDeleteShape(shapeId)
    }
  }

  // Handle delete shape
  const handleDeleteShape = async (shapeId: string) => {
    const newShapes = shapes.filter(s => s.id !== shapeId)
    setShapes(newShapes)
    setSelectedShapeId(null)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    // Delete from database if it's a persisted markup
    const markup = existingMarkups?.find(m => m.id === shapeId)
    if (markup) {
      try {
        await deleteMarkup.mutateAsync(markup.id)
      } catch (error) {
        console.error('Failed to delete markup:', error)
        toast.error('Failed to delete annotation')
      }
    }
  }

  // Handle undo
  const handleUndo = () => {
    if (historyStep === 0) return
    setHistoryStep(historyStep - 1)
    setShapes(history[historyStep - 1])
  }

  // Handle redo
  const handleRedo = () => {
    if (historyStep === history.length - 1) return
    setHistoryStep(historyStep + 1)
    setShapes(history[historyStep + 1])
  }

  // Handle clear all
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all annotations?')) {
      setShapes([])
      setHistory([[]])
      setHistoryStep(0)
      setSelectedShapeId(null)

      // Delete all markups from database
      if (existingMarkups && existingMarkups.length > 0) {
        try {
          await Promise.all(existingMarkups.map(m => deleteMarkup.mutateAsync(m.id)))
          toast.success('All annotations cleared')
        } catch (error) {
          console.error('Failed to clear markups:', error)
          toast.error('Failed to clear annotations')
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50">
        <p className="text-gray-500">Loading annotations...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Mobile view-only notice */}
      {isMobile && !readOnly && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-amber-100 border border-amber-300 rounded-lg px-4 py-2 flex items-center gap-2 shadow-md">
          <Smartphone className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800">View only on mobile devices</span>
        </div>
      )}

      {/* Toolbar */}
      {!effectiveReadOnly && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-2">
          {/* Tool buttons */}
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant={tool === 'select' ? 'default' : 'outline'}
              onClick={() => setTool('select')}
              title="Select"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'arrow' ? 'default' : 'outline'}
              onClick={() => setTool('arrow')}
              title="Arrow"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'rectangle' ? 'default' : 'outline'}
              onClick={() => setTool('rectangle')}
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'circle' ? 'default' : 'outline'}
              onClick={() => setTool('circle')}
              title="Circle"
            >
              <CircleIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'cloud' ? 'default' : 'outline'}
              onClick={() => setTool('cloud')}
              title="Cloud/Callout"
            >
              <Cloud className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'text' ? 'default' : 'outline'}
              onClick={() => setTool('text')}
              title="Text"
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'freehand' ? 'default' : 'outline'}
              onClick={() => setTool('freehand')}
              title="Freehand"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'eraser' ? 'default' : 'outline'}
              onClick={() => setTool('eraser')}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>

          {/* Color picker */}
          <div className="border-t pt-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
              title="Color"
            />
          </div>

          {/* Stroke width */}
          <div className="border-t pt-2">
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-full"
              title="Stroke Width"
            />
            <p className="text-xs text-center text-gray-600">{strokeWidth}px</p>
          </div>

          {/* Actions */}
          <div className="border-t pt-2 flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyStep === 0}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={historyStep === history.length - 1}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClearAll}
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Filter panel for layer visibility */}
          <div className="border-t pt-2">
            <MarkupFilterPanel
              filter={filter}
              onFilterChange={setFilter}
              creators={creators}
              currentUserId={currentUserId}
              markupCounts={markupCounts}
            />
          </div>
        </div>
      )}

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as any}
        onTouchMove={handleMouseMove as any}
        onTouchEnd={handleMouseUp as any}
      >
        <Layer ref={layerRef}>
          {/* Background image (if provided) */}
          {backgroundImageUrl && (
            <KonvaText
              text="Background image loading..."
              x={width / 2 - 100}
              y={height / 2}
              fontSize={16}
              fill="#999"
            />
          )}

          {/* Render existing shapes (filtered by layer visibility) */}
          {filteredShapes.map((shape) => {
            if (shape.type === 'freehand' && shape.points) {
              return (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  x={shape.x}
                  y={shape.y}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={tool === 'select'}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            } else if (shape.type === 'arrow' && shape.points) {
              return (
                <Arrow
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  x={shape.x}
                  y={shape.y}
                  pointerLength={shape.pointerLength || 10}
                  pointerWidth={shape.pointerWidth || 10}
                  draggable={tool === 'select'}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            } else if (shape.type === 'rectangle') {
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width || 0}
                  height={shape.height || 0}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill || 'transparent'}
                  draggable={tool === 'select'}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            } else if (shape.type === 'circle') {
              return (
                <Circle
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius || 0}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill || 'transparent'}
                  draggable={tool === 'select'}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            } else if (shape.type === 'text') {
              return (
                <KonvaText
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  text={shape.text || ''}
                  fontSize={16}
                  fill={shape.fill || color}
                  draggable={tool === 'select'}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            } else if (shape.type === 'cloud') {
              const pathData = generateCloudPath(
                shape.width || 0,
                shape.height || 0,
                shape.numBumps || 8
              )
              return (
                <Shape
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill || 'transparent'}
                  draggable={tool === 'select'}
                  sceneFunc={(context, shapeInstance) => {
                    if (!pathData) return
                    const path = new Path2D(pathData)
                    context.beginPath()
                    // @ts-ignore - Path2D works with canvas context
                    context._context.stroke(path)
                    if (shape.fill && shape.fill !== 'transparent') {
                      // @ts-ignore
                      context._context.fill(path)
                    }
                    context.fillStrokeShape(shapeInstance)
                  }}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            }
            return null
          })}

          {/* Render current shape being drawn */}
          {currentShape && (
            <>
              {currentShape.type === 'freehand' && currentShape.points && (
                <Line
                  points={currentShape.points}
                  stroke={currentShape.stroke}
                  strokeWidth={currentShape.strokeWidth}
                  x={currentShape.x}
                  y={currentShape.y}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {currentShape.type === 'arrow' && currentShape.points && (
                <Arrow
                  points={currentShape.points}
                  stroke={currentShape.stroke}
                  strokeWidth={currentShape.strokeWidth}
                  x={currentShape.x}
                  y={currentShape.y}
                  pointerLength={currentShape.pointerLength || 10}
                  pointerWidth={currentShape.pointerWidth || 10}
                />
              )}
              {currentShape.type === 'rectangle' && (
                <Rect
                  x={currentShape.x}
                  y={currentShape.y}
                  width={currentShape.width || 0}
                  height={currentShape.height || 0}
                  stroke={currentShape.stroke}
                  strokeWidth={currentShape.strokeWidth}
                  fill={currentShape.fill || 'transparent'}
                />
              )}
              {currentShape.type === 'circle' && (
                <Circle
                  x={currentShape.x}
                  y={currentShape.y}
                  radius={currentShape.radius || 0}
                  stroke={currentShape.stroke}
                  strokeWidth={currentShape.strokeWidth}
                  fill={currentShape.fill || 'transparent'}
                />
              )}
              {currentShape.type === 'cloud' && (
                <Shape
                  x={currentShape.x}
                  y={currentShape.y}
                  stroke={currentShape.stroke}
                  strokeWidth={currentShape.strokeWidth}
                  fill={currentShape.fill || 'transparent'}
                  sceneFunc={(context, shapeInstance) => {
                    const pathData = generateCloudPath(
                      currentShape.width || 0,
                      currentShape.height || 0,
                      currentShape.numBumps || 8
                    )
                    if (!pathData) return
                    const path = new Path2D(pathData)
                    context.beginPath()
                    // @ts-ignore - Path2D works with canvas context
                    context._context.stroke(path)
                    context.fillStrokeShape(shapeInstance)
                  }}
                />
              )}
            </>
          )}

          {/* Transformer for selected shape */}
          {tool === 'select' && (
            <Transformer
              ref={transformerRef}
              onTransformEnd={handleTransformEnd}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

export default DrawingCanvas
