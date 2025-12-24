// File: /src/features/documents/components/comparison/MarkupChangesList.tsx
// List of markup changes with filtering and interaction

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Filter,
  Search,
  ArrowDownUp,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  MapPin,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChangeRegion } from '../../types/markup'

type ChangeFilter = 'all' | 'added' | 'removed' | 'modified'
type SortOption = 'location' | 'size' | 'type' | 'confidence'

interface ChangeStats {
  added: number
  removed: number
  modified: number
  total: number
}

interface MarkupChangesListProps {
  changeRegions: ChangeRegion[]
  filter: ChangeFilter
  onFilterChange: (filter: ChangeFilter) => void
  selectedChangeId: string | null
  onSelectChange: (change: ChangeRegion) => void
  changeStats: ChangeStats
  comparisonSummary?: string
  onTransferMarkups?: () => void
}

export function MarkupChangesList({
  changeRegions,
  filter,
  onFilterChange,
  selectedChangeId,
  onSelectChange,
  changeStats,
  comparisonSummary,
  onTransferMarkups,
}: MarkupChangesListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('location')

  // Filter and sort changes
  const filteredAndSortedChanges = useMemo(() => {
    let filtered = changeRegions

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(region => region.changeType === filter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(region =>
        region.description?.toLowerCase().includes(query) ||
        region.changeType.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'location':
        sorted.sort((a, b) => (a.y - b.y) || (a.x - b.x))
        break
      case 'size':
        sorted.sort((a, b) => (b.width * b.height) - (a.width * a.height))
        break
      case 'type':
        sorted.sort((a, b) => a.changeType.localeCompare(b.changeType))
        break
      case 'confidence':
        sorted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        break
    }

    return sorted
  }, [changeRegions, filter, searchQuery, sortBy])

  const changeTypeConfig = {
    added: {
      icon: Plus,
      label: 'Added',
      color: 'text-success',
      bgColor: 'bg-success-light',
      borderColor: 'border-green-500',
      badgeVariant: 'default' as const,
      badgeClassName: 'bg-success',
    },
    removed: {
      icon: Minus,
      label: 'Removed',
      color: 'text-error',
      bgColor: 'bg-error-light',
      borderColor: 'border-red-500',
      badgeVariant: 'destructive' as const,
      badgeClassName: 'bg-error',
    },
    modified: {
      icon: Edit,
      label: 'Modified',
      color: 'text-warning',
      bgColor: 'bg-warning-light',
      borderColor: 'border-warning',
      badgeVariant: 'default' as const,
      badgeClassName: 'bg-yellow-600',
    },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-surface">
        <h3 className="text-lg font-semibold mb-3" className="heading-subsection">Markup Changes</h3>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => onFilterChange('added')}
            className={cn(
              'p-2 rounded text-center transition-colors',
              filter === 'added'
                ? 'bg-success text-white'
                : 'bg-success-light text-success-dark hover:bg-success-light'
            )}
          >
            <div className="text-lg font-bold">{changeStats.added}</div>
            <div className="text-xs">Added</div>
          </button>
          <button
            onClick={() => onFilterChange('removed')}
            className={cn(
              'p-2 rounded text-center transition-colors',
              filter === 'removed'
                ? 'bg-error text-white'
                : 'bg-error-light text-error-dark hover:bg-error-light'
            )}
          >
            <div className="text-lg font-bold">{changeStats.removed}</div>
            <div className="text-xs">Removed</div>
          </button>
          <button
            onClick={() => onFilterChange('modified')}
            className={cn(
              'p-2 rounded text-center transition-colors',
              filter === 'modified'
                ? 'bg-yellow-600 text-white'
                : 'bg-warning-light text-yellow-700 hover:bg-warning-light'
            )}
          >
            <div className="text-lg font-bold">{changeStats.modified}</div>
            <div className="text-xs">Modified</div>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-disabled" />
            <Input
              type="text"
              placeholder="Search changes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-secondary">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter */}
          {filter !== 'all' && (
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
              <span className="text-xs text-primary-hover">
                Showing {filter} changes only
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange('all')}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {comparisonSummary && (
        <div className="p-3 bg-blue-50 border-b">
          <p className="text-sm text-blue-900">{comparisonSummary}</p>
        </div>
      )}

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedChanges.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No changes found</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? 'Try a different search term'
                : filter !== 'all'
                ? 'Try changing the filter'
                : 'No markup changes detected'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAndSortedChanges.map((change, index) => {
              const config = changeTypeConfig[change.changeType]
              const Icon = config.icon
              const isSelected = change.id === selectedChangeId

              return (
                <button
                  key={change.id}
                  onClick={() => onSelectChange(change)}
                  className={cn(
                    'w-full p-3 text-left transition-colors hover:bg-surface',
                    isSelected && 'bg-blue-50 border-l-4 border-primary'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={config.badgeVariant}
                          className={cn('text-xs', config.badgeClassName)}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted">
                          #{index + 1}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-foreground truncate mb-1">
                        {change.description || `${config.label} markup change`}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          x:{change.x} y:{change.y}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {change.width}×{change.height}
                        </span>
                      </div>

                      {/* Confidence */}
                      {change.confidence !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted">Confidence</span>
                            <span className="font-medium">
                              {(change.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={cn(
                                'h-1.5 rounded-full transition-all',
                                change.confidence > 0.7
                                  ? 'bg-green-500'
                                  : change.confidence > 0.4
                                  ? 'bg-warning'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${change.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Jump indicator */}
                    <ChevronRight
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-transform',
                        isSelected && 'rotate-90'
                      )}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t bg-surface space-y-2">
        <div className="text-xs text-secondary mb-2">
          Showing {filteredAndSortedChanges.length} of {changeRegions.length} changes
        </div>

        {onTransferMarkups && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTransferMarkups}
            className="w-full"
          >
            <Package className="w-4 h-4 mr-2" />
            Transfer All Markups
          </Button>
        )}
      </div>
    </div>
  )
}

export default MarkupChangesList
