// File: /src/features/documents/components/markup/UnifiedDrawingCanvas.tsx
// Unified Konva-based drawing canvas combining best features from both implementations

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Text as KonvaText, Transformer, Image as KonvaImage, Group } from 'react-konva'
import type Konva from 'konva'
import useImage from 'use-image'
import { Button } from '@/components/ui/button'
import { Trash2, Undo, Redo, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentMarkups, useCreateMarkup, useUpdateMarkup, useDeleteMarkup } from '../../hooks/useMarkups'
import type { DocumentMarkup } from '@/lib/api/services/markups'
import { MarkupToolbar } from './MarkupToolbar'
import { EnhancedMarkupToolbar } from './EnhancedMarkupToolbar'
import { MarkupFilterPanel, type MarkupFilter, type MarkupType } from '../MarkupFilterPanel'
import { LinkMarkupDialog, type LinkableItemType } from '../LinkMarkupDialog'
import type { AnnotationType } from '@/types/markup'
import { useAuth } from '@/lib/auth/AuthContext'
import { useEnhancedMarkupState } from '../../hooks/useEnhancedMarkupState'
import toast from 'react-hot-toast'

type Tool = AnnotationType | 'select' | 'pan' | 'eraser'

interface UnifiedDrawingCanvasProps {
  documentId: string
  projectId: string
  pageNumber?: number | null
  backgroundImageUrl?: string
  width?: number
  height?: number
  readOnly?: boolean
  onSave?: () => void
  // Enhanced markup props
  selectedLayerId?: string | null
  visibleLayerIds?: string[]
  selectedColor?: string
  selectedLineWidth?: number
  markupState?: ReturnType<typeof useEnhancedMarkupState>
}

interface Shape {
  id: string
  type: AnnotationType
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
  createdBy?: string  // User ID who created this markup
  relatedToId?: string | null  // ID of linked item (RFI, Task, Punch Item)
  relatedToType?: string | null  // Type of linked item
  layerId?: string | null  // Layer this markup belongs to
  visible?: boolean  // Controlled by layer visibility
}

/**
 * UnifiedDrawingCanvas Component
 *
 * A comprehensive Konva-based canvas for drawing annotations on documents.
 * Combines features from both DrawingCanvas and DrawingMarkupCanvas:
 * - Undo/Redo history
 * - Auto-save to database
 * - Pan/Zoom functionality
 * - Background image support
 * - All annotation tools (arrow, rectangle, circle, text, freehand)
 * - Shape selection and transformation
 */
