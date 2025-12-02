/**
 * Inspection Filters Component
 *
 * Filter panel for inspection list with status, type, and date filters.
 */

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InspectionFilters as InspectionFiltersType, InspectionStatus, InspectionResult, InspectionType } from '../types'
import {
  INSPECTION_STATUS_CONFIG,
  INSPECTION_RESULT_CONFIG,
  INSPECTION_TYPE_CONFIG,
} from '../types'

interface InspectionFiltersProps {
  filters: InspectionFiltersType
  onFiltersChange: (filters: InspectionFiltersType) => void
  className?: string
}

export function InspectionFilters({
  filters,
  onFiltersChange,
  className,
}: InspectionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = <K extends keyof InspectionFiltersType>(
    key: K,
    value: InspectionFiltersType[K] | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.status || filters.result || filters.inspection_type || filters.search

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and toggle row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search inspections..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(hasActiveFilters && 'border-blue-500 text-blue-600')}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
              {
                [filters.status, filters.result, filters.inspection_type].filter(
                  Boolean
                ).length
              }
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                updateFilter('status', value === 'all' ? undefined : (value as InspectionStatus))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(INSPECTION_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Result filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Result
            </label>
            <Select
              value={filters.result || 'all'}
              onValueChange={(value) =>
                updateFilter('result', value === 'all' ? undefined : (value as InspectionResult))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                {Object.entries(INSPECTION_RESULT_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <Select
              value={filters.inspection_type || 'all'}
              onValueChange={(value) =>
                updateFilter(
                  'inspection_type',
                  value === 'all' ? undefined : (value as InspectionType)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(INSPECTION_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

export default InspectionFilters
