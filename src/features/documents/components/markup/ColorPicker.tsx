// File: /src/features/documents/components/markup/ColorPicker.tsx
// Color picker component with trade presets and custom color support

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Palette, Check, ChevronDown, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRADE_COLOR_PRESETS, type ColorPreset } from '../../types/markup'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  showTradePresets?: boolean
  recentColors?: string[]
  onRecentColorsChange?: (colors: string[]) => void
  className?: string
}

const MAX_RECENT_COLORS = 8

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  showTradePresets = true,
  recentColors = [],
  onRecentColorsChange,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleColorSelect = (color: string) => {
    onChange(color)
    setCustomColor(color)

    // Update recent colors
    if (onRecentColorsChange) {
      const newRecent = [color, ...recentColors.filter(c => c !== color)].slice(0, MAX_RECENT_COLORS)
      onRecentColorsChange(newRecent)
    }

    setIsOpen(false)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onChange(color)
  }

  const handleCustomColorBlur = () => {
    if (onRecentColorsChange && customColor) {
      const newRecent = [customColor, ...recentColors.filter(c => c !== customColor)].slice(0, MAX_RECENT_COLORS)
      onRecentColorsChange(newRecent)
    }
  }

  // Group colors by trade
  const colorsByTrade = TRADE_COLOR_PRESETS.reduce((acc, preset) => {
    const trade = preset.trade || 'Other'
    if (!acc[trade]) {
      acc[trade] = []
    }
    acc[trade].push(preset)
    return acc
  }, {} as Record<string, ColorPreset[]>)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('flex items-center gap-2', className)}
          aria-label={`Color picker, current color: ${getColorName(value)}`}
        >
          <div
            className="w-5 h-5 rounded border border-input shadow-inner"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
          <ChevronDown className="w-3 h-3 text-muted" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-4">
          {/* Custom Color Input */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-secondary flex items-center gap-1" id="custom-color-label">
              <Palette className="w-3 h-3" aria-hidden="true" />
              Custom Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                ref={colorInputRef}
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                onBlur={handleCustomColorBlur}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                disabled={disabled}
                aria-label="Choose custom color"
                aria-labelledby="custom-color-label"
              />
              <Input
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    onChange(e.target.value)
                  }
                }}
                onBlur={handleCustomColorBlur}
                placeholder="#FF0000"
                className="flex-1 h-8 text-sm font-mono"
                disabled={disabled}
                aria-label="Custom color hex value"
              />
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-secondary flex items-center gap-1" id="recent-colors-label">
                <History className="w-3 h-3" aria-hidden="true" />
                Recent Colors
              </Label>
              <div className="flex flex-wrap gap-1" role="group" aria-labelledby="recent-colors-label">
                {recentColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-all hover:scale-110 relative',
                      value === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-input'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    disabled={disabled}
                    title={getColorName(color)}
                    aria-label={`${getColorName(color)} color${value === color ? ', selected' : ''}`}
                  >
                    {value === color && (
                      <Check
                        className={cn(
                          'w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                          isLightColor(color) ? 'text-foreground' : 'text-white'
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trade Color Presets */}
          {showTradePresets && (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-secondary">Trade Colors</Label>
              {Object.entries(colorsByTrade).map(([trade, presets]) => (
                <div key={trade} className="space-y-1">
                  <span className="text-xs text-muted" id={`trade-${trade.replace(/\s+/g, '-').toLowerCase()}-label`}>{trade}</span>
                  <div className="flex flex-wrap gap-1" role="group" aria-labelledby={`trade-${trade.replace(/\s+/g, '-').toLowerCase()}-label`}>
                    {presets.map((preset) => (
                      <button
                        key={preset.hex}
                        className={cn(
                          'w-6 h-6 rounded border-2 transition-all hover:scale-110 relative',
                          value === preset.hex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-input'
                        )}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => handleColorSelect(preset.hex)}
                        disabled={disabled}
                        title={`${preset.name}${preset.description ? ` - ${preset.description}` : ''}`}
                        aria-label={`${preset.name} color${preset.description ? ` for ${preset.description}` : ''}${value === preset.hex ? ', selected' : ''}`}
                      >
                        {value === preset.hex && (
                          <Check
                            className={cn(
                              'w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                              isLightColor(preset.hex) ? 'text-foreground' : 'text-white'
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Color Legend Info */}
          <div className="pt-2 border-t text-xs text-muted">
            <p>Tip: Use consistent colors for each trade to improve collaboration.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Helper function to determine if a color is light or dark
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '')
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// Helper function to get a descriptive color name from hex
function getColorName(hex: string): string {
  const colorNames: Record<string, string> = {
    '#FF0000': 'Red',
    '#00FF00': 'Green',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#808080': 'Gray',
    '#FFA500': 'Orange',
    '#800080': 'Purple',
    '#FFC0CB': 'Pink',
    '#A52A2A': 'Brown',
  }
  return colorNames[hex.toUpperCase()] || hex
}

export default ColorPicker
