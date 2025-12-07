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
        >
          <div
            className="w-5 h-5 rounded border border-gray-300 shadow-inner"
            style={{ backgroundColor: value }}
          />
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-4">
          {/* Custom Color Input */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Palette className="w-3 h-3" />
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
              />
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <History className="w-3 h-3" />
                Recent Colors
              </Label>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-all hover:scale-110 relative',
                      value === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    disabled={disabled}
                    title={color}
                  >
                    {value === color && (
                      <Check
                        className={cn(
                          'w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                          isLightColor(color) ? 'text-gray-800' : 'text-white'
                        )}
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
              <Label className="text-xs font-medium text-gray-600">Trade Colors</Label>
              {Object.entries(colorsByTrade).map(([trade, presets]) => (
                <div key={trade} className="space-y-1">
                  <span className="text-xs text-gray-500">{trade}</span>
                  <div className="flex flex-wrap gap-1">
                    {presets.map((preset) => (
                      <button
                        key={preset.hex}
                        className={cn(
                          'w-6 h-6 rounded border-2 transition-all hover:scale-110 relative',
                          value === preset.hex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                        )}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => handleColorSelect(preset.hex)}
                        disabled={disabled}
                        title={`${preset.name}${preset.description ? ` - ${preset.description}` : ''}`}
                      >
                        {value === preset.hex && (
                          <Check
                            className={cn(
                              'w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                              isLightColor(preset.hex) ? 'text-gray-800' : 'text-white'
                            )}
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
          <div className="pt-2 border-t text-xs text-gray-500">
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

export default ColorPicker
