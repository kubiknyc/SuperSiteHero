// File: /src/features/documents/components/markup/StampTools.tsx
// Stamp tools component for approval stamps (APPROVED, REJECTED, REVIEWED, etc.)

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Stamp,
  Check,
  X,
  Eye,
  AlertCircle,
  FileText,
  Ban,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StampType } from '../../types/markup'

interface StampToolsProps {
  selectedStamp: StampType | null
  onStampSelect: (stamp: StampType | null) => void
  customStampText: string
  onCustomStampTextChange: (text: string) => void
  disabled?: boolean
  className?: string
}

interface StampPreset {
  type: StampType
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

const STAMP_PRESETS: StampPreset[] = [
  {
    type: 'APPROVED',
    label: 'APPROVED',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-success-dark',
    bgColor: 'bg-success-light',
    borderColor: 'border-green-500',
  },
  {
    type: 'REJECTED',
    label: 'REJECTED',
    icon: <X className="w-4 h-4" />,
    color: 'text-error-dark',
    bgColor: 'bg-error-light',
    borderColor: 'border-red-500',
  },
  {
    type: 'REVIEWED',
    label: 'REVIEWED',
    icon: <Eye className="w-4 h-4" />,
    color: 'text-primary-hover',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
  },
  {
    type: 'REVISED',
    label: 'REVISED',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-amber-700',
    bgColor: 'bg-warning-light',
    borderColor: 'border-warning',
  },
  {
    type: 'FOR_INFORMATION',
    label: 'FOR INFORMATION',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
  },
  {
    type: 'NOT_FOR_CONSTRUCTION',
    label: 'NOT FOR CONSTRUCTION',
    icon: <Ban className="w-4 h-4" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
  },
  {
    type: 'VOID',
    label: 'VOID',
    icon: <X className="w-4 h-4" />,
    color: 'text-secondary',
    bgColor: 'bg-muted',
    borderColor: 'border-gray-500',
  },
  {
    type: 'PRELIMINARY',
    label: 'PRELIMINARY',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-cyan-700',
    bgColor: 'bg-info-light',
    borderColor: 'border-cyan-500',
  },
  {
    type: 'FINAL',
    label: 'FINAL',
    icon: <Check className="w-4 h-4" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
  },
]

export function StampTools({
  selectedStamp,
  onStampSelect,
  customStampText,
  onCustomStampTextChange,
  disabled = false,
  className,
}: StampToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleStampSelect = (type: StampType) => {
    if (type === 'CUSTOM') {
      setShowCustomInput(true)
    } else {
      setShowCustomInput(false)
      onCustomStampTextChange('')
    }
    onStampSelect(selectedStamp === type ? null : type)
  }

  const selectedPreset = STAMP_PRESETS.find(p => p.type === selectedStamp)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedStamp ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2',
            selectedStamp && selectedPreset && `${selectedPreset.bgColor} ${selectedPreset.color} border ${selectedPreset.borderColor}`,
            className
          )}
        >
          <Stamp className="w-4 h-4" />
          <span className="text-xs">
            {selectedStamp === 'CUSTOM' && customStampText
              ? customStampText
              : selectedPreset?.label || 'Stamps'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-secondary">Select Stamp</Label>

          {/* Stamp Grid */}
          <div className="grid grid-cols-2 gap-1">
            {STAMP_PRESETS.map((preset) => (
              <button
                key={preset.type}
                onClick={() => handleStampSelect(preset.type)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded border-2 text-xs font-bold transition-all',
                  preset.bgColor,
                  preset.color,
                  selectedStamp === preset.type
                    ? `${preset.borderColor} ring-2 ring-offset-1 ring-blue-300`
                    : 'border-transparent hover:border-input'
                )}
              >
                {preset.icon}
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Stamp */}
          <div className="pt-2 border-t">
            <button
              onClick={() => handleStampSelect('CUSTOM')}
              disabled={disabled}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded border-2 text-xs font-bold transition-all',
                'bg-surface text-secondary',
                selectedStamp === 'CUSTOM'
                  ? 'border-gray-500 ring-2 ring-offset-1 ring-blue-300'
                  : 'border-transparent hover:border-input'
              )}
            >
              <Stamp className="w-4 h-4" />
              <span>Custom Stamp</span>
            </button>

            {(showCustomInput || selectedStamp === 'CUSTOM') && (
              <div className="mt-2">
                <Input
                  value={customStampText}
                  onChange={(e) => onCustomStampTextChange(e.target.value.toUpperCase())}
                  placeholder="Enter custom text"
                  className="text-xs uppercase"
                  maxLength={30}
                  disabled={disabled}
                />
                <p className="text-xs text-muted mt-1">
                  Max 30 characters, will appear in uppercase
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedStamp && (
            <div className="pt-2 border-t">
              <Label className="text-xs font-medium text-secondary mb-2 block">Preview</Label>
              <div className="flex justify-center">
                <StampPreview
                  type={selectedStamp}
                  customText={customStampText}
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="pt-2 border-t text-xs text-muted">
            <p>Click on the document to place the stamp. You can resize and rotate it after placing.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Stamp Preview Component
function StampPreview({ type, customText }: { type: StampType; customText?: string }) {
  const preset = STAMP_PRESETS.find(p => p.type === type)

  if (!preset && type !== 'CUSTOM') {return null}

  const label = type === 'CUSTOM' ? (customText || 'CUSTOM') : preset?.label
  const color = preset?.color || 'text-secondary'
  const borderColor = preset?.borderColor || 'border-gray-500'

  return (
    <div
      className={cn(
        'relative px-4 py-2 border-4 rounded transform rotate-[-15deg]',
        borderColor,
        color
      )}
      style={{
        borderStyle: 'double',
      }}
    >
      <div
        className={cn(
          'absolute inset-0 border-2 rounded m-0.5',
          borderColor
        )}
      />
      <span className="relative z-10 font-bold text-sm tracking-wider whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

export function getStampColor(type: StampType): string {
  const preset = STAMP_PRESETS.find(p => p.type === type)
  if (!preset) {return '#666666'}

  // Extract hex color from the color class
  const colorMap: Record<string, string> = {
    'text-success-dark': '#15803d',
    'text-error-dark': '#b91c1c',
    'text-primary-hover': '#1d4ed8',
    'text-amber-700': '#b45309',
    'text-purple-700': '#7e22ce',
    'text-orange-700': '#c2410c',
    'text-secondary': '#374151',
    'text-cyan-700': '#0e7490',
    'text-emerald-700': '#047857',
  }

  return colorMap[preset.color] || '#666666'
}

export default StampTools
