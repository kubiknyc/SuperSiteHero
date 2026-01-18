// File: /src/features/visual-search/components/SheetSelector.tsx
// Multi-select component for choosing drawing sheets to search

import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  FileImage,
  AlertCircle,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Button,
  Badge,
  Checkbox,
  NativeSelect,
  Skeleton,
  ScrollArea,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useDrawingSheets } from '@/features/drawing-sheets/hooks/useDrawingSheets'
import type { DrawingSheet, DrawingDiscipline } from '@/types/drawing-sheets'
import { DRAWING_DISCIPLINES, DISCIPLINE_LABELS } from '@/types/drawing-sheets'

interface SheetSelectorProps {
  projectId: string
  selectedSheetIds: Set<string>
  onSelectionChange: (selectedIds: Set<string>) => void
  className?: string
}

const DISCIPLINE_OPTIONS = [
  { value: '', label: 'All Disciplines' },
  ...DRAWING_DISCIPLINES.map((d) => ({ value: d, label: DISCIPLINE_LABELS[d] })),
]

// Quick select discipline buttons (most common in construction takeoffs)
const QUICK_SELECT_DISCIPLINES: DrawingDiscipline[] = [
  'electrical',
  'architectural',
  'mechanical',
  'plumbing',
  'structural',
]

/**
 * SheetSelector Component
 *
 * Multi-select component for choosing drawing sheets to search.
 *
 * Features:
 * - Checkboxes for each sheet with thumbnail, sheet number, and discipline
 * - "Select All" / "Deselect All" buttons
 * - Filter by discipline dropdown
 * - Quick select buttons for common disciplines
 * - Search input to filter by sheet number or name
 * - Shows selected count
 */
