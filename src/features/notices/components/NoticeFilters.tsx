// File: /src/features/notices/components/NoticeFilters.tsx
// Filter controls for notices list

import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NoticeFilters as FilterType } from '../types'
import { NOTICE_TYPES, NOTICE_STATUSES, NOTICE_DIRECTIONS } from '../types'

interface NoticeFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
  overdueCount?: number
  className?: string
}

// Quick filter chips
const QUICK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'awaiting_response', label: 'Awaiting Response' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
] as const

type QuickFilterKey = typeof QUICK_FILTERS[number]['key']

export function NoticeFilters({
  filters,
  onFiltersChange,
  overdueCount = 0,
  className,
}: NoticeFiltersProps) {
  // Determine which quick filter is active
  const getActiveQuickFilter = (): QuickFilterKey => {
    if (filters.is_critical === true) {return 'critical'}
    if (filters.status === 'pending_response' || filters.response_required === true) {
      return 'awaiting_response'
    }
    if (filters.direction === 'outgoing') {return 'sent'}
    if (filters.direction === 'incoming') {return 'received'}
    // Note: 'overdue' requires special handling in the parent component
    return 'all'
  }

  const activeQuickFilter = getActiveQuickFilter()

  // Handle quick filter selection
  const handleQuickFilter = (key: QuickFilterKey) => {
    const newFilters: FilterType = { search: filters.search }

    switch (key) {
      case 'critical':
        newFilters.is_critical = true
        break
      case 'overdue':
        // Special case - handled by parent with useOverdueNotices
        newFilters.response_required = true
        break
      case 'awaiting_response':
        newFilters.response_required = true
        break
      case 'sent':
        newFilters.direction = 'outgoing'
        break
      case 'received':
        newFilters.direction = 'incoming'
        break
      case 'all':
      default:
        // Clear all filters except search
        break
    }

    onFiltersChange(newFilters)
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value || undefined,
    })
  }

  // Handle clear filters
  const handleClearFilters = () => {
    onFiltersChange({})
  }

  // Check if any filters are active
  const hasActiveFilters =
    filters.status ||
    filters.notice_type ||
    filters.direction ||
    filters.is_critical ||
    filters.response_required ||
    filters.search

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by reference, subject, or party..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {filters.search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter.key}
            variant={activeQuickFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter(filter.key)}
            className={cn(
              'relative',
              activeQuickFilter === filter.key && 'ring-2 ring-offset-1'
            )}
          >
            {filter.label}
            {filter.key === 'overdue' && overdueCount > 0 && (
              <Badge
                className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0"
              >
                {overdueCount}
              </Badge>
            )}
          </Button>
        ))}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced filters row (expandable in future) */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Notice type filter */}
        <select
          value={filters.notice_type || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              notice_type: (e.target.value as any) || undefined,
            })
          }
          className="text-sm border rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">All Types</option>
          {NOTICE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              status: (e.target.value as any) || undefined,
            })
          }
          className="text-sm border rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">All Statuses</option>
          {NOTICE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
