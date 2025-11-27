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
    <div className="flex items-center gap-2 p-2 bg-white border-b">
      {/* Selection Tools */}
      <div className="flex items-center gap-1 pr-2 border-r">
        <Button
          size="sm"
          variant={selectedTool === 'select' ? 'default' : 'outline'}
          onClick={() => onToolChange('select')}
          disabled={disabled}
          title="Select"
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'pan' ? 'default' : 'outline'}
          onClick={() => onToolChange('pan')}
          disabled={disabled}
          title="Pan"
        >
          <Move className="w-4 h-4" />
        </Button>
      </div>

      {/* Drawing Tools */}
      <div className="flex items-center gap-1 pr-2 border-r">
        <Button
          size="sm"
          variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
          onClick={() => onToolChange('rectangle')}
          disabled={disabled}
          title="Rectangle"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'circle' ? 'default' : 'outline'}
          onClick={() => onToolChange('circle')}
          disabled={disabled}
          title="Circle"
        >
          <CircleIcon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'arrow' ? 'default' : 'outline'}
          onClick={() => onToolChange('arrow')}
          disabled={disabled}
          title="Arrow"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'freehand' ? 'default' : 'outline'}
          onClick={() => onToolChange('freehand')}
          disabled={disabled}
          title="Freehand"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={selectedTool === 'text' ? 'default' : 'outline'}
          onClick={() => onToolChange('text')}
          disabled={disabled}
          title="Text"
        >
          <Type className="w-4 h-4" />
        </Button>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 pr-2 border-r">
        <span className="text-sm text-gray-600">Color:</span>
        <div className="flex gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${
                selectedColor === color ? 'border-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              disabled={disabled}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          disabled={disabled}
        />
      </div>

      {/* Line Width */}
      <div className="flex items-center gap-1 pr-2 border-r">
        <span className="text-sm text-gray-600">Width:</span>
        <div className="flex gap-1">
          {LINE_WIDTHS.map((width) => (
            <Button
              key={width}
              size="sm"
              variant={lineWidth === width ? 'default' : 'outline'}
              onClick={() => onLineWidthChange(width)}
              disabled={disabled}
              className="w-8"
            >
              {width}
            </Button>
          ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomIn}
          disabled={disabled}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomOut}
          disabled={disabled}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onResetView}
          disabled={disabled}
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
