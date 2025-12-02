// File: /src/features/takeoffs/components/shapes/PitchedAreaShape.tsx
// Konva shape component for pitched area measurements (Type 5)
// Renders polygon with pitch indicator lines

import { Group, Line } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface PitchedAreaShapeProps {
  id: string
  points: Point[]
  pitch: number // Rise over run
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillOpacity?: number
  showPitchLines?: boolean
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * PitchedAreaShape Component
 * Renders polygon with optional pitch indication lines
 */
export function PitchedAreaShape({
  id,
  points,
  pitch,
  stroke = '#FFA500',
  strokeWidth = 2,
  fill = '#FFA500',
  fillOpacity = 0.2,
  showPitchLines = true,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PitchedAreaShapeProps) {
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  // Generate pitch indicator lines (diagonal hatch pattern)
  const pitchLines: number[][] = []
  if (showPitchLines && points.length >= 3) {
    // Calculate bounding box
    const minX = Math.min(...points.map((p) => p.x))
    const maxX = Math.max(...points.map((p) => p.x))
    const minY = Math.min(...points.map((p) => p.y))
    const maxY = Math.max(...points.map((p) => p.y))

    // Create diagonal lines spaced 20 pixels apart
    const spacing = 20
    const angle = Math.atan(pitch) // Convert pitch to angle

    for (let x = minX; x <= maxX + (maxY - minY); x += spacing) {
      const y1 = minY
      const y2 = maxY
      const x1 = x
      const x2 = x - (y2 - y1) * Math.tan(angle)

      pitchLines.push([x1, y1, x2, y2])
    }
  }

  return (
    <Group id={id}>
      {/* Main polygon */}
      <Line
        points={flatPoints}
        stroke={stroke}
        strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
        fill={fill}
        opacity={fillOpacity}
        closed={true}
        listening={true}
        onClick={onClick}
        onTap={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        shadowEnabled={selected}
        shadowColor="black"
        shadowBlur={10}
        shadowOpacity={0.3}
        hitStrokeWidth={10}
      />
      {/* Pitch indicator lines */}
      {showPitchLines &&
        pitchLines.map((linePoints, index) => (
          <Line
            key={`pitch-line-${index}`}
            points={linePoints}
            stroke={stroke}
            strokeWidth={1}
            opacity={0.4}
            listening={false}
            dash={[5, 5]}
          />
        ))}
    </Group>
  )
}
