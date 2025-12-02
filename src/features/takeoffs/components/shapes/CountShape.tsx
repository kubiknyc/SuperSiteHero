// File: /src/features/takeoffs/components/shapes/CountShape.tsx
// Konva shape component for count measurements (Type 3)
// Renders individual markers for discrete items

import { Circle, Group, Text as KonvaText } from 'react-konva'
import type { Point } from '../../utils/measurements'

export interface CountShapeProps {
  id: string
  points: Point[]
  fill?: string
  stroke?: string
  radius?: number
  showNumbers?: boolean
  selected?: boolean
  onClick?: (index: number) => void
  onMouseEnter?: (index: number) => void
  onMouseLeave?: (index: number) => void
}

/**
 * CountShape Component
 * Renders circles at each point for counting measurements
 */
export function CountShape({
  id,
  points,
  fill = '#00FF00',
  stroke = '#006600',
  radius = 8,
  showNumbers = true,
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CountShapeProps) {
  return (
    <Group id={id}>
      {points.map((point, index) => (
        <Group key={`${id}-point-${index}`}>
          {/* Circle marker */}
          <Circle
            x={point.x}
            y={point.y}
            radius={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={selected ? 3 : 2}
            listening={true}
            onClick={() => onClick?.(index)}
            onTap={() => onClick?.(index)}
            onMouseEnter={() => onMouseEnter?.(index)}
            onMouseLeave={() => onMouseLeave?.(index)}
            shadowEnabled={selected}
            shadowColor="black"
            shadowBlur={5}
            shadowOpacity={0.3}
          />
          {/* Number label */}
          {showNumbers && (
            <KonvaText
              x={point.x}
              y={point.y}
              text={`${index + 1}`}
              fontSize={12}
              fontFamily="Arial"
              fill="white"
              align="center"
              verticalAlign="middle"
              offsetX={6}
              offsetY={6}
              listening={false}
            />
          )}
        </Group>
      ))}
    </Group>
  )
}
