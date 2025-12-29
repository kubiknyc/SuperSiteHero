import { useState, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Arrow, Text } from 'react-konva'
import useImage from 'use-image'
import type {
  Annotation,
  AnnotationType,
  RectangleAnnotation,
  CircleAnnotation,
  ArrowAnnotation,
  FreehandAnnotation,
  TextAnnotation,
} from '@/types/markup'
import { MarkupToolbar } from './MarkupToolbar'

interface DrawingMarkupCanvasProps {
  imageUrl: string
  documentId: string
  annotations?: Annotation[]
  onAnnotationsChange?: (annotations: Annotation[]) => void
  readOnly?: boolean
  width?: number
  height?: number
}

export function DrawingMarkupCanvas({
  imageUrl,
  documentId,
  annotations = [],
  onAnnotationsChange,
  readOnly = false,
  width = window.innerWidth - 300,
  height = window.innerHeight - 200,
}: DrawingMarkupCanvasProps) {
  const [image] = useImage(imageUrl)
  const [tool, setTool] = useState<AnnotationType | 'select' | 'pan' | 'eraser'>('select')
  const [color, setColor] = useState('#FF0000')
  const [lineWidth, setLineWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const stageRef = useRef<any>(null)
  const isPanning = useRef(false)
  const lastPointerPosition = useRef({ x: 0, y: 0 })

  // Handle mouse down - start drawing
  const handleMouseDown = (e: any) => {
    if (readOnly || tool === 'select') {return}

    if (tool === 'pan') {
      isPanning.current = true
      const stage = e.target.getStage()
      lastPointerPosition.current = stage.getPointerPosition()
      return
    }

    setIsDrawing(true)
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    const stagePoint = {
      x: (point.x - position.x) / scale,
      y: (point.y - position.y) / scale,
    }

    const baseAnnotation = {
      id: `temp-${Date.now()}`,
      documentId,
      color,
      lineWidth,
      userId: 'current-user', // Replace with actual user ID
      userName: 'Current User', // Replace with actual user name
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visible: true,
    }

    switch (tool) {
      case 'rectangle':
        setCurrentAnnotation({
          ...baseAnnotation,
          type: 'rectangle',
          x: stagePoint.x,
          y: stagePoint.y,
          width: 0,
          height: 0,
        } as RectangleAnnotation)
        break
      case 'circle':
        setCurrentAnnotation({
          ...baseAnnotation,
          type: 'circle',
          x: stagePoint.x,
          y: stagePoint.y,
          radius: 0,
        } as CircleAnnotation)
        break
      case 'arrow':
        setCurrentAnnotation({
          ...baseAnnotation,
          type: 'arrow',
          points: [stagePoint.x, stagePoint.y, stagePoint.x, stagePoint.y],
          pointerLength: 20,
          pointerWidth: 20,
        } as ArrowAnnotation)
        break
      case 'freehand':
        setCurrentAnnotation({
          ...baseAnnotation,
          type: 'freehand',
          points: [stagePoint.x, stagePoint.y],
          tension: 0.5,
        } as FreehandAnnotation)
        break
      case 'text':
        setCurrentAnnotation({
          ...baseAnnotation,
          type: 'text',
          x: stagePoint.x,
          y: stagePoint.y,
          text: 'New Text',
          fontSize: 16,
          fill: color,
        } as TextAnnotation)
        break
    }
  }

  // Handle mouse move - continue drawing
  const handleMouseMove = (e: any) => {
    if (tool === 'pan' && isPanning.current) {
      const stage = e.target.getStage()
      const newPointerPosition = stage.getPointerPosition()
      const dx = newPointerPosition.x - lastPointerPosition.current.x
      const dy = newPointerPosition.y - lastPointerPosition.current.y

      setPosition({
        x: position.x + dx,
        y: position.y + dy,
      })
      lastPointerPosition.current = newPointerPosition
      return
    }

    if (!isDrawing || !currentAnnotation || readOnly) {return}

    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    const stagePoint = {
      x: (point.x - position.x) / scale,
      y: (point.y - position.y) / scale,
    }

    switch (currentAnnotation.type) {
      case 'rectangle': {
        const rect = currentAnnotation as RectangleAnnotation
        setCurrentAnnotation({
          ...rect,
          width: stagePoint.x - rect.x,
          height: stagePoint.y - rect.y,
        })
        break
      }
      case 'circle': {
        const circle = currentAnnotation as CircleAnnotation
        const dx = stagePoint.x - circle.x
        const dy = stagePoint.y - circle.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        setCurrentAnnotation({
          ...circle,
          radius,
        })
        break
      }
      case 'arrow': {
        const arrow = currentAnnotation as ArrowAnnotation
        setCurrentAnnotation({
          ...arrow,
          points: [arrow.points[0], arrow.points[1], stagePoint.x, stagePoint.y],
        })
        break
      }
      case 'freehand': {
        const freehand = currentAnnotation as FreehandAnnotation
        setCurrentAnnotation({
          ...freehand,
          points: [...freehand.points, stagePoint.x, stagePoint.y],
        })
        break
      }
    }
  }

  // Handle mouse up - finish drawing
  const handleMouseUp = () => {
    if (tool === 'pan') {
      isPanning.current = false
      return
    }

    if (!isDrawing || !currentAnnotation || readOnly) {return}

    setIsDrawing(false)

    // Add the completed annotation to the list
    const newAnnotations = [...annotations, { ...currentAnnotation, id: `annotation-${Date.now()}` }]
    onAnnotationsChange?.(newAnnotations)
    setCurrentAnnotation(null)
  }

  // Handle zoom with mouse wheel
  const handleWheel = (e: any) => {
    e.evt.preventDefault()

    const scaleBy = 1.1
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

    setScale(newScale)
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }

  // Render annotation based on type
  const renderAnnotation = (annotation: Annotation, index: number) => {
    if (!annotation.visible) {return null}

    const commonProps = {
      key: annotation.id || index,
      stroke: annotation.color,
      strokeWidth: annotation.lineWidth,
    }

    switch (annotation.type) {
      case 'rectangle': {
        const rect = annotation as RectangleAnnotation
        return (
          <Rect
            {...commonProps}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={rect.fill}
            opacity={rect.opacity}
          />
        )
      }
      case 'circle': {
        const circle = annotation as CircleAnnotation
        return (
          <Circle
            {...commonProps}
            x={circle.x}
            y={circle.y}
            radius={circle.radius}
            fill={circle.fill}
            opacity={circle.opacity}
          />
        )
      }
      case 'arrow': {
        const arrow = annotation as ArrowAnnotation
        return (
          <Arrow
            {...commonProps}
            points={arrow.points}
            pointerLength={arrow.pointerLength}
            pointerWidth={arrow.pointerWidth}
            fill={arrow.color}
          />
        )
      }
      case 'freehand': {
        const freehand = annotation as FreehandAnnotation
        return (
          <Line
            {...commonProps}
            points={freehand.points}
            tension={freehand.tension}
            lineCap="round"
            lineJoin="round"
          />
        )
      }
      case 'text': {
        const text = annotation as TextAnnotation
        return (
          <Text
            key={annotation.id || index}
            x={text.x}
            y={text.y}
            text={text.text}
            fontSize={text.fontSize}
            fontFamily={text.fontFamily || 'Arial'}
            fill={text.fill || text.color}
          />
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <MarkupToolbar
        selectedTool={tool}
        selectedColor={color}
        lineWidth={lineWidth}
        onToolChange={setTool}
        onColorChange={setColor}
        onLineWidthChange={setLineWidth}
        onZoomIn={() => setScale(scale * 1.2)}
        onZoomOut={() => setScale(scale / 1.2)}
        onResetView={() => {
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }}
        disabled={readOnly}
      />

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
          onWheel={handleWheel}
          className="cursor-crosshair"
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={image.width}
                height={image.height}
              />
            )}
          </Layer>

          <Layer>
            {annotations.map((annotation, index) => renderAnnotation(annotation, index))}
            {currentAnnotation && renderAnnotation(currentAnnotation, -1)}
          </Layer>
        </Stage>
      </div>

      <div className="p-2 bg-card border-t flex items-center justify-between text-sm text-secondary">
        <div>
          Zoom: {Math.round(scale * 100)}% | Tool: {tool}
        </div>
        <div>
          {annotations.length} annotation(s)
        </div>
      </div>
    </div>
  )
}
