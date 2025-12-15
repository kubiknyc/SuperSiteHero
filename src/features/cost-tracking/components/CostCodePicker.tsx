/**
 * Cost Code Picker Component
 * Hierarchical cost code selector with search
 */

import { useState, useMemo } from 'react'
import { Check, ChevronDown, Search, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCostCodes } from '../hooks/useCostTracking'
import type { CostCode } from '@/types/cost-tracking'

interface CostCodePickerProps {
  companyId: string
  value: string | undefined
  onChange: (costCodeId: string, costCode: CostCode) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CostCodePicker({
  companyId,
  value,
  onChange,
  placeholder = 'Select cost code...',
  disabled = false,
  className,
}: CostCodePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: costCodes, isLoading } = useCostCodes({
    companyId,
    isActive: true,
  })

  // Find selected cost code
  const selectedCode = useMemo(() => {
    if (!value || !costCodes) {return null}
    return costCodes.find(c => c.id === value)
  }, [value, costCodes])

  // Filter and group cost codes
  const filteredCodes = useMemo(() => {
    if (!costCodes) {return []}

    let codes = costCodes

    if (search) {
      const searchLower = search.toLowerCase()
      codes = codes.filter(c =>
        c.code.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower) ||
        c.division?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by code
    return codes.sort((a, b) => a.code.localeCompare(b.code))
  }, [costCodes, search])

  // Group by division
  const groupedCodes = useMemo(() => {
    const groups: Record<string, CostCode[]> = {}

    filteredCodes.forEach(code => {
      const division = code.division || 'Other'
      if (!groups[division]) {
        groups[division] = []
      }
      groups[division].push(code)
    })

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredCodes])

  const handleSelect = (code: CostCode) => {
    onChange(code.id, code)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selectedCode ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono text-sm text-gray-600">{selectedCode.code}</span>
              <span className="truncate">{selectedCode.name}</span>
            </span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cost codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading cost codes...</div>
          ) : groupedCodes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <FolderTree className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No cost codes found</p>
              {search && <p className="text-sm">Try a different search term</p>}
            </div>
          ) : (
            groupedCodes.map(([division, codes]) => (
              <div key={division}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                  Division {division}
                </div>
                {codes.map((code) => (
                  <button
                    key={code.id}
                    onClick={() => handleSelect(code)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors',
                      value === code.id && 'bg-blue-50'
                    )}
                  >
                    <span className="font-mono text-sm text-gray-600 w-24 shrink-0">
                      {code.code}
                    </span>
                    <span className="flex-1 truncate text-sm">{code.name}</span>
                    {value === code.id && (
                      <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
