// File: /src/features/takeoffs/components/TakeoffCanvas.tsx
// Main Konva canvas component for takeoff measurements
// Integrates all 9 shape components with drawing tools and spatial indexing

import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import type Konva from 'konva'
import {
  LinearShape,
  AreaShape,
  CountShape,
  LinearWithDropShape,
  PitchedAreaShape,
  PitchedLinearShape,
  SurfaceAreaShape,
  Volume2DShape,
  Volume3DShape,
  type CrossSection,
} from './shapes'
import { TakeoffSpatialIndex } from '../utils/spatialIndex'
import type { Point, MeasurementType, ScaleFactor } from '../utils/measurements'
import {
  calculateLinear,
  calculateArea,
  calculateCount,
  calculateLinearWithDrop,
  calculatePitchedArea,
  calculatePitchedLinear,
  calculateSurfaceArea,
  calculateVolume2D,
} from '../utils/measurements'

export interface TakeoffMeasurement {
  id: string
  type: MeasurementType
  points: Point[]
  color: string
  name?: string
  // Type-specific properties
  dropHeight?: number // For linear_with_drop
  pitch?: number // For pitched_area, pitched_linear
  height?: number // For surface_area
  depth?: number // For volume_2d
  crossSections?: CrossSection[] // For volume_3d
}

export interface TakeoffCanvasProps {
  documentId: string
  projectId: string
  pageNumber?: number
  backgroundImageUrl?: string
  width?: number
  height?: number
  measurements?: TakeoffMeasurement[]
  scale?: ScaleFactor
  currentTool?: MeasurementType
  readOnly?: boolean
  onMeasurementCreate?: (measurement: Omit<TakeoffMeasurement, 'id'>) => void
  onMeasurementUpdate?: (id: string, updates: Partial<TakeoffMeasurement>) => void
  onMeasurementSelect?: (id: string | null) => void
  onMeasurementDelete?: (id: string) => void
  // Calibration props
  isCalibrating?: boolean
  onCalibrationLineDrawn?: (points: [Point, Point]) => void
  onCancelCalibration?: () => void
}

/**
 * TakeoffCanvas Component
 *
 * Main canvas for drawing and displaying takeoff measurements.
 * Features:
 * - All 9 measurement types
 * - Spatial indexing for performance
 * - Real-time calculations
 * - Drawing tools
 * - Viewport culling
 */
