// File: /src/features/documents/components/markup/AngleMeasurement.tsx
// Angle measurement tool component for measuring angles on drawings

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Triangle,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Magnet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AngleMeasurement as AngleMeasurementType, MeasurementAnnotation } from '../../types/markup'
import { COMMON_ANGLES, ANGLE_SNAP_INCREMENTS } from '../../types/markup'

interface AngleMeasurementProps {
  isActive: boolean
  onActiveChange: (active: boolean) => void
  measurements: MeasurementAnnotation[]
  onDeleteMeasurement: (id: string) => void
  onClearAngleMeasurements: () => void
  snapToCommonAngles: boolean
  onSnapToCommonAnglesChange: (snap: boolean) => void
  snapIncrement: number // Snap increment in degrees (default 15)
  onSnapIncrementChange: (increment: number) => void
  showInteriorAngle: boolean
  onShowInteriorAngleChange: (show: boolean) => void
  disabled?: boolean
  className?: string
}

// Utility function to calculate angle between three points
export function calculateAngle(
  vertex: { x: number; y: number },
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  // Calculate vectors from vertex to each point
  const v1 = { x: point1.x - vertex.x, y: point1.y - vertex.y }
  const v2 = { x: point2.x - vertex.x, y: point2.y - vertex.y }

  // Calculate dot product and magnitudes
  const dotProduct = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

  // Calculate angle in radians and convert to degrees
  const cosAngle = dotProduct / (mag1 * mag2)
  // Clamp to [-1, 1] to handle floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))
  const angleRadians = Math.acos(clampedCos)
  const angleDegrees = angleRadians * (180 / Math.PI)

  return angleDegrees
}

// Snap angle to nearest common angle if within threshold
export function snapToCommonAngle(angle: number, threshold = 3): number {
  for (const commonAngle of COMMON_ANGLES) {
    if (Math.abs(angle - commonAngle) <= threshold) {
      return commonAngle
    }
  }
  return angle
}

// Snap angle to nearest increment (e.g., 15 degrees)
export function snapToIncrement(angle: number, increment: number = 15): number {
  if (increment <= 0) {return angle}
  return Math.round(angle / increment) * increment
}

// Calculate interior and exterior angles
export function getAngles(angle: number): { interior: number; exterior: number } {
  return {
    interior: angle,
    exterior: 360 - angle,
  }
}

