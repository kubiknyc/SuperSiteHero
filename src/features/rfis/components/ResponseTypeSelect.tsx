// File: src/features/rfis/components/ResponseTypeSelect.tsx
// Select component for RFI response types

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { RFIResponseType } from '@/types/rfi'
import { RFI_RESPONSE_TYPES } from '@/types/rfi'
import { ResponseTypeBadge } from './ResponseTypeBadge'

interface ResponseTypeSelectProps {
  value: RFIResponseType | null | undefined
  onChange: (value: RFIResponseType | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  className?: string
  error?: string
}

/**
 * Select component for choosing RFI response types
 *
 * @example
 * ```tsx
 * <ResponseTypeSelect
 *   value={responseType}
 *   onChange={setResponseType}
 *   label="Response Type"
 * />
 * ```
 */
export function ResponseTypeSelect({
  value,
  onChange,
  label,
  placeholder = 'Select response type',
  disabled = false,
  required = false,
  allowClear = true,
  className,
  error,
}: ResponseTypeSelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value || ''}
        onValueChange={(val) => {
          if (val === 'clear') {
            onChange(null)
          } else {
            onChange(val as RFIResponseType)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn(error && 'border-red-500')}>
          <SelectValue placeholder={placeholder}>
            {value ? <ResponseTypeBadge responseType={value} size="sm" /> : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowClear && value && (
            <SelectItem value="clear" className="text-gray-500 italic">
              Clear selection
            </SelectItem>
          )}
          {RFI_RESPONSE_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-gray-500">{type.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/**
 * Common response types as quick-select buttons
 */
export function CommonResponseTypes({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: RFIResponseType | null | undefined
  onChange: (value: RFIResponseType) => void
  disabled?: boolean
  className?: string
}) {
  // Most commonly used response types
  const commonTypes: RFIResponseType[] = ['answered', 'see_drawings', 'see_specs', 'deferred']

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {commonTypes.map((type) => {
        const config = RFI_RESPONSE_TYPES.find((t) => t.value === type)
        if (!config) {return null}

        const isSelected = value === type

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-md border transition-all text-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected
                ? 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-200'
                : 'border-gray-300 hover:bg-gray-50'
            )}
          >
            {config.label}
          </button>
        )
      })}
    </div>
  )
}

export default ResponseTypeSelect
