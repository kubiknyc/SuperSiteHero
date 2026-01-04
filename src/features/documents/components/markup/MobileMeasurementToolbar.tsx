// File: /src/features/documents/components/markup/MobileMeasurementToolbar.tsx
// Mobile-optimized measurement toolbar with touch-friendly controls

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Ruler,
  Square,
  Triangle,
  Hash,
  Box,
  Crosshair,
  Trash2,
  Download,
  Copy,
  Check,
  ChevronRight,
  X,
  Sigma,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MeasurementType,
  MeasurementUnit,
  ScaleCalibration,
  MeasurementAnnotation,
  CountCategory,
  CountMarker,
} from '../../types/markup'
import { UNIT_CONVERSION, formatVolume, convertVolume } from './MeasurementTools'

interface MobileMeasurementToolbarProps {
  // Measurement state
  activeMeasurementType: MeasurementType | null
  onMeasurementTypeChange: (type: MeasurementType | null) => void
  currentUnit: MeasurementUnit
  measurements: MeasurementAnnotation[]
  onDeleteMeasurement: (id: string) => void
  onClearAllMeasurements: () => void

  // Scale state
  scale: ScaleCalibration | null
  isCalibrating: boolean
  onStartCalibration: () => void
  onCancelCalibration: () => void

  // Count state
  isCountActive: boolean
  onCountActiveChange: (active: boolean) => void
  activeCountCategory: CountCategory | null
  onCountCategoryChange: (category: CountCategory | null) => void
  countCategories: CountCategory[]
  countMarkers: CountMarker[]
  totalCount: number

  // Export
  onExportMeasurements?: () => void
  onExportCounts?: () => void

  // General
  disabled?: boolean
  className?: string
}

const MEASUREMENT_TOOLS = [
  { type: 'distance' as MeasurementType, icon: Ruler, label: 'Distance', color: 'text-blue-500' },
  { type: 'area' as MeasurementType, icon: Square, label: 'Area', color: 'text-green-500' },
  { type: 'angle' as MeasurementType, icon: Triangle, label: 'Angle', color: 'text-amber-500' },
  { type: 'perimeter' as MeasurementType, icon: Square, label: 'Perimeter', color: 'text-cyan-500' },
]

