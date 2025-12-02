// File: /src/features/takeoffs/components/shapes/Volume2DShape.tsx
// Konva shape component for 2D volume measurements (Type 8)
// Renders area with depth indicator

import { Group, Line, Rect, Text as KonvaText } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface Volume2DShapeProps {
  id: string
  points: Point[]
  depth: number // Depth value for display
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillOpacity?: number
  depthUnit?: string
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Volume2DShape Component
 * Renders polygon with depth indicator for volume calculation
 */
export function Volume2DShape({
  id,
  points,
  depth,
  stroke = '#4169E1',
  strokeWidth = 2,
  fill = '#4169E1',
  fillOpacity = 0.3,
  depthUnit = 'ft',
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Volume2DShapeProps) {
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  // Calculate center point for depth label
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

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

      {/* Depth indicator label */}
      <Group listening={false}>
        {/* Background for label */}
        <Rect
          x={centerX - 30}
          y={centerY - 12}
          width={60}
          height={24}
          fill="white"
          opacity={0.8}
          cornerRadius={4}
        />
        {/* Depth text */}
        <KonvaText
          x={centerX - 25}
          y={centerY - 8}
          text={`D: ${depth}${depthUnit}`}
          fontSize={14}
          fontFamily="Arial"
          fill={stroke}
          fontStyle="bold"
        />
      </Group>
    </Group>
  )
}
