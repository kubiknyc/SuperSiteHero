// File: /src/features/takeoffs/components/shapes/LinearShape.tsx
// Konva shape component for linear measurements (Type 1)
// Renders polylines for straight lines and multi-segment measurements

import { Line } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface LinearShapeProps {
  id: string
  points: Point[]
  stroke?: string
  strokeWidth?: number
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * LinearShape Component
 * Renders a polyline for linear measurements
 */
export function LinearShape({
  id,
  points,
  stroke = '#FF0000',
  strokeWidth = 2,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LinearShapeProps) {
  // Convert Point[] to flat array [x1, y1, x2, y2, ...]
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  return (
    <Line
      id={id}
      points={flatPoints}
      stroke={stroke}
      strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
      listening={true}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      shadowEnabled={selected}
      shadowColor="black"
      shadowBlur={10}
      shadowOpacity={0.3}
      hitStrokeWidth={10} // Wider hit area for easier selection
    />
  )
}