export function MobileMeasurementToolbar({
  activeMeasurementType,
  onMeasurementTypeChange,
  currentUnit,
  measurements,
  onDeleteMeasurement,
  onClearAllMeasurements,
  scale,
  isCalibrating,
  onStartCalibration,
  onCancelCalibration,
  isCountActive,
  onCountActiveChange,
  activeCountCategory,
  onCountCategoryChange,
  countCategories,
  countMarkers,
  totalCount,
  onExportMeasurements,
  onExportCounts,
  disabled = false,
  className,
}: MobileMeasurementToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'measure' | 'count' | 'results'>('measure')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Calculate totals
  const distanceTotal = measurements
    .filter((m) => m.type === 'distance')
    .reduce((sum, m) => sum + m.value * UNIT_CONVERSION[m.unit][currentUnit], 0)

  const areaTotal = measurements
    .filter((m) => m.type === 'area')
    .reduce((sum, m) => sum + m.value * Math.pow(UNIT_CONVERSION[m.unit][currentUnit], 2), 0)

  const formatMeasurement = useCallback(
    (value: number, unit: MeasurementUnit): string => {
      const convertedValue = value * UNIT_CONVERSION[unit][currentUnit]
      const abbrev = { feet: 'ft', inches: 'in', meters: 'm', centimeters: 'cm', millimeters: 'mm' }[currentUnit]
      return `${convertedValue.toFixed(2)} ${abbrev}`
    },
    [currentUnit]
  )

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleToolSelect = useCallback(
    (type: MeasurementType) => {
      if (activeMeasurementType === type) {
        onMeasurementTypeChange(null)
      } else {
        onMeasurementTypeChange(type)
        onCountActiveChange(false)
      }
    },
    [activeMeasurementType, onMeasurementTypeChange, onCountActiveChange]
  )

  const handleCountCategorySelect = useCallback(
    (category: CountCategory) => {
      if (activeCountCategory?.id === category.id) {
        onCountCategoryChange(null)
        onCountActiveChange(false)
      } else {
        onCountCategoryChange(category)
        onCountActiveChange(true)
        onMeasurementTypeChange(null)
      }
    },
    [activeCountCategory, onCountCategoryChange, onCountActiveChange, onMeasurementTypeChange]
  )

  // Get active tool info for trigger button
  const getActiveToolInfo = () => {
    if (activeMeasurementType) {
      const tool = MEASUREMENT_TOOLS.find((t) => t.type === activeMeasurementType)
      return { icon: tool?.icon || Ruler, label: tool?.label || 'Measure', color: tool?.color || 'text-blue-500' }
    }
    if (isCountActive && activeCountCategory) {
      return { icon: Hash, label: activeCountCategory.name, color: 'text-purple-500' }
    }
    if (isCalibrating) {
      return { icon: Crosshair, label: 'Calibrating...', color: 'text-orange-500' }
    }
    return { icon: Ruler, label: 'Measure', color: 'text-gray-500' }
  }

  const activeInfo = getActiveToolInfo()
  const ActiveIcon = activeInfo.icon

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          className={cn(
            'fixed bottom-4 right-4 h-14 px-4 rounded-full shadow-lg z-50',
            (activeMeasurementType || isCountActive || isCalibrating) &&
              'bg-primary text-white border-primary',
            className
          )}
        >
          <ActiveIcon className={cn('w-5 h-5 mr-2', activeInfo.color)} />
          <span className="text-sm font-medium">{activeInfo.label}</span>
          {(measurements.length > 0 || totalCount > 0) && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {measurements.length + totalCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center">Measurement Tools</SheetTitle>
        </SheetHeader>

        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          {(['measure', 'count', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary hover:text-foreground'
              )}
            >
              {tab === 'measure' && 'Measure'}
              {tab === 'count' && `Count (${totalCount})`}
              {tab === 'results' && `Results (${measurements.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Measure Tab */}
          {activeTab === 'measure' && (
            <div className="space-y-4">
              {/* Scale Status */}
              <div className="p-3 bg-surface rounded-lg dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs text-secondary dark:text-gray-400">Scale</Label>
                    <p className="text-sm font-medium dark:text-gray-200">
                      {scale
                        ? `${scale.pixelDistance.toFixed(0)}px = ${scale.realWorldDistance} ${scale.unit}`
                        : 'Not calibrated'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isCalibrating ? 'default' : 'outline'}
                    onClick={() => (isCalibrating ? onCancelCalibration() : onStartCalibration())}
                    disabled={disabled}
                    className="min-h-[44px]"
                  >
                    <Crosshair className="w-4 h-4 mr-1" />
                    {isCalibrating ? 'Cancel' : scale ? 'Recalibrate' : 'Calibrate'}
                  </Button>
                </div>
                {isCalibrating && (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    Draw a line between two points of known distance
                  </p>
                )}
              </div>

              {/* Measurement Tools Grid */}
              <div>
                <Label className="text-xs text-secondary mb-2 block dark:text-gray-400">Measurement Tools</Label>
                <div className="grid grid-cols-2 gap-3">
                  {MEASUREMENT_TOOLS.map((tool) => {
                    const Icon = tool.icon
                    const isActive = activeMeasurementType === tool.type
                    const isDisabled = disabled || (!scale && tool.type !== 'angle')

                    return (
                      <button
                        key={tool.type}
                        onClick={() => handleToolSelect(tool.type)}
                        disabled={isDisabled}
                        className={cn(
                          'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[80px]',
                          isActive
                            ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Icon className={cn('w-6 h-6 mb-1', tool.color)} />
                        <span className="text-sm font-medium dark:text-gray-200">{tool.label}</span>
                        {isDisabled && !scale && tool.type !== 'angle' && (
                          <span className="text-xs text-secondary mt-1 dark:text-gray-400">Needs scale</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Running Totals */}
              {(distanceTotal > 0 || areaTotal > 0) && (
                <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg dark:from-blue-900/20 dark:to-green-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sigma className="w-4 h-4 text-secondary" />
                    <Label className="text-xs text-secondary dark:text-gray-400">Running Totals</Label>
                  </div>
                  <div className="space-y-1">
                    {distanceTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary dark:text-gray-400">Distance:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatMeasurement(distanceTotal, currentUnit)}
                        </span>
                      </div>
                    )}
                    {areaTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary dark:text-gray-400">Area:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatMeasurement(areaTotal, currentUnit)} sq
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Count Tab */}
          {activeTab === 'count' && (
            <div className="space-y-4">
              <Label className="text-xs text-secondary block dark:text-gray-400">Select Category to Count</Label>
              <div className="grid grid-cols-2 gap-3">
                {countCategories.map((category) => {
                  const isActive = activeCountCategory?.id === category.id

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCountCategorySelect(category)}
                      disabled={disabled}
                      className={cn(
                        'flex items-center p-3 rounded-xl border-2 transition-all',
                        isActive
                          ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/20 dark:border-purple-400'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                        style={{ backgroundColor: category.color }}
                      >
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium dark:text-gray-200">{category.name}</p>
                        <p className="text-xs text-secondary dark:text-gray-400">{category.count} counted</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-secondary" />
                    </button>
                  )
                })}
              </div>

              {/* Count Summary */}
              {totalCount > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-secondary dark:text-gray-400">Total Count</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalCount}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onExportCounts}
                    disabled={disabled}
                    className="w-full min-h-[44px]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Counts
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {measurements.length === 0 ? (
                <div className="text-center py-8">
                  <Ruler className="w-12 h-12 mx-auto text-disabled mb-2" />
                  <p className="text-secondary dark:text-gray-400">No measurements yet</p>
                  <p className="text-xs text-muted mt-1 dark:text-gray-500">
                    Select a tool and tap on the drawing
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {measurements.map((m, index) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 bg-surface rounded-lg dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              m.type === 'distance' && 'bg-blue-100 dark:bg-blue-900/30',
                              m.type === 'area' && 'bg-green-100 dark:bg-green-900/30',
                              m.type === 'angle' && 'bg-amber-100 dark:bg-amber-900/30'
                            )}
                          >
                            {m.type === 'distance' && <Ruler className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                            {m.type === 'area' && <Square className="w-5 h-5 text-green-600 dark:text-green-400" />}
                            {m.type === 'angle' && <Triangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-gray-200">
                              {formatMeasurement(m.value, m.unit)}
                              {m.type === 'area' && <sup>2</sup>}
                            </p>
                            {m.volumeValue && m.volumeUnit && (
                              <p className="text-xs text-purple-600 dark:text-purple-400">
                                Vol: {formatVolume(m.volumeValue, m.volumeUnit)}
                              </p>
                            )}
                            <p className="text-xs text-secondary dark:text-gray-500">
                              #{index + 1} - {m.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleCopy(formatMeasurement(m.value, m.unit), m.id)
                            }
                            className="p-2 hover:bg-muted rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center dark:hover:bg-gray-700"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-5 h-5 text-success" />
                            ) : (
                              <Copy className="w-5 h-5 text-secondary" />
                            )}
                          </button>
                          <button
                            onClick={() => onDeleteMeasurement(m.id)}
                            disabled={disabled}
                            className="p-2 hover:bg-red-50 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-5 h-5 text-error" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={onClearAllMeasurements}
                      disabled={disabled}
                      className="flex-1 min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                    {onExportMeasurements && (
                      <Button
                        variant="default"
                        onClick={onExportMeasurements}
                        disabled={disabled}
                        className="flex-1 min-h-[44px]"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </SheetContent>
    </Sheet>
  )
}

export default MobileMeasurementToolbar
