// File: /src/features/documents/components/markup/EnhancedMarkupToolbar.tsx
// Enhanced markup toolbar with color picker, layers, measurements, stamps, and history

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Pencil,
  Type,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Cloud,
  Eraser,
  Highlighter,
  MessageSquare,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColorPicker } from './ColorPicker'
import { LayerManager } from './LayerManager'
import { MeasurementTools } from './MeasurementTools'
import { StampTools } from './StampTools'
import { MarkupHistoryPanel } from './MarkupHistoryPanel'
import type { AnnotationType } from '@/types/markup'
import type {
  ExtendedAnnotationType,
  MarkupLayer,
  MeasurementType,
  MeasurementUnit,
  ScaleCalibration,
  MeasurementAnnotation,
  StampType,
  EnhancedShape,
  MarkupAuthor,
  LayerOrderAction,
} from '../../types/markup'

type Tool = ExtendedAnnotationType | 'select' | 'pan' | 'eraser' | 'measure-distance' | 'measure-area' | 'calibrate'

interface EnhancedMarkupToolbarProps {
  // Tool state
  selectedTool: Tool
  onToolChange: (tool: Tool) => void

  // Color state
  selectedColor: string
  onColorChange: (color: string) => void
  recentColors?: string[]
  onRecentColorsChange?: (colors: string[]) => void

  // Line width state
  lineWidth: number
  onLineWidthChange: (width: number) => void

  // Layer state
  layers: MarkupLayer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string | null) => void
  onCreateLayer: (layer: Omit<MarkupLayer, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateLayer: (layerId: string, updates: Partial<MarkupLayer>) => void
  onDeleteLayer: (layerId: string) => void
  onReorderLayer: (layerId: string, action: LayerOrderAction) => void
  onToggleLayerVisibility: (layerId: string) => void
  onToggleLayerLock: (layerId: string) => void

  // Measurement state
  activeMeasurementType: MeasurementType | null
  onMeasurementTypeChange: (type: MeasurementType | null) => void
  currentMeasurementUnit: MeasurementUnit
  onMeasurementUnitChange: (unit: MeasurementUnit) => void
  scale: ScaleCalibration | null
  onCalibrateScale: (scale: ScaleCalibration) => void
  measurements: MeasurementAnnotation[]
  onDeleteMeasurement: (id: string) => void
  onClearAllMeasurements: () => void
  isCalibrating: boolean
  onStartCalibration: () => void
  onCancelCalibration: () => void
  calibrationPixelDistance: number | null

  // Stamp state
  selectedStamp: StampType | null
  onStampSelect: (stamp: StampType | null) => void
  customStampText: string
  onCustomStampTextChange: (text: string) => void

  // History state
  markups: EnhancedShape[]
  authors: MarkupAuthor[]
  currentUserId: string
  onSelectMarkup: (markupId: string) => void
  onDeleteMarkup: (markupId: string) => void
  onEditMarkup: (markupId: string) => void
  onViewMarkup: (markupId: string) => void
  selectedMarkupId?: string

  // Sharing
  onOpenShareDialog?: () => void
  canShare?: boolean

  // Zoom controls
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  currentZoom?: number

  // General
  disabled?: boolean
  className?: string
}

const LINE_WIDTHS = [1, 2, 3, 5, 8]

