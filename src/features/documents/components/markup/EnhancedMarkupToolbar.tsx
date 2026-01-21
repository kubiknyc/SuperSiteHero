// File: /src/features/documents/components/markup/EnhancedMarkupToolbar.tsx
// Enhanced markup toolbar with color picker, layers, measurements, stamps, history, symbols, and templates

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
import { SymbolLibrary } from './SymbolLibrary'
import { MarkupTemplateManager } from './MarkupTemplateManager'
import { AutoNumberingControls } from './AutoNumberingControls'
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
  ConstructionSymbol,
  AutoNumberingConfig,
  MarkupAnnotationData,
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

  // Auto-numbering (optional)
  autoNumberingConfig?: AutoNumberingConfig
  currentAutoNumber?: number
  isAutoNumberingEnabled?: boolean
  onAutoNumberingToggle?: (enabled: boolean) => void
  onAutoNumberingPrefixChange?: (prefix: string) => void
  onAutoNumberingStartChange?: (num: number) => void
  onAutoNumberingResetOnNewPageChange?: (reset: boolean) => void
  onAutoNumberingReset?: (startNumber?: number) => void
  formatAutoNumber?: (num: number) => string

  // Symbol library (optional)
  onSymbolSelect?: (symbol: ConstructionSymbol, options: { width: number; height: number; rotation: number; color: string }) => void

  // Templates (optional)
  canvasWidth?: number
  canvasHeight?: number
  onLoadTemplate?: (markups: MarkupAnnotationData[], canvasWidth: number, canvasHeight: number) => void
  projectId?: string

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
  // Auto-numbering
  autoNumberingConfig,
  currentAutoNumber = 1,
  isAutoNumberingEnabled = false,
  onAutoNumberingToggle,
  onAutoNumberingPrefixChange,
  onAutoNumberingStartChange,
  onAutoNumberingResetOnNewPageChange,
  onAutoNumberingReset,
  formatAutoNumber = (n: number) => `${n}`,
  // Symbol library
  onSymbolSelect,
  // Templates
  canvasWidth = 800,
  canvasHeight = 600,
  onLoadTemplate,
  projectId,
  // General
  disabled = false,
  className,
}: EnhancedMarkupToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-2 p-2 bg-card border-b flex-wrap', className)} role="toolbar" aria-label="Enhanced markup tools">
        {/* Tool Groups */}
        {TOOL_GROUPS.map((group, groupIndex) => (
          <div key={group.name} className="flex items-center gap-1" role="group" aria-label={`${group.name} tools`}>
            {group.tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    onClick={() => onToolChange(tool.id)}
                    disabled={disabled}
                    className="relative"
                    aria-label={`${tool.label} tool (${tool.shortcut})`}
                    aria-pressed={selectedTool === tool.id}
                  >
                    <tool.icon className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tool.label} <span className="text-disabled">({tool.shortcut})</span></p>
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < TOOL_GROUPS.length - 1 && (
              <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
            )}
          </div>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

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
        <div className="flex items-center gap-1" role="group" aria-label="Line width">
          <span className="text-xs text-secondary hidden sm:inline" id="enhanced-width-label">Width:</span>
          <div className="flex gap-0.5" role="radiogroup" aria-labelledby="enhanced-width-label">
            {LINE_WIDTHS.map((width) => (
              <Tooltip key={width}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={lineWidth === width ? 'default' : 'outline'}
                    onClick={() => onLineWidthChange(width)}
                    disabled={disabled}
                    className="w-7 h-7 p-0"
                    aria-label={`${width} pixel line width`}
                    role="radio"
                    aria-checked={lineWidth === width}
                  >
                    <div
                      className="bg-current rounded-full"
                      style={{
                        width: Math.max(2, width),
                        height: Math.max(2, width),
                      }}
                      aria-hidden="true"
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

        <div className="w-px h-6 bg-border mx-1" />

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

        {/* Symbol Library */}
        {onSymbolSelect && (
          <SymbolLibrary
            onSymbolSelect={onSymbolSelect}
            selectedColor={selectedColor}
            disabled={disabled}
          />
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Auto-Numbering Controls */}
        {autoNumberingConfig && onAutoNumberingToggle && (
          <AutoNumberingControls
            config={autoNumberingConfig}
            currentNumber={currentAutoNumber}
            isEnabled={isAutoNumberingEnabled}
            onToggleEnabled={onAutoNumberingToggle}
            onPrefixChange={onAutoNumberingPrefixChange || (() => {})}
            onStartNumberChange={onAutoNumberingStartChange || (() => {})}
            onResetOnNewPageChange={onAutoNumberingResetOnNewPageChange || (() => {})}
            onReset={onAutoNumberingReset || (() => {})}
            formatNumber={formatAutoNumber}
            disabled={disabled}
          />
        )}

        {/* Template Manager */}
        {onLoadTemplate && (
          <MarkupTemplateManager
            currentMarkups={markups}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onLoadTemplate={onLoadTemplate}
            projectId={projectId}
            disabled={disabled}
          />
        )}

        <div className="w-px h-6 bg-border mx-1" />

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
                aria-label="Share selected markup"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
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
        <div className="flex items-center gap-1" role="group" aria-label="Zoom controls">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onZoomOut}
                disabled={disabled}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out (-)</p>
            </TooltipContent>
          </Tooltip>

          <span className="text-xs font-medium w-12 text-center" aria-live="polite" aria-atomic="true">{currentZoom}%</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onZoomIn}
                disabled={disabled}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
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
                aria-label="Reset view to original zoom"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
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
