// File: /src/features/takeoffs/components/shapes/AreaShape.tsx
// Konva shape component for area measurements (Type 2)
// Renders closed polygons with fill and stroke

import { Line } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface AreaShapeProps {
  id: string
  points: Point[]
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillOpacity?: number
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * AreaShape Component
 * Renders a closed polygon for area measurements
 */
export function AreaShape({
  id,
  points,
  stroke = '#0000FF',
  strokeWidth = 2,
  fill = '#0000FF',
  fillOpacity = 0.2,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AreaShapeProps) {
  // Convert Point[] to flat array and close the polygon
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  return (
    <Line
      id={id}
      points={flatPoints}
      stroke={stroke}
      strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
      fill={fill}
      opacity={fillOpacity}
      closed={true} // Close the polygon
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
  )
}
