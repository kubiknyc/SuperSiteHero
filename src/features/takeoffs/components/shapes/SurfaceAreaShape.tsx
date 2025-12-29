// File: /src/features/takeoffs/components/shapes/SurfaceAreaShape.tsx
// Konva shape component for surface area measurements (Type 7)
// Renders perimeter with 3D extrusion indicator

import { Group, Line } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface SurfaceAreaShapeProps {
  id: string
  points: Point[] // Perimeter base
  height: number // Extrusion height in pixels
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillOpacity?: number
  showExtrusion?: boolean
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * SurfaceAreaShape Component
 * Renders perimeter with 3D extrusion visualization
 */
export function SurfaceAreaShape({
  id,
  points,
  height: _height,
  stroke = '#8B4513',
  strokeWidth = 2,
  fill = '#8B4513',
  fillOpacity = 0.2,
  showExtrusion = true,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SurfaceAreaShapeProps) {
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  // Create offset points for 3D effect
  const extrusionOffset = { x: 10, y: -10 } // Isometric offset
  const extrudedPoints = points.map((p) => ({
    x: p.x + extrusionOffset.x,
    y: p.y + extrusionOffset.y,
  }))
  const flatExtrudedPoints = extrudedPoints.flatMap((p) => [p.x, p.y])

  return (
    <Group id={id}>
      {/* Extruded (back) face */}
      {showExtrusion && (
        <Line
          points={flatExtrudedPoints}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={fillOpacity * 0.5}
          closed={true}
          listening={false}
          dash={[5, 5]}
        />
      )}

      {/* Connection lines for 3D effect */}
      {showExtrusion &&
        points.map((point, index) => (
          <Line
            key={`extrusion-${index}`}
            points={[
              point.x,
              point.y,
              extrudedPoints[index].x,
              extrudedPoints[index].y,
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={0.3}
            listening={false}
          />
        ))}

      {/* Main (front) face */}
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
    </Group>
  )
}