export function SheetSelector({
  projectId,
  selectedSheetIds,
  onSelectionChange,
  className,
}: SheetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState<DrawingDiscipline | ''>('')

  // Fetch all sheets for the project (completed processing only)
  const { data: sheets, isLoading, error } = useDrawingSheets(projectId, {
    processingStatus: 'completed',
  })

  // Filter sheets by search term and discipline
  const filteredSheets = useMemo(() => {
    if (!sheets) return []

    let result = sheets

    // Filter by discipline
    if (disciplineFilter) {
      result = result.filter((sheet) => sheet.discipline === disciplineFilter)
    }

    // Filter by search term
    const term = searchTerm.toLowerCase().trim()
    if (term) {
      result = result.filter((sheet) => {
        const sheetNumber = sheet.sheet_number?.toLowerCase() || ''
        const title = sheet.title?.toLowerCase() || ''
        return sheetNumber.includes(term) || title.includes(term)
      })
    }

    return result
  }, [sheets, searchTerm, disciplineFilter])

  // Get sheets for a specific discipline
  const getSheetsByDiscipline = useCallback(
    (discipline: DrawingDiscipline) => {
      if (!sheets) return []
      return sheets.filter((sheet) => sheet.discipline === discipline)
    },
    [sheets]
  )

  // Count sheets per discipline for quick select buttons
  const disciplineCounts = useMemo(() => {
    if (!sheets) return new Map<DrawingDiscipline, number>()
    const counts = new Map<DrawingDiscipline, number>()
    for (const sheet of sheets) {
      if (sheet.discipline) {
        counts.set(sheet.discipline, (counts.get(sheet.discipline) || 0) + 1)
      }
    }
    return counts
  }, [sheets])

  // Toggle single sheet selection
  const toggleSheet = useCallback(
    (sheetId: string) => {
      const newSelection = new Set(selectedSheetIds)
      if (newSelection.has(sheetId)) {
        newSelection.delete(sheetId)
      } else {
        newSelection.add(sheetId)
      }
      onSelectionChange(newSelection)
    },
    [selectedSheetIds, onSelectionChange]
  )

  // Select all visible sheets
  const selectAll = useCallback(() => {
    const newSelection = new Set(selectedSheetIds)
    for (const sheet of filteredSheets) {
      newSelection.add(sheet.id)
    }
    onSelectionChange(newSelection)
  }, [filteredSheets, selectedSheetIds, onSelectionChange])

  // Deselect all visible sheets
  const deselectAll = useCallback(() => {
    const filteredIds = new Set(filteredSheets.map((s) => s.id))
    const newSelection = new Set(
      [...selectedSheetIds].filter((id) => !filteredIds.has(id))
    )
    onSelectionChange(newSelection)
  }, [filteredSheets, selectedSheetIds, onSelectionChange])

  // Quick select all sheets of a discipline
  const quickSelectDiscipline = useCallback(
    (discipline: DrawingDiscipline) => {
      const disciplineSheets = getSheetsByDiscipline(discipline)
      const newSelection = new Set(selectedSheetIds)
      for (const sheet of disciplineSheets) {
        newSelection.add(sheet.id)
      }
      onSelectionChange(newSelection)
    },
    [getSheetsByDiscipline, selectedSheetIds, onSelectionChange]
  )

  // Check if all visible sheets are selected
  const allVisibleSelected = useMemo(() => {
    if (filteredSheets.length === 0) return false
    return filteredSheets.every((sheet) => selectedSheetIds.has(sheet.id))
  }, [filteredSheets, selectedSheetIds])

  // Count selected visible sheets
  const selectedVisibleCount = useMemo(() => {
    return filteredSheets.filter((sheet) => selectedSheetIds.has(sheet.id)).length
  }, [filteredSheets, selectedSheetIds])

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
          <span className="text-destructive">Failed to load sheets</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Select Sheets to Search</CardTitle>
            <CardDescription className="mt-1">
              Choose which drawing sheets to search for matches
            </CardDescription>
          </div>
          <Badge variant="default">
            {selectedSheetIds.size} selected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by sheet number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-label="Search drawing sheets"
            />
          </div>

          {/* Discipline Filter */}
          <div className="flex gap-2">
            <NativeSelect
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value as DrawingDiscipline | '')}
              className="w-40"
              aria-label="Filter by discipline"
            >
              {DISCIPLINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">
            <Zap className="h-3 w-3 inline mr-1" />
            Quick:
          </span>
          {QUICK_SELECT_DISCIPLINES.map((discipline) => {
            const count = disciplineCounts.get(discipline) || 0
            if (count === 0) return null
            return (
              <Button
                key={discipline}
                variant="outline"
                size="sm"
                onClick={() => quickSelectDiscipline(discipline)}
                className="text-xs h-7"
              >
                All {DISCIPLINE_LABELS[discipline]} ({count})
              </Button>
            )
          })}
        </div>

        {/* Select All / Deselect All */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={isLoading || filteredSheets.length === 0}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              disabled={isLoading || selectedVisibleCount === 0}
            >
              <Square className="h-4 w-4 mr-1" />
              Deselect All
            </Button>
          </div>

          <span className="text-sm text-muted-foreground">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                {selectedVisibleCount} of {filteredSheets.length} visible
                {(disciplineFilter || searchTerm) && ' (filtered)'}
              </>
            )}
          </span>
        </div>

        {/* Sheet List */}
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SheetItemSkeleton key={i} />
              ))}
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <FileImage className="h-10 w-10 text-muted-foreground mb-3" />
              {searchTerm || disciplineFilter ? (
                <>
                  <p className="text-sm font-medium mb-1">No sheets match your filters</p>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search or discipline filter.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1">No processed sheets available</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Upload drawing sheets and wait for processing to complete before using visual search.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSheets.map((sheet) => (
                <SheetItem
                  key={sheet.id}
                  sheet={sheet}
                  isSelected={selectedSheetIds.has(sheet.id)}
                  onToggle={() => toggleSheet(sheet.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Individual sheet item with checkbox
interface SheetItemProps {
  sheet: DrawingSheet
  isSelected: boolean
  onToggle: () => void
}

function SheetItem({ sheet, isSelected, onToggle }: SheetItemProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/5'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        touchFriendly={false}
      />

      {/* Thumbnail */}
      <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
        {sheet.thumbnail_url ? (
          <img
            src={sheet.thumbnail_url}
            alt={sheet.sheet_number || 'Sheet'}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileImage className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {sheet.sheet_number || `Page ${sheet.page_number}`}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {sheet.title || 'Untitled'}
        </p>
      </div>

      {/* Discipline Badge */}
      {sheet.discipline && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {DISCIPLINE_LABELS[sheet.discipline]}
        </Badge>
      )}
    </label>
  )
}

// Skeleton for loading state
function SheetItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="w-10 h-10 rounded" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-16 rounded" />
    </div>
  )
}

export default SheetSelector
