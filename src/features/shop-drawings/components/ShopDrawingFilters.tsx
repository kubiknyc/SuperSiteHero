// File: /src/features/shop-drawings/components/ShopDrawingFilters.tsx
// Filter controls for shop drawings list

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { X, Filter } from 'lucide-react'
import type { SubmittalReviewStatus } from '@/types/database'
import type { ShopDrawingPriority, ShopDrawingDiscipline } from '@/types/submittal'
import { SUBMITTAL_REVIEW_STATUSES } from '@/types/submittal'
import { SHOP_DRAWING_PRIORITIES, SHOP_DRAWING_DISCIPLINES } from '../hooks/useShopDrawings'
import type { ShopDrawingFilters as FiltersType } from '../hooks/useShopDrawings'

interface ShopDrawingFiltersProps {
  filters: FiltersType
  onFiltersChange: (filters: FiltersType) => void
  subcontractors?: Array<{ id: string; company_name: string }>
}

export const ShopDrawingFilters = memo(function ShopDrawingFilters({
  filters,
  onFiltersChange,
  subcontractors = [],
}: ShopDrawingFiltersProps) {
  const hasActiveFilters =
    filters.status ||
    filters.discipline ||
    filters.priority ||
    filters.longLeadOnly ||
    filters.overdueOnly ||
    filters.subcontractorId

  const clearFilters = () => {
    onFiltersChange({})
  }

  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined, // Remove empty values
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      {/* Status Filter */}
      <div className="space-y-1">
        <Label htmlFor="status-filter" className="text-xs">
          Status
        </Label>
        <Select
          id="status-filter"
          value={filters.status as string || ''}
          onValueChange={(value) =>
            updateFilter('status', value as SubmittalReviewStatus || undefined)
          }
        >
          <option value="">All Statuses</option>
          {SUBMITTAL_REVIEW_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Discipline Filter */}
      <div className="space-y-1">
        <Label htmlFor="discipline-filter" className="text-xs">
          Discipline
        </Label>
        <Select
          id="discipline-filter"
          value={filters.discipline as string || ''}
          onValueChange={(value) =>
            updateFilter('discipline', value as ShopDrawingDiscipline || undefined)
          }
        >
          <option value="">All Disciplines</option>
          {SHOP_DRAWING_DISCIPLINES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Priority Filter */}
      <div className="space-y-1">
        <Label htmlFor="priority-filter" className="text-xs">
          Priority
        </Label>
        <Select
          id="priority-filter"
          value={filters.priority as string || ''}
          onValueChange={(value) =>
            updateFilter('priority', value as ShopDrawingPriority || undefined)
          }
        >
          <option value="">All Priorities</option>
          {SHOP_DRAWING_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Subcontractor Filter */}
      {subcontractors.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="subcontractor-filter" className="text-xs">
            Subcontractor
          </Label>
          <Select
            id="subcontractor-filter"
            value={filters.subcontractorId || ''}
            onValueChange={(value) => updateFilter('subcontractorId', value || undefined)}
          >
            <option value="">All Subcontractors</option>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.company_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Checkbox Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="long-lead-filter"
            checked={filters.longLeadOnly || false}
            onCheckedChange={(checked) => updateFilter('longLeadOnly', checked === true || undefined)}
          />
          <Label htmlFor="long-lead-filter" className="text-sm font-normal cursor-pointer">
            Long Lead Only
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="overdue-filter"
            checked={filters.overdueOnly || false}
            onCheckedChange={(checked) => updateFilter('overdueOnly', checked === true || undefined)}
          />
          <Label htmlFor="overdue-filter" className="text-sm font-normal cursor-pointer">
            Overdue Only
          </Label>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
})
