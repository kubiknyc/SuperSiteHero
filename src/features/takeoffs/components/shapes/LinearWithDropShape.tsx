// File: /src/features/takeoffs/components/shapes/LinearWithDropShape.tsx
// Konva shape component for linear with drop measurements (Type 4)
// Renders horizontal line with vertical drop indicator

import { Group, Line, Arrow } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface LinearWithDropShapeProps {
  id: string
  points: Point[] // Horizontal path
  dropHeight: number // Vertical drop in pixels
  stroke?: string
  strokeWidth?: number
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * LinearWithDropShape Component
 * Renders horizontal line with vertical drop arrow
 */
export function LinearWithDropShape({
  id,
  points,
  dropHeight,
  stroke = '#FF00FF',
  strokeWidth = 2,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LinearWithDropShapeProps) {
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  // Calculate end point for drop arrow
  const lastPoint = points[points.length - 1]
  const dropStart = { x: lastPoint.x, y: lastPoint.y }
  const dropEnd = { x: lastPoint.x, y: lastPoint.y + dropHeight }

  return (
    <Group id={id}>
      {/* Horizontal line */}
      <Line
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
        hitStrokeWidth={10}
      />
      {/* Vertical drop arrow */}
      <Arrow
        points={[dropStart.x, dropStart.y, dropEnd.x, dropEnd.y]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={stroke}
        pointerLength={8}
        pointerWidth={8}
        dash={[5, 5]} // Dashed line
        listening={false}
      />
    </Group>
  )
}
