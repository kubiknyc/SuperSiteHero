/**
 * Subcontractor Punch Items Page
 * Lists all punch items assigned to the subcontractor
 */

import { useState } from 'react'
import { useSubcontractorPunchItems } from '@/features/subcontractor-portal/hooks'
import { PunchItemStatusButton } from '@/features/subcontractor-portal/components'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClipboardList, Search, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import type { SubcontractorItemsFilter, PunchItemStatus } from '@/types/subcontractor-portal'

function ItemsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function SubcontractorPunchItemsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')

  const filter: SubcontractorItemsFilter = {
    search: search || undefined,
    status:
      statusFilter === 'all'
        ? undefined
        : statusFilter === 'open'
          ? ['open', 'in_progress', 'ready_for_review']
          : [statusFilter],
  }

  const { data: items, isLoading, isError } = useSubcontractorPunchItems(filter)

  const getLocationString = (item: any) => {
    const parts = [item.building, item.floor, item.room, item.area].filter(Boolean)
    return parts.length > 0 ? parts.join(' > ') : 'No location specified'
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) { return false }
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 heading-page">
          <ClipboardList className="h-6 w-6" />
          Punch Items
        </h1>
        <p className="text-muted-foreground">
          View and update punch items assigned to you.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search punch items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <RadixSelect value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="ready_for_review">Ready for Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
          </SelectContent>
        </RadixSelect>
      </div>

      {/* Items List */}
      {isLoading ? (
        <ItemsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load punch items
          </CardContent>
        </Card>
      ) : !items || items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No punch items found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate heading-subsection">{item.title}</h3>
                      {item.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          High Priority
                        </Badge>
                      )}
                      {item.due_date && isOverdue(item.due_date) && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {getLocationString(item)}
                      </span>
                      {item.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Due {format(new Date(item.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {item.trade && (
                        <Badge variant="secondary" className="text-xs">
                          {item.trade}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <PunchItemStatusButton
                    punchItemId={item.id}
                    currentStatus={item.status as PunchItemStatus}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubcontractorPunchItemsPage
