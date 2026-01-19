// File: /src/features/visual-search/components/LassoSelectTool.tsx
// Lasso/rectangle selection tool for capturing patterns from drawing sheets

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import {
  Square,
  Lasso,
  RotateCcw,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

export type SelectionMode = 'rectangle' | 'lasso'

export interface SelectionRegion {
  x: number // percentage 0-100
  y: number // percentage 0-100
  width: number // percentage 0-100
  height: number // percentage 0-100
  points?: { x: number; y: number }[] // For lasso (percentage coordinates)
}

interface LassoSelectToolProps {
  imageUrl: string
  onSelectionComplete: (region: SelectionRegion, imageBase64: string) => void
  onCancel?: () => void
  initialMode?: SelectionMode
  minSelectionSize?: number // Minimum selection size as percentage
  className?: string
}

/**
 * LassoSelectTool Component
 *
 * Allows users to select a region of a drawing sheet for visual pattern search.
 * Supports both rectangular selection and freeform lasso selection.
 *
 * Features:
 * - Rectangle and lasso selection modes
 * - Zoom and pan controls
 * - Real-time selection preview
 * - Captures selection as base64 image
 */
export function LassoSelectTool({
  imageUrl,
  onSelectionComplete,
  onCancel,
  initialMode = 'rectangle',
  minSelectionSize = 2,
  className,
}: LassoSelectToolProps) {
  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Image state
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Selection state
  const [mode, setMode] = useState<SelectionMode>(initialMode)
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([])
  const [selectionRect, setSelectionRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Tool state
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null)

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })

      // Fit image to canvas
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight - 60 // Account for toolbar
        setCanvasSize({ width: containerWidth, height: containerHeight })

        // Calculate initial scale to fit image
        const scaleX = containerWidth / img.naturalWidth
        const scaleY = containerHeight / img.naturalHeight
        const initialScale = Math.min(scaleX, scaleY, 1) * 0.9
        setScale(initialScale)

        // Center the image
        const offsetX = (containerWidth - img.naturalWidth * initialScale) / 2
        const offsetY = (containerHeight - img.naturalHeight * initialScale) / 2
        setPosition({ x: offsetX, y: offsetY })
      }
    }
    img.src = imageUrl
  }, [imageUrl])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight - 60
        setCanvasSize({ width: containerWidth, height: containerHeight })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get pointer position relative to image (in percentage)
  const getImagePosition = useCallback(
    (stagePos: { x: number; y: number }) => {
      if (!imageSize.width || !imageSize.height) {return null}

      // Convert from stage coordinates to image coordinates
      const imageX = (stagePos.x - position.x) / scale
      const imageY = (stagePos.y - position.y) / scale

      // Convert to percentage
      const percentX = (imageX / imageSize.width) * 100
      const percentY = (imageY / imageSize.height) * 100

      return { x: percentX, y: percentY }
    },
    [position, scale, imageSize]
  )

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) {return}

      const pos = stage.getPointerPosition()
      if (!pos) {return}

      // Check for middle mouse button or ctrl+click for panning
      if (e.evt.button === 1 || e.evt.ctrlKey) {
        setIsPanning(true)
        setLastPanPosition(pos)
        return
      }

      const imagePos = getImagePosition(pos)
      if (!imagePos) {return}

      // Check if click is within image bounds
      if (imagePos.x < 0 || imagePos.x > 100 || imagePos.y < 0 || imagePos.y > 100) {
        return
      }

      setIsSelecting(true)
      setStartPoint(imagePos)
      setCurrentPoint(imagePos)

      if (mode === 'lasso') {
        setLassoPoints([imagePos])
      } else {
        setSelectionRect({
          x: imagePos.x,
          y: imagePos.y,
          width: 0,
          height: 0,
        })
      }
    },
    [mode, getImagePosition]
  )

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) {return}

      const pos = stage.getPointerPosition()
      if (!pos) {return}

      // Handle panning
      if (isPanning && lastPanPosition) {
        const dx = pos.x - lastPanPosition.x
        const dy = pos.y - lastPanPosition.y
        setPosition((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }))
        setLastPanPosition(pos)
        return
      }

      if (!isSelecting || !startPoint) {return}

      const imagePos = getImagePosition(pos)
      if (!imagePos) {return}

      // Clamp to image bounds
      const clampedPos = {
        x: Math.max(0, Math.min(100, imagePos.x)),
        y: Math.max(0, Math.min(100, imagePos.y)),
      }

      setCurrentPoint(clampedPos)

      if (mode === 'lasso') {
        // Add point to lasso path
        setLassoPoints((prev) => [...prev, clampedPos])
      } else {
        // Update rectangle
        const minX = Math.min(startPoint.x, clampedPos.x)
        const minY = Math.min(startPoint.y, clampedPos.y)
        const maxX = Math.max(startPoint.x, clampedPos.x)
        const maxY = Math.max(startPoint.y, clampedPos.y)

        setSelectionRect({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        })
      }
    },
    [isPanning, lastPanPosition, isSelecting, startPoint, mode, getImagePosition]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      setLastPanPosition(null)
      return
    }

    if (!isSelecting) {return}

    setIsSelecting(false)

    if (mode === 'lasso' && lassoPoints.length > 2) {
      // Calculate bounding box of lasso selection
      const xs = lassoPoints.map((p) => p.x)
      const ys = lassoPoints.map((p) => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)

      setSelectionRect({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      })
    }
  }, [isPanning, isSelecting, mode, lassoPoints])

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => {
      const newScale = prev + delta
      return Math.max(0.1, Math.min(5, newScale))
    })
  }, [])

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = e.target.getStage()
      if (!stage) {return}

      const oldScale = scale
      const pointer = stage.getPointerPosition()
      if (!pointer) {return}

      const scaleBy = 1.1
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
      const clampedScale = Math.max(0.1, Math.min(5, newScale))

      // Zoom towards pointer
      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      }

      setScale(clampedScale)
      setPosition({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      })
    },
    [scale, position]
  )

  // Reset selection
  const handleReset = useCallback(() => {
    setSelectionRect(null)
    setLassoPoints([])
    setStartPoint(null)
    setCurrentPoint(null)
  }, [])

  // Complete selection
  const handleComplete = useCallback(async () => {
    if (!selectionRect || !image) {return}

    // Validate minimum size
    if (selectionRect.width < minSelectionSize || selectionRect.height < minSelectionSize) {
      return
    }

    try {
      // Capture the selected region as base64
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {throw new Error('Failed to create canvas context')}

      // Output size (square for consistency)
      const outputSize = 512
      canvas.width = outputSize
      canvas.height = outputSize

      // Calculate source rectangle in pixels
      const srcX = (selectionRect.x / 100) * imageSize.width
      const srcY = (selectionRect.y / 100) * imageSize.height
      const srcW = (selectionRect.width / 100) * imageSize.width
      const srcH = (selectionRect.height / 100) * imageSize.height

      // Draw cropped region
      ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize)

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')

      // Build region object
      const region: SelectionRegion = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
      }

      if (mode === 'lasso' && lassoPoints.length > 0) {
        region.points = lassoPoints
      }

      onSelectionComplete(region, base64)
    } catch (error) {
      logger.error('Failed to capture selection:', error)
    }
  }, [selectionRect, image, imageSize, mode, lassoPoints, minSelectionSize, onSelectionComplete])

  // Convert percentage coordinates to stage coordinates
  const toStageCoords = useCallback(
    (percentX: number, percentY: number) => {
      const imageX = (percentX / 100) * imageSize.width
      const imageY = (percentY / 100) * imageSize.height
      return {
        x: position.x + imageX * scale,
        y: position.y + imageY * scale,
      }
    },
    [position, scale, imageSize]
  )

  // Check if selection is valid
  const isSelectionValid =
    selectionRect &&
    selectionRect.width >= minSelectionSize &&
    selectionRect.height >= minSelectionSize

  return (
    <div ref={containerRef} className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Selection mode buttons */}
          <div className="flex border rounded-md">
            <Button
              variant={mode === 'rectangle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('rectangle')}
              className="rounded-r-none"
            >
              <Square className="h-4 w-4 mr-1" />
              Rectangle
            </Button>
            <Button
              variant={mode === 'lasso' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('lasso')}
              className="rounded-l-none"
            >
              <Lasso className="h-4 w-4 mr-1" />
              Lasso
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Zoom controls */}
          <Button variant="ghost" size="icon" onClick={() => handleZoom(0.2)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="min-w-[60px] justify-center">
            {Math.round(scale * 100)}%
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => handleZoom(-0.2)}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Pan hint */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Move className="h-3 w-3" />
            <span>Ctrl+Drag to pan</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection info */}
          {selectionRect && (
            <Badge variant={isSelectionValid ? 'default' : 'secondary'}>
              {Math.round(selectionRect.width)}% × {Math.round(selectionRect.height)}%
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!selectionRect}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>

          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleComplete}
            disabled={!isSelectionValid}
          >
            <Check className="h-4 w-4 mr-1" />
            Use Selection
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-muted/30 overflow-hidden">
        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? 'grabbing' : isSelecting ? 'crosshair' : 'crosshair' }}
        >
          <Layer>
            {/* Background image */}
            {image && (
              <KonvaImage
                image={image}
                x={position.x}
                y={position.y}
                width={imageSize.width * scale}
                height={imageSize.height * scale}
              />
            )}

            {/* Selection rectangle */}
            {selectionRect && (
              <Rect
                x={toStageCoords(selectionRect.x, selectionRect.y).x}
                y={toStageCoords(selectionRect.x, selectionRect.y).y}
                width={(selectionRect.width / 100) * imageSize.width * scale}
                height={(selectionRect.height / 100) * imageSize.height * scale}
                stroke={isSelectionValid ? '#3B82F6' : '#EF4444'}
                strokeWidth={2}
                dash={[5, 5]}
                fill={isSelectionValid ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
              />
            )}

            {/* Lasso path (during drawing) */}
            {mode === 'lasso' && isSelecting && lassoPoints.length > 1 && (
              <Line
                points={lassoPoints.flatMap((p) => {
                  const stageP = toStageCoords(p.x, p.y)
                  return [stageP.x, stageP.y]
                })}
                stroke="#3B82F6"
                strokeWidth={2}
                closed={false}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Completed lasso path */}
            {mode === 'lasso' && !isSelecting && lassoPoints.length > 2 && (
              <Line
                points={lassoPoints.flatMap((p) => {
                  const stageP = toStageCoords(p.x, p.y)
                  return [stageP.x, stageP.y]
                })}
                stroke="#3B82F6"
                strokeWidth={2}
                closed
                fill="rgba(59, 130, 246, 0.1)"
                lineCap="round"
                lineJoin="round"
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30 border-t">
        {mode === 'rectangle'
          ? 'Click and drag to select a rectangular region'
          : 'Click and drag to draw a freeform selection'}
        {' • '}
        Scroll to zoom • Ctrl+Drag to pan
      </div>
    </div>
  )
}

export default LassoSelectTool
