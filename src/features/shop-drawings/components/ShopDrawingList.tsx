// File: /src/features/shop-drawings/components/ShopDrawingList.tsx
// Shop drawings list table with sorting and filtering

import { memo, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { ShopDrawingStatusBadge, PriorityBadge, DisciplineBadge } from './ShopDrawingStatusBadge'
import { ShopDrawingFilters } from './ShopDrawingFilters'
import { useShopDrawings, type ShopDrawingFilters as FiltersType, type ShopDrawingWithDetails } from '../hooks'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ShopDrawingListProps {
  projectId: string
  onShopDrawingClick?: (shopDrawing: ShopDrawingWithDetails) => void
}

type SortField = 'drawing_number' | 'title' | 'discipline' | 'status' | 'date_required' | 'priority'
type SortDirection = 'asc' | 'desc'

export const ShopDrawingList = memo(function ShopDrawingList({
  projectId,
  onShopDrawingClick,
}: ShopDrawingListProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FiltersType>({})
  const [sortField, setSortField] = useState<SortField>('drawing_number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const { data: shopDrawings, isLoading, error } = useShopDrawings(projectId, filters)

  // Sort data
  const sortedData = useMemo(() => {
    if (!shopDrawings) return []

    return [...shopDrawings].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'drawing_number':
          comparison = (a.drawing_number || '').localeCompare(b.drawing_number || '')
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'discipline':
          comparison = (a.discipline || '').localeCompare(b.discipline || '')
          break
        case 'status':
          comparison = a.review_status.localeCompare(b.review_status)
          break
        case 'date_required':
          if (!a.date_required) return 1
          if (!b.date_required) return -1
          comparison = new Date(a.date_required).getTime() - new Date(b.date_required).getTime()
          break
        case 'priority':
          const priorityOrder = { critical_path: 0, standard: 1, non_critical: 2 }
          comparison = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [shopDrawings, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleRowClick = (shopDrawing: ShopDrawingWithDetails) => {
    if (onShopDrawingClick) {
      onShopDrawingClick(shopDrawing)
    } else {
      navigate(`/projects/${projectId}/shop-drawings/${shopDrawing.id}`)
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => toggleSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  )

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load shop drawings: {(error as Error).message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <ShopDrawingFilters filters={filters} onFiltersChange={setFilters} />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${sortedData.length} shop drawing${sortedData.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="drawing_number">Drawing #</SortableHeader>
              <SortableHeader field="title">Title</SortableHeader>
              <SortableHeader field="discipline">Discipline</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <SortableHeader field="priority">Priority</SortableHeader>
              <SortableHeader field="date_required">Required Date</SortableHeader>
              <TableHead>Rev</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>No shop drawings found</p>
                    <p className="text-xs">Create a new shop drawing to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((sd) => (
                <TableRow
                  key={sd.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    sd.is_overdue && 'bg-red-50 dark:bg-red-900/10'
                  )}
                  onClick={() => handleRowClick(sd)}
                >
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      {sd.long_lead_item && (
                        <Clock className="h-4 w-4 text-orange-500" title="Long Lead Item" />
                      )}
                      {sd.drawing_number || sd.submittal_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate font-medium" title={sd.title}>
                      {sd.title}
                    </div>
                    {sd.subcontractor && (
                      <div className="text-xs text-muted-foreground">
                        {sd.subcontractor.company_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sd.discipline && <DisciplineBadge discipline={sd.discipline} />}
                  </TableCell>
                  <TableCell>
                    <ShopDrawingStatusBadge status={sd.review_status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={sd.priority} />
                  </TableCell>
                  <TableCell>
                    {sd.date_required ? (
                      <div className={cn(sd.is_overdue && 'text-red-600 font-medium')}>
                        {new Date(sd.date_required).toLocaleDateString()}
                        {sd.is_overdue && (
                          <div className="text-xs">
                            Overdue by {Math.abs(sd.days_until_required || 0)} days
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                      {sd.revision_label || `Rev ${sd.revision_number || 0}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRowClick(sd)
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})
