// File: /src/features/takeoffs/components/shapes/PitchedLinearShape.tsx
// Konva shape component for pitched linear measurements (Type 6)
// Renders angled line representing sloped measurement

import { Group, Line, Text as KonvaText } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface PitchedLinearShapeProps {
  id: string
  points: Point[]
  pitch: number // Rise over run
  stroke?: string
  strokeWidth?: number
  showPitchLabel?: boolean
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * PitchedLinearShape Component
 * Renders line with pitch angle indicator
 */
export function PitchedLinearShape({
  id,
  points,
  pitch,
  stroke = '#9400D3',
  strokeWidth = 2,
  showPitchLabel = true,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PitchedLinearShapeProps) {
  const flatPoints = points.flatMap((p) => [p.x, p.y])

  // Calculate pitch angle in degrees
  const pitchAngle = (Math.atan(pitch) * 180) / Math.PI

  // Calculate midpoint for label
  const midIndex = Math.floor(points.length / 2)
  const midPoint = points[midIndex] || points[0]

  return (
    <Group id={id}>
      {/* Main line */}
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
      {/* Pitch label */}
      {showPitchLabel && (
        <KonvaText
          x={midPoint.x}
          y={midPoint.y - 20}
          text={`${pitchAngle.toFixed(1)}°`}
          fontSize={12}
          fontFamily="Arial"
          fill={stroke}
          align="center"
          listening={false}
        />
      )}
    </Group>
  )
}
