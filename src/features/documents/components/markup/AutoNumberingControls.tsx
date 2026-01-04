// File: /src/features/documents/components/markup/AutoNumberingControls.tsx
// Toolbar controls for auto-numbering clouds and callouts

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Hash,
  RotateCcw,
  Settings2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NUMBERING_PREFIX_OPTIONS } from '../../hooks/useAutoNumbering'
import type { AutoNumberingConfig, ExtendedAnnotationType } from '../../types/markup'

// ============================================================
// COMPONENT PROPS
// ============================================================

interface AutoNumberingControlsProps {
  // Config state
  config: AutoNumberingConfig
  currentNumber: number
  isEnabled: boolean

  // Actions
  onToggleEnabled: (enabled: boolean) => void
  onPrefixChange: (prefix: string) => void
  onStartNumberChange: (num: number) => void
  onResetOnNewPageChange: (reset: boolean) => void
  onReset: (startNumber?: number) => void

  // Formatting
  formatNumber: (num: number) => string

  // State
  disabled?: boolean
  className?: string
}

export function AutoNumberingControls({
  config,
  currentNumber,
  isEnabled,
  onToggleEnabled,
  onPrefixChange,
  onStartNumberChange,
  onResetOnNewPageChange,
  onReset,
  formatNumber,
  disabled = false,
  className,
}: AutoNumberingControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customPrefix, setCustomPrefix] = useState('')
  const [showCustomPrefix, setShowCustomPrefix] = useState(false)

  // Check if current prefix is custom (not in presets)
  const isCustomPrefix = !NUMBERING_PREFIX_OPTIONS.some(opt => opt.value === config.prefix)

  const handlePrefixSelect = (value: string) => {
    if (value === 'custom') {
      setShowCustomPrefix(true)
    } else {
      setShowCustomPrefix(false)
      onPrefixChange(value)
    }
  }

  const handleCustomPrefixApply = () => {
    onPrefixChange(customPrefix)
    setShowCustomPrefix(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isEnabled ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          className={cn('flex items-center gap-2', className)}
        >
          <Hash className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">
            {isEnabled ? formatNumber(currentNumber) : 'Auto #'}
          </span>
          {isEnabled && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              ON
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-4">
          {/* Header with toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <Label className="text-sm font-medium">Auto-Numbering</Label>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              disabled={disabled}
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Next number:</p>
            <p className="text-2xl font-bold">{formatNumber(currentNumber)}</p>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            {/* Prefix selector */}
            <div className="space-y-2">
              <Label className="text-xs">Prefix</Label>
              {showCustomPrefix ? (
                <div className="flex gap-2">
                  <Input
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                    placeholder="Custom prefix..."
                    className="h-9"
                    maxLength={10}
                  />
                  <Button
                    size="sm"
                    onClick={handleCustomPrefixApply}
                    className="h-9"
                  >
                    Apply
                  </Button>
                </div>
              ) : (
                <Select
                  value={isCustomPrefix ? 'custom' : config.prefix}
                  onValueChange={handlePrefixSelect}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select prefix" />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBERING_PREFIX_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Start number */}
            <div className="space-y-2">
              <Label className="text-xs">Start Number</Label>
              <Input
                type="number"
                min={1}
                max={9999}
                value={config.startNumber}
                onChange={(e) => onStartNumberChange(parseInt(e.target.value) || 1)}
                className="h-9"
                disabled={disabled}
              />
            </div>

            {/* Reset on new page toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs">Reset on New Page</Label>
                <p className="text-xs text-muted-foreground">
                  Restart numbering on each page
                </p>
              </div>
              <Switch
                checked={config.resetOnNewPage}
                onCheckedChange={onResetOnNewPageChange}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Applicable types info */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Applies to:</Label>
            <div className="flex flex-wrap gap-1">
              {config.applicableTypes.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReset()}
                  disabled={disabled}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reset numbering to start value
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Help text */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <p>
              When enabled, clouds and callouts will automatically be numbered
              sequentially as you create them.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default AutoNumberingControls
