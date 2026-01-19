// File: /src/features/drawing-sheets/components/SheetGrid.tsx
// Grid view of drawing sheets with filtering and search

import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Loader2,
  FileImage,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  Input,
  Button,
  Badge,
  NativeSelect,
  Skeleton,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useDrawingSheets } from '../hooks/useDrawingSheets'
import type {
  DrawingSheet,
  DrawingDiscipline,
  ProcessingStatus,
} from '@/types/drawing-sheets'
import { DISCIPLINE_LABELS, PROCESSING_STATUS_LABELS } from '@/types/drawing-sheets'

interface SheetGridProps {
  projectId: string
  onSheetClick?: (sheet: DrawingSheet) => void
  selectedSheetId?: string
  className?: string
}

type ViewMode = 'grid' | 'list'

const DISCIPLINE_OPTIONS = [
  { value: '', label: 'All Disciplines' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'structural', label: 'Structural' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'civil', label: 'Civil' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'fire_protection', label: 'Fire Protection' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

/**
 * SheetGrid Component
 *
 * Displays a filterable grid or list of drawing sheets.
 *
 * Features:
 * - Grid and list view modes
 * - Search by sheet number and title
 * - Filter by discipline and processing status
 * - Thumbnail previews with status indicators
 * - Click to select/view sheet
 */
export function SheetGrid({
  projectId,
  onSheetClick,
  selectedSheetId,
  className,
}: SheetGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState<DrawingDiscipline | ''>('')
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | ''>('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Fetch sheets
  const { data: sheets, isLoading, error } = useDrawingSheets(projectId, {
    discipline: disciplineFilter || undefined,
    processingStatus: statusFilter || undefined,
  })

  // Filter sheets by search term
  const filteredSheets = useMemo(() => {
    if (!sheets) {return []}

    const term = searchTerm.toLowerCase().trim()
    if (!term) {return sheets}

    return sheets.filter((sheet) => {
      const sheetNumber = sheet.sheet_number?.toLowerCase() || ''
      const title = sheet.title?.toLowerCase() || ''
      return sheetNumber.includes(term) || title.includes(term)
    })
  }, [sheets, searchTerm])

  // Get status icon
  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Get discipline badge variant
  const getDisciplineBadgeVariant = (
    discipline: DrawingDiscipline | null
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (discipline) {
      case 'architectural':
        return 'default'
      case 'structural':
        return 'secondary'
      case 'electrical':
        return 'outline'
      case 'mechanical':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" />
        Failed to load sheets
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <NativeSelect
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value as DrawingDiscipline | '')}
            className="w-40"
          >
            {DISCIPLINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProcessingStatus | '')}
            className="w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>

          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          'Loading...'
        ) : (
          <>
            {filteredSheets.length} sheet{filteredSheets.length !== 1 ? 's' : ''}
            {(disciplineFilter || statusFilter || searchTerm) && ' (filtered)'}
          </>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          )}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SheetCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSheets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium">No sheets found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm || disciplineFilter || statusFilter
              ? 'Try adjusting your filters'
              : 'Upload a drawing set to get started'}
          </p>
        </div>
      )}

      {/* Sheet Grid/List */}
      {!isLoading && filteredSheets.length > 0 && (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          )}
        >
          {filteredSheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              viewMode={viewMode}
              isSelected={selectedSheetId === sheet.id}
              onClick={() => onSheetClick?.(sheet)}
              getStatusIcon={getStatusIcon}
              getDisciplineBadgeVariant={getDisciplineBadgeVariant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Sheet Card Component
interface SheetCardProps {
  sheet: DrawingSheet
  viewMode: ViewMode
  isSelected: boolean
  onClick?: () => void
  getStatusIcon: (status: ProcessingStatus) => React.ReactNode
  getDisciplineBadgeVariant: (discipline: DrawingDiscipline | null) => 'default' | 'secondary' | 'outline' | 'destructive'
}

function SheetCard({
  sheet,
  viewMode,
  isSelected,
  onClick,
  getStatusIcon,
  getDisciplineBadgeVariant,
}: SheetCardProps) {
  if (viewMode === 'list') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/50',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onClick}
      >
        <CardContent className="flex items-center gap-4 py-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
            {sheet.thumbnail_url ? (
              <img
                src={sheet.thumbnail_url}
                alt={sheet.sheet_number || 'Sheet'}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileImage className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {sheet.sheet_number || `Page ${sheet.page_number}`}
              </span>
              {getStatusIcon(sheet.processing_status)}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {sheet.title || 'Untitled'}
            </p>
          </div>

          {/* Discipline Badge */}
          {sheet.discipline && (
            <Badge variant={getDisciplineBadgeVariant(sheet.discipline)}>
              {DISCIPLINE_LABELS[sheet.discipline]}
            </Badge>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md overflow-hidden',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden relative">
        {sheet.thumbnail_url || sheet.full_image_url ? (
          <img
            src={sheet.thumbnail_url || sheet.full_image_url || ''}
            alt={sheet.sheet_number || 'Sheet'}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileImage className="h-12 w-12 text-muted-foreground" />
        )}

        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          {getStatusIcon(sheet.processing_status)}
        </div>

        {/* Discipline badge */}
        {sheet.discipline && (
          <div className="absolute bottom-2 left-2">
            <Badge
              variant={getDisciplineBadgeVariant(sheet.discipline)}
              className="text-xs"
            >
              {sheet.discipline.charAt(0).toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate">
          {sheet.sheet_number || `Page ${sheet.page_number}`}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {sheet.title || 'Untitled'}
        </p>
      </CardContent>
    </Card>
  )
}

// Skeleton for loading state
function SheetCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 py-3">
          <Skeleton className="w-16 h-16 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3]" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}
