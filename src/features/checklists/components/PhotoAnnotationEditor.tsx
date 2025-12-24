// File: /src/features/checklists/components/PhotoAnnotationEditor.tsx
// Photo annotation editor with drawing tools using Konva

import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Line, Image as KonvaImage, Arrow, Circle, Rect, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Pencil,
  ArrowRight,
  Circle as CircleIcon,
  Square,
  Type,
  Eraser,
  Undo,
  Check,
  X,
} from 'lucide-react'

interface Annotation {
  id: string
  tool: 'pen' | 'arrow' | 'circle' | 'rectangle' | 'text'
  points?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  strokeWidth: number
}

interface PhotoAnnotationEditorProps {
  imageUrl: string
  onSave: (annotatedImageUrl: string) => void
  onCancel: () => void
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000', '#FFFFFF']
const STROKE_WIDTHS = [2, 4, 6, 8]

export function PhotoAnnotationEditor({
  imageUrl,
  onSave,
  onCancel,
}: PhotoAnnotationEditorProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentTool, setCurrentTool] = useState<'pen' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'eraser'>('pen')
  const [currentColor, setCurrentColor] = useState('#EF4444')
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)

      // Calculate stage size to fit image
      const maxWidth = 800
      const maxHeight = 600
      const aspectRatio = img.width / img.height

      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        width = maxWidth
        height = width / aspectRatio
      }

      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }

      setStageSize({ width, height })
    }
    img.src = imageUrl
  }, [imageUrl])

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    setIsDrawing(true)

    const id = `annotation-${Date.now()}`

    if (currentTool === 'pen') {
      const newAnnotation: Annotation = {
        id,
        tool: 'pen',
        points: [pos.x, pos.y],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      }
      setAnnotations([...annotations, newAnnotation])
    } else if (currentTool === 'arrow') {
      const newAnnotation: Annotation = {
        id,
        tool: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      }
      setAnnotations([...annotations, newAnnotation])
    } else if (currentTool === 'circle') {
      const newAnnotation: Annotation = {
        id,
        tool: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      }
      setAnnotations([...annotations, newAnnotation])
    } else if (currentTool === 'rectangle') {
      const newAnnotation: Annotation = {
        id,
        tool: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      }
      setAnnotations([...annotations, newAnnotation])
    }
  }

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing) {return}

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    const newAnnotations = [...annotations]
    const lastAnnotation = newAnnotations[newAnnotations.length - 1]

    if (currentTool === 'pen' && lastAnnotation.tool === 'pen') {
      lastAnnotation.points = [...(lastAnnotation.points || []), pos.x, pos.y]
    } else if (currentTool === 'arrow' && lastAnnotation.tool === 'arrow') {
      lastAnnotation.points = [
        lastAnnotation.points![0],
        lastAnnotation.points![1],
        pos.x,
        pos.y,
      ]
    } else if (currentTool === 'circle' && lastAnnotation.tool === 'circle') {
      const dx = pos.x - lastAnnotation.x!
      const dy = pos.y - lastAnnotation.y!
      lastAnnotation.radius = Math.sqrt(dx * dx + dy * dy)
    } else if (currentTool === 'rectangle' && lastAnnotation.tool === 'rectangle') {
      lastAnnotation.width = pos.x - lastAnnotation.x!
      lastAnnotation.height = pos.y - lastAnnotation.y!
    }

    setAnnotations(newAnnotations)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1))
  }

  const handleSave = () => {
    if (!stageRef.current) {return}

    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2,
      })
      onSave(dataUrl)
    } catch (error) {
      console.error('Failed to save annotated image:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-surface rounded-lg">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          <Label className="text-xs text-secondary mr-2">Tool:</Label>
          <Button
            type="button"
            size="sm"
            variant={currentTool === 'pen' ? 'default' : 'outline'}
            onClick={() => setCurrentTool('pen')}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={currentTool === 'arrow' ? 'default' : 'outline'}
            onClick={() => setCurrentTool('arrow')}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={currentTool === 'circle' ? 'default' : 'outline'}
            onClick={() => setCurrentTool('circle')}
          >
            <CircleIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={currentTool === 'rectangle' ? 'default' : 'outline'}
            onClick={() => setCurrentTool('rectangle')}
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          <Label className="text-xs text-secondary mr-2">Color:</Label>
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setCurrentColor(color)}
              className={`w-8 h-8 rounded border-2 ${
                currentColor === color ? 'border-gray-900' : 'border-input'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1">
          <Label className="text-xs text-secondary mr-2">Width:</Label>
          {STROKE_WIDTHS.map((width) => (
            <Button
              key={width}
              type="button"
              size="sm"
              variant={currentStrokeWidth === width ? 'default' : 'outline'}
              onClick={() => setCurrentStrokeWidth(width)}
            >
              {width}px
            </Button>
          ))}
        </div>

        {/* Undo */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleUndo}
          disabled={annotations.length === 0}
        >
          <Undo className="w-4 h-4 mr-1" />
          Undo
        </Button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {image && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              {/* Background Image */}
              <KonvaImage
                image={image}
                width={stageSize.width}
                height={stageSize.height}
              />

              {/* Annotations */}
              {annotations.map((annotation) => {
                if (annotation.tool === 'pen') {
                  return (
                    <Line
                      key={annotation.id}
                      points={annotation.points || []}
                      stroke={annotation.color}
                      strokeWidth={annotation.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )
                } else if (annotation.tool === 'arrow') {
                  return (
                    <Arrow
                      key={annotation.id}
                      points={annotation.points || []}
                      stroke={annotation.color}
                      strokeWidth={annotation.strokeWidth}
                      fill={annotation.color}
                      pointerLength={10}
                      pointerWidth={10}
                    />
                  )
                } else if (annotation.tool === 'circle') {
                  return (
                    <Circle
                      key={annotation.id}
                      x={annotation.x}
                      y={annotation.y}
                      radius={annotation.radius}
                      stroke={annotation.color}
                      strokeWidth={annotation.strokeWidth}
                    />
                  )
                } else if (annotation.tool === 'rectangle') {
                  return (
                    <Rect
                      key={annotation.id}
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      stroke={annotation.color}
                      strokeWidth={annotation.strokeWidth}
                    />
                  )
                }
                return null
              })}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="text-secondary">
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
        </Badge>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Annotated Photo
          </Button>
        </div>
      </div>
    </div>
  )
}