const TOOL_GROUPS = [
  {
    name: 'Navigation',
    tools: [
      { id: 'select' as Tool, icon: MousePointer2, label: 'Select', shortcut: '1' },
      { id: 'pan' as Tool, icon: Move, label: 'Pan', shortcut: '2' },
    ],
  },
  {
    name: 'Shapes',
    tools: [
      { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle', shortcut: '3' },
      { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle', shortcut: '4' },
      { id: 'arrow' as Tool, icon: ArrowUpRight, label: 'Arrow', shortcut: '5' },
      { id: 'freehand' as Tool, icon: Pencil, label: 'Freehand', shortcut: '6' },
    ],
  },
  {
    name: 'Annotations',
    tools: [
      { id: 'text' as Tool, icon: Type, label: 'Text', shortcut: '7' },
      { id: 'cloud' as Tool, icon: Cloud, label: 'Cloud Callout', shortcut: '8' },
      { id: 'callout' as Tool, icon: MessageSquare, label: 'Callout', shortcut: '9' },
      { id: 'highlight' as Tool, icon: Highlighter, label: 'Highlight', shortcut: '0' },
    ],
  },
  {
    name: 'Edit',
    tools: [
      { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser', shortcut: 'E' },
    ],
  },
]

export function EnhancedMarkupToolbar({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  recentColors,
  onRecentColorsChange,
  lineWidth,
  onLineWidthChange,
  layers,
  selectedLayerId,
  onSelectLayer,
  onCreateLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorderLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  activeMeasurementType,
  onMeasurementTypeChange,
  currentMeasurementUnit,
  onMeasurementUnitChange,
  scale,
  onCalibrateScale,
  measurements,
  onDeleteMeasurement,
  onClearAllMeasurements,
  isCalibrating,
  onStartCalibration,
  onCancelCalibration,
  calibrationPixelDistance,
  selectedStamp,
  onStampSelect,
  customStampText,
  onCustomStampTextChange,
  markups,
  authors,
  currentUserId,
  onSelectMarkup,
  onDeleteMarkup,
  onEditMarkup,
  onViewMarkup,
  selectedMarkupId,
  onOpenShareDialog,
  canShare,
  onZoomIn,
  onZoomOut,
  onResetView,
  currentZoom = 100,
  disabled = false,
  className,
}: EnhancedMarkupToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-2 p-2 bg-white border-b flex-wrap', className)}>
        {/* Tool Groups */}
        {TOOL_GROUPS.map((group, groupIndex) => (
          <div key={group.name} className="flex items-center gap-1">
            {group.tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    onClick={() => onToolChange(tool.id)}
                    disabled={disabled}
                    className="relative"
                  >
                    <tool.icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tool.label} <span className="text-gray-400">({tool.shortcut})</span></p>
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < TOOL_GROUPS.length - 1 && (
              <div className="w-px h-6 bg-gray-300 mx-1" />
            )}
          </div>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Color Picker */}
        <ColorPicker
          value={selectedColor}
          onChange={onColorChange}
          disabled={disabled}
          showTradePresets={true}
          recentColors={recentColors}
          onRecentColorsChange={onRecentColorsChange}
        />

        {/* Line Width */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600 hidden sm:inline">Width:</span>
          <div className="flex gap-0.5">
            {LINE_WIDTHS.map((width) => (
              <Tooltip key={width}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={lineWidth === width ? 'default' : 'outline'}
                    onClick={() => onLineWidthChange(width)}
                    disabled={disabled}
                    className="w-7 h-7 p-0"
                  >
                    <div
                      className="bg-current rounded-full"
                      style={{
                        width: Math.max(2, width),
                        height: Math.max(2, width),
                      }}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Line width: {width}px</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Layer Manager */}
        <LayerManager
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={onSelectLayer}
          onCreateLayer={onCreateLayer}
          onUpdateLayer={onUpdateLayer}
          onDeleteLayer={onDeleteLayer}
          onReorderLayer={onReorderLayer}
          onToggleVisibility={onToggleLayerVisibility}
          onToggleLock={onToggleLayerLock}
          currentUserId={currentUserId}
          disabled={disabled}
        />

        {/* Measurement Tools */}
        <MeasurementTools
          activeMeasurementType={activeMeasurementType}
          onMeasurementTypeChange={onMeasurementTypeChange}
          currentUnit={currentMeasurementUnit}
          onUnitChange={onMeasurementUnitChange}
          scale={scale}
          onCalibrateScale={onCalibrateScale}
          measurements={measurements}
          onDeleteMeasurement={onDeleteMeasurement}
          onClearAllMeasurements={onClearAllMeasurements}
          isCalibrating={isCalibrating}
          onStartCalibration={onStartCalibration}
          onCancelCalibration={onCancelCalibration}
          calibrationPixelDistance={calibrationPixelDistance}
          disabled={disabled}
        />

        {/* Stamp Tools */}
        <StampTools
          selectedStamp={selectedStamp}
          onStampSelect={onStampSelect}
          customStampText={customStampText}
          onCustomStampTextChange={onCustomStampTextChange}
          disabled={disabled}
        />

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* History Panel */}
        <MarkupHistoryPanel
          markups={markups}
          authors={authors}
          currentUserId={currentUserId}
          onSelectMarkup={onSelectMarkup}
          onDeleteMarkup={onDeleteMarkup}
          onEditMarkup={onEditMarkup}
          onViewMarkup={onViewMarkup}
          selectedMarkupId={selectedMarkupId}
          disabled={disabled}
        />

        {/* Share Button */}
        {onOpenShareDialog && canShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenShareDialog}
                disabled={disabled || !selectedMarkupId}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share selected markup</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onZoomOut}
                disabled={disabled}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out (-)</p>
            </TooltipContent>
          </Tooltip>

          <span className="text-xs font-medium w-12 text-center">{currentZoom}%</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onZoomIn}
                disabled={disabled}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In (+)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onResetView}
                disabled={disabled}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset View (0)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default EnhancedMarkupToolbar
