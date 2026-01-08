// File: /src/features/documents/components/markup/UnifiedDrawingCanvas.tsx
// Unified Konva-based drawing canvas combining best features from both implementations

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Text as KonvaText, Transformer, Image as KonvaImage, Group } from 'react-konva'
import type Konva from 'konva'
import useImage from 'use-image'
import { Button } from '@/components/ui/button'
import { Trash2, Undo, Redo, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { useDocumentMarkups, useCreateMarkup, useUpdateMarkup, useDeleteMarkup } from '../../hooks/useMarkups'
import type { DocumentMarkup } from '@/lib/api/services/markups'
import { MarkupToolbar } from './MarkupToolbar'
import { EnhancedMarkupToolbar } from './EnhancedMarkupToolbar'
import { MarkupSharingDialog } from './MarkupSharingDialog'
import { MarkupFilterPanel, type MarkupFilter, type MarkupType } from '../MarkupFilterPanel'
import { LinkMarkupDialog, type LinkableItemType } from '../LinkMarkupDialog'
import type { AnnotationType } from '@/types/markup'
import { useAuth } from '@/lib/auth/AuthContext'
import { useEnhancedMarkupState } from '../../hooks/useEnhancedMarkupState'
import { toast } from 'sonner'
import { useLiveCursors } from '@/hooks/useLiveCursors'
import { RelativeCursorsContainer, OnlineUsersIndicator } from '@/components/realtime/LiveCursor'
import { logger } from '../../../../lib/utils/logger';
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers'
import { useMarkupCollaboration, useDebouncedTransformBroadcast } from '../../hooks/useMarkupCollaboration'
import { CollaboratorIndicator } from './CollaboratorIndicator'
import { RemoteMarkupHighlights } from './RemoteMarkupHighlight'
import type { MarkupOperation, MarkupData, TransformData } from '@/lib/realtime/markup-sync-types'


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
  // Real-time collaboration props
  collaborative?: boolean
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
  collaborative = false,
}: UnifiedDrawingCanvasProps) {
  'use no memo'
  // Tool state
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(propColor || '#FF0000')
  const [strokeWidth, setStrokeWidth] = useState(propLineWidth || 3)

  // Sync color/lineWidth from props when they change
  useEffect(() => {
    if (propColor) {
      setTimeout(() => setColor(propColor), 0)
    }
  }, [propColor])

  useEffect(() => {
    if (propLineWidth) {
      setTimeout(() => setStrokeWidth(propLineWidth), 0)
    }
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

  // Fetch project users for sharing dialog
  const { data: projectUsers = [] } = useProjectUsers(projectId)
  const shareableUsers = useMemo(() =>
    projectUsers.map(pu => ({
      id: pu.user_id,
      name: pu.user ? `${pu.user.first_name || ''} ${pu.user.last_name || ''}`.trim() || pu.user.email : 'Unknown',
      role: pu.project_role || undefined,
    })).filter(u => u.id !== user?.id), // Exclude current user
    [projectUsers, user?.id]
  )

  // Live cursors for real-time collaboration
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const { cursors, setContainer: _setContainer, isConnected: _isConnected, broadcastCursorPosition } = useLiveCursors(
    `canvas-${documentId}-${pageNumber || 0}`
  )

  // Markup collaboration for real-time sync
  const handleRemoteCreate = useCallback((operation: MarkupOperation) => {
    if (!operation.data) {return}
    const data = operation.data as MarkupData
    const newShape: Shape = {
      id: data.id || operation.markupId,
      type: data.type as AnnotationType,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      points: data.points,
      text: data.text,
      fill: data.fill,
      stroke: data.color || '#FF0000',
      strokeWidth: data.strokeWidth || 3,
      rotation: data.rotation,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      layerId: data.layerId,
      visible: data.visible,
    }
    setShapes(prev => [...prev, newShape])
  }, [])

  const handleRemoteUpdate = useCallback((operation: MarkupOperation) => {
    if (!operation.data) {return}
    const data = operation.data as Partial<MarkupData>
    setShapes(prev => prev.map(shape =>
      shape.id === operation.markupId
        ? { ...shape, ...data }
        : shape
    ))
  }, [])

  const handleRemoteTransform = useCallback((operation: MarkupOperation) => {
    if (!operation.data) {return}
    const transform = operation.data as TransformData
    setShapes(prev => prev.map(shape =>
      shape.id === operation.markupId
        ? {
            ...shape,
            x: transform.x ?? shape.x,
            y: transform.y ?? shape.y,
            width: transform.width ?? shape.width,
            height: transform.height ?? shape.height,
            scaleX: transform.scaleX ?? shape.scaleX,
            scaleY: transform.scaleY ?? shape.scaleY,
            rotation: transform.rotation ?? shape.rotation,
            points: transform.points ?? shape.points,
          }
        : shape
    ))
  }, [])

  const handleRemoteDelete = useCallback((operation: MarkupOperation) => {
    setShapes(prev => prev.filter(shape => shape.id !== operation.markupId))
  }, [])

  const {
    isConnected: isCollaborationConnected,
    isCollaborating,
    collaborators,
    collaboratorCount,
    remoteEditHighlights,
    broadcastCreate,
    broadcastUpdate: _broadcastUpdate,
    broadcastTransform,
    broadcastDelete,
    broadcastActionStart,
    broadcastActionEnd,
  } = useMarkupCollaboration({
    documentId,
    pageNumber: pageNumber || 1,
    enabled: collaborative,
    onRemoteCreate: handleRemoteCreate,
    onRemoteUpdate: handleRemoteUpdate,
    onRemoteTransform: handleRemoteTransform,
    onRemoteDelete: handleRemoteDelete,
  })

  // Debounced transform broadcasting for smooth updates
  const { debouncedBroadcast: _debouncedTransformBroadcast, flush: flushTransformBroadcast } = useDebouncedTransformBroadcast(broadcastTransform)

  // Link dialog state
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)

  // Clear all dialog state
  const [showClearDialog, setShowClearDialog] = useState(false)

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

  // Check if current user can share the selected markup (must own it)
  const canShareSelectedMarkup = useMemo(() => {
    if (!selectedShapeId || !existingMarkups || !user?.id) {return false}
    const selectedMarkup = existingMarkups.find(m => m.id === selectedShapeId)
    // User can share if they own the markup
    return selectedMarkup?.created_by === user.id
  }, [selectedShapeId, existingMarkups, user?.id])

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
      setTimeout(() => {
        setShapes(loadedShapes)
        setHistory([loadedShapes])
        setHistoryStep(0)
      }, 0)
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

  // Handle delete shape - moved before keyboard shortcuts that use it
  const handleDeleteShape = async (shapeId: string) => {
    const newShapes = shapes.filter(s => s.id !== shapeId)
    setShapes(newShapes)
    setSelectedShapeId(null)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    // Broadcast delete to collaborators
    if (collaborative) {
      broadcastDelete(shapeId)
    }

    // Delete from database if it's a persisted markup
    const markup = existingMarkups?.find(m => m.id === shapeId)
    if (markup) {
      try {
        await deleteMarkup.mutateAsync(markup.id)
      } catch (error) {
        logger.error('Failed to delete markup:', error)
        toast.error('Failed to delete annotation')
      }
    }
  }

  // Handle undo - moved before keyboard shortcuts
  const handleUndo = () => {
    if (historyStep === 0) {return}
    setHistoryStep(historyStep - 1)
    setShapes(history[historyStep - 1])
  }

  // Handle redo - moved before keyboard shortcuts
  const handleRedo = () => {
    if (historyStep === history.length - 1) {return}
    setHistoryStep(historyStep + 1)
    setShapes(history[historyStep + 1])
  }

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
          logger.error('Failed to update markup:', error)
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

    // Broadcast transform to collaborators (final position)
    if (collaborative) {
      flushTransformBroadcast() // Flush any pending debounced updates
      broadcastTransform(id, {
        x: node.x(),
        y: node.y(),
      })
      broadcastActionEnd()
    }

    // Debounced save to database
    debouncedUpdateShape(id, {
      x: node.x(),
      y: node.y(),
    })
  }, [debouncedUpdateShape, collaborative, broadcastTransform, flushTransformBroadcast, broadcastActionEnd])

  // Handle transform end - save scale, rotation changes
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const id = node.id()

    // Get transform values
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation()

    // Find the shape to get its current dimensions
    const shape = shapes.find(s => s.id === id)

    // Update local state
    setShapes(prevShapes =>
      prevShapes.map(s =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              scaleX,
              scaleY,
              rotation,
              // For rectangles and circles, also update width/height/radius
              ...(s.type === 'rectangle' && s.width
                ? { width: Math.max(5, s.width * scaleX) }
                : {}),
              ...(s.type === 'rectangle' && s.height
                ? { height: Math.max(5, s.height * scaleY) }
                : {}),
              ...(s.type === 'circle' && s.radius
                ? { radius: Math.max(5, s.radius * scaleX) }
                : {}),
            }
          : s
      )
    )

    // Reset scale to 1 after absorbing it into width/height/radius
    node.scaleX(1)
    node.scaleY(1)

    // Broadcast transform to collaborators (final transform)
    if (collaborative) {
      flushTransformBroadcast() // Flush any pending debounced updates
      broadcastTransform(id, {
        x: node.x(),
        y: node.y(),
        rotation,
        scaleX,
        scaleY,
        // Include computed dimensions for rectangles/circles
        ...(shape?.type === 'rectangle' && shape.width
          ? { width: Math.max(5, shape.width * scaleX) }
          : {}),
        ...(shape?.type === 'rectangle' && shape.height
          ? { height: Math.max(5, shape.height * scaleY) }
          : {}),
        ...(shape?.type === 'circle' && shape.radius
          ? { width: Math.max(5, shape.radius * scaleX) * 2 } // radius * 2 for diameter
          : {}),
      })
      broadcastActionEnd()
    }

    // Debounced save to database
    debouncedUpdateShape(id, {
      x: node.x(),
      y: node.y(),
      rotation,
      scaleX,
      scaleY,
    })
  }, [debouncedUpdateShape, shapes, collaborative, broadcastTransform, flushTransformBroadcast, broadcastActionEnd])

  // ============================================================
  // MEASUREMENT & STAMP HANDLERS
  // ============================================================

  // Save a shape to the database - moved here before handleStampPlacement
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

      // Broadcast create operation to collaborators
      if (collaborative) {
        broadcastCreate({
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          points: shape.points,
          text: shape.text,
          color: shape.stroke,
          strokeWidth: shape.strokeWidth,
          fill: shape.fill,
          rotation: shape.rotation,
          scaleX: shape.scaleX,
          scaleY: shape.scaleY,
          layerId: shape.layerId || undefined,
          visible: shape.visible,
        })
      }

      onSave?.()
    } catch (error) {
      logger.error('Failed to save markup:', error)
      toast.error('Failed to save annotation')
    }
  }

  // Handle stamp placement
  const handleStampPlacement = useCallback((pos: { x: number; y: number }) => {
    if (!markupState?.selectedStamp) {return}

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

    // Save stamp to database
    saveShapeToDatabase(stampShape)

    // Auto-deselect stamp after placing
    markupState.onStampSelect(null)
    markupState.setSelectedTool('select')
  }, [markupState, shapes, history, historyStep, saveShapeToDatabase])

  // Handle calibration start
  const handleCalibrationStart = useCallback((_pos: { x: number; y: number }) => {
    // This would start drawing a calibration line
    // For now, we'll create a simple line that users can adjust
    toast('Click and drag to draw calibration line', { icon: 'ℹ️' })
  }, [])

  // Handle measurement start
  const handleMeasurementStart = useCallback((type: 'distance' | 'area', _pos: { x: number; y: number }) => {
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

    // Broadcast action start to collaborators
    if (collaborative) {
      broadcastActionStart('drawing')
    }

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
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    // Update live cursor position for collaboration (works even in readOnly mode)
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect()
      // Convert canvas position to relative percentage for cursor display
      const relativeX = ((pos.x * scale + position.x) / rect.width) * 100
      const relativeY = ((pos.y * scale + position.y) / rect.height) * 100
      broadcastCursorPosition({ x: relativeX, y: relativeY })
    }

    if (readOnly) {return}

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

    // Broadcast action end to collaborators
    if (collaborative) {
      broadcastActionEnd()
    }

    // Add shape to shapes array
    const newShapes = [...shapes, currentShape]
    setShapes(newShapes)

    // Add to history
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)

    setCurrentShape(null)

    // Auto-save to database (this also broadcasts the create operation)
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

  // Handle shape selection
  const handleShapeClick = (shapeId: string) => {
    if (tool === 'select') {
      setSelectedShapeId(shapeId)
    } else if (tool === 'eraser') {
      handleDeleteShape(shapeId)
    }
  }

  // Handle clear all
  const handleClearAll = async () => {
    setShapes([])
    setHistory([[]])
    setHistoryStep(0)
    setSelectedShapeId(null)
    setShowClearDialog(false)

    // Delete all markups from database
    if (existingMarkups && existingMarkups.length > 0) {
      try {
        await Promise.all(existingMarkups.map(m => deleteMarkup.mutateAsync(m.id)))
        toast.success('All annotations cleared')
      } catch (error) {
        logger.error('Failed to clear markups:', error)
        toast.error('Failed to clear annotations')
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
        logger.error('Failed to link markup:', error)
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
        logger.error('Failed to unlink markup:', error)
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
      <div className="flex items-center justify-center w-full h-full bg-surface">
        <p className="text-muted">Loading annotations...</p>
      </div>
    )
  }

  return (
    <div ref={canvasContainerRef} className="relative w-full h-full flex flex-col">
      {/* Online Users Indicator for Real-time Collaboration */}
      {cursors.length > 0 && (
        <div className="absolute top-2 right-2 z-20">
          <OnlineUsersIndicator cursors={cursors} />
        </div>
      )}

      {/* Markup Collaboration Indicator */}
      {collaborative && isCollaborating && collaboratorCount > 0 && (
        <div className="absolute top-2 right-32 z-20">
          <CollaboratorIndicator
            collaborators={collaborators}
            compact={true}
          />
        </div>
      )}

      {/* Live Cursors Overlay */}
      <RelativeCursorsContainer cursors={cursors} />

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

              // Sharing
              onOpenShareDialog={() => {
                if (selectedShapeId && markupState) {
                  markupState.onOpenShareDialog(selectedShapeId)
                }
              }}
              canShare={canShareSelectedMarkup && !!markupState}

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
        <div className="absolute top-16 right-4 z-10 bg-card rounded-lg shadow-lg p-2 flex gap-1">
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
            onClick={() => setShowClearDialog(true)}
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
      <div className="flex-1 overflow-hidden bg-muted">
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

            {/* Remote edit highlights for collaboration */}
            {collaborative && remoteEditHighlights.length > 0 && (
              <RemoteMarkupHighlights
                highlights={remoteEditHighlights}
                shapes={shapes}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Status Bar */}
      <div className="p-2 bg-card border-t flex items-center justify-between text-sm text-secondary">
        <div className="flex items-center gap-4">
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <span>Tool: {tool}</span>
          {pageNumber && <span>Page: {pageNumber}</span>}
          {collaborative && (
            <span className={isCollaborationConnected ? 'text-green-600' : 'text-yellow-600'}>
              {isCollaborationConnected ? '● Synced' : '○ Connecting...'}
              {collaboratorCount > 0 && ` (${collaboratorCount} collaborator${collaboratorCount > 1 ? 's' : ''})`}
            </span>
          )}
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

      {/* Markup Sharing Dialog */}
      {markupState?.isShareDialogOpen && markupState.shareMarkupId && markupState.shareSettings && (
        <MarkupSharingDialog
          open={markupState.isShareDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              markupState.onCloseShareDialog()
            }
          }}
          markupId={markupState.shareMarkupId}
          currentSettings={markupState.shareSettings}
          onSave={markupState.onSaveShareSettings}
          availableUsers={shareableUsers}
        />
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Annotations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all annotations? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default UnifiedDrawingCanvas
