// File: /src/features/takeoffs/components/TakeoffItemCard.tsx
// Detail card for editing individual takeoff measurements

import { useState } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TakeoffMeasurement } from './TakeoffCanvas'
import type { MeasurementType, ScaleFactor } from '../utils/measurements'
import {
  calculateLinear,
  calculateArea,
  calculateCount,
  calculateLinearWithDrop,
  calculatePitchedArea,
  calculatePitchedLinear,
  calculateSurfaceArea,
  calculateVolume2D,
} from '../utils/measurements'

export interface TakeoffItemCardProps {
  measurement: TakeoffMeasurement
  scale?: ScaleFactor
  onUpdate: (id: string, updates: Partial<TakeoffMeasurement>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  linear: 'Linear',
  area: 'Area',
  count: 'Count',
  linear_with_drop: 'Linear + Drop',
  pitched_area: 'Pitched Area',
  pitched_linear: 'Pitched Linear',
  surface_area: 'Surface Area',
  volume_2d: 'Volume 2D',
  volume_3d: 'Volume 3D',
}

/**
 * TakeoffItemCard Component
 *
 * Detail editor for individual measurement.
 * Features:
 * - Edit name and color
 * - Edit type-specific properties
 * - View calculated values
 * - Delete measurement
 */
export function TakeoffItemCard({
  measurement,
  scale,
  onUpdate,
  onDelete,
  onClose,
}: TakeoffItemCardProps) {
  const [name, setName] = useState(measurement.name || '')
  const [color, setColor] = useState(measurement.color)
  const [dropHeight, setDropHeight] = useState(measurement.dropHeight?.toString() || '10')
  const [pitch, setPitch] = useState(measurement.pitch?.toString() || '0.333')
  const [height, setHeight] = useState(measurement.height?.toString() || '8')
  const [depth, setDepth] = useState(measurement.depth?.toString() || '0.5')

  // Calculate and format measurement value
  const getCalculatedValue = (): string => {
    if (!scale) return '-- (No scale)'

    try {
      switch (measurement.type) {
        case 'linear': {
          const value = calculateLinear(measurement.points, scale, 'ft')
          return `${value.toFixed(2)} LF`
        }

        case 'area': {
          const value = calculateArea(measurement.points, scale, 'ft2')
          return `${value.toFixed(2)} SF`
        }

        case 'count': {
          const value = calculateCount(measurement.points)
          return `${value} EA`
        }

        case 'linear_with_drop': {
          const result = calculateLinearWithDrop(
            measurement.points,
            measurement.dropHeight || 0,
            scale,
            'ft'
          )
          return `${result.total.toFixed(2)} LF (H: ${result.horizontal.toFixed(2)}, V: ${result.vertical.toFixed(2)})`
        }

        case 'pitched_area': {
          const result = calculatePitchedArea(
            measurement.points,
            measurement.pitch || 0,
            scale,
            'ft2'
          )
          return `${result.actual.toFixed(2)} SF (Planar: ${result.planar.toFixed(2)})`
        }

        case 'pitched_linear': {
          const result = calculatePitchedLinear(
            measurement.points,
            measurement.pitch || 0,
            scale,
            'ft'
          )
          return `${result.actual.toFixed(2)} LF (Horizontal: ${result.horizontal.toFixed(2)})`
        }

        case 'surface_area': {
          const result = calculateSurfaceArea(
            measurement.points,
            measurement.height || 0,
            scale,
            'ft2',
            false
          )
          return `${result.total.toFixed(2)} SF`
        }

        case 'volume_2d': {
          const value = calculateVolume2D(measurement.points, measurement.depth || 0, scale, 'ft3')
          return `${value.toFixed(2)} CF`
        }

        case 'volume_3d':
          return 'N/A (Requires multiple sections)'

        default:
          return 'Unknown type'
      }
    } catch (error) {
      return 'Error calculating'
    }
  }

  // Handle save
  const handleSave = () => {
    const updates: Partial<TakeoffMeasurement> = {
      name: name.trim() || undefined,
      color,
    }

    // Add type-specific properties
    if (measurement.type === 'linear_with_drop') {
      updates.dropHeight = parseFloat(dropHeight) || 10
    } else if (measurement.type === 'pitched_area' || measurement.type === 'pitched_linear') {
      updates.pitch = parseFloat(pitch) || 0.333
    } else if (measurement.type === 'surface_area') {
      updates.height = parseFloat(height) || 8
    } else if (measurement.type === 'volume_2d') {
      updates.depth = parseFloat(depth) || 0.5
    }

    onUpdate(measurement.id, updates)
  }

  // Handle delete
  const handleDelete = () => {
    if (confirm('Delete this measurement? This cannot be undone.')) {
      onDelete(measurement.id)
      onClose()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Edit Measurement</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type (read-only) */}
        <div className="space-y-2">
          <Label>Type</Label>
          <Input value={MEASUREMENT_TYPE_LABELS[measurement.type]} disabled />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter measurement name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
          </div>
        </div>

        {/* Type-specific properties */}
        {measurement.type === 'linear_with_drop' && (
          <div className="space-y-2">
            <Label htmlFor="dropHeight">Drop Height (ft)</Label>
            <Input
              id="dropHeight"
              type="number"
              step="0.1"
              value={dropHeight}
              onChange={(e) => setDropHeight(e.target.value)}
            />
          </div>
        )}

        {(measurement.type === 'pitched_area' || measurement.type === 'pitched_linear') && (
          <div className="space-y-2">
            <Label htmlFor="pitch">Pitch (rise/run)</Label>
            <RadixSelect value={pitch} onValueChange={setPitch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.083">1:12</SelectItem>
                <SelectItem value="0.167">2:12</SelectItem>
                <SelectItem value="0.25">3:12</SelectItem>
                <SelectItem value="0.333">4:12</SelectItem>
                <SelectItem value="0.417">5:12</SelectItem>
                <SelectItem value="0.5">6:12</SelectItem>
                <SelectItem value="0.583">7:12</SelectItem>
                <SelectItem value="0.667">8:12</SelectItem>
                <SelectItem value="0.75">9:12</SelectItem>
                <SelectItem value="0.833">10:12</SelectItem>
                <SelectItem value="0.917">11:12</SelectItem>
                <SelectItem value="1.0">12:12</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>
        )}

        {measurement.type === 'surface_area' && (
          <div className="space-y-2">
            <Label htmlFor="height">Height (ft)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        )}

        {measurement.type === 'volume_2d' && (
          <div className="space-y-2">
            <Label htmlFor="depth">Depth (ft)</Label>
            <Input
              id="depth"
              type="number"
              step="0.01"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
          </div>
        )}

        {/* Calculated Value */}
        <div className="space-y-2 pt-4 border-t">
          <Label>Calculated Value</Label>
          <div className="font-mono text-lg font-semibold">{getCalculatedValue()}</div>
        </div>

        {/* Point Count */}
        <div className="text-sm text-muted-foreground">
          {measurement.points.length} point{measurement.points.length !== 1 ? 's' : ''}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
