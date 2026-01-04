// File: /src/features/documents/components/markup/MeasurementTools.tsx
// Enhanced measurement tools component for distance, area, volume, and scale calibration

import { useState, useCallback, useMemo } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Select } from '@/components/ui/select'
import {
  Ruler,
  Square,
  Crosshair,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Box,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Calculator,
  Sigma,
  Triangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MeasurementType,
  MeasurementUnit,
  VolumeUnit,
  ScaleCalibration,
  MeasurementAnnotation,
  MeasurementExportOptions,
  RunningTotalsState,
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
  onUpdateMeasurement?: (id: string, updates: Partial<MeasurementAnnotation>) => void
  onExportMeasurements?: (options: MeasurementExportOptions) => void
  isCalibrating: boolean
  onStartCalibration: () => void
  onCancelCalibration: () => void
  calibrationPixelDistance: number | null
  pageNumber?: number
  sheetName?: string
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

const VOLUME_UNIT_OPTIONS: { value: VolumeUnit; label: string; abbrev: string }[] = [
  { value: 'cubic_feet', label: 'Cubic Feet', abbrev: 'ft3' },
  { value: 'cubic_meters', label: 'Cubic Meters', abbrev: 'm3' },
  { value: 'cubic_yards', label: 'Cubic Yards', abbrev: 'yd3' },
  { value: 'cubic_inches', label: 'Cubic Inches', abbrev: 'in3' },
  { value: 'liters', label: 'Liters', abbrev: 'L' },
  { value: 'gallons', label: 'Gallons (US)', abbrev: 'gal' },
]

export const UNIT_CONVERSION: Record<MeasurementUnit, Record<MeasurementUnit, number>> = {
  feet: { feet: 1, inches: 12, meters: 0.3048, centimeters: 30.48, millimeters: 304.8 },
  inches: { feet: 0.0833333, inches: 1, meters: 0.0254, centimeters: 2.54, millimeters: 25.4 },
  meters: { feet: 3.28084, inches: 39.3701, meters: 1, centimeters: 100, millimeters: 1000 },
  centimeters: { feet: 0.0328084, inches: 0.393701, meters: 0.01, centimeters: 1, millimeters: 10 },
  millimeters: { feet: 0.00328084, inches: 0.0393701, meters: 0.001, centimeters: 0.1, millimeters: 1 },
}

// Volume conversion to cubic feet as base
const VOLUME_TO_CUBIC_FEET: Record<VolumeUnit, number> = {
  cubic_feet: 1,
  cubic_meters: 35.3147,
  cubic_yards: 27,
  cubic_inches: 0.000578704,
  liters: 0.0353147,
  gallons: 0.133681,
}

// Convert area (in given unit squared) to volume (in cubic feet)
export function calculateVolume(
  areaValue: number,
  areaUnit: MeasurementUnit,
  depth: number,
  depthUnit: MeasurementUnit
): number {
  // Convert area to square feet
  const areaInSqFt = areaValue * Math.pow(UNIT_CONVERSION[areaUnit]['feet'], 2)
  // Convert depth to feet
  const depthInFt = depth * UNIT_CONVERSION[depthUnit]['feet']
  // Volume in cubic feet
  return areaInSqFt * depthInFt
}

// Convert cubic feet to target volume unit
export function convertVolume(cubicFeet: number, toUnit: VolumeUnit): number {
  return cubicFeet / VOLUME_TO_CUBIC_FEET[toUnit]
}

// Format volume with unit
export function formatVolume(value: number, unit: VolumeUnit): string {
  const abbrev = VOLUME_UNIT_OPTIONS.find(u => u.value === unit)?.abbrev || unit
  return `${value.toFixed(2)} ${abbrev}`
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
  onUpdateMeasurement,
  onExportMeasurements,
  isCalibrating,
  onStartCalibration,
  onCancelCalibration,
  calibrationPixelDistance,
  pageNumber = 1,
  sheetName,
  disabled = false,
  className,
}: MeasurementToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCalibrationDialogOpen, setIsCalibrationDialogOpen] = useState(false)
  const [isVolumeDialogOpen, setIsVolumeDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [calibrationValue, setCalibrationValue] = useState('')
  const [calibrationUnit, setCalibrationUnit] = useState<MeasurementUnit>('feet')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tools', 'totals']))

  // Volume calculation state
  const [selectedMeasurementForVolume, setSelectedMeasurementForVolume] = useState<MeasurementAnnotation | null>(null)
  const [volumeDepth, setVolumeDepth] = useState('')
  const [volumeDepthUnit, setVolumeDepthUnit] = useState<MeasurementUnit>('feet')
  const [volumeDisplayUnit, setVolumeDisplayUnit] = useState<VolumeUnit>('cubic_feet')

  // Export options state
  const [exportOptions, setExportOptions] = useState<MeasurementExportOptions>({
    format: 'csv',
    includeScale: true,
    groupByPage: true,
    groupByType: false,
    includeTimestamps: true,
    includeUserInfo: false,
  })

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

  // Calculate running totals
  const runningTotals = useMemo((): RunningTotalsState => {
    const distanceTotal = measurements
      .filter(m => m.type === 'distance')
      .reduce((sum, m) => sum + m.value * UNIT_CONVERSION[m.unit][currentUnit], 0)

    const areaTotal = measurements
      .filter(m => m.type === 'area')
      .reduce((sum, m) => sum + m.value * Math.pow(UNIT_CONVERSION[m.unit][currentUnit], 2), 0)

    const volumeTotal = measurements
      .filter(m => m.type === 'volume' || m.volumeValue)
      .reduce((sum, m) => {
        if (m.volumeValue && m.volumeUnit) {
          // Convert to cubic feet then to current display preference
          const cubicFeet = m.volumeValue * VOLUME_TO_CUBIC_FEET[m.volumeUnit]
          return sum + cubicFeet
        }
        return sum
      }, 0)

    // Count angle measurements
    const angleCount = measurements.filter(m => m.type === 'angle').length

    return {
      distanceTotal,
      areaTotal,
      volumeTotal,
      angleCount,
      countsByCategory: {},
      measurementCount: measurements.length,
    }
  }, [measurements, currentUnit])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const handleCalibrationComplete = () => {
    if (!calibrationPixelDistance || !calibrationValue) return

    const realWorldDistance = parseFloat(calibrationValue)
    if (isNaN(realWorldDistance) || realWorldDistance <= 0) return

    const newScale: ScaleCalibration = {
      id: `scale-${Date.now()}`,
      documentId: '', // Will be set by parent
      pageNumber: pageNumber,
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
    let text = formatMeasurement(measurement.value, measurement.unit)
    if (measurement.type === 'area') {
      text += '2'
    }
    if (measurement.volumeValue && measurement.volumeUnit) {
      text += ` (Volume: ${formatVolume(measurement.volumeValue, measurement.volumeUnit)})`
    }
    navigator.clipboard.writeText(text)
    setCopiedId(measurement.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyTotals = useCallback(() => {
    const lines: string[] = []
    if (runningTotals.distanceTotal > 0) {
      lines.push(`Total Distance: ${formatMeasurement(runningTotals.distanceTotal, currentUnit)}`)
    }
    if (runningTotals.areaTotal > 0) {
      lines.push(`Total Area: ${formatMeasurement(runningTotals.areaTotal, currentUnit)} sq`)
    }
    if (runningTotals.volumeTotal > 0) {
      lines.push(`Total Volume: ${formatVolume(convertVolume(runningTotals.volumeTotal, volumeDisplayUnit), volumeDisplayUnit)}`)
    }
    lines.push(`\nMeasurement Count: ${runningTotals.measurementCount}`)

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedId('totals')
    setTimeout(() => setCopiedId(null), 2000)
  }, [runningTotals, currentUnit, formatMeasurement, volumeDisplayUnit])

  const handleOpenVolumeDialog = useCallback((measurement: MeasurementAnnotation) => {
    if (measurement.type !== 'area') return
    setSelectedMeasurementForVolume(measurement)
    setVolumeDepth('')
    setVolumeDepthUnit(currentUnit)
    setIsVolumeDialogOpen(true)
  }, [currentUnit])

  const handleCalculateVolume = useCallback(() => {
    if (!selectedMeasurementForVolume || !volumeDepth) return

    const depth = parseFloat(volumeDepth)
    if (isNaN(depth) || depth <= 0) return

    const volumeInCubicFeet = calculateVolume(
      selectedMeasurementForVolume.value,
      selectedMeasurementForVolume.unit,
      depth,
      volumeDepthUnit
    )

    const volumeInDisplayUnit = convertVolume(volumeInCubicFeet, volumeDisplayUnit)

    if (onUpdateMeasurement) {
      onUpdateMeasurement(selectedMeasurementForVolume.id, {
        depth,
        depthUnit: volumeDepthUnit,
        volumeValue: volumeInDisplayUnit,
        volumeUnit: volumeDisplayUnit,
      })
    }

    setIsVolumeDialogOpen(false)
    setSelectedMeasurementForVolume(null)
    setVolumeDepth('')
  }, [selectedMeasurementForVolume, volumeDepth, volumeDepthUnit, volumeDisplayUnit, onUpdateMeasurement])

  const handleExport = useCallback(() => {
    if (onExportMeasurements) {
      onExportMeasurements(exportOptions)
    }
    setIsExportDialogOpen(false)
  }, [onExportMeasurements, exportOptions])

  // Get measurement icon based on type
  const getMeasurementIcon = useCallback((type: MeasurementType) => {
    switch (type) {
      case 'distance':
        return <Ruler className="w-3 h-3 text-primary" />
      case 'area':
        return <Square className="w-3 h-3 text-success" />
      case 'volume':
        return <Box className="w-3 h-3 text-purple-500" />
      case 'angle':
        return <Triangle className="w-3 h-3 text-amber-500" />
      default:
        return <Ruler className="w-3 h-3 text-secondary" />
    }
  }, [])

  // Filtered measurements by type for display
  const distanceMeasurements = measurements.filter(m => m.type === 'distance')
  const areaMeasurements = measurements.filter(m => m.type === 'area')
  const volumeMeasurements = measurements.filter(m => m.volumeValue !== undefined)
  const angleMeasurements = measurements.filter(m => m.type === 'angle')

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
              activeMeasurementType && 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400',
              className
            )}
          >
            <Ruler className="w-4 h-4" />
            <span className="text-xs">Measure</span>
            {measurements.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full dark:bg-blue-800 dark:text-blue-200">
                {measurements.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0 max-h-[80vh] overflow-hidden flex flex-col" align="start">
          {/* Tools Section */}
          <div className="p-3 border-b dark:border-gray-700">
            <button
              onClick={() => toggleSection('tools')}
              className="flex items-center justify-between w-full text-left"
            >
              <Label className="text-xs font-medium text-secondary dark:text-gray-400">Measurement Tools</Label>
              {expandedSections.has('tools') ? (
                <ChevronUp className="w-4 h-4 text-secondary" />
              ) : (
                <ChevronDown className="w-4 h-4 text-secondary" />
              )}
            </button>
            {expandedSections.has('tools') && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMeasurementType === 'distance' ? 'default' : 'outline'}
                      onClick={() => onMeasurementTypeChange(activeMeasurementType === 'distance' ? null : 'distance')}
                      disabled={disabled || !scale}
                      className="flex-1"
                    >
                      <Ruler className="w-4 h-4 mr-1" />
                      Distance
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!scale ? 'Calibrate scale first' : 'Measure distance between two points'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMeasurementType === 'area' ? 'default' : 'outline'}
                      onClick={() => onMeasurementTypeChange(activeMeasurementType === 'area' ? null : 'area')}
                      disabled={disabled || !scale}
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Area
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!scale ? 'Calibrate scale first' : 'Measure area of a polygon'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMeasurementType === 'perimeter' ? 'default' : 'outline'}
                      onClick={() => onMeasurementTypeChange(activeMeasurementType === 'perimeter' ? null : 'perimeter')}
                      disabled={disabled || !scale}
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-1" strokeDasharray="2 2" />
                      Perimeter
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!scale ? 'Calibrate scale first' : 'Measure perimeter of a polygon'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMeasurementType === 'angle' ? 'default' : 'outline'}
                      onClick={() => onMeasurementTypeChange(activeMeasurementType === 'angle' ? null : 'angle')}
                      disabled={disabled}
                      className="flex-1"
                    >
                      <Triangle className="w-4 h-4 mr-1" />
                      Angle
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Click 3 points to measure angle (vertex first)
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Scale Calibration */}
          <div className="p-3 border-b bg-surface dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-secondary dark:text-gray-400">Scale Calibration</Label>
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
              <div className="p-2 bg-blue-50 text-blue-800 rounded text-xs mb-2 dark:bg-blue-900/30 dark:text-blue-200">
                Draw a line on a known dimension (e.g., a scale bar or dimension line on the drawing)
                {calibrationPixelDistance && (
                  <div className="mt-1 font-medium">
                    Pixel distance: {calibrationPixelDistance.toFixed(0)}px
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setIsCalibrationDialogOpen(true)}
                      className="ml-2 h-auto p-0 text-blue-600 dark:text-blue-400"
                    >
                      Enter real distance
                    </Button>
                  </div>
                )}
              </div>
            )}

            {scale ? (
              <div className="text-xs text-secondary dark:text-gray-400">
                <p>Current scale: {scale.pixelDistance.toFixed(0)}px = {scale.realWorldDistance} {scale.unit}</p>
                <p className="text-disabled dark:text-gray-500">
                  1px = {(scale.realWorldDistance / scale.pixelDistance).toFixed(4)} {scale.unit}
                </p>
              </div>
            ) : (
              <p className="text-xs text-warning dark:text-yellow-400">
                No scale calibrated. Calibrate to enable measurements.
              </p>
            )}
          </div>

          {/* Unit Selection */}
          <div className="p-3 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-secondary dark:text-gray-400">Display Unit</Label>
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

          {/* Running Totals Section */}
          {measurements.length > 0 && (
            <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 dark:border-gray-700">
              <button
                onClick={() => toggleSection('totals')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Sigma className="w-4 h-4 text-secondary" />
                  <Label className="text-xs font-medium text-secondary dark:text-gray-400">Running Totals</Label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyTotals()
                    }}
                    className="p-1 hover:bg-white/50 rounded dark:hover:bg-gray-700/50"
                    title="Copy totals"
                  >
                    {copiedId === 'totals' ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3 text-secondary" />
                    )}
                  </button>
                  {expandedSections.has('totals') ? (
                    <ChevronUp className="w-4 h-4 text-secondary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  )}
                </div>
              </button>

              {expandedSections.has('totals') && (
                <div className="mt-2 space-y-2">
                  {runningTotals.distanceTotal > 0 && (
                    <div className="flex items-center justify-between p-2 bg-white/60 rounded dark:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-3 h-3 text-primary" />
                        <span className="text-xs text-secondary dark:text-gray-400">
                          Distance ({distanceMeasurements.length})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary dark:text-blue-400">
                        {formatMeasurement(runningTotals.distanceTotal, currentUnit)}
                      </span>
                    </div>
                  )}

                  {runningTotals.areaTotal > 0 && (
                    <div className="flex items-center justify-between p-2 bg-white/60 rounded dark:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Square className="w-3 h-3 text-success" />
                        <span className="text-xs text-secondary dark:text-gray-400">
                          Area ({areaMeasurements.length})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-success dark:text-green-400">
                        {formatMeasurement(runningTotals.areaTotal, currentUnit)}<sup>2</sup>
                      </span>
                    </div>
                  )}

                  {runningTotals.volumeTotal > 0 && (
                    <div className="flex items-center justify-between p-2 bg-white/60 rounded dark:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Box className="w-3 h-3 text-purple-500" />
                        <span className="text-xs text-secondary dark:text-gray-400">
                          Volume ({volumeMeasurements.length})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {formatVolume(convertVolume(runningTotals.volumeTotal, volumeDisplayUnit), volumeDisplayUnit)}
                      </span>
                    </div>
                  )}

                  {angleMeasurements.length > 0 && (
                    <div className="flex items-center justify-between p-2 bg-white/60 rounded dark:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Triangle className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-secondary dark:text-gray-400">
                          Angles ({angleMeasurements.length})
                        </span>
                      </div>
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        {angleMeasurements.length} measured
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Measurements List */}
          <div className="flex-1 overflow-y-auto max-h-48">
            {measurements.length === 0 ? (
              <div className="p-4 text-center text-muted text-xs">
                <Ruler className="w-6 h-6 mx-auto mb-1 text-disabled" />
                <p>No measurements yet</p>
                <p className="text-secondary mt-1 dark:text-gray-400">Select a tool and click on the drawing</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {measurements.map((m, index) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 hover:bg-surface dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getMeasurementIcon(m.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium dark:text-gray-200">
                            {formatMeasurement(m.value, m.unit)}
                            {m.type === 'area' && <sup>2</sup>}
                          </span>
                          {m.type === 'angle' && m.angleValue && (
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                              {m.angleValue.toFixed(1)}deg
                            </span>
                          )}
                        </div>
                        {m.volumeValue && m.volumeUnit && (
                          <div className="text-xs text-purple-600 dark:text-purple-400">
                            Vol: {formatVolume(m.volumeValue, m.volumeUnit)}
                          </div>
                        )}
                        <div className="text-xs text-secondary dark:text-gray-500">
                          #{index + 1} {m.displayLabel && `- ${m.displayLabel}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.type === 'area' && !m.volumeValue && onUpdateMeasurement && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleOpenVolumeDialog(m)}
                              className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                              title="Calculate volume"
                            >
                              <Calculator className="w-3 h-3 text-purple-500" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Add depth to calculate volume</TooltipContent>
                        </Tooltip>
                      )}
                      <button
                        onClick={() => handleCopyMeasurement(m)}
                        className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                        title="Copy value"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteMeasurement(m.id)}
                        className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                        title="Delete measurement"
                        disabled={disabled}
                      >
                        <Trash2 className="w-3 h-3 text-error" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {measurements.length > 0 && (
            <div className="p-2 border-t bg-surface flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearAllMeasurements}
                disabled={disabled}
                className="h-6 text-xs text-error hover:text-error-dark"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>

              {onExportMeasurements && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(true)}
                  disabled={disabled}
                  className="h-6 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              )}
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
            <div className="p-3 bg-muted rounded text-sm dark:bg-gray-800">
              <p className="text-secondary dark:text-gray-400">
                Pixel distance measured: <strong className="dark:text-gray-200">{calibrationPixelDistance?.toFixed(0)}px</strong>
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
              <div className="p-3 bg-blue-50 rounded text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
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

      {/* Volume Calculation Dialog */}
      <Dialog open={isVolumeDialogOpen} onOpenChange={setIsVolumeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calculate Volume</DialogTitle>
            <DialogDescription>
              Enter the depth/height to calculate volume from the selected area measurement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedMeasurementForVolume && (
              <div className="p-3 bg-green-50 rounded text-sm dark:bg-green-900/30">
                <div className="flex items-center gap-2">
                  <Square className="w-4 h-4 text-success" />
                  <span className="font-medium text-success dark:text-green-400">
                    Area: {formatMeasurement(selectedMeasurementForVolume.value, selectedMeasurementForVolume.unit)}
                    <sup>2</sup>
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="volume-depth">Depth/Height</Label>
                <Input
                  id="volume-depth"
                  type="number"
                  step="0.01"
                  min="0"
                  value={volumeDepth}
                  onChange={(e) => setVolumeDepth(e.target.value)}
                  placeholder="e.g., 8"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depth-unit">Unit</Label>
                <Select
                  id="depth-unit"
                  value={volumeDepthUnit}
                  onChange={(e) => setVolumeDepthUnit(e.target.value as MeasurementUnit)}
                >
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume-display-unit">Display Volume In</Label>
              <Select
                id="volume-display-unit"
                value={volumeDisplayUnit}
                onChange={(e) => setVolumeDisplayUnit(e.target.value as VolumeUnit)}
              >
                {VOLUME_UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.abbrev})
                  </option>
                ))}
              </Select>
            </div>

            {volumeDepth && selectedMeasurementForVolume && (
              <div className="p-3 bg-purple-50 rounded text-sm dark:bg-purple-900/30">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">
                    Volume: {formatVolume(
                      convertVolume(
                        calculateVolume(
                          selectedMeasurementForVolume.value,
                          selectedMeasurementForVolume.unit,
                          parseFloat(volumeDepth),
                          volumeDepthUnit
                        ),
                        volumeDisplayUnit
                      ),
                      volumeDisplayUnit
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsVolumeDialogOpen(false)
                setSelectedMeasurementForVolume(null)
                setVolumeDepth('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCalculateVolume}
              disabled={!volumeDepth || parseFloat(volumeDepth) <= 0}
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculate Volume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Measurements</DialogTitle>
            <DialogDescription>
              Export all measurements to a file for use in other applications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-2">
                {(['csv', 'xlsx', 'json'] as const).map((format) => (
                  <Button
                    key={format}
                    size="sm"
                    variant={exportOptions.format === format ? 'default' : 'outline'}
                    onClick={() => setExportOptions({ ...exportOptions, format })}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Options</Label>

              <div className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-300">Include scale information</span>
                <button
                  onClick={() => setExportOptions({ ...exportOptions, includeScale: !exportOptions.includeScale })}
                  className={cn(
                    'w-8 h-5 rounded-full transition-colors relative',
                    exportOptions.includeScale ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      exportOptions.includeScale ? 'left-3.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-300">Group by page</span>
                <button
                  onClick={() => setExportOptions({ ...exportOptions, groupByPage: !exportOptions.groupByPage })}
                  className={cn(
                    'w-8 h-5 rounded-full transition-colors relative',
                    exportOptions.groupByPage ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      exportOptions.groupByPage ? 'left-3.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-300">Group by measurement type</span>
                <button
                  onClick={() => setExportOptions({ ...exportOptions, groupByType: !exportOptions.groupByType })}
                  className={cn(
                    'w-8 h-5 rounded-full transition-colors relative',
                    exportOptions.groupByType ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      exportOptions.groupByType ? 'left-3.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-300">Include timestamps</span>
                <button
                  onClick={() => setExportOptions({ ...exportOptions, includeTimestamps: !exportOptions.includeTimestamps })}
                  className={cn(
                    'w-8 h-5 rounded-full transition-colors relative',
                    exportOptions.includeTimestamps ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      exportOptions.includeTimestamps ? 'left-3.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="p-3 bg-muted rounded text-sm dark:bg-gray-800">
              <p className="text-secondary dark:text-gray-400">
                {measurements.length} measurement{measurements.length !== 1 ? 's' : ''} will be exported
                {sheetName && ` from ${sheetName}`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MeasurementTools
