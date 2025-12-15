// File: /src/features/documents/components/markup/MeasurementTools.tsx
// Measurement tools component for distance, area, and scale calibration

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import {
  Ruler,
  Square,
  Crosshair,
  Settings,
  Trash2,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MeasurementType,
  MeasurementUnit,
  ScaleCalibration,
  MeasurementAnnotation,
} from '../../types/markup'

interface MeasurementToolsProps {
  activeMeasurementType: MeasurementType | null
  onMeasurementTypeChange: (type: MeasurementType | null) => void
  currentUnit: MeasurementUnit
  onUnitChange: (unit: MeasurementUnit) => void
  scale: ScaleCalibration | null
  onCalibrateScale: (scale: ScaleCalibration) => void
  measurements: MeasurementAnnotation[]
  onDeleteMeasurement: (id: string) => void
  onClearAllMeasurements: () => void
  isCalibrating: boolean
  onStartCalibration: () => void
  onCancelCalibration: () => void
  calibrationPixelDistance: number | null
  disabled?: boolean
  className?: string
}

const UNIT_OPTIONS: { value: MeasurementUnit; label: string; abbrev: string }[] = [
  { value: 'feet', label: 'Feet', abbrev: 'ft' },
  { value: 'inches', label: 'Inches', abbrev: 'in' },
  { value: 'meters', label: 'Meters', abbrev: 'm' },
  { value: 'centimeters', label: 'Centimeters', abbrev: 'cm' },
  { value: 'millimeters', label: 'Millimeters', abbrev: 'mm' },
]

const UNIT_CONVERSION: Record<MeasurementUnit, Record<MeasurementUnit, number>> = {
  feet: { feet: 1, inches: 12, meters: 0.3048, centimeters: 30.48, millimeters: 304.8 },
  inches: { feet: 0.0833333, inches: 1, meters: 0.0254, centimeters: 2.54, millimeters: 25.4 },
  meters: { feet: 3.28084, inches: 39.3701, meters: 1, centimeters: 100, millimeters: 1000 },
  centimeters: { feet: 0.0328084, inches: 0.393701, meters: 0.01, centimeters: 1, millimeters: 10 },
  millimeters: { feet: 0.00328084, inches: 0.0393701, meters: 0.001, centimeters: 0.1, millimeters: 1 },
}