export function TakeoffCanvas({
  documentId,
  projectId,
  pageNumber,
  backgroundImageUrl,
  width = 1200,
  height = 800,
  measurements = [],
  scale,
  currentTool = 'linear',
  readOnly = false,
  onMeasurementCreate,
  onMeasurementUpdate,
  onMeasurementSelect,
  onMeasurementDelete,
  isCalibrating = false,
  onCalibrationLineDrawn,
  onCancelCalibration,
}: TakeoffCanvasProps) {
  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const spatialIndexRef = useRef<TakeoffSpatialIndex>(new TakeoffSpatialIndex())

  // State
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [hoveredMeasurementId, setHoveredMeasurementId] = useState<string | null>(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0, width, height })

  // Calibration line state
  const [calibrationLinePoints, setCalibrationLinePoints] = useState<Point[]>([])
  const [isDrawingCalibration, setIsDrawingCalibration] = useState(false)

  // Background image
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Load background image
  useEffect(() => {
    if (!backgroundImageUrl) {
      setBackgroundImage(null)
      return
    }

    const img = new window.Image()
    img.onload = () => setBackgroundImage(img)
    img.src = backgroundImageUrl
  }, [backgroundImageUrl])

  // Initialize spatial index with measurements
  useEffect(() => {
    const index = spatialIndexRef.current
    index.clear()

    measurements.forEach((m) => {
      index.insert(m.id, m.type, m.points)
    })
  }, [measurements])

  // Handle Escape key to cancel calibration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCalibrating) {
        setCalibrationLinePoints([])
        setIsDrawingCalibration(false)
        onCancelCalibration?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCalibrating, onCancelCalibration])

  // Reset calibration line state when calibration mode is toggled off
  useEffect(() => {
    if (!isCalibrating) {
      setCalibrationLinePoints([])
      setIsDrawingCalibration(false)
    }
  }, [isCalibrating])

  // Get visible measurements using spatial index
  const visibleMeasurements = measurements.filter((m) => {
    const inViewport = spatialIndexRef.current.searchViewport(viewport)
    return inViewport.some((indexed) => indexed.id === m.id)
  })

  // Handle mouse down - start drawing
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (readOnly) {return}

      const stage = e.target.getStage()
      if (!stage) {return}

      const pos = stage.getPointerPosition()
      if (!pos) {return}

      const point: Point = { x: pos.x, y: pos.y }

      // If in calibration mode, start drawing calibration line
      if (isCalibrating) {
        setIsDrawingCalibration(true)
        setCalibrationLinePoints([point])
        return
      }

      // If clicking on an existing measurement, select it
      const clickedMeasurement = measurements.find((m) => {
        const nearby = spatialIndexRef.current.searchNearPoint(point, 10)
        return nearby.some((indexed) => indexed.id === m.id)
      })

      if (clickedMeasurement) {
        setSelectedMeasurementId(clickedMeasurement.id)
        onMeasurementSelect?.(clickedMeasurement.id)
        return
      }

      // Start drawing new measurement
      if (currentTool === 'count') {
        // For count, add point immediately
        const newPoint = point
        setCurrentPoints([newPoint])

        // Create measurement immediately for count
        onMeasurementCreate?.({
          type: 'count',
          points: [newPoint],
          color: '#00FF00',
        })
        setCurrentPoints([])
      } else {
        // For other types, start drawing
        setIsDrawing(true)
        setCurrentPoints([point])
      }
    },
    [readOnly, measurements, currentTool, onMeasurementCreate, onMeasurementSelect, isCalibrating]
  )

  // Handle mouse move - continue drawing
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) {return}

      const pos = stage.getPointerPosition()
      if (!pos) {return}

      const point: Point = { x: pos.x, y: pos.y }

      // Handle calibration line drawing
      if (isDrawingCalibration && isCalibrating) {
        setCalibrationLinePoints((prev) => (prev.length > 0 ? [prev[0], point] : [point]))
        return
      }

      if (!isDrawing || readOnly) {return}

      // Update current points based on tool type
      if (currentTool === 'linear' || currentTool === 'linear_with_drop' || currentTool === 'pitched_linear') {
        // For line tools: maintain start point, update end point
        setCurrentPoints((prev) => (prev.length > 0 ? [prev[0], point] : [point]))
      } else if (currentTool === 'count') {
        // For count: no dragging needed
        return
      } else {
        // For area/polygon tools: add points continuously for freehand drawing
        setCurrentPoints((prev) => [...prev, point])
      }
    },
    [isDrawing, readOnly, currentTool, isDrawingCalibration, isCalibrating]
  )

  // Handle mouse up - finish drawing
  const handleMouseUp = useCallback(() => {
    // Handle calibration line completion
    if (isDrawingCalibration && isCalibrating && calibrationLinePoints.length >= 2) {
      const [p1, p2] = calibrationLinePoints
      setIsDrawingCalibration(false)
      setCalibrationLinePoints([])
      onCalibrationLineDrawn?.([p1, p2])
      return
    }

    if (!isDrawing || readOnly) {return}

    if (currentPoints.length < 2) {
      setIsDrawing(false)
      setCurrentPoints([])
      return
    }

    // Create measurement based on tool type
    const colorMap: Record<MeasurementType, string> = {
      linear: '#FF0000',
      area: '#0000FF',
      count: '#00FF00',
      linear_with_drop: '#FF00FF',
      pitched_area: '#FFA500',
      pitched_linear: '#9400D3',
      surface_area: '#8B4513',
      volume_2d: '#4169E1',
      volume_3d: '#DC143C',
    }

    const newMeasurement: Omit<TakeoffMeasurement, 'id'> = {
      type: currentTool,
      points: currentPoints,
      color: colorMap[currentTool],
    }

    // Add default values for specific types
    if (currentTool === 'linear_with_drop') {
      newMeasurement.dropHeight = 10 // Default 10 feet
    } else if (currentTool === 'pitched_area' || currentTool === 'pitched_linear') {
      newMeasurement.pitch = 0.333 // Default 4:12 pitch
    } else if (currentTool === 'surface_area') {
      newMeasurement.height = 8 // Default 8 feet
    } else if (currentTool === 'volume_2d') {
      newMeasurement.depth = 0.5 // Default 6 inches
    }

    onMeasurementCreate?.(newMeasurement)

    setIsDrawing(false)
    setCurrentPoints([])
  }, [isDrawing, readOnly, currentPoints, currentTool, onMeasurementCreate, isDrawingCalibration, isCalibrating, calibrationLinePoints, onCalibrationLineDrawn])

  // Handle double-click to close polygon
  const handleDoubleClick = useCallback(() => {
    if (!isDrawing || readOnly) {return}
    handleMouseUp()
  }, [isDrawing, readOnly, handleMouseUp])

  // Calculate measurement value
  const calculateValue = useCallback(
    (measurement: TakeoffMeasurement): string => {
      if (!scale) {return '-- (No scale)'}

      try {
        switch (measurement.type) {
          case 'linear':
            return `${calculateLinear(measurement.points, scale, 'ft').toFixed(2)} LF`

          case 'area':
            return `${calculateArea(measurement.points, scale, 'ft2').toFixed(2)} SF`

          case 'count':
            return `${calculateCount(measurement.points)} EA`

          case 'linear_with_drop': {
            const result = calculateLinearWithDrop(
              measurement.points,
              measurement.dropHeight || 0,
              scale,
              'ft'
            )
            return `${result.total.toFixed(2)} LF (H: ${result.horizontal.toFixed(2)}, V: ${result.vertical.toFixed(2)})`
          }

          case 'pitched_area': {
            const result = calculatePitchedArea(
              measurement.points,
              measurement.pitch || 0,
              scale,
              'ft2'
            )
            return `${result.actual.toFixed(2)} SF (Planar: ${result.planar.toFixed(2)}, Factor: ${result.factor.toFixed(3)})`
          }

          case 'pitched_linear': {
            const result = calculatePitchedLinear(
              measurement.points,
              measurement.pitch || 0,
              scale,
              'ft'
            )
            return `${result.actual.toFixed(2)} LF (Horizontal: ${result.horizontal.toFixed(2)})`
          }

          case 'surface_area': {
            const result = calculateSurfaceArea(
              measurement.points,
              measurement.height || 0,
              scale,
              'ft2',
              false
            )
            return `${result.total.toFixed(2)} SF`
          }

          case 'volume_2d':
            return `${calculateVolume2D(measurement.points, measurement.depth || 0, scale, 'ft3').toFixed(2)} CF`

          case 'volume_3d':
            return 'N/A (Requires multiple sections)'

          default:
            return 'Unknown type'
        }
      } catch (error) {
        return 'Error calculating'
      }
    },
    [scale]
  )

  // Render measurement shape
  const renderMeasurement = useCallback(
    (measurement: TakeoffMeasurement) => {
      const isSelected = measurement.id === selectedMeasurementId
      const isHovered = measurement.id === hoveredMeasurementId

      const sharedProps = {
        id: measurement.id,
        selected: isSelected,
        onClick: () => {
          setSelectedMeasurementId(measurement.id)
          onMeasurementSelect?.(measurement.id)
        },
        onMouseEnter: () => setHoveredMeasurementId(measurement.id),
        onMouseLeave: () => setHoveredMeasurementId(null),
      }

      switch (measurement.type) {
        case 'linear':
          return (
            <LinearShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              stroke={measurement.color}
            />
          )

        case 'area':
          return (
            <AreaShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              stroke={measurement.color}
              fill={measurement.color}
            />
          )

        case 'count':
          return (
            <CountShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              fill={measurement.color}
              stroke="#006600"
            />
          )

        case 'linear_with_drop':
          return (
            <LinearWithDropShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              dropHeight={measurement.dropHeight || 10}
              stroke={measurement.color}
            />
          )

        case 'pitched_area':
          return (
            <PitchedAreaShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              pitch={measurement.pitch || 0.333}
              stroke={measurement.color}
              fill={measurement.color}
            />
          )

        case 'pitched_linear':
          return (
            <PitchedLinearShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              pitch={measurement.pitch || 0.333}
              stroke={measurement.color}
            />
          )

        case 'surface_area':
          return (
            <SurfaceAreaShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              height={measurement.height || 8}
              stroke={measurement.color}
              fill={measurement.color}
            />
          )

        case 'volume_2d':
          return (
            <Volume2DShape
              key={measurement.id}
              {...sharedProps}
              points={measurement.points}
              depth={measurement.depth || 0.5}
              stroke={measurement.color}
              fill={measurement.color}
            />
          )

        case 'volume_3d':
          return (
            <Volume3DShape
              key={measurement.id}
              {...sharedProps}
              crossSections={measurement.crossSections || []}
              stroke={measurement.color}
              fill={measurement.color}
            />
          )

        default:
          return null
      }
    },
    [selectedMeasurementId, hoveredMeasurementId, onMeasurementSelect]
  )

  // Render current drawing shape
  const renderCurrentDrawing = useCallback(() => {
    if (!isDrawing || currentPoints.length === 0) {return null}

    const tempProps = {
      id: 'temp-drawing',
      points: currentPoints,
      stroke: '#666',
      strokeWidth: 2,
    }

    switch (currentTool) {
      case 'linear':
      case 'linear_with_drop':
      case 'pitched_linear':
        return <LinearShape {...tempProps} />

      case 'area':
      case 'pitched_area':
      case 'surface_area':
      case 'volume_2d':
        return <AreaShape {...tempProps} fill="#666" fillOpacity={0.1} />

      default:
        return null
    }
  }, [isDrawing, currentPoints, currentTool])

  // Determine cursor style
  const getCursorStyle = () => {
    if (isCalibrating) {return 'crosshair'}
    if (isDrawing) {return 'crosshair'}
    return 'default'
  }

  return (
    <div className="relative">
      {/* Calibration mode indicator */}
      {isCalibrating && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
          <span className="text-sm font-medium">Calibration Mode</span>
          <span className="text-xs opacity-80">Draw a line on a known dimension • Press ESC to cancel</span>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDoubleClick}
        style={{ cursor: getCursorStyle() }}
      >
        <Layer ref={layerRef}>
          {/* Background image */}
          {backgroundImage && (
            <>{/* Background image rendering would go here */}</>
          )}

          {/* Visible measurements (viewport culled) */}
          {visibleMeasurements.map((measurement) => renderMeasurement(measurement))}

          {/* Current drawing */}
          {renderCurrentDrawing()}

          {/* Calibration line being drawn */}
          {isCalibrating && calibrationLinePoints.length >= 1 && (
            <Line
              points={calibrationLinePoints.flatMap(p => [p.x, p.y])}
              stroke="#3B82F6"
              strokeWidth={3}
              dash={[10, 5]}
              lineCap="round"
            />
          )}
        </Layer>
      </Stage>

      {/* Measurement info overlay */}
      {selectedMeasurementId && (
        <div className="absolute top-4 right-4 bg-card p-4 rounded shadow-lg">
          <h3 className="font-semibold mb-2 heading-subsection">Measurement</h3>
          {measurements
            .filter((m) => m.id === selectedMeasurementId)
            .map((m) => (
              <div key={m.id}>
                <p className="text-sm">Type: {m.type}</p>
                <p className="text-sm font-mono">{calculateValue(m)}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
