// File: /src/features/takeoffs/components/shapes/Volume3DShape.tsx
// Konva shape component for 3D volume measurements (Type 9)
// Renders multiple cross-sections with elevation indicators

import { Group, Line, Text as KonvaText } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface CrossSection {
  points: Point[]
  elevation: number
}

export interface Volume3DShapeProps {
  id: string
  crossSections: CrossSection[]
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillOpacity?: number
  elevationUnit?: string
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Volume3DShape Component
 * Renders multiple cross-sections at different elevations
 */
export function Volume3DShape({
  id,
  crossSections,
  stroke = '#DC143C',
  strokeWidth = 2,
  fill = '#DC143C',
  fillOpacity = 0.2,
  elevationUnit = 'ft',
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Volume3DShapeProps) {
  // Sort cross-sections by elevation
  const sorted = [...crossSections].sort((a, b) => a.elevation - b.elevation)

  return (
    <Group id={id}>
      {sorted.map((section, index) => {
        const flatPoints = section.points.flatMap((p) => [p.x, p.y])
        const isFirst = index === 0
        const isLast = index === sorted.length - 1

        // Calculate label position (first point of section)
        const labelPoint = section.points[0] || { x: 0, y: 0 }

        // Vary opacity by elevation (darker = lower)
        const sectionOpacity = fillOpacity * (0.5 + (index / sorted.length) * 0.5)

        return (
          <Group key={`section-${index}`}>
            {/* Cross-section polygon */}
            <Line
              points={flatPoints}
              stroke={stroke}
              strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
              fill={fill}
              opacity={sectionOpacity}
              closed={true}
              listening={true}
              onClick={onClick}
              onTap={onClick}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              shadowEnabled={selected && (isFirst || isLast)}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.3}
              hitStrokeWidth={10}
              dash={index > 0 && index < sorted.length - 1 ? [5, 5] : undefined}
            />

            {/* Elevation label */}
            <KonvaText
              x={labelPoint.x + 5}
              y={labelPoint.y - 15}
              text={`${section.elevation}${elevationUnit}`}
              fontSize={11}
              fontFamily="Arial"
              fill={stroke}
              listening={false}
            />
          </Group>
        )
      })}
    </Group>
  )
}
