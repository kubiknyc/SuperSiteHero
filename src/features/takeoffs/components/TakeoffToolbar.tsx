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
  CheckCircle2,
  Loader2,
  RefreshCw,
  Copy,
  History,
  Trash2,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { MeasurementType, UnitSystem, LinearUnit } from '../utils/measurements'
import { convertLinearUnit } from '../utils/measurements'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TakeoffCalibration } from '../hooks/useTakeoffCalibration'

export interface TakeoffToolbarProps {
  currentTool: MeasurementType
  onToolChange: (tool: MeasurementType) => void
  currentColor?: string
  onColorChange?: (color: string) => void
  scale?: {
    pixelsPerUnit: number
    unit: string
  }
  /** Whether the scale has been persisted to the database */
  isScaleSaved?: boolean
  /** Whether the scale is currently being saved */
  isSavingScale?: boolean
  /** Current unit system (imperial or metric) */
  unitSystem?: UnitSystem
  /** Callback when unit system changes */
  onUnitSystemChange?: (system: UnitSystem) => void
  onCalibrate?: () => void
  onShowList?: () => void
  onExport?: () => void
  measurementCount?: number
  readOnly?: boolean
  /** Current page number (1-indexed) */
  pageNumber?: number
  /** Total pages in the document */
  totalPages?: number
  /** Calibrations from other pages (for copy feature) */
  otherPageCalibrations?: TakeoffCalibration[]
  /** Callback when user wants to copy calibration from another page */
  onCopyFromPage?: (sourcePageNumber: number) => void
  /** Callback when user wants to view calibration history */
  onShowHistory?: () => void
  /** Callback when user wants to clear/delete calibration */
  onClearCalibration?: () => void
  /** Whether a calibration action is in progress */
  isCalibrationPending?: boolean
  /** Current calibration ID (for history access) */
  calibrationId?: string
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
// Unit system display labels
const _UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  imperial: 'Imperial (ft, in)',
  metric: 'Metric (m, cm)',
}

// Get display unit for a unit system
function getDisplayUnit(unit: string, targetSystem: UnitSystem): { value: number; unit: LinearUnit } {
  const linearUnit = unit as LinearUnit

  // Determine if current unit is metric or imperial
  const metricUnits: LinearUnit[] = ['mm', 'cm', 'm', 'km']
  const isMetric = metricUnits.includes(linearUnit)

  if (targetSystem === 'metric' && !isMetric) {
    // Convert imperial to metric (feet -> meters)
    return { value: convertLinearUnit(1, linearUnit, 'm'), unit: 'm' }
  } else if (targetSystem === 'imperial' && isMetric) {
    // Convert metric to imperial (meters -> feet)
    return { value: convertLinearUnit(1, linearUnit, 'ft'), unit: 'ft' }
  }

  return { value: 1, unit: linearUnit }
}

export function TakeoffToolbar({
  currentTool,
  onToolChange,
  currentColor = '#FF0000',
  onColorChange,
  scale,
  isScaleSaved = false,
  isSavingScale = false,
  unitSystem = 'imperial',
  onUnitSystemChange,
  onCalibrate,
  onShowList,
  onExport,
  measurementCount = 0,
  readOnly = false,
  pageNumber = 1,
  totalPages: _totalPages = 1,
  otherPageCalibrations = [],
  onCopyFromPage,
  onShowHistory,
  onClearCalibration,
  isCalibrationPending = false,
  calibrationId,
}: TakeoffToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const currentToolData = MEASUREMENT_TOOLS.find((t) => t.type === currentTool)
  const hasCalibration = !!scale
  const canCopyFromOtherPages = otherPageCalibrations.length > 0
  const canShowHistory = !!calibrationId && !!onShowHistory

  // Convert scale display to current unit system
  const displayScale = scale ? (() => {
    const conversion = getDisplayUnit(scale.unit, unitSystem)
    return {
      pixelsPerUnit: scale.pixelsPerUnit / conversion.value,
      unit: conversion.unit,
    }
  })() : null

  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b shadow-sm">
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
        {displayScale ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs flex items-center gap-1 cursor-help">
                  {isSavingScale ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isScaleSaved ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : null}
                  Scale: {displayScale.pixelsPerUnit.toFixed(2)} px/{displayScale.unit}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isScaleSaved ? 'Scale saved for this page' : 'Scale not saved - will be lost on page change'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="destructive" className="text-xs">
            No Scale
          </Badge>
        )}

        {/* Unit System Toggle */}
        {onUnitSystemChange && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUnitSystemChange(unitSystem === 'imperial' ? 'metric' : 'imperial')}
                  className="text-xs h-7 px-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {unitSystem === 'imperial' ? 'ft' : 'm'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch to {unitSystem === 'imperial' ? 'metric' : 'imperial'} units</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Calibration Menu */}
        {onCalibrate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isCalibrationPending}
                className="gap-1"
              >
                {isCalibrationPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                Calibrate
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Page {pageNumber} Calibration
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Draw calibration line */}
              <DropdownMenuItem onClick={onCalibrate}>
                <Ruler className="w-4 h-4 mr-2" />
                {hasCalibration ? 'Recalibrate Page' : 'Calibrate Page'}
              </DropdownMenuItem>

              {/* Copy from another page */}
              {canCopyFromOtherPages && onCopyFromPage && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy from Page
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {otherPageCalibrations.map((cal) => (
                      <DropdownMenuItem
                        key={cal.page_number}
                        onClick={() => onCopyFromPage(cal.page_number)}
                      >
                        Page {cal.page_number}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {cal.pixels_per_unit.toFixed(1)} px/{cal.unit}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* View history */}
              {canShowHistory && (
                <DropdownMenuItem onClick={onShowHistory}>
                  <History className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
              )}

              {/* Clear calibration */}
              {hasCalibration && onClearCalibration && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onClearCalibration}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Calibration
                  </DropdownMenuItem>
                </>
              )}

              {/* Status info */}
              {hasCalibration && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {isScaleSaved ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Calibration saved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                        Not saved to database
                      </span>
                    )}
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
