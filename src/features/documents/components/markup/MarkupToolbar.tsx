import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import type { AnnotationType } from '@/types/markup'

interface MarkupToolbarProps {
  selectedTool: AnnotationType | 'select' | 'pan' | 'eraser'
  selectedColor: string
  lineWidth: number
  onToolChange: (tool: AnnotationType | 'select' | 'pan' | 'eraser') => void
  onColorChange: (color: string) => void
  onLineWidthChange: (width: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  disabled?: boolean
}

const PRESET_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#000000', // Black
  '#FFFFFF', // White
]

const COLOR_NAMES: Record<string, string> = {
  '#FF0000': 'Red',
  '#00FF00': 'Green',
  '#0000FF': 'Blue',
  '#FFFF00': 'Yellow',
  '#FF00FF': 'Magenta',
  '#00FFFF': 'Cyan',
  '#000000': 'Black',
  '#FFFFFF': 'White',
}

const LINE_WIDTHS = [1, 2, 3, 5, 8]

export function MarkupToolbar({
  selectedTool,
  selectedColor,
  lineWidth,
  onToolChange,
  onColorChange,
  onLineWidthChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  disabled = false,
}: MarkupToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b" role="toolbar" aria-label="Markup tools">
      {/* Selection Tools */}
      <div className="flex items-center gap-1 pr-2 border-r" role="group" aria-label="Selection tools">
        <Button
          size="sm"
          variant={selectedTool === 'select' ? 'default' : 'outline'}
          onClick={() => onToolChange('select')}
          disabled={disabled}
          title="Select"
          aria-label="Select tool"
          aria-pressed={selectedTool === 'select'}
        >
          <MousePointer2 className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'pan' ? 'default' : 'outline'}
          onClick={() => onToolChange('pan')}
          disabled={disabled}
          title="Pan"
          aria-label="Pan tool"
          aria-pressed={selectedTool === 'pan'}
        >
          <Move className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Drawing Tools */}
      <div className="flex items-center gap-1 pr-2 border-r" role="group" aria-label="Drawing tools">
        <Button
          size="sm"
          variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
          onClick={() => onToolChange('rectangle')}
          disabled={disabled}
          title="Rectangle"
          aria-label="Rectangle tool"
          aria-pressed={selectedTool === 'rectangle'}
        >
          <Square className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'circle' ? 'default' : 'outline'}
          onClick={() => onToolChange('circle')}
          disabled={disabled}
          title="Circle"
          aria-label="Circle tool"
          aria-pressed={selectedTool === 'circle'}
        >
          <CircleIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'arrow' ? 'default' : 'outline'}
          onClick={() => onToolChange('arrow')}
          disabled={disabled}
          title="Arrow"
          aria-label="Arrow tool"
          aria-pressed={selectedTool === 'arrow'}
        >
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'freehand' ? 'default' : 'outline'}
          onClick={() => onToolChange('freehand')}
          disabled={disabled}
          title="Freehand"
          aria-label="Freehand drawing tool"
          aria-pressed={selectedTool === 'freehand'}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'text' ? 'default' : 'outline'}
          onClick={() => onToolChange('text')}
          disabled={disabled}
          title="Text"
          aria-label="Text tool"
          aria-pressed={selectedTool === 'text'}
        >
          <Type className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 pr-2 border-r" role="group" aria-label="Color selection">
        <span className="text-sm text-secondary" id="markup-color-label">Color:</span>
        <div className="flex gap-1" role="radiogroup" aria-labelledby="markup-color-label">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${
                selectedColor === color ? 'border-blue-500' : 'border-input'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              disabled={disabled}
              title={COLOR_NAMES[color] || color}
              aria-label={`${COLOR_NAMES[color] || color} color`}
              role="radio"
              aria-checked={selectedColor === color}
            />
          ))}
        </div>
        <label htmlFor="markup-custom-color" className="sr-only">Custom color</label>
        <input
          id="markup-custom-color"
          type="color"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          disabled={disabled}
          aria-label="Custom color picker"
        />
      </div>

      {/* Line Width */}
      <div className="flex items-center gap-1 pr-2 border-r" role="group" aria-label="Line width">
        <span className="text-sm text-secondary" id="markup-width-label">Width:</span>
        <div className="flex gap-1" role="radiogroup" aria-labelledby="markup-width-label">
          {LINE_WIDTHS.map((width) => (
            <Button
              key={width}
              size="sm"
              variant={lineWidth === width ? 'default' : 'outline'}
              onClick={() => onLineWidthChange(width)}
              disabled={disabled}
              className="w-8"
              aria-label={`${width} pixel line width`}
              role="radio"
              aria-checked={lineWidth === width}
            >
              {width}
            </Button>
          ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1" role="group" aria-label="Zoom controls">
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomIn}
          disabled={disabled}
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomOut}
          disabled={disabled}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onResetView}
          disabled={disabled}
          title="Reset View"
          aria-label="Reset view to original zoom"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