export function UnifiedDrawingCanvas({
  documentId,
  projectId,
  pageNumber = null,
  backgroundImageUrl,
  width = 800,
  height = 600,
  readOnly = false,
  onSave,
  selectedLayerId = null,
  visibleLayerIds,
  selectedColor: propColor,
  selectedLineWidth: propLineWidth,
  markupState,
}: UnifiedDrawingCanvasProps) {
  // Tool state
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(propColor || '#FF0000')
  const [strokeWidth, setStrokeWidth] = useState(propLineWidth || 3)

  // Sync color/lineWidth from props when they change
  useEffect(() => {
    if (propColor) setColor(propColor)
  }, [propColor])

  useEffect(() => {
    if (propLineWidth) setStrokeWidth(propLineWidth)
  }, [propLineWidth])

  // Filter state for layer visibility
  const [filter, setFilter] = useState<MarkupFilter>({
    showMyMarkupsOnly: false,
    creatorIds: [],
    types: ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'],
    dateRange: { start: null, end: null },
    hiddenLayers: [],
  })

  // Drawing state
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)

  // History for undo/redo
  const [history, setHistory] = useState<Shape[][]>([])
  const [historyStep, setHistoryStep] = useState(0)

  // Pan/Zoom state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPointerPosition = useRef({ x: 0, y: 0 })

  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null)

  // Load background image if provided
  const [backgroundImage] = useImage(backgroundImageUrl || '', 'anonymous')

  // React Query hooks
  const { data: existingMarkups, isLoading } = useDocumentMarkups(documentId, pageNumber)
  const createMarkup = useCreateMarkup()
  const updateMarkup = useUpdateMarkup()
  const deleteMarkup = useDeleteMarkup()

  // Auth hook
  const { user } = useAuth()

  // Link dialog state
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)

  // Extract unique creators from existing markups for layer visibility
  const creators = useMemo(() => {
    if (!existingMarkups) {return []}
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
      if (shape.type in counts) {counts[shape.type as MarkupType]++}
    })
    return counts
  }, [shapes])

  // Filter shapes based on active filters and layer visibility
  const filteredShapes = useMemo(() => {
    return shapes.filter(shape => {
      // Filter by type
      if (!filter.types.includes(shape.type as MarkupType)) {return false}
      // Filter by hidden layers (by creator)
      if (shape.createdBy && filter.hiddenLayers.includes(shape.createdBy)) {return false}

      // Filter by layer visibility (use markupState if available, otherwise fall back to props)
      if (markupState) {
        // Get visible layer IDs from markupState
        const visibleLayers = markupState.layers.filter((l: any) => l.visible).map((l: any) => l.id)
        if (shape.layerId && !visibleLayers.includes(shape.layerId)) {return false}
      } else if (visibleLayerIds && shape.layerId && !visibleLayerIds.includes(shape.layerId)) {
        // Fallback to prop-based filtering
        return false
      }

      return true
    })
  }, [shapes, filter, visibleLayerIds, markupState])

  // Load existing markups from database
  useEffect(() => {
    if (existingMarkups && existingMarkups.length > 0) {
      const loadedShapes: Shape[] = existingMarkups.map(markup => ({
        id: markup.id,
        type: markup.markup_type as Shape['type'],
        ...markup.markup_data,
        stroke: markup.markup_data.stroke || color,
        strokeWidth: markup.markup_data.strokeWidth || strokeWidth,
        createdBy: markup.created_by || undefined,
        relatedToId: markup.related_to_id || undefined,
        relatedToType: markup.related_to_type || undefined,
        layerId: markup.layer_id || undefined,
        visible: markup.visible ?? true,
      }))
      setShapes(loadedShapes)
      setHistory([loadedShapes])
      setHistoryStep(0)
    }
  }, [existingMarkups])

  // Auto-create default layer when first markup is created (if using markupState)
  useEffect(() => {
    if (markupState && shapes.length > 0 && markupState.layers.length === 0 && !markupState.layersLoading && documentId) {
      // Create default layer
      markupState.onCreateLayer({
        documentId,
        name: 'Default Layer',
        color: '#FF0000',
        visible: true,
        locked: false,
        order: 0,
        isDefault: true,
        createdBy: markupState.currentUserId,
        description: 'Automatically created default layer',
      })
    }
  }, [shapes.length, markupState, documentId])

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) {return}

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      }
      // Delete key: Delete selected shape
      else if (e.key === 'Delete' && selectedShapeId) {
        e.preventDefault()
        handleDeleteShape(selectedShapeId)
      }
      // Escape: Deselect
      else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedShapeId(null)
        if (transformerRef.current) {
          transformerRef.current.nodes([])
        }
      }
      // Number keys 1-6: Switch tools
      else if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const tools: Tool[] = ['select', 'arrow', 'rectangle', 'circle', 'text', 'freehand']
        setTool(tools[parseInt(e.key) - 1])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, selectedShapeId, historyStep, history])

  // Convert stage coordinates to canvas coordinates (accounting for pan/zoom)
  const getCanvasPoint = (stagePoint: { x: number; y: number }) => {
    return {
      x: (stagePoint.x - position.x) / scale,
      y: (stagePoint.y - position.y) / scale,
    }
  }

  // Debounced save for transform operations (drag, resize)
  const debouncedUpdateShape = useCallback((shapeId: string, updates: Partial<Shape>) => {
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

  // ============================================================
  // MEASUREMENT & STAMP HANDLERS
  // ============================================================

  // Handle stamp placement
  const handleStampPlacement = useCallback((pos: { x: number; y: number }) => {
    if (!markupState?.selectedStamp) return

    const stampType = markupState.selectedStamp
    let stampText = ''

    if (stampType === 'CUSTOM') {
      stampText = markupState.customStampText || 'CUSTOM'
    } else {
      stampText = stampType.replace(/_/g, ' ')
    }

    // Get stamp color based on type
    const getStampColor = (type: string) => {
      switch (type) {
        case 'APPROVED': return '#10B981'
        case 'REJECTED': return '#EF4444'
        case 'REVIEWED': return '#3B82F6'
        case 'FOR_REVIEW': return '#F59E0B'
        case 'REVISED': return '#8B5CF6'
        default: return '#6B7280'
      }
    }

    const stampColor = getStampColor(stampType)

    const stampShape: Shape = {
      id: `stamp-${Date.now()}`,
      type: 'text' as AnnotationType, // Use text type for stamps
      x: pos.x - 50,
      y: pos.y - 20,
      width: 100,
      height: 40,
      text: stampText,
      stroke: stampColor,
      fill: `${stampColor}22`,
      strokeWidth: 2,
      layerId: markupState.selectedLayerId || undefined,
    }

    setShapes(prev => [...prev, stampShape])
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push([...shapes, stampShape])
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    // Save stamp to database (will be called after definition)
    setTimeout(() => saveShapeToDatabase(stampShape), 0)

    // Auto-deselect stamp after placing
    markupState.onStampSelect(null)
    markupState.setSelectedTool('select')
  }, [markupState, shapes, history, historyStep])

  // Handle calibration start
  const handleCalibrationStart = useCallback((pos: { x: number; y: number }) => {
    // This would start drawing a calibration line
    // For now, we'll create a simple line that users can adjust
    toast('Click and drag to draw calibration line', { icon: 'ℹ️' })
  }, [])

  // Handle measurement start
  const handleMeasurementStart = useCallback((type: 'distance' | 'area', pos: { x: number; y: number }) => {
    if (!markupState?.scale) {
      toast.error('Please calibrate the scale first using the calibration tool')
      return
    }

    toast(`${type === 'distance' ? 'Distance' : 'Area'} measurement started. Click to add points.`, { icon: 'ℹ️' })
    // Additional measurement logic would go here
  }, [markupState])

  // Handle mouse down - start drawing or panning
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly) {return}

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    // Pan mode
    if (tool === 'pan') {
      isPanning.current = true
      lastPointerPosition.current = pos
      return
    }

    // Select mode - click on shape or background
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) {
        setSelectedShapeId(null)
        if (transformerRef.current) {
          transformerRef.current.nodes([])
        }
      }
      return
    }

    // Eraser mode - handled in handleShapeClick
    if (tool === 'eraser') {return}

    const canvasPoint = getCanvasPoint(pos)

    // Stamp mode - place stamp at click location
    if (markupState?.selectedStamp && (tool as any) === 'stamp') {
      handleStampPlacement(canvasPoint)
      return
    }

    // Calibration mode - start drawing calibration line
    if ((tool as any) === 'calibrate' && markupState?.isCalibrating) {
      handleCalibrationStart(canvasPoint)
      return
    }

    // Measurement modes
    if ((tool as any) === 'measure-distance') {
      handleMeasurementStart('distance', canvasPoint)
      return
    }

    if ((tool as any) === 'measure-area') {
      handleMeasurementStart('area', canvasPoint)
      return
    }

    // Drawing mode
    setIsDrawing(true)

    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type: tool as AnnotationType,
      x: canvasPoint.x,
      y: canvasPoint.y,
      stroke: color,
      strokeWidth: strokeWidth,
      layerId: selectedLayerId || undefined,
    }

    if (tool === 'freehand') {
      newShape.points = [0, 0]
    } else if (tool === 'arrow') {
      newShape.points = [0, 0, 0, 0]
      newShape.pointerLength = 20
      newShape.pointerWidth = 20
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
    }

    setCurrentShape(newShape)
  }

  // Handle mouse move - update current shape or pan
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly) {return}

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    // Pan mode
    if (tool === 'pan' && isPanning.current) {
      const dx = pos.x - lastPointerPosition.current.x
      const dy = pos.y - lastPointerPosition.current.y
      setPosition({
        x: position.x + dx,
        y: position.y + dy,
      })
      lastPointerPosition.current = pos
      return
    }

    // Drawing mode
    if (!isDrawing || !currentShape) {return}

    const canvasPoint = getCanvasPoint(pos)
    const updatedShape = { ...currentShape }

    if (tool === 'freehand' && updatedShape.points) {
      const newPoints = updatedShape.points.concat([
        canvasPoint.x - updatedShape.x,
        canvasPoint.y - updatedShape.y,
      ])
      updatedShape.points = newPoints
    } else if (tool === 'arrow' && updatedShape.points) {
      updatedShape.points = [
        0,
        0,
        canvasPoint.x - updatedShape.x,
        canvasPoint.y - updatedShape.y,
      ]
    } else if (tool === 'rectangle') {
      updatedShape.width = canvasPoint.x - updatedShape.x
      updatedShape.height = canvasPoint.y - updatedShape.y
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(canvasPoint.x - updatedShape.x, 2) + Math.pow(canvasPoint.y - updatedShape.y, 2)
      )
      updatedShape.radius = radius
    }

    setCurrentShape(updatedShape)
  }

  // Handle mouse up - finish drawing or panning
  const handleMouseUp = () => {
    if (readOnly) {return}

    // End panning
    if (tool === 'pan') {
      isPanning.current = false
      return
    }

    // End drawing
    if (!isDrawing || !currentShape) {return}

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

  // Handle mouse wheel - zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (readOnly) {return}

    e.evt.preventDefault()

    const scaleBy = 1.1
    const stage = e.target.getStage()
    if (!stage) {return}

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) {return}

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

    // Clamp scale between 0.1 and 5
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    setScale(clampedScale)
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  // Save a shape to the database
  const saveShapeToDatabase = async (shape: Shape) => {
    try {
      const markupData: DocumentMarkup['markup_data'] = {
        x: shape.x,
        y: shape.y,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
      }

      if (shape.width !== undefined) {markupData.width = shape.width}
      if (shape.height !== undefined) {markupData.height = shape.height}
      if (shape.radius !== undefined) {markupData.radius = shape.radius}
      if (shape.points) {markupData.points = shape.points}
      if (shape.text) {markupData.text = shape.text}
      if (shape.fill) {markupData.fill = shape.fill}
      if (shape.rotation) {markupData.rotation = shape.rotation}
      if (shape.scaleX) {markupData.scaleX = shape.scaleX}
      if (shape.scaleY) {markupData.scaleY = shape.scaleY}
      if (shape.pointerLength) {markupData.pointerLength = shape.pointerLength}
      if (shape.pointerWidth) {markupData.pointerWidth = shape.pointerWidth}

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
        layer_id: shape.layerId || markupState?.selectedLayerId || null,
        color: shape.stroke || markupState?.selectedColor || color,
        visible: true,
        author_name: null,
        permission_level: null,
        shared_with_users: null,
      })

      onSave?.()
    } catch (error) {
      console.error('Failed to save markup:', error)
      toast.error('Failed to save annotation')
    }
  }

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
    if (historyStep === 0) {return}
    setHistoryStep(historyStep - 1)
    setShapes(history[historyStep - 1])
  }

  // Handle redo
  const handleRedo = () => {
    if (historyStep === history.length - 1) {return}
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

  // Handle link markup to RFI/Task/Punch
  const handleLinkMarkup = async (itemId: string, itemType: LinkableItemType) => {
    if (!selectedShapeId) {return}

    // Update the shape with link info
    const updatedShapes = shapes.map(shape => {
      if (shape.id === selectedShapeId) {
        return {
          ...shape,
          relatedToId: itemId,
          relatedToType: itemType,
        }
      }
      return shape
    })
    setShapes(updatedShapes)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(updatedShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    // Update in database
    const markup = existingMarkups?.find(m => m.id === selectedShapeId)
    if (markup) {
      try {
        await updateMarkup.mutateAsync({
          id: markup.id,
          related_to_id: itemId,
          related_to_type: itemType,
        })
      } catch (error) {
        console.error('Failed to link markup:', error)
        throw error // Re-throw so dialog can show error
      }
    }
  }

  // Handle unlink markup
  const handleUnlinkMarkup = async () => {
    if (!selectedShapeId) {return}

    // Update the shape to remove link
    const updatedShapes = shapes.map(shape => {
      if (shape.id === selectedShapeId) {
        return {
          ...shape,
          relatedToId: null,
          relatedToType: null,
        }
      }
      return shape
    })
    setShapes(updatedShapes)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(updatedShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    // Update in database
    const markup = existingMarkups?.find(m => m.id === selectedShapeId)
    if (markup) {
      try {
        await updateMarkup.mutateAsync({
          id: markup.id,
          related_to_id: null,
          related_to_type: null,
        })
      } catch (error) {
        console.error('Failed to unlink markup:', error)
        throw error // Re-throw so dialog can show error
      }
    }
  }

  // Zoom controls
  const handleZoomIn = () => {
    const newScale = Math.min(5, scale * 1.2)
    setScale(newScale)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, scale / 1.2)
    setScale(newScale)
  }

  const handleResetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50">
        <p className="text-gray-500">Loading annotations...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <>
          {markupState ? (
            <EnhancedMarkupToolbar
              // Tool state
              selectedTool={markupState.selectedTool}
              onToolChange={markupState.setSelectedTool}

              // Color state
              selectedColor={markupState.selectedColor}
              onColorChange={markupState.onColorChange}
              recentColors={markupState.recentColors}
              onRecentColorsChange={() => {}} // Handled internally by markupState

              // Line width
              lineWidth={markupState.lineWidth}
              onLineWidthChange={markupState.setLineWidth}

              // Layer state
              layers={markupState.layers}
              selectedLayerId={markupState.selectedLayerId}
              onSelectLayer={markupState.onSelectLayer}
              onCreateLayer={markupState.onCreateLayer}
              onUpdateLayer={markupState.onUpdateLayer}
              onDeleteLayer={markupState.onDeleteLayer}
              onReorderLayer={markupState.onReorderLayer}
              onToggleLayerVisibility={markupState.onToggleLayerVisibility}
              onToggleLayerLock={markupState.onToggleLayerLock}

              // Measurement state
              activeMeasurementType={markupState.activeMeasurementType}
              onMeasurementTypeChange={markupState.onMeasurementTypeChange}
              currentMeasurementUnit={markupState.currentMeasurementUnit}
              onMeasurementUnitChange={markupState.onMeasurementUnitChange}
              scale={markupState.scale}
              onCalibrateScale={markupState.onCalibrateScale}
              measurements={markupState.measurements}
              onDeleteMeasurement={markupState.onDeleteMeasurement}
              onClearAllMeasurements={markupState.onClearAllMeasurements}
              isCalibrating={markupState.isCalibrating}
              onStartCalibration={markupState.onStartCalibration}
              onCancelCalibration={markupState.onCancelCalibration}
              calibrationPixelDistance={markupState.calibrationPixelDistance}

              // Stamp state
              selectedStamp={markupState.selectedStamp}
              onStampSelect={markupState.onStampSelect}
              customStampText={markupState.customStampText}
              onCustomStampTextChange={markupState.onCustomStampTextChange}

              // History state
              markups={markupState.markups}
              authors={markupState.authors}
              currentUserId={markupState.currentUserId}
              onSelectMarkup={markupState.onSelectMarkup}
              onDeleteMarkup={markupState.onDeleteMarkup}
              onEditMarkup={markupState.onEditMarkup}
              onViewMarkup={markupState.onViewMarkup}
              selectedMarkupId={markupState.selectedMarkupId}

              // Zoom controls
              onZoomIn={markupState.onZoomIn}
              onZoomOut={markupState.onZoomOut}
              onResetView={markupState.onResetView}
              currentZoom={markupState.zoom}

              // Sharing (optional)
              onOpenShareDialog={() => {/* TODO: implement sharing */}}
              canShare={false}

              disabled={false}
            />
          ) : (
            <MarkupToolbar
              selectedTool={tool}
              selectedColor={color}
              lineWidth={strokeWidth}
              onToolChange={setTool}
              onColorChange={setColor}
              onLineWidthChange={setStrokeWidth}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              disabled={false}
            />
          )}
        </>
      )}

      {/* Action Buttons (Undo/Redo/Clear) */}
      {!readOnly && (
        <div className="absolute top-16 right-4 z-10 bg-white rounded-lg shadow-lg p-2 flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={historyStep === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={historyStep === history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsLinkDialogOpen(true)}
            disabled={!selectedShapeId}
            title="Link to RFI/Task/Punch"
          >
            <Link2 className="w-4 h-4" />
          </Button>

          {/* Filter panel for layer visibility */}
          <div className="border-t pt-2 mt-2">
            <MarkupFilterPanel
              filter={filter}
              onFilterChange={setFilter}
              creators={creators}
              markupCounts={markupCounts}
            />
          </div>
        </div>
      )}

      {/* Konva Stage */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown as any}
          onTouchMove={handleMouseMove as any}
          onTouchEnd={handleMouseUp as any}
          onWheel={handleWheel}
          className={cn(
            'cursor-crosshair',
            tool === 'pan' && 'cursor-move',
            tool === 'select' && 'cursor-default'
          )}
        >
          <Layer>
            {/* Background image */}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                width={backgroundImage.width}
                height={backgroundImage.height}
              />
            )}
          </Layer>

          <Layer ref={layerRef}>
            {/* Render existing shapes */}
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
                    pointerLength={shape.pointerLength || 20}
                    pointerWidth={shape.pointerWidth || 20}
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
                // Check if this is a stamp (has width and height properties)
                const isStamp = shape.width && shape.height

                if (isStamp) {
                  // Render as stamp with border and background
                  const stampWidth = shape.width || 100
                  const stampHeight = shape.height || 40

                  return (
                    <Group
                      key={shape.id}
                      draggable={tool === 'select'}
                      onClick={() => handleShapeClick(shape.id)}
                      onTap={() => handleShapeClick(shape.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Outer border with dashed line */}
                      <Rect
                        x={shape.x}
                        y={shape.y}
                        width={stampWidth}
                        height={stampHeight}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth || 2}
                        fill={shape.fill}
                        cornerRadius={4}
                        dash={[5, 5]}
                      />
                      {/* Inner border */}
                      <Rect
                        x={shape.x + 4}
                        y={shape.y + 4}
                        width={stampWidth - 8}
                        height={stampHeight - 8}
                        stroke={shape.stroke}
                        strokeWidth={1}
                        cornerRadius={2}
                      />
                      {/* Stamp text */}
                      <KonvaText
                        x={shape.x}
                        y={shape.y + (stampHeight - 16) / 2}
                        width={stampWidth}
                        text={shape.text || ''}
                        fontSize={14}
                        fontStyle="bold"
                        fill={shape.stroke}
                        align="center"
                      />
                    </Group>
                  )
                } else {
                  // Regular text
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
                }
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
                    pointerLength={currentShape.pointerLength || 20}
                    pointerWidth={currentShape.pointerWidth || 20}
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

      {/* Status Bar */}
      <div className="p-2 bg-white border-t flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <span>Tool: {tool}</span>
          {pageNumber && <span>Page: {pageNumber}</span>}
        </div>
        <div>
          {shapes.length} annotation(s)
        </div>
      </div>

      {/* Link Markup Dialog */}
      {selectedShapeId && (
        <LinkMarkupDialog
          open={isLinkDialogOpen}
          onOpenChange={setIsLinkDialogOpen}
          projectId={projectId}
          currentLink={{
            id: shapes.find(s => s.id === selectedShapeId)?.relatedToId || null,
            type: shapes.find(s => s.id === selectedShapeId)?.relatedToType || null,
          }}
          onLink={handleLinkMarkup}
          onUnlink={handleUnlinkMarkup}
        />
      )}
    </div>
  )
}

export default UnifiedDrawingCanvas
