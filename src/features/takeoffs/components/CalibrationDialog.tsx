// File: /src/features/takeoffs/components/CalibrationDialog.tsx
// Dialog for calibrating scale on PDF drawings

import { useState } from 'react'
import { Ruler, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import type { Point, ScaleFactor, LinearUnit } from '../utils/measurements'
import { distanceBetweenPoints } from '../utils/measurements'

export interface CalibrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calibrationPoints?: Point[]
  onCalibrationComplete: (scale: ScaleFactor) => void
}

const COMMON_UNITS: Array<{ value: LinearUnit; label: string }> = [
  { value: 'in', label: 'Inches' },
  { value: 'ft', label: 'Feet' },
  { value: 'yd', label: 'Yards' },
  { value: 'm', label: 'Meters' },
  { value: 'cm', label: 'Centimeters' },
]

/**
 * CalibrationDialog Component
 *
 * Allows users to calibrate scale by:
 * 1. Drawing a line on the canvas
 * 2. Entering the known real-world length
 * 3. Selecting the unit
 *
 * Calculates pixels-per-unit ratio for accurate measurements.
 */
export function CalibrationDialog({
  open,
  onOpenChange,
  calibrationPoints,
  onCalibrationComplete,
}: CalibrationDialogProps) {
  const [knownLength, setKnownLength] = useState('')
  const [unit, setUnit] = useState<LinearUnit>('ft')

  // Calculate pixel distance from calibration points
  const pixelDistance =
    calibrationPoints && calibrationPoints.length === 2
      ? distanceBetweenPoints(calibrationPoints[0], calibrationPoints[1])
      : 0

  // Calculate pixels per unit
  const calculatePixelsPerUnit = (): number | null => {
    const length = parseFloat(knownLength)
    if (isNaN(length) || length <= 0 || pixelDistance <= 0) {
      return null
    }
    return pixelDistance / length
  }

  // Handle calibration
  const handleCalibrate = () => {
    const pixelsPerUnit = calculatePixelsPerUnit()
    if (!pixelsPerUnit) return

    const scale: ScaleFactor = {
      pixelsPerUnit,
      unit,
    }

    onCalibrationComplete(scale)
    onOpenChange(false)

    // Reset
    setKnownLength('')
    setUnit('ft')
  }

  // Get accuracy indicator
  const getAccuracyBadge = () => {
    if (pixelDistance === 0) return null

    const pixelsPerUnit = calculatePixelsPerUnit()
    if (!pixelsPerUnit) return null

    // Typical drawing scales:
    // 1/4" = 1' (1:48) → 0.25 in/ft → 3 px/in at 72 DPI → 144 px/ft
    // 1/8" = 1' (1:96) → 0.125 in/ft → 72 px/ft
    // 1" = 10' (1:120) → 0.1 in/ft → 60 px/ft
    // 1" = 20' (1:240) → 0.05 in/ft → 30 px/ft

    if (unit === 'ft') {
      if (pixelsPerUnit > 100) {
        return <Badge variant="default">High accuracy (large scale)</Badge>
      } else if (pixelsPerUnit > 50) {
        return <Badge variant="secondary">Medium accuracy</Badge>
      } else {
        return <Badge variant="outline">Low accuracy (small scale)</Badge>
      }
    }

    return <Badge variant="secondary">Ready to calibrate</Badge>
  }

  const pixelsPerUnit = calculatePixelsPerUnit()
  const canCalibrate = pixelsPerUnit !== null && pixelDistance > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Scale Calibration
          </DialogTitle>
          <DialogDescription>
            Draw a line on a known dimension in the drawing, then enter the actual length below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Calibration Line Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Calibration Line</div>
            {pixelDistance > 0 ? (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Pixel distance: {pixelDistance.toFixed(2)} px
                </div>
                {calibrationPoints && calibrationPoints.length === 2 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    From ({calibrationPoints[0].x.toFixed(0)}, {calibrationPoints[0].y.toFixed(0)})
                    to ({calibrationPoints[1].x.toFixed(0)}, {calibrationPoints[1].y.toFixed(0)})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Draw a line on the canvas to calibrate
              </div>
            )}
          </div>

          {/* Known Length Input */}
          <div className="space-y-2">
            <Label htmlFor="knownLength">Known Length</Label>
            <div className="flex gap-2">
              <Input
                id="knownLength"
                type="number"
                step="0.01"
                placeholder="Enter length"
                value={knownLength}
                onChange={(e) => setKnownLength(e.target.value)}
                className="flex-1"
                disabled={pixelDistance === 0}
              />
              <RadixSelect value={unit} onValueChange={(v) => setUnit(v as LinearUnit)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>
          </div>

          {/* Calculated Scale */}
          {pixelsPerUnit && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Calculated Scale</div>
                {getAccuracyBadge()}
              </div>
              <div className="text-lg font-mono font-semibold">
                {pixelsPerUnit.toFixed(4)} px/{unit}
              </div>
              <div className="text-xs text-muted-foreground">
                1 {unit} = {pixelsPerUnit.toFixed(2)} pixels on screen
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Tips for accurate calibration:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Use a dimension line or scale bar on the drawing</li>
              <li>Choose a longer reference line for better accuracy</li>
              <li>Verify the drawing scale matches the expected ratio</li>
              <li>Recalibrate if zooming significantly</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCalibrate} disabled={!canCalibrate}>
            <Check className="w-4 h-4 mr-2" />
            Apply Calibration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
