// File: src/features/submittals/components/ApprovalCodeSelect.tsx
// Select component for submittal approval codes (A/B/C/D)

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
import type { SubmittalApprovalCode } from '@/types/submittal'
import { SUBMITTAL_APPROVAL_CODES } from '@/types/submittal'
import { ApprovalCodeBadge } from './ApprovalCodeBadge'

interface ApprovalCodeSelectProps {
  value: SubmittalApprovalCode | null | undefined
  onChange: (value: SubmittalApprovalCode | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  className?: string
  error?: string
}

/**
 * Select component for choosing submittal approval codes
 *
 * @example
 * ```tsx
 * <ApprovalCodeSelect
 *   value={approvalCode}
 *   onChange={setApprovalCode}
 *   label="Approval Code"
 * />
 * ```
 */
export function ApprovalCodeSelect({
  value,
  onChange,
  label,
  placeholder = 'Select approval code',
  disabled = false,
  required = false,
  allowClear = true,
  className,
  error,
}: ApprovalCodeSelectProps) {
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
            onChange(val as SubmittalApprovalCode)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn(error && 'border-red-500')}>
          <SelectValue placeholder={placeholder}>
            {value ? <ApprovalCodeBadge code={value} showLabel /> : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowClear && value && (
            <SelectItem value="clear" className="text-gray-500 italic">
              Clear selection
            </SelectItem>
          )}
          {SUBMITTAL_APPROVAL_CODES.map((code) => (
            <SelectItem key={code.value} value={code.value}>
              <div className="flex items-center gap-3">
                <ApprovalCodeBadge code={code.value} size="sm" />
                <div className="flex flex-col">
                  <span className="font-medium">{code.label}</span>
                  <span className="text-xs text-gray-500">{code.description}</span>
                </div>
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
 * Quick approval code buttons for rapid selection
 */
export function ApprovalCodeButtons({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: SubmittalApprovalCode | null | undefined
  onChange: (value: SubmittalApprovalCode) => void
  disabled?: boolean
  className?: string
}) {
  const colorClasses: Record<SubmittalApprovalCode, { base: string; selected: string }> = {
    A: {
      base: 'border-green-300 hover:bg-green-50',
      selected: 'bg-green-100 border-green-500 ring-2 ring-green-200',
    },
    B: {
      base: 'border-lime-300 hover:bg-lime-50',
      selected: 'bg-lime-100 border-lime-500 ring-2 ring-lime-200',
    },
    C: {
      base: 'border-orange-300 hover:bg-orange-50',
      selected: 'bg-orange-100 border-orange-500 ring-2 ring-orange-200',
    },
    D: {
      base: 'border-red-300 hover:bg-red-50',
      selected: 'bg-red-100 border-red-500 ring-2 ring-red-200',
    },
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {SUBMITTAL_APPROVAL_CODES.map((code) => {
        const isSelected = value === code.value
        const colors = colorClasses[code.value]

        return (
          <button
            key={code.value}
            type="button"
            onClick={() => onChange(code.value)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all',
              'min-w-[70px] disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected ? colors.selected : colors.base
            )}
            title={code.description}
          >
            <span className="text-2xl font-bold">{code.value}</span>
            <span className="text-xs text-gray-600 mt-1">{code.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ApprovalCodeSelect
