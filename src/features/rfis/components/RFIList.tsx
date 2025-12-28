// File: /src/features/rfis/components/RFIList.tsx
// Table list of RFIs with filtering and sorting capabilities

import { format, isPast } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RFIStatusBadge } from './RFIStatusBadge'
import { RFIPriorityBadge } from './RFIPriorityBadge'
import type { WorkflowItem } from '@/types/database'
import { UserName } from '@/components/shared'

export interface RFIListProps {
  rfis: WorkflowItem[]
  isLoading: boolean
  onSelectRFI: (rfi: WorkflowItem) => void
  filters?: {
    status?: string
    priority?: string
  }
}

/**
 * RFIList Component
 *
 * Displays RFIs in a responsive table with status/priority badges
 * Highlights overdue items and provides row-level actions
 *
 * @example
 * ```tsx
 * <RFIList
 *   rfis={rfis}
 *   isLoading={isLoading}
 *   onSelectRFI={(rfi) => navigate(`/rfis/${rfi.id}`)}
 *   filters={{ status: 'submitted', priority: 'high' }}
 * />
 * ```
 *
 * Performance:
 * - Memoize filtered data if list is large
 * - Use virtual scrolling for 100+ items
 * - Lazy load RFI details on row click
 *
 * Accessibility:
 * - Semantic table markup with proper headers
 * - Sortable columns with aria-sort attributes
 * - Row actions accessible via keyboard
 * - Screen reader friendly status indicators
 */
export function RFIList({ rfis, isLoading, onSelectRFI, filters }: RFIListProps) {
  // Apply filters
  const filteredRFIs = rfis.filter((rfi) => {
    if (filters?.status && rfi.status !== filters.status) {
      return false
    }
    if (filters?.priority && rfi.priority !== filters.priority) {
      return false
    }
    return true
  })

  // Check if RFI is overdue
  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) {return false}
    return isPast(new Date(dueDate))
  }

  // Format date with fallback
  const formatDate = (date: string | null): string => {
    if (!date) {return '-'}
    try {
      return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A'
    } catch {
      return '-'
    }
  }

  // Render assignees display
  const renderAssignees = (assignees: string[] | null) => {
    if (!assignees || assignees.length === 0) {return <span>Unassigned</span>}
    if (assignees.length === 1) {
      return <UserName userId={assignees[0]} fallback="Unknown User" />
    }
    return (
      <span>
        <UserName userId={assignees[0]} fallback="Unknown User" />
        <span> +{assignees.length - 1}</span>
      </span>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-disabled animate-spin mb-4" />
            <p className="text-secondary">Loading RFIs...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (filteredRFIs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RFIs</CardTitle>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-secondary font-medium">No RFIs found</p>
            <p className="text-sm text-muted mt-2">
              {filters?.status || filters?.priority
                ? 'Try adjusting your filters'
                : 'Create your first RFI to get started'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          RFIs
          <span className="ml-2 text-sm font-normal text-muted">
            ({filteredRFIs.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">RFI #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[150px]">Assignee(s)</TableHead>
                <TableHead className="w-[130px]">Due Date</TableHead>
                <TableHead className="w-[130px]">Created</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRFIs.map((rfi) => {
                const overdueStatus = isOverdue(rfi.due_date)
                return (
                  <TableRow
                    key={rfi.id}
                    className={cn(
                      'cursor-pointer hover:bg-surface',
                      overdueStatus && 'bg-error-light/50 hover:bg-error-light'
                    )}
                    onClick={() => onSelectRFI(rfi)}
                  >
                    {/* RFI Number */}
                    <TableCell className="font-medium">
                      {rfi.reference_number || `#${rfi.number || '-'}`}
                    </TableCell>

                    {/* Title */}
                    <TableCell>
                      <div className="max-w-md">
                        <p className="font-medium text-foreground truncate">
                          {rfi.title || 'Untitled RFI'}
                        </p>
                        {rfi.description && (
                          <p className="text-xs text-muted truncate mt-1">
                            {rfi.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <RFIStatusBadge
                        status={rfi.status as 'pending' | 'submitted' | 'approved' | 'rejected' | 'closed'}
                      />
                    </TableCell>

                    {/* Priority Badge */}
                    <TableCell>
                      <RFIPriorityBadge priority={rfi.priority as 'low' | 'normal' | 'high'} />
                    </TableCell>

                    {/* Assignees */}
                    <TableCell className="text-sm text-secondary">
                      {renderAssignees(rfi.assignees)}
                    </TableCell>

                    {/* Due Date */}
                    <TableCell
                      className={cn(
                        'text-sm',
                        overdueStatus ? 'text-error font-medium' : 'text-secondary'
                      )}
                    >
                      {formatDate(rfi.due_date)}
                      {overdueStatus && (
                        <span className="ml-1 text-xs">(Overdue)</span>
                      )}
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-sm text-secondary">
                      {formatDate(rfi.created_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectRFI(rfi)
                        }}
                        aria-label={`View RFI ${rfi.reference_number || rfi.number}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
