// File: /src/features/documents/components/search/DocumentFilters.tsx
// Advanced document filtering UI component

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Label,
  Select,
  Input,
} from '@/components/ui'
import { useAvailableDisciplines } from '@/features/documents/hooks/useDocumentFilters'
import { cn } from '@/lib/utils'
import type { DocumentType, DocumentStatus } from '@/types/database'

export interface DocumentFiltersState {
  documentType?: DocumentType
  discipline?: string
  status?: DocumentStatus
  dateFrom?: string
  dateTo?: string
  hasPinned?: boolean
}

interface DocumentFiltersProps {
  projectId: string
  filters: DocumentFiltersState
  onFiltersChange: (filters: DocumentFiltersState) => void
  onReset?: () => void
  isOpen?: boolean
  onToggle?: () => void
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'specification', label: 'Specification' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'scope', label: 'Scope of Work' },
  { value: 'general', label: 'General' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
]

const DOCUMENT_STATUSES: { value: DocumentStatus; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'archived', label: 'Archived' },
  { value: 'void', label: 'Void' },
]

export function DocumentFilters({
  projectId,
  filters,
  onFiltersChange,
  onReset,
  isOpen = true,
  onToggle,
}: DocumentFiltersProps) {
  const { data: disciplines = [] } = useAvailableDisciplines(projectId)
  const [showPanel, setShowPanel] = useState(isOpen)

  const activeFilterCount = Object.entries(filters).filter(
    ([_, value]) => value !== undefined && value !== null && value !== ''
  ).length

  const handleToggle = () => {
    setShowPanel(!showPanel)
    onToggle?.()
  }

  const handleFilterChange = (key: keyof DocumentFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  const handleRemoveFilter = (key: keyof DocumentFiltersState) => {
    const updated = { ...filters }
    delete updated[key]
    onFiltersChange(updated)
  }

  const handleReset = () => {
    onFiltersChange({})
    onReset?.()
  }

  return (
    <Card className="border-b rounded-none">
      <CardContent className="p-4">
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-info-light text-blue-800 text-xs font-semibold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-secondary transition-transform',
              showPanel && 'rotate-180'
            )}
          />
        </button>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.documentType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                Type: {DOCUMENT_TYPES.find(t => t.value === filters.documentType)?.label}
                <button
                  onClick={() => handleRemoveFilter('documentType')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.discipline && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                Discipline: {filters.discipline}
                <button
                  onClick={() => handleRemoveFilter('discipline')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                Status: {DOCUMENT_STATUSES.find(s => s.value === filters.status)?.label}
                <button
                  onClick={() => handleRemoveFilter('status')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                From: {filters.dateFrom}
                <button
                  onClick={() => handleRemoveFilter('dateFrom')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                To: {filters.dateTo}
                <button
                  onClick={() => handleRemoveFilter('dateTo')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.hasPinned === true && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-secondary text-sm rounded">
                Pinned Only
                <button
                  onClick={() => handleRemoveFilter('hasPinned')}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {showPanel && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label htmlFor="filter-type">Document Type</Label>
              <Select
                id="filter-type"
                value={(filters.documentType as string) || ''}
                onChange={(e) => {
                  const val = e.target.value as DocumentType | ''
                  handleFilterChange('documentType', val === '' ? undefined : val)
                }}
                className="mt-1"
              >
                <option value="">All Types</option>
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value as string}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            {disciplines.length > 0 && (
              <div>
                <Label htmlFor="filter-discipline">Discipline</Label>
                <Select
                  id="filter-discipline"
                  value={filters.discipline || ''}
                  onChange={(e) =>
                    handleFilterChange('discipline', e.target.value || undefined)
                  }
                  className="mt-1"
                >
                  <option value="">All Disciplines</option>
                  {disciplines.map(discipline => (
                    <option key={discipline} value={discipline}>
                      {discipline}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                value={(filters.status as string) || ''}
                onChange={(e) => {
                  const val = e.target.value as DocumentStatus | ''
                  handleFilterChange('status', val === '' ? undefined : val)
                }}
                className="mt-1"
              >
                <option value="">All Statuses</option>
                {DOCUMENT_STATUSES.map(status => (
                  <option key={status.value} value={status.value as string}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="filter-date-from">From Date</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={(filters.dateFrom as string | undefined) || ''}
                  onChange={(e) =>
                    handleFilterChange('dateFrom', e.target.value || undefined)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filter-date-to">To Date</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={(filters.dateTo as string | undefined) || ''}
                  onChange={(e) =>
                    handleFilterChange('dateTo', e.target.value || undefined)
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="filter-pinned"
                type="checkbox"
                checked={filters.hasPinned === true}
                onChange={(e) =>
                  handleFilterChange('hasPinned', e.target.checked ? true : undefined)
                }
                className="rounded"
              />
              <Label htmlFor="filter-pinned" className="mb-0 cursor-pointer">
                Show Pinned Documents Only
              </Label>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
