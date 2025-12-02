// File: /src/features/takeoffs/components/TakeoffToolbar.tsx
// Toolbar for selecting measurement tools and canvas settings

import { useState } from 'react'
import {
  Ruler,
  Square,
  Hash,
  TrendingDown,
  Triangle,
  Slash,
  Layers,
  Box,
  Boxes,
  Palette,
  Settings,
  Download,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { MeasurementType } from '../utils/measurements'

export interface TakeoffToolbarProps {
  currentTool: MeasurementType
  onToolChange: (tool: MeasurementType) => void
  currentColor?: string
  onColorChange?: (color: string) => void
  scale?: {
    pixelsPerUnit: number
    unit: string
  }
  onCalibrate?: () => void
  onShowList?: () => void
  onExport?: () => void
  measurementCount?: number
  readOnly?: boolean
}

const MEASUREMENT_TOOLS: Array<{
  type: MeasurementType
  label: string
  icon: typeof Ruler
  color: string
  description: string
}> = [
  {
    type: 'linear',
    label: 'Linear',
    icon: Ruler,
    color: '#FF0000',
    description: 'Measure straight lines and polylines',
  },
  {
    type: 'area',
    label: 'Area',
    icon: Square,
    color: '#0000FF',
    description: 'Measure enclosed areas',
  },
  {
    type: 'count',
    label: 'Count',
    icon: Hash,
    color: '#00FF00',
    description: 'Count discrete items',
  },
  {
    type: 'linear_with_drop',
    label: 'Linear + Drop',
    icon: TrendingDown,
    color: '#FF00FF',
    description: 'Measure with elevation change',
  },
  {
    type: 'pitched_area',
    label: 'Pitched Area',
    icon: Triangle,
    color: '#FFA500',
    description: 'Measure sloped surfaces (roofing)',
  },
  {
    type: 'pitched_linear',
    label: 'Pitched Linear',
    icon: Slash,
    color: '#9400D3',
    description: 'Measure sloped lengths (ramps)',
  },
  {
    type: 'surface_area',
    label: 'Surface Area',
    icon: Layers,
    color: '#8B4513',
    description: 'Measure 3D surface area (walls)',
  },
  {
    type: 'volume_2d',
    label: 'Volume 2D',
    icon: Box,
    color: '#4169E1',
    description: 'Measure volume from area + depth',
  },
  {
    type: 'volume_3d',
    label: 'Volume 3D',
    icon: Boxes,
    color: '#DC143C',
    description: 'Measure volume from cross-sections',
  },
]

const PRESET_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00FF00', // Green
  '#FF00FF', // Magenta
  '#FFA500', // Orange
  '#9400D3', // Purple
  '#8B4513', // Brown
  '#4169E1', // Royal Blue
  '#DC143C', // Crimson
  '#000000', // Black
]

/**
 * TakeoffToolbar Component
 *
 * Provides tool selection and settings for takeoff measurements.
 * Features:
 * - 9 measurement type tools
 * - Color picker
 * - Scale calibration
 * - Measurement list toggle
 * - Export options
 */
export function TakeoffToolbar({
  currentTool,
  onToolChange,
  currentColor = '#FF0000',
  onColorChange,
  scale,
  onCalibrate,
  onShowList,
  onExport,
  measurementCount = 0,
  readOnly = false,
}: TakeoffToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const currentToolData = MEASUREMENT_TOOLS.find((t) => t.type === currentTool)

  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b shadow-sm">
      {/* Tool Selection Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={readOnly} className="min-w-[180px] justify-start">
            {currentToolData && (
              <>
                <currentToolData.icon className="w-4 h-4 mr-2" />
                {currentToolData.label}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {MEASUREMENT_TOOLS.map((tool) => (
            <DropdownMenuItem
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              className="flex items-start gap-2 cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: tool.color + '20' }}
              >
                <tool.icon className="w-4 h-4" style={{ color: tool.color }} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{tool.label}</div>
                <div className="text-xs text-muted-foreground">{tool.description}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-8 w-px bg-border mx-2" />

      {/* Color Picker */}
      {onColorChange && (
        <DropdownMenu open={showColorPicker} onOpenChange={setShowColorPicker}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={readOnly}>
              <Palette className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="grid grid-cols-5 gap-2 p-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    borderColor: color === currentColor ? '#000' : '#e5e7eb',
                  }}
                  onClick={() => {
                    onColorChange(color)
                    setShowColorPicker(false)
                  }}
                  title={color}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Scale Status & Calibration */}
      <div className="flex items-center gap-2">
        {scale ? (
          <Badge variant="outline" className="text-xs">
            Scale: {scale.pixelsPerUnit.toFixed(2)} px/{scale.unit}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">
            No Scale
          </Badge>
        )}
        {onCalibrate && (
          <Button variant="outline" size="sm" onClick={onCalibrate}>
            <Settings className="w-4 h-4 mr-1" />
            Calibrate
          </Button>
        )}
      </div>

      <div className="flex-1" />

      {/* Measurement Count */}
      {measurementCount > 0 && (
        <Badge variant="secondary" className="text-sm">
          {measurementCount} measurement{measurementCount !== 1 ? 's' : ''}
        </Badge>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onShowList && (
          <Button variant="outline" size="sm" onClick={onShowList}>
            <List className="w-4 h-4 mr-1" />
            List
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={measurementCount === 0}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        )}
      </div>
    </div>
  )
}