export function AngleMeasurement({
  isActive,
  onActiveChange,
  measurements,
  onDeleteMeasurement,
  onClearAngleMeasurements,
  snapToCommonAngles,
  onSnapToCommonAnglesChange,
  snapIncrement = 15,
  onSnapIncrementChange,
  showInteriorAngle,
  onShowInteriorAngleChange,
  disabled = false,
  className,
}: AngleMeasurementProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showIncrementPicker, setShowIncrementPicker] = useState(false)

  // Filter only angle measurements
  const angleMeasurements = useMemo(() => {
    return measurements.filter((m) => m.type === 'angle')
  }, [measurements])

  const handleCopyAngle = useCallback((measurement: MeasurementAnnotation) => {
    const angle = measurement.angleValue ?? measurement.value
    const text = `${angle.toFixed(1)}deg`
    navigator.clipboard.writeText(text)
    setCopiedId(measurement.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleCopyAllAngles = useCallback(() => {
    const lines = angleMeasurements.map((m, idx) => {
      const angle = m.angleValue ?? m.value
      return `Angle ${idx + 1}: ${angle.toFixed(1)}deg`
    })
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedId('all')
    setTimeout(() => setCopiedId(null), 2000)
  }, [angleMeasurements])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2',
            isActive && 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-amber-400',
            className
          )}
        >
          <Triangle className="w-4 h-4" />
          <span className="text-xs">Angle</span>
          {angleMeasurements.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full dark:bg-amber-800 dark:text-amber-200">
              {angleMeasurements.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="p-3 border-b bg-surface dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">Angle Measurement</h3>
              <p className="text-xs text-secondary dark:text-gray-400">
                Click 3 points: vertex, then two ray endpoints
              </p>
            </div>
            <Button
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => onActiveChange(!isActive)}
              disabled={disabled}
            >
              {isActive ? 'Active' : 'Measure'}
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="p-3 border-b">
          <Label className="text-xs font-medium text-secondary dark:text-gray-400 mb-2 block">
            Settings
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Magnet className="w-3 h-3 text-secondary" />
                <span className="text-xs">Snap to common angles</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSnapToCommonAnglesChange(!snapToCommonAngles)}
                    className={cn(
                      'w-8 h-5 rounded-full transition-colors relative',
                      snapToCommonAngles
                        ? 'bg-amber-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        snapToCommonAngles ? 'left-3.5' : 'left-0.5'
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Snap to: {COMMON_ANGLES.join('deg, ')}deg</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Snap to increment option */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Magnet className="w-3 h-3 text-secondary" />
                <span className="text-xs">Snap to {snapIncrement}deg increments</span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowIncrementPicker(!showIncrementPicker)}
                      className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                    >
                      {snapIncrement}deg
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to change snap increment</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Increment picker dropdown */}
            {showIncrementPicker && (
              <div className="flex flex-wrap gap-1 p-2 bg-surface rounded dark:bg-gray-700">
                <Label className="w-full text-xs text-secondary mb-1 dark:text-gray-400">
                  Select snap increment:
                </Label>
                {ANGLE_SNAP_INCREMENTS.map((inc) => (
                  <button
                    key={inc}
                    onClick={() => {
                      onSnapIncrementChange(inc)
                      setShowIncrementPicker(false)
                    }}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-colors',
                      snapIncrement === inc
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40'
                    )}
                  >
                    {inc}deg
                  </button>
                ))}
                <button
                  onClick={() => {
                    onSnapIncrementChange(0)
                    setShowIncrementPicker(false)
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    snapIncrement === 0
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                  )}
                >
                  Off
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3 h-3 text-secondary" />
                <span className="text-xs">Show interior angle</span>
              </div>
              <button
                onClick={() => onShowInteriorAngleChange(!showInteriorAngle)}
                className={cn(
                  'w-8 h-5 rounded-full transition-colors relative',
                  showInteriorAngle
                    ? 'bg-amber-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    showInteriorAngle ? 'left-3.5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Common angles reference */}
          <div className="mt-3 pt-3 border-t dark:border-gray-600">
            <Label className="text-xs font-medium text-secondary dark:text-gray-400 mb-1 block">
              Common Angles Reference
            </Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_ANGLES.map((angle) => (
                <span
                  key={angle}
                  className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded dark:bg-amber-900/30 dark:text-amber-300"
                >
                  {angle}deg
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Measurements List */}
        <div className="max-h-48 overflow-y-auto">
          {angleMeasurements.length === 0 ? (
            <div className="p-4 text-center text-muted text-xs">
              <Triangle className="w-6 h-6 mx-auto mb-1 text-disabled" />
              <p>No angle measurements yet</p>
              <p className="text-secondary mt-1">Click 3 points to measure</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {angleMeasurements.map((m, index) => {
                const angle = m.angleValue ?? m.value
                const { exterior } = getAngles(angle)
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 hover:bg-surface dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Triangle className="w-3 h-3 text-amber-500" />
                      <div>
                        <span className="text-sm font-medium dark:text-gray-200">
                          Angle {index + 1}: {angle.toFixed(1)}deg
                        </span>
                        <p className="text-xs text-secondary dark:text-gray-400">
                          Exterior: {exterior.toFixed(1)}deg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyAngle(m)}
                        className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                        title="Copy angle"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteMeasurement(m.id)}
                        className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                        title="Delete measurement"
                        disabled={disabled}
                      >
                        <Trash2 className="w-3 h-3 text-error" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {angleMeasurements.length > 0 && (
          <div className="p-2 border-t bg-surface flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAllAngles}
                className="flex items-center gap-1 text-xs text-secondary hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200"
              >
                {copiedId === 'all' ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy all
              </button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearAngleMeasurements}
              disabled={disabled}
              className="h-6 text-xs text-error hover:text-error-dark"
            >
              Clear All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// SVG Component for rendering angle measurement on canvas
export interface AngleDisplayProps {
  measurement: AngleMeasurementType
  isSelected?: boolean
  onSelect?: (id: string) => void
  scale?: number
  showInteriorAngle?: boolean
}

export function AngleDisplay({
  measurement,
  isSelected = false,
  onSelect,
  scale = 1,
  showInteriorAngle = true,
}: AngleDisplayProps) {
  const { vertex, point1, point2, angleDegrees, color, strokeWidth, fontSize, showLabel } = measurement

  // Calculate arc path for the angle visualization
  const arcRadius = 30 / scale

  // Calculate vectors
  const v1 = { x: point1.x - vertex.x, y: point1.y - vertex.y }
  const v2 = { x: point2.x - vertex.x, y: point2.y - vertex.y }

  // Normalize vectors
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
  const norm1 = { x: v1.x / mag1, y: v1.y / mag1 }
  const norm2 = { x: v2.x / mag2, y: v2.y / mag2 }

  // Arc start and end points
  const arcStart = {
    x: vertex.x + norm1.x * arcRadius,
    y: vertex.y + norm1.y * arcRadius,
  }
  const arcEnd = {
    x: vertex.x + norm2.x * arcRadius,
    y: vertex.y + norm2.y * arcRadius,
  }

  // Determine if large arc flag should be set
  const largeArcFlag = angleDegrees > 180 ? 1 : 0

  // Calculate cross product to determine sweep direction
  const cross = v1.x * v2.y - v1.y * v2.x
  const sweepFlag = cross > 0 ? 1 : 0

  // Label position (midpoint of arc)
  const midAngle = Math.atan2(norm1.y + norm2.y, norm1.x + norm2.x)
  const labelPos = {
    x: vertex.x + Math.cos(midAngle) * (arcRadius + 15 / scale),
    y: vertex.y + Math.sin(midAngle) * (arcRadius + 15 / scale),
  }

  const displayAngle = showInteriorAngle ? angleDegrees : 360 - angleDegrees

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect?.(measurement.id)}
    >
      {/* Ray lines */}
      <line
        x1={vertex.x}
        y1={vertex.y}
        x2={point1.x}
        y2={point1.y}
        stroke={color}
        strokeWidth={(strokeWidth || 2) / scale}
        strokeLinecap="round"
      />
      <line
        x1={vertex.x}
        y1={vertex.y}
        x2={point2.x}
        y2={point2.y}
        stroke={color}
        strokeWidth={(strokeWidth || 2) / scale}
        strokeLinecap="round"
      />

      {/* Arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke={color}
        strokeWidth={(strokeWidth || 2) / scale}
        strokeDasharray={`${4 / scale} ${4 / scale}`}
      />

      {/* Vertex point */}
      <circle
        cx={vertex.x}
        cy={vertex.y}
        r={4 / scale}
        fill={color}
        stroke={isSelected ? '#000' : 'white'}
        strokeWidth={2 / scale}
      />

      {/* End points */}
      <circle
        cx={point1.x}
        cy={point1.y}
        r={3 / scale}
        fill={color}
        stroke="white"
        strokeWidth={1.5 / scale}
      />
      <circle
        cx={point2.x}
        cy={point2.y}
        r={3 / scale}
        fill={color}
        stroke="white"
        strokeWidth={1.5 / scale}
      />

      {/* Angle label */}
      {showLabel && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <rect
            x={-20 / scale}
            y={-10 / scale}
            width={40 / scale}
            height={20 / scale}
            fill="white"
            stroke={color}
            strokeWidth={1 / scale}
            rx={3 / scale}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={(fontSize || 12) / scale}
            fontWeight="bold"
          >
            {displayAngle.toFixed(1)}deg
          </text>
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={vertex.x}
          cy={vertex.y}
          r={arcRadius + 10 / scale}
          fill="none"
          stroke={color}
          strokeWidth={1 / scale}
          strokeDasharray={`${3 / scale} ${3 / scale}`}
          opacity={0.5}
        />
      )}
    </g>
  )
}

export default AngleMeasurement