export function MeasurementTools({
  activeMeasurementType,
  onMeasurementTypeChange,
  currentUnit,
  onUnitChange,
  scale,
  onCalibrateScale,
  measurements,
  onDeleteMeasurement,
  onClearAllMeasurements,
  isCalibrating,
  onStartCalibration,
  onCancelCalibration,
  calibrationPixelDistance,
  disabled = false,
  className,
}: MeasurementToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCalibrationDialogOpen, setIsCalibrationDialogOpen] = useState(false)
  const [calibrationValue, setCalibrationValue] = useState('')
  const [calibrationUnit, setCalibrationUnit] = useState<MeasurementUnit>('feet')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const formatMeasurement = useCallback((value: number, unit: MeasurementUnit, toUnit?: MeasurementUnit): string => {
    const targetUnit = toUnit || currentUnit
    const convertedValue = value * UNIT_CONVERSION[unit][targetUnit]
    const abbrev = UNIT_OPTIONS.find(u => u.value === targetUnit)?.abbrev || targetUnit

    // Format based on unit precision
    let precision = 2
    if (targetUnit === 'millimeters' || targetUnit === 'inches') {
      precision = 1
    }

    return `${convertedValue.toFixed(precision)} ${abbrev}`
  }, [currentUnit])

  const handleCalibrationComplete = () => {
    if (!calibrationPixelDistance || !calibrationValue) {return}

    const realWorldDistance = parseFloat(calibrationValue)
    if (isNaN(realWorldDistance) || realWorldDistance <= 0) {return}

    const newScale: ScaleCalibration = {
      id: `scale-${Date.now()}`,
      documentId: '', // Will be set by parent
      pageNumber: 1, // Will be set by parent
      pixelDistance: calibrationPixelDistance,
      realWorldDistance,
      unit: calibrationUnit,
      calibratedBy: '', // Will be set by parent
      calibratedAt: new Date().toISOString(),
    }

    onCalibrateScale(newScale)
    setIsCalibrationDialogOpen(false)
    setCalibrationValue('')
    onCancelCalibration()
  }

  const handleCopyMeasurement = (measurement: MeasurementAnnotation) => {
    const text = formatMeasurement(measurement.value, measurement.unit)
    navigator.clipboard.writeText(text)
    setCopiedId(measurement.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const totalDistance = measurements
    .filter(m => m.type === 'distance')
    .reduce((sum, m) => sum + m.value * UNIT_CONVERSION[m.unit][currentUnit], 0)

  const totalArea = measurements
    .filter(m => m.type === 'area')
    .reduce((sum, m) => sum + m.value * Math.pow(UNIT_CONVERSION[m.unit][currentUnit], 2), 0)

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              'flex items-center gap-2',
              activeMeasurementType && 'bg-blue-50 border-blue-500',
              className
            )}
          >
            <Ruler className="w-4 h-4" />
            <span className="text-xs">Measure</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Tools Section */}
          <div className="p-3 border-b">
            <Label className="text-xs font-medium text-gray-600 mb-2 block">Measurement Tools</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeMeasurementType === 'distance' ? 'default' : 'outline'}
                onClick={() => onMeasurementTypeChange(activeMeasurementType === 'distance' ? null : 'distance')}
                disabled={disabled || !scale}
                className="flex-1"
                title={!scale ? 'Calibrate scale first' : 'Measure distance'}
              >
                <Ruler className="w-4 h-4 mr-1" />
                Distance
              </Button>
              <Button
                size="sm"
                variant={activeMeasurementType === 'area' ? 'default' : 'outline'}
                onClick={() => onMeasurementTypeChange(activeMeasurementType === 'area' ? null : 'area')}
                disabled={disabled || !scale}
                className="flex-1"
                title={!scale ? 'Calibrate scale first' : 'Measure area'}
              >
                <Square className="w-4 h-4 mr-1" />
                Area
              </Button>
            </div>
          </div>

          {/* Scale Calibration */}
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-gray-600">Scale Calibration</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (isCalibrating) {
                    onCancelCalibration()
                  } else {
                    onStartCalibration()
                  }
                }}
                disabled={disabled}
                className="h-7 text-xs"
              >
                {isCalibrating ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3 h-3 mr-1" />
                    {scale ? 'Recalibrate' : 'Calibrate'}
                  </>
                )}
              </Button>
            </div>

            {isCalibrating && (
              <div className="p-2 bg-blue-100 text-blue-800 rounded text-xs mb-2">
                Draw a line on a known dimension (e.g., a scale bar or dimension line on the drawing)
                {calibrationPixelDistance && (
                  <div className="mt-1 font-medium">
                    Pixel distance: {calibrationPixelDistance.toFixed(0)}px
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setIsCalibrationDialogOpen(true)}
                      className="ml-2 h-auto p-0 text-blue-700"
                    >
                      Enter real distance
                    </Button>
                  </div>
                )}
              </div>
            )}

            {scale ? (
              <div className="text-xs text-gray-600">
                <p>Current scale: {scale.pixelDistance.toFixed(0)}px = {scale.realWorldDistance} {scale.unit}</p>
                <p className="text-gray-400">
                  1px = {(scale.realWorldDistance / scale.pixelDistance).toFixed(4)} {scale.unit}
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600">
                No scale calibrated. Calibrate to enable measurements.
              </p>
            )}
          </div>

          {/* Unit Selection */}
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-600">Display Unit</Label>
              <Select
                value={currentUnit}
                onChange={(e) => onUnitChange(e.target.value as MeasurementUnit)}
                className="w-32 h-7 text-xs"
                disabled={disabled}
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.abbrev})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Measurements List */}
          <div className="max-h-48 overflow-y-auto">
            {measurements.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-xs">
                <Ruler className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p>No measurements yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {measurements.map((m, index) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {m.type === 'distance' ? (
                        <Ruler className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Square className="w-3 h-3 text-green-500" />
                      )}
                      <span className="text-sm font-medium">
                        {formatMeasurement(m.value, m.unit)}
                        {m.type === 'area' && <sup>2</sup>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyMeasurement(m)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copy value"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteMeasurement(m.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Delete measurement"
                        disabled={disabled}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {measurements.length > 0 && (
            <div className="p-2 border-t bg-gray-50">
              <div className="flex items-center justify-between text-xs">
                <div>
                  {totalDistance > 0 && (
                    <span className="text-blue-600">
                      Total: {formatMeasurement(totalDistance, currentUnit)}
                    </span>
                  )}
                  {totalArea > 0 && (
                    <span className="text-green-600 ml-2">
                      Area: {formatMeasurement(totalArea, currentUnit)}<sup>2</sup>
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearAllMeasurements}
                  disabled={disabled}
                  className="h-6 text-xs text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Calibration Value Dialog */}
      <Dialog open={isCalibrationDialogOpen} onOpenChange={setIsCalibrationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Real-World Distance</DialogTitle>
            <DialogDescription>
              Enter the actual distance of the line you drew on the drawing.
              This will be used to calculate the scale for all measurements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-100 rounded text-sm">
              <p className="text-gray-600">
                Pixel distance measured: <strong>{calibrationPixelDistance?.toFixed(0)}px</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calibration-value">Distance</Label>
                <Input
                  id="calibration-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={calibrationValue}
                  onChange={(e) => setCalibrationValue(e.target.value)}
                  placeholder="e.g., 10"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calibration-unit">Unit</Label>
                <Select
                  id="calibration-unit"
                  value={calibrationUnit}
                  onChange={(e) => setCalibrationUnit(e.target.value as MeasurementUnit)}
                >
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {calibrationValue && calibrationPixelDistance && (
              <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                <p>
                  Scale: 1 pixel = {(parseFloat(calibrationValue) / calibrationPixelDistance).toFixed(4)}{' '}
                  {UNIT_OPTIONS.find(u => u.value === calibrationUnit)?.abbrev}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCalibrationDialogOpen(false)
                setCalibrationValue('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCalibrationComplete}
              disabled={!calibrationValue || parseFloat(calibrationValue) <= 0}
            >
              Set Scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MeasurementTools
