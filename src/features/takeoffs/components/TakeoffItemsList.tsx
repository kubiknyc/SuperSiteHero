// File: /src/features/takeoffs/components/TakeoffItemsList.tsx
// List view of takeoff measurements with filtering and sorting

/* eslint-disable react-hooks/preserve-manual-memoization */

import { useState, useMemo } from 'react'
import { Search, SortAsc, SortDesc, Filter, Trash2, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
// ScrollArea component not available, using overflow-auto instead
import type { TakeoffMeasurement } from './TakeoffCanvas'
import type { MeasurementType, ScaleFactor } from '../utils/measurements'
import {
  calculateLinear,
  calculateArea,
  calculateCount,
  calculateLinearWithDrop,
  calculatePitchedArea,
  calculatePitchedLinear,
  calculateSurfaceArea,
  calculateVolume2D,
} from '../utils/measurements'

export interface TakeoffItemsListProps {
  measurements: TakeoffMeasurement[]
  scale?: ScaleFactor
  selectedId?: string | null
  onSelect?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<TakeoffMeasurement>) => void
}

type SortField = 'name' | 'type' | 'value' | 'created'
type SortDirection = 'asc' | 'desc'

const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  linear: 'Linear',
  area: 'Area',
  count: 'Count',
  linear_with_drop: 'Linear + Drop',
  pitched_area: 'Pitched Area',
  pitched_linear: 'Pitched Linear',
  surface_area: 'Surface Area',
  volume_2d: 'Volume 2D',
  volume_3d: 'Volume 3D',
}

/**
 * TakeoffItemsList Component
 *
 * Displays list of measurements with filtering, sorting, and actions.
 * Features:
 * - Search by name
 * - Filter by type
 * - Sort by name/type/value
 * - Delete measurements
 * - Toggle visibility
 * - Select for editing
 */
export function TakeoffItemsList({
  measurements,
  scale,
  selectedId,
  onSelect,
  onDelete,
  onToggleVisibility,
  onUpdate: _onUpdate,
}: TakeoffItemsListProps) {
  'use no memo'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [typeFilters, setTypeFilters] = useState<Set<MeasurementType>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  // Calculate measurement value
  const calculateValue = (measurement: TakeoffMeasurement): number => {
    if (!scale) {return 0}

    try {
      switch (measurement.type) {
        case 'linear':
          return calculateLinear(measurement.points, scale, 'ft')

        case 'area':
          return calculateArea(measurement.points, scale, 'ft2')

        case 'count':
          return calculateCount(measurement.points)

        case 'linear_with_drop': {
          const result = calculateLinearWithDrop(
            measurement.points,
            measurement.dropHeight || 0,
            scale,
            'ft'
          )
          return result.total
        }

        case 'pitched_area': {
          const result = calculatePitchedArea(
            measurement.points,
            measurement.pitch || 0,
            scale,
            'ft2'
          )
          return result.actual
        }

        case 'pitched_linear': {
          const result = calculatePitchedLinear(
            measurement.points,
            measurement.pitch || 0,
            scale,
            'ft'
          )
          return result.actual
        }

        case 'surface_area': {
          const result = calculateSurfaceArea(
            measurement.points,
            measurement.height || 0,
            scale,
            'ft2',
            false
          )
          return result.total
        }

        case 'volume_2d':
          return calculateVolume2D(measurement.points, measurement.depth || 0, scale, 'ft3')

        case 'volume_3d':
          return 0 // Requires special calculation

        default:
          return 0
      }
    } catch {
      return 0
    }
  }

  // Format value for display
  const formatValue = (measurement: TakeoffMeasurement): string => {
    const value = calculateValue(measurement)

    switch (measurement.type) {
      case 'linear':
      case 'linear_with_drop':
      case 'pitched_linear':
        return `${value.toFixed(2)} LF`

      case 'area':
      case 'pitched_area':
      case 'surface_area':
        return `${value.toFixed(2)} SF`

      case 'count':
        return `${value} EA`

      case 'volume_2d':
      case 'volume_3d':
        return `${value.toFixed(2)} CF`

      default:
        return '--'
    }
  }

  // Filter and sort measurements
  const filteredMeasurements = useMemo(() => {
    'use no memo';
    let filtered = measurements

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((m) => m.name?.toLowerCase().includes(query))
    }

    // Type filter
    if (typeFilters.size > 0) {
      filtered = filtered.filter((m) => typeFilters.has(m.type))
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break

        case 'type':
          comparison = MEASUREMENT_TYPE_LABELS[a.type].localeCompare(
            MEASUREMENT_TYPE_LABELS[b.type]
          )
          break

        case 'value':
          comparison = calculateValue(a) - calculateValue(b)
          break

        case 'created':
          // Default to array order (creation order)
          comparison = 0
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [measurements, searchQuery, typeFilters, sortField, sortDirection])

  // Toggle type filter
  const toggleTypeFilter = (type: MeasurementType) => {
    const newFilters = new Set(typeFilters)
    if (newFilters.has(type)) {
      newFilters.delete(type)
    } else {
      newFilters.add(type)
    }
    setTypeFilters(newFilters)
  }

  // Toggle visibility
  const handleToggleVisibility = (id: string) => {
    const newHidden = new Set(hiddenIds)
    if (newHidden.has(id)) {
      newHidden.delete(id)
    } else {
      newHidden.add(id)
    }
    setHiddenIds(newHidden)
    onToggleVisibility?.(id)
  }

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold heading-subsection">Measurements</h3>
          <Badge variant="secondary">{filteredMeasurements.length}</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search measurements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters & Sort */}
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="w-3 h-3 mr-1" />
                Type
                {typeFilters.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {typeFilters.size}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(MEASUREMENT_TYPE_LABELS).map(([type, label]) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={typeFilters.has(type as MeasurementType)}
                  onCheckedChange={() => toggleTypeFilter(type as MeasurementType)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {sortDirection === 'asc' ? (
                  <SortAsc className="w-3 h-3 mr-1" />
                ) : (
                  <SortDesc className="w-3 h-3 mr-1" />
                )}
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortField('name')}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField('type')}>Type</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField('value')}>Value</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField('created')}>Created</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <div className="p-2 space-y-2">
          {filteredMeasurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || typeFilters.size > 0 ? 'No measurements found' : 'No measurements yet'}
            </div>
          ) : (
            filteredMeasurements.map((measurement) => (
              <div
                key={measurement.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === measurement.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted/50'
                } ${hiddenIds.has(measurement.id) ? 'opacity-50' : ''}`}
                onClick={() => onSelect?.(measurement.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: measurement.color }}
                      />
                      <div className="font-medium text-sm truncate">
                        {measurement.name || 'Unnamed'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {MEASUREMENT_TYPE_LABELS[measurement.type]}
                      </Badge>
                      <span className="font-mono">{formatValue(measurement)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleVisibility(measurement.id)
                      }}
                    >
                      {hiddenIds.has(measurement.id) ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this measurement?')) {
                            onDelete(measurement.id)
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
