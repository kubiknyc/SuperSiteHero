/**
 * MobileMarkupToolbar
 *
 * Touch-optimized markup toolbar for mobile devices.
 * Features:
 * - Large touch targets (44px minimum per Apple guidelines)
 * - Bottom-positioned for thumb accessibility
 * - Collapsible tool groups
 * - Quick access to most-used tools
 * - Expandable drawer for advanced options
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
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
  Undo2,
  Redo2,
  Palette,
  ChevronUp,
  ChevronDown,
  Ruler,
  Stamp,
  X,
  Eraser,
  Highlighter,
  Cloud,
  Settings,
  Layers,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import type { ExtendedAnnotationType } from '../../types/markup'

type Tool = ExtendedAnnotationType | 'select' | 'pan' | 'eraser' | 'measure-distance' | 'measure-area' | 'calibrate'

interface MobileMarkupToolbarProps {
  // Tool state
  selectedTool: Tool
  onToolChange: (tool: Tool) => void

  // Color state
  selectedColor: string
  onColorChange: (color: string) => void

  // Line width state
  lineWidth: number
  onLineWidthChange: (width: number) => void

  // Zoom controls
  onZoomIn: () => void
  onZoomOut: () => void
  currentZoom?: number

  // Undo/Redo
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean

  // Advanced tools callbacks
  onOpenLayers?: () => void
  onOpenMeasure?: () => void
  onOpenStamps?: () => void

  // General
  disabled?: boolean
  className?: string
}

// Quick access tools (most commonly used on mobile)
const QUICK_TOOLS: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pan', icon: Move, label: 'Pan' },
  { id: 'freehand', icon: Pencil, label: 'Draw' },
  { id: 'text', icon: Type, label: 'Text' },
]

// Shape tools
const SHAPE_TOOLS: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: CircleIcon, label: 'Circle' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { id: 'cloud', icon: Cloud, label: 'Cloud' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
]

// Preset colors for quick selection
const QUICK_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#000000', // Black
]

// Line width presets
const LINE_WIDTH_PRESETS = [
  { value: 2, label: 'Fine' },
  { value: 4, label: 'Medium' },
  { value: 8, label: 'Bold' },
]

export function MobileMarkupToolbar({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onZoomIn,
  onZoomOut,
  currentZoom = 100,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenLayers,
  onOpenMeasure,
  onOpenStamps,
  disabled = false,
  className,
}: MobileMarkupToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShapeTools, setShowShapeTools] = useState(false)
  const [_showMoreTools, _setShowMoreTools] = useState(false)

  // Check if current tool is a shape tool
  const isShapeTool = SHAPE_TOOLS.some((t) => t.id === selectedTool)
  const currentShapeTool = SHAPE_TOOLS.find((t) => t.id === selectedTool)

  // Handle tool selection with haptic feedback
  const handleToolSelect = useCallback((tool: Tool) => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    onToolChange(tool)
    setShowShapeTools(false)
  }, [onToolChange])

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-50', className)}>
      {/* Expanded Panel - Advanced Options */}
      {isExpanded && (
        <div className="bg-card border-t border-border px-4 py-3 space-y-3 animate-in slide-in-from-bottom duration-200">
          {/* Color Selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Color</p>
            <div className="flex items-center gap-2">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-transform active:scale-95',
                    selectedColor === color ? 'border-gray-900 scale-110' : 'border-border'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                  disabled={disabled}
                />
              ))}
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full"
                    disabled={disabled}
                  >
                    <Palette className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" side="top">
                  <ColorPicker
                    value={selectedColor}
                    onChange={(color) => {
                      onColorChange(color)
                      setShowColorPicker(false)
                    }}
                    disabled={disabled}
                    showTradePresets={true}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Line Width */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Line Width</p>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {LINE_WIDTH_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={lineWidth === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-10 px-4"
                    onClick={() => onLineWidthChange(preset.value)}
                    disabled={disabled}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex-1 px-2">
                <Slider
                  value={[lineWidth]}
                  min={1}
                  max={12}
                  step={1}
                  onValueChange={([value]) => onLineWidthChange(value)}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-secondary w-8 text-right">{lineWidth}px</span>
            </div>
          </div>

          {/* Advanced Tools */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Advanced Tools</p>
            <div className="flex gap-2">
              {onOpenLayers && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={onOpenLayers}
                  disabled={disabled}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Layers
                </Button>
              )}
              {onOpenMeasure && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={onOpenMeasure}
                  disabled={disabled}
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  Measure
                </Button>
              )}
              {onOpenStamps && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={onOpenStamps}
                  disabled={disabled}
                >
                  <Stamp className="w-4 h-4 mr-2" />
                  Stamps
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shape Tools Drawer */}
      {showShapeTools && (
        <div className="bg-card border-t border-border px-4 py-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Shapes</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShapeTools(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SHAPE_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? 'default' : 'outline'}
                className="h-14 flex flex-col items-center justify-center gap-1"
                onClick={() => handleToolSelect(tool.id)}
                disabled={disabled}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-xs">{tool.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-card border-t border-border px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-between gap-1">
          {/* Quick Tools */}
          <div className="flex items-center gap-1">
            {QUICK_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? 'default' : 'ghost'}
                className={cn(
                  'h-11 w-11 p-0 rounded-lg',
                  selectedTool === tool.id && 'ring-2 ring-blue-500 ring-offset-1'
                )}
                onClick={() => handleToolSelect(tool.id)}
                disabled={disabled}
              >
                <tool.icon className="w-5 h-5" />
              </Button>
            ))}

            {/* Shape Tool Button (shows current shape or opens picker) */}
            <Button
              variant={isShapeTool ? 'default' : 'ghost'}
              className={cn(
                'h-11 w-11 p-0 rounded-lg relative',
                isShapeTool && 'ring-2 ring-blue-500 ring-offset-1'
              )}
              onClick={() => setShowShapeTools(!showShapeTools)}
              disabled={disabled}
            >
              {currentShapeTool ? (
                <currentShapeTool.icon className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <ChevronUp className="w-3 h-3 absolute bottom-0.5 right-0.5" />
            </Button>

            {/* Eraser */}
            <Button
              variant={selectedTool === 'eraser' ? 'default' : 'ghost'}
              className={cn(
                'h-11 w-11 p-0 rounded-lg',
                selectedTool === 'eraser' && 'ring-2 ring-blue-500 ring-offset-1'
              )}
              onClick={() => handleToolSelect('eraser')}
              disabled={disabled}
            >
              <Eraser className="w-5 h-5" />
            </Button>
          </div>

          {/* Center - Color indicator & Zoom */}
          <div className="flex items-center gap-2">
            {/* Current Color */}
            <button
              type="button"
              className="w-8 h-8 rounded-full border-2 border-input shadow-sm"
              style={{ backgroundColor: selectedColor }}
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
            />

            {/* Zoom Controls */}
            <div className="flex items-center bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-l-lg"
                onClick={onZoomOut}
                disabled={disabled}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium px-1 min-w-[40px] text-center">
                {currentZoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-r-lg"
                onClick={onZoomIn}
                disabled={disabled}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right - Undo/Redo & Expand */}
          <div className="flex items-center gap-1">
            {/* Undo */}
            {onUndo && (
              <Button
                variant="ghost"
                className="h-11 w-11 p-0 rounded-lg"
                onClick={onUndo}
                disabled={disabled || !canUndo}
              >
                <Undo2 className="w-5 h-5" />
              </Button>
            )}

            {/* Redo */}
            {onRedo && (
              <Button
                variant="ghost"
                className="h-11 w-11 p-0 rounded-lg"
                onClick={onRedo}
                disabled={disabled || !canRedo}
              >
                <Redo2 className="w-5 h-5" />
              </Button>
            )}

            {/* Expand/Collapse Advanced Options */}
            <Button
              variant={isExpanded ? 'default' : 'outline'}
              className="h-11 w-11 p-0 rounded-lg"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileMarkupToolbar
