/**
 * Inline Cost Code Picker
 *
 * Lightweight inline cost code selector for use in forms and grids
 */

import { useState, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCostCodes } from '@/features/cost-tracking/hooks/useCostTracking'
import type { CostCode } from '@/types/cost-tracking'

interface InlineCostCodePickerProps {
  companyId: string | undefined
  value: string | undefined
  onChange: (costCodeId: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  compact?: boolean
}

export function InlineCostCodePicker({
  companyId,
  value,
  onChange,
  placeholder = 'Cost code...',
  disabled = false,
  className,
  compact = false,
}: InlineCostCodePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: costCodes, isLoading } = useCostCodes({
    companyId: companyId || '',
    isActive: true,
  })

  // Find selected cost code
  const selectedCode = useMemo(() => {
    if (!value || !costCodes) return null
    return costCodes.find(c => c.id === value)
  }, [value, costCodes])

  // Filter cost codes
  const filteredCodes = useMemo(() => {
    if (!costCodes) return []

    let codes = costCodes

    if (search) {
      const searchLower = search.toLowerCase()
      codes = codes.filter(c =>
        c.code.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower)
      )
    }

    return codes.sort((a, b) => a.code.localeCompare(b.code)).slice(0, 20)
  }, [costCodes, search])

  const handleSelect = (code: CostCode) => {
    onChange(code.id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  if (!companyId) {
    return (
      <div className={cn('text-gray-400 text-sm', className)}>
        {placeholder}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full text-left',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
          'border rounded-md bg-white',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span className={cn(
          'truncate flex-1',
          !selectedCode && 'text-gray-400'
        )}>
          {selectedCode ? (
            <span className="flex items-center gap-1">
              <span className="font-mono text-gray-600">{selectedCode.code}</span>
              {!compact && <span className="truncate">{selectedCode.name}</span>}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1 ml-1">
          {selectedCode && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            open && 'transform rotate-180'
          )} />
        </div>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className={cn(
            'absolute z-20 mt-1 w-64 bg-white border rounded-lg shadow-lg',
            compact ? 'left-0' : 'left-0'
          )}>
            {/* Search */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  Loading...
                </div>
              ) : filteredCodes.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  No cost codes found
                </div>
              ) : (
                filteredCodes.map((code) => (
                  <button
                    key={code.id}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100',
                      value === code.id && 'bg-blue-50'
                    )}
                  >
                    <span className="font-mono text-xs text-gray-600 w-16 shrink-0">
                      {code.code}
                    </span>
                    <span className="truncate">{code.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default InlineCostCodePicker
